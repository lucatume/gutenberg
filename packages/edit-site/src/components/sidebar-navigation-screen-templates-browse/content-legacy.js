/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	commentAuthorAvatar,
	layout,
	plugins as pluginIcon,
	globe,
} from '@wordpress/icons';
import { Path, SVG } from '@wordpress/primitives';

/**
 * Internal dependencies
 */
import { TEMPLATE_POST_TYPE } from '../../utils/constants';
import DataViewsSidebarContent from '../sidebar-dataviews';
import SidebarNavigationItem from '../sidebar-navigation-item';

const SOURCE_TO_ICON = {
	user: commentAuthorAvatar,
	theme: layout,
	plugin: pluginIcon,
	site: globe,
};

// Mirror of the `core/template-content` block icon. Inlined to avoid
// importing private icon files from `@wordpress/block-library`.
const rootTemplateIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M18 5.5H6a.5.5 0 00-.5.5v3h13V6a.5.5 0 00-.5-.5zm-10 5H5.5V18a.5.5 0 00.5.5h2.5v-8zM6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
		<Path d="M10 10.5h8.5V18a.5.5 0 01-.5.5h-8z" />
	</SVG>
);

export default function DataviewsTemplatesSidebarContent() {
	const { authorSourceMap, rootTemplateId } = useSelect( ( select ) => {
		const { getCurrentTheme, getEntityRecord, getEntityRecords } =
			select( coreStore );
		const templates = getEntityRecords(
			'postType',
			TEMPLATE_POST_TYPE,
			{ per_page: -1 }
		);
		const map = {};
		if ( templates ) {
			for ( const template of templates ) {
				if (
					template.author_text &&
					template.original_source &&
					! map[ template.author_text ]
				) {
					map[ template.author_text ] = template.original_source;
				}
			}
		}
		const stylesheet = getCurrentTheme()?.stylesheet;
		let rootId = null;
		if ( stylesheet ) {
			const id = `${ stylesheet }//root`;
			const record = getEntityRecord( 'postType', 'wp_template', id );
			if ( record ) {
				rootId = id;
			}
		}
		return { authorSourceMap: map, rootTemplateId: rootId };
	}, [] );

	const resolveIcon = ( view ) => {
		const source = authorSourceMap[ view.slug ];
		return SOURCE_TO_ICON[ source ] ?? layout;
	};

	// If the active theme provides a `root.html`, append a quick "Root
	// template" link inside the same ItemGroup as the per-source views, so
	// it reads as a peer entry with consistent left-alignment.
	const appendItems = rootTemplateId ? (
		<SidebarNavigationItem
			to={ `/wp_template/${ rootTemplateId }?canvas=edit` }
			icon={ rootTemplateIcon }
		>
			{ __( 'Root template' ) }
		</SidebarNavigationItem>
	) : null;

	return (
		<DataViewsSidebarContent
			postType={ TEMPLATE_POST_TYPE }
			resolveIcon={ resolveIcon }
			appendItems={ appendItems }
		/>
	);
}
