<?php
/**
 * Bootstraps the Dashboard Widgets page in wp-admin.
 *
 * @package gutenberg
 */

add_action( 'admin_menu', 'gutenberg_register_dashboard_widgets_menu' );
add_action( 'dashboard_init', 'gutenberg_dashboard_widgets_register_site_health_widget' );
add_action( 'dashboard-wp-admin_init', 'gutenberg_dashboard_widgets_register_site_health_widget' );
add_action( 'dashboard_init', 'gutenberg_dashboard_widgets_register_activity_widget' );
add_action( 'dashboard-wp-admin_init', 'gutenberg_dashboard_widgets_register_activity_widget' );
add_action( 'dashboard_init', 'gutenberg_dashboard_widgets_register_quick_draft_widget' );
add_action( 'dashboard-wp-admin_init', 'gutenberg_dashboard_widgets_register_quick_draft_widget' );
add_action( 'dashboard_init', 'gutenberg_dashboard_widgets_register_site_preview_widget' );
add_action( 'dashboard-wp-admin_init', 'gutenberg_dashboard_widgets_register_site_preview_widget' );

/**
 * Wires the `site-health` widget as a dynamic dep of the dashboard module so it
 * lands in the import map and React.lazy in the dashboard stage can resolve it.
 */
function gutenberg_dashboard_widgets_register_site_health_widget() {
	$widget_module = 'wp/widgets/site-health/render';

	if ( function_exists( 'gutenberg_register_dashboard_route' ) ) {
		gutenberg_register_dashboard_route( '/__widget_site_health', $widget_module );
	}

	if ( function_exists( 'gutenberg_register_dashboard_wp_admin_route' ) ) {
		gutenberg_register_dashboard_wp_admin_route( '/__widget_site_health', $widget_module );
	}
}

/**
 * Registers the Dashboard Widgets menu item.
 */
function gutenberg_register_dashboard_widgets_menu() {
	add_menu_page(
		__( 'Dashboard (Beta)', 'gutenberg' ),
		__( 'Dashboard (Beta)', 'gutenberg' ),
		'read',
		'dashboard-wp-admin',
		'gutenberg_dashboard_wp_admin_render_page',
		'dashicons-dashboard',
		1
	);
}


/**
 * Wires the `site-preview` widget as a dynamic dep of the dashboard module so it
 * lands in the import map and React.lazy in the dashboard stage can resolve it.
 */
function gutenberg_dashboard_widgets_register_site_preview_widget() {
	$widget_module = 'wp/widgets/site-preview/render';

	if ( function_exists( 'gutenberg_register_dashboard_route' ) ) {
		gutenberg_register_dashboard_route( '/__widget_site_preview', $widget_module );
	}

	if ( function_exists( 'gutenberg_register_dashboard_wp_admin_route' ) ) {
		gutenberg_register_dashboard_wp_admin_route( '/__widget_site_preview', $widget_module );
	}
}

/**
 * Wires the `quick-draft` widget as a dynamic dep of the dashboard module so it
 * lands in the import map and React.lazy in the dashboard stage can resolve it.
 */
function gutenberg_dashboard_widgets_register_quick_draft_widget() {
	$widget_module = 'wp/widgets/quick-draft/render';

	if ( function_exists( 'gutenberg_register_dashboard_route' ) ) {
		gutenberg_register_dashboard_route( '/__widget_quick_draft', $widget_module );
	}

	if ( function_exists( 'gutenberg_register_dashboard_wp_admin_route' ) ) {
		gutenberg_register_dashboard_wp_admin_route( '/__widget_quick_draft', $widget_module );
	}
}

/**
 * Wires the `activity` widget as a dynamic dep of the dashboard module so it
 * lands in the import map and React.lazy in the dashboard stage can resolve it.
 */
function gutenberg_dashboard_widgets_register_activity_widget() {
	$widget_module = 'wp/widgets/activity/render';

	if ( function_exists( 'gutenberg_register_dashboard_route' ) ) {
		gutenberg_register_dashboard_route( '/__widget_activity', $widget_module );
	}

	if ( function_exists( 'gutenberg_register_dashboard_wp_admin_route' ) ) {
		gutenberg_register_dashboard_wp_admin_route( '/__widget_activity', $widget_module );
	}
}
