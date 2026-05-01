/**
 * WordPress dependencies
 */
import {
	store as coreStore,
	useEntityRecords,
} from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __experimentalItemGroup as ItemGroup } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { privateApis as routerPrivateApis } from '@wordpress/router';
import { addQueryArgs } from '@wordpress/url';
import { Path, SVG } from '@wordpress/primitives';

/**
 * Internal dependencies
 */
import SidebarNavigationItem from '../sidebar-navigation-item';
import { useAddedBy } from '../page-templates/hooks';
import { commentAuthorAvatar, published } from '@wordpress/icons';
import { unlock } from '../../lock-unlock';

const { useLocation } = unlock( routerPrivateApis );

const EMPTY_ARRAY = [];

// Mirror of the `core/template-content` block icon. Inlined to avoid
// importing private icon files from `@wordpress/block-library`.
const rootTemplateIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M18 5.5H6a.5.5 0 00-.5.5v3h13V6a.5.5 0 00-.5-.5zm-10 5H5.5V18a.5.5 0 00.5.5h2.5v-8zM6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
		<Path d="M10 10.5h8.5V18a.5.5 0 01-.5.5h-8z" />
	</SVG>
);

function TemplateDataviewItem( { template, isActive } ) {
	const { text, icon } = useAddedBy( template.type, template.id );

	return (
		<SidebarNavigationItem
			to={ addQueryArgs( '/template', { activeView: text } ) }
			icon={ icon }
			aria-current={ isActive }
		>
			{ text }
		</SidebarNavigationItem>
	);
}

export default function DataviewsTemplatesSidebarContent() {
	const {
		query: { activeView = 'active' },
	} = useLocation();
	const { records } = useEntityRecords( 'root', 'registeredTemplate', {
		// This should not be needed, the endpoint returns all registered
		// templates, but it's not possible right now to turn off pagination for
		// entity configs.
		per_page: -1,
	} );
	const firstItemPerAuthorText = useMemo( () => {
		const firstItemPerAuthor = records?.reduce( ( acc, template ) => {
			const author = template.author_text;
			if ( author && ! acc[ author ] ) {
				acc[ author ] = template;
			}
			return acc;
		}, {} );
		return (
			( firstItemPerAuthor && Object.values( firstItemPerAuthor ) ) ??
			EMPTY_ARRAY
		);
	}, [ records ] );

	// If the active theme provides a `root.html`, surface a quick "Root
	// template" link at the bottom of the templates sidebar — promoted out of
	// the per-source views because it's the most common thing an author will
	// want to edit on a root-template-based theme.
	const rootTemplateId = useSelect( ( select ) => {
		const { getCurrentTheme, getEntityRecord } = select( coreStore );
		const stylesheet = getCurrentTheme()?.stylesheet;
		if ( ! stylesheet ) {
			return null;
		}
		const id = `${ stylesheet }//root`;
		const record = getEntityRecord( 'postType', 'wp_template', id );
		return record ? id : null;
	}, [] );

	return (
		<ItemGroup className="edit-site-sidebar-navigation-screen-templates-browse">
			<SidebarNavigationItem
				to="/template"
				icon={ published }
				aria-current={ activeView === 'active' }
			>
				{ __( 'Active templates' ) }
			</SidebarNavigationItem>
			<SidebarNavigationItem
				to={ addQueryArgs( '/template', { activeView: 'user' } ) }
				icon={ commentAuthorAvatar }
				aria-current={ activeView === 'user' }
			>
				{
					// Let's avoid calling them "custom templates" to avoid
					// confusion. "Created" is closest to meaning database
					// templates, created by users.
					// https://developer.wordpress.org/themes/classic-themes/templates/page-template-files/#creating-custom-page-templates-for-global-use
					__( 'Created templates' )
				}
			</SidebarNavigationItem>
			{ firstItemPerAuthorText.map( ( template ) => {
				return (
					<TemplateDataviewItem
						key={ template.author_text }
						template={ template }
						isActive={ activeView === template.author_text }
					/>
				);
			} ) }
			{ rootTemplateId && (
				<SidebarNavigationItem
					to={ `/wp_template/${ rootTemplateId }?canvas=edit` }
					icon={ rootTemplateIcon }
				>
					{ __( 'Root template' ) }
				</SidebarNavigationItem>
			) }
		</ItemGroup>
	);
}
