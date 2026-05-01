/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { Page } from '@wordpress/admin-ui';
import { __ } from '@wordpress/i18n';
import { lazy, Suspense } from '@wordpress/element';
import { Card } from '@wordpress/ui';
import type { ComponentType } from '@wordpress/element';

/**
 * Internal dependencies
 */
import styles from './style.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY DEMO — DELETE WHEN THE WIDGET RENDERING ENGINE LANDS.
// This file hardcodes widgets behind a Suspense
// boundary just to prove the end-to-end pipeline (wp-build → script module →
// import map → dynamic import). The real implementation will ship a generic
// widget renderer driven by layout state, not a hardcoded import.
// ─────────────────────────────────────────────────────────────────────────────

// Opaque to the bundler; resolved at runtime via the WordPress import map.
const importFromImportMap = new Function(
	'specifier',
	'return import( specifier );'
) as ( specifier: string ) => Promise< { default: ComponentType } >;

const ActivityWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `activity` widget' );
	return importFromImportMap( 'wp/widgets/activity/render' );
} );

const QuickDraftWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `quick-draft` widget' );
	return importFromImportMap( 'wp/widgets/quick-draft/render' );
} );

const SitePreviewWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `site-preview` widget' );
	return importFromImportMap( 'wp/widgets/site-preview/render' );
} );

const SiteHealthWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `site-health` widget' );
	return importFromImportMap( 'wp/widgets/site-health/render' );
} );

const WelcomeWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `welcome` widget' );
	return importFromImportMap( 'wp/widgets/welcome/render' );
} );

const EventsNewsWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `events-news` widget' );
	return importFromImportMap( 'wp/widgets/events-news/render' );
} );

const Widget = ( {
	children,
	className: classNameProp,
	isLoading,
	title,
}: {
	children?: React.ReactNode;
	className?: string;
	isLoading?: boolean;
	title?: string;
} ) => {
	const className = clsx(
		styles.widget,
		isLoading && styles[ 'is-loading' ],
		classNameProp
	);

	return (
		<Card.Root className={ className }>
			{ title && <Card.Header>{ title }</Card.Header> }
			{ children && <Card.Content>{ children }</Card.Content> }
		</Card.Root>
	);
};

const LoadingPlaceholder = ( {
	className,
	title,
}: {
	className?: string;
	title?: string;
} ) => {
	return (
		<Widget className={ className } title={ title } isLoading>
			{ __( 'Loading widget…' ) }
		</Widget>
	);
};

function Dashboard() {
	return (
		<Page title={ __( 'Dashboard' ) }>
			<div className={ styles.widgets }>
				<Suspense
					fallback={
						<LoadingPlaceholder
							className={ styles[ 'widget-full-width' ] }
							title={ __( 'Welcome' ) }
						/>
					}
				>
					<Widget className={ styles[ 'widget-full-width' ] }>
						<WelcomeWidget />
					</Widget>
				</Suspense>
				<Suspense
					fallback={
						<LoadingPlaceholder title={ __( 'Activity' ) } />
					}
				>
					<Widget title={ __( 'Activity' ) }>
						<ActivityWidget />
					</Widget>
				</Suspense>
				<Suspense
					fallback={
						<LoadingPlaceholder title={ __( 'Quick Draft' ) } />
					}
				>
					<Widget title={ __( 'Quick Draft' ) }>
						<QuickDraftWidget />
					</Widget>
				</Suspense>
				<Suspense
					fallback={
						<LoadingPlaceholder
							title={ __( 'Site Health Status' ) }
						/>
					}
				>
					<Widget title={ __( 'Site Health Status' ) }>
						<SiteHealthWidget />
					</Widget>
				</Suspense>
				<Suspense
					fallback={
						<LoadingPlaceholder
							title={ __( 'WordPress Events and News' ) }
						/>
					}
				>
					<Widget title={ __( 'WordPress Events and News' ) }>
						<EventsNewsWidget />
					</Widget>
				</Suspense>
				<Suspense fallback={ <LoadingPlaceholder /> }>
					<Widget>
						<SitePreviewWidget />
					</Widget>
				</Suspense>
			</div>
		</Page>
	);
}

export const stage = Dashboard;
