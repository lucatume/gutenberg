<?php
/**
 * Root template feature.
 *
 * If the active theme provides a `root.html` template, every block template
 * resolved by the WordPress template hierarchy is wrapped inside it. The
 * originally-resolved template id is stashed in a global so the
 * `core/template-content` block can resolve and render it.
 *
 * @package gutenberg
 */

/**
 * Returns the active theme's root block template, or null if none exists.
 *
 * Caches the result for the duration of the request. `get_block_template()`
 * checks both the `wp_template` post type (user customizations) and theme
 * files, so this works for either source.
 *
 * @return WP_Block_Template|null
 */
function gutenberg_get_root_block_template() {
	static $resolved = false;
	static $cached   = null;

	if ( $resolved ) {
		return $cached;
	}
	$resolved = true;

	$id     = get_stylesheet() . '//root';
	$cached = get_block_template( $id, 'wp_template' );
	return $cached;
}

/**
 * Swaps the resolved template content for the root template, stashing the
 * inner template id so `core/template-content` can render the original.
 *
 * Hooked at a high priority on `template_include` so it runs after gutenberg
 * and core have populated `$_wp_current_template_id` /
 * `$_wp_current_template_content`.
 *
 * @global string $_wp_current_template_id
 * @global string $_wp_current_template_content
 *
 * @param string $template Resolved template path (unchanged by this filter).
 * @return string
 */
function gutenberg_root_template_swap( $template ) {
	global $_wp_current_template_id, $_wp_current_template_content;

	if ( empty( $_wp_current_template_id ) ) {
		return $template;
	}

	// If we are already rendering root (e.g. directly visiting it via the editor preview), skip.
	$separator = strpos( $_wp_current_template_id, '//' );
	$slug      = false === $separator ? $_wp_current_template_id : substr( $_wp_current_template_id, $separator + 2 );
	if ( 'root' === $slug ) {
		return $template;
	}

	$root = gutenberg_get_root_block_template();
	if ( ! $root ) {
		return $template;
	}

	// Stash the inner template id for `core/template-content`.
	$GLOBALS['_wp_current_inner_template_id'] = $_wp_current_template_id;

	$_wp_current_template_id      = $root->id;
	$_wp_current_template_content = $root->content;

	return $template;
}
add_filter( 'template_include', 'gutenberg_root_template_swap', 999 );
