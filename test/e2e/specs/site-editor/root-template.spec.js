/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Token coverage for the root-template feature: when the active theme has a
 * `root.html`, clicking another template in the templates list should drop
 * the user into focus mode (matching how `core/template-part` is edited).
 *
 * Manually verifying the wrap behaviour, the preview-picker, the purple
 * outline, and the frontend `template_include` swap is out of scope here —
 * those are smoke-test territory until the feature shape settles. This spec
 * just guards the focus-mode-on-click routing, which is the most easily
 * regressed piece.
 */
test.describe( 'Root template: focus-mode routing', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'emptytheme' );
		await requestUtils.deleteAllTemplates( 'wp_template' );
		// The behaviour we want to assert only kicks in when a `root` template
		// exists for the active theme. Create one as a published wp_template
		// via REST — `useEntityRecord` in the editor will pick it up.
		await requestUtils.createTemplate( 'wp_template', {
			slug: 'root',
			title: 'Root',
			content:
				'<!-- wp:paragraph --><p>Root chrome</p><!-- /wp:paragraph -->\n<!-- wp:template-content /-->',
		} );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllTemplates( 'wp_template' );
		await requestUtils.activateTheme( 'twentytwentyone' );
	} );

	test( 'opens non-root templates in focus mode when root.html exists', async ( {
		admin,
		page,
	} ) => {
		await admin.visitSiteEditor();
		await page.click( 'role=button[name="Templates"]' );

		// Click any template other than Root. `Index` is the catch-all that
		// emptytheme always provides.
		await page
			.locator( '.fields-field__title', { hasText: 'Index' } )
			.click();

		await expect( page ).toHaveURL( /focusMode=true/ );
		await expect( page ).toHaveURL(
			/\/wp_template\/emptytheme\/\/index/
		);
	} );

	test( 'opens root.html itself in the regular editor (no focus mode)', async ( {
		admin,
		page,
	} ) => {
		await admin.visitSiteEditor();
		await page.click( 'role=button[name="Templates"]' );

		await page
			.locator( '.fields-field__title', { hasText: 'Root' } )
			.click();

		await expect( page ).toHaveURL(
			/\/wp_template\/emptytheme\/\/root/
		);
		await expect( page ).not.toHaveURL( /focusMode=true/ );
	} );
} );
