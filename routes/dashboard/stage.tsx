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
// This file hardcodes a single widget (`hello-world`) behind a Suspense
// boundary just to prove the end-to-end pipeline (wp-build → script module →
// import map → dynamic import). The real implementation will ship a generic
// widget renderer driven by layout state, not a hardcoded import.
// ─────────────────────────────────────────────────────────────────────────────

// Opaque to the bundler; resolved at runtime via the WordPress import map.
const importFromImportMap = new Function(
	'specifier',
	'return import( specifier );'
) as ( specifier: string ) => Promise< { default: ComponentType } >;

const HelloWorldWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `hello-world` widget' );
	return importFromImportMap( 'wp/widgets/hello-world/render' );
} );

const ActivityWidget = lazy( () => {
	// eslint-disable-next-line no-console
	console.log( 'importing `activity` widget' );
	return importFromImportMap( 'wp/widgets/activity/render' );
} );

const Widget = ( {
	children,
	isLoading,
	title,
}: {
	children?: React.ReactNode;
	isLoading?: boolean;
	title?: string;
} ) => {
	const className = clsx(
		styles.widget,
		isLoading && styles[ 'is-loading' ]
	);

	return (
		<Card.Root className={ className }>
			{ title && <Card.Header>{ title }</Card.Header> }
			{ children && <Card.Content>{ children }</Card.Content> }
		</Card.Root>
	);
};

const LoadingPlaceholder = ( { title }: { title?: string } ) => {
	return (
		<Widget title={ title } isLoading>
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
						<LoadingPlaceholder title={ __( 'Activity' ) } />
					}
				>
					<Widget title={ __( 'Activity' ) }>
						<ActivityWidget />
					</Widget>
				</Suspense>
				<Suspense fallback={ <LoadingPlaceholder /> }>
					<Widget>
						<HelloWorldWidget />
					</Widget>
				</Suspense>
			</div>
		</Page>
	);
}

export const stage = Dashboard;
