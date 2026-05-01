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
 *
 * The root template is created via a direct REST POST rather than
 * `requestUtils.createTemplate`, because that helper hardcodes
 * `is_wp_suggestion: true`, which prevents the entity from showing up via
 * `useEntityRecord` lookup-by-id in the editor.
 */
test.describe( 'Root template: focus-mode routing', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activateTheme( 'emptytheme' );
	} );

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllTemplates( 'wp_template' );
		await requestUtils.rest( {
			method: 'POST',
			path: '/wp/v2/templates',
			params: {
				slug: 'root',
				title: 'Root',
				content:
					'<!-- wp:paragraph --><p>Root chrome</p><!-- /wp:paragraph -->\n<!-- wp:template-content /-->',
				status: 'publish',
			},
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
