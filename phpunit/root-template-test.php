<?php
/**
 * Tests for the root template feature: the `template_include` swap and the
 * `core/template-content` block's render callback (recursion guard +
 * stashed-id resolution).
 *
 * @package WordPress
 * @subpackage Blocks
 */

/**
 * @group blocks
 */
class Root_Template_Test extends WP_UnitTestCase {
	/**
	 * Saved theme to restore after each test, so we can switch into the
	 * bundled `twentytwentyfive` test theme that ships in `test/`.
	 */
	private $original_stylesheet;
	private $original_template;
	private $original_globals;

	public function set_up() {
		parent::set_up();
		// The render-callback assertions below call the gutenberg-prefixed
		// function name from the built block file. If a contributor runs
		// PHPUnit before building, the block isn't registered yet — skip
		// rather than failing with an opaque "undefined function" error.
		if (
			! function_exists( 'gutenberg_render_block_core_template_content' )
		) {
			$this->markTestSkipped(
				'core/template-content block not built. Run `npm run build` first.'
			);
		}

		$this->original_stylesheet = get_stylesheet();
		$this->original_template   = get_template();
		$this->original_globals    = array(
			'_wp_current_template_id'       => $GLOBALS['_wp_current_template_id'] ?? null,
			'_wp_current_template_content'  => $GLOBALS['_wp_current_template_content'] ?? null,
			'_wp_current_inner_template_id' => $GLOBALS['_wp_current_inner_template_id'] ?? null,
		);
		// Reset the static cache between tests so each test sees the current
		// theme's root template.
		gutenberg_get_root_block_template( true );
	}

	public function tear_down() {
		// Restore globals.
		foreach ( $this->original_globals as $key => $value ) {
			if ( null === $value ) {
				unset( $GLOBALS[ $key ] );
			} else {
				$GLOBALS[ $key ] = $value;
			}
		}
		gutenberg_get_root_block_template( true );
		parent::tear_down();
	}

	/**
	 * The swap should not run when no template id is set in the request.
	 */
	public function test_swap_noop_when_no_current_template() {
		$GLOBALS['_wp_current_template_id']      = '';
		$GLOBALS['_wp_current_template_content'] = '';

		$result = gutenberg_root_template_swap( '/path/to/template-canvas.php' );

		$this->assertSame( '/path/to/template-canvas.php', $result );
		$this->assertEmpty( $GLOBALS['_wp_current_template_id'] );
		$this->assertArrayNotHasKey(
			'_wp_current_inner_template_id',
			$GLOBALS
		);
	}

	/**
	 * The swap should not run when the resolved template is already root —
	 * otherwise we'd render root inside root and rely on the recursion guard.
	 */
	public function test_swap_noop_when_already_rendering_root() {
		$GLOBALS['_wp_current_template_id']      = get_stylesheet() . '//root';
		$GLOBALS['_wp_current_template_content'] = '<!-- wp:paragraph --><p>root</p><!-- /wp:paragraph -->';

		gutenberg_root_template_swap( '/path' );

		$this->assertSame(
			get_stylesheet() . '//root',
			$GLOBALS['_wp_current_template_id']
		);
		$this->assertArrayNotHasKey(
			'_wp_current_inner_template_id',
			$GLOBALS
		);
	}

	/**
	 * When the active theme has no root template, the swap is a no-op even
	 * if a non-root template is being rendered.
	 */
	public function test_swap_noop_when_no_root_template_in_theme() {
		// `default` theme (used in the unit-test bootstrap) has no root.html.
		$GLOBALS['_wp_current_template_id']      = get_stylesheet() . '//archive';
		$GLOBALS['_wp_current_template_content'] = '<!-- wp:paragraph --><p>archive</p><!-- /wp:paragraph -->';

		gutenberg_root_template_swap( '/path' );

		$this->assertSame(
			get_stylesheet() . '//archive',
			$GLOBALS['_wp_current_template_id']
		);
		$this->assertArrayNotHasKey(
			'_wp_current_inner_template_id',
			$GLOBALS
		);
	}

	/**
	 * The render callback returns empty (no markup) when no inner template
	 * id has been stashed by the swap — i.e. the block was rendered outside
	 * a wrapped request.
	 */
	public function test_render_callback_returns_empty_without_stashed_id() {
		unset( $GLOBALS['_wp_current_inner_template_id'] );

		$rendered = gutenberg_render_block_core_template_content();

		$this->assertSame( '', $rendered );
	}

	/**
	 * The render callback returns empty when the stashed inner template id
	 * doesn't resolve to a real template (e.g. theme uninstalled, slug
	 * misspelled in `root.html`).
	 */
	public function test_render_callback_returns_empty_for_missing_template() {
		$GLOBALS['_wp_current_inner_template_id'] = 'nonexistent-theme//does-not-exist';

		$rendered = gutenberg_render_block_core_template_content();
		$this->assertSame( '', $rendered );
	}

	/**
	 * The render callback's static `$seen_ids` recursion guard bails with
	 * empty output when the same template id is encountered while it's
	 * already being rendered. This exercises the actual reentry path —
	 * a template whose content contains a `<!-- wp:template-content /-->`
	 * block — by creating such a template via WP's REST controller and
	 * stashing its id.
	 */
	public function test_render_callback_recursion_guard_blocks_reentry() {
		$theme         = get_stylesheet();
		$inner_id      = $theme . '//recursive-fixture';
		$recursive_tpl = wp_insert_post(
			array(
				'post_type'    => 'wp_template',
				'post_status'  => 'publish',
				'post_name'    => 'recursive-fixture',
				'post_title'   => 'Recursive fixture',
				'post_content' => '<!-- wp:paragraph --><p>before</p><!-- /wp:paragraph --><!-- wp:template-content /--><!-- wp:paragraph --><p>after</p><!-- /wp:paragraph -->',
				'tax_input'    => array( 'wp_theme' => $theme ),
			)
		);
		wp_set_object_terms( $recursive_tpl, $theme, 'wp_theme' );

		$GLOBALS['_wp_current_inner_template_id'] = $inner_id;

		// First pass renders the outer template. The inner Template Content
		// block resolves the same id, hits the static `$seen_ids` guard, and
		// returns an empty string for the inner pass. We assert "before" and
		// "after" both rendered — i.e. the outer pass completed normally —
		// and that no recursion-induced repetition appears in the output.
		$rendered = gutenberg_render_block_core_template_content();

		wp_delete_post( $recursive_tpl, true );

		$this->assertStringContainsString( 'before', $rendered );
		$this->assertStringContainsString( 'after', $rendered );
		// Two paragraph occurrences — one each from "before" and "after" —
		// confirm the inner re-entry produced nothing.
		$this->assertSame( 2, substr_count( $rendered, '<p>' ) );
	}
}
