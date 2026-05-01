/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	BlockControls,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	useEntityBlockEditor,
	store as coreStore,
} from '@wordpress/core-data';
import { useSelect, useRegistry } from '@wordpress/data';
import { useLayoutEffect, useMemo, useState } from '@wordpress/element';
import {
	Placeholder,
	Spinner,
	ToolbarButton,
	PanelBody,
	SelectControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import icon from './icon';

/**
 * The hierarchy used to find a default preview template when the user hasn't
 * picked one explicitly. Walks the same precedence WordPress uses to resolve
 * the home page on the frontend, falling through to the universal `index`
 * fallback if neither front-page nor home exists.
 */
const HOMEPAGE_FALLBACKS = [ 'front-page', 'home', 'index' ];

/**
 * Mirrors the page-editor's `DisableNonPageContentBlocks` pattern:
 * the previewed inner template's blocks should appear in the canvas (and List
 * View) but stay non-structural. To actually edit them, the author uses the
 * "Edit original" toolbar button to navigate to the inner template's own
 * focused canvas — same way `core/template-part` is edited.
 */
function useLockInnerBlocks( clientId ) {
	const registry = useRegistry();
	const childClientIds = useSelect(
		( select ) =>
			clientId
				? select( blockEditorStore ).getBlockOrder( clientId )
				: [],
		[ clientId ]
	);

	// `useLayoutEffect` (vs. `useEffect`) so the editing-mode dispatch fires
	// synchronously after commit but before browser paint — closes the brief
	// window where children would otherwise render in `default` mode and
	// briefly accept clicks that go nowhere via our no-op `onChange`.
	useLayoutEffect( () => {
		if ( childClientIds.length === 0 ) {
			return;
		}
		const { setBlockEditingMode, unsetBlockEditingMode } =
			registry.dispatch( blockEditorStore );
		registry.batch( () => {
			for ( const id of childClientIds ) {
				setBlockEditingMode( id, 'contentOnly' );
			}
		} );
		return () => {
			registry.batch( () => {
				for ( const id of childClientIds ) {
					unsetBlockEditingMode( id );
				}
			} );
		};
	}, [ childClientIds, registry ] );
}

export default function TemplateContentEdit( { clientId } ) {
	const blockProps = useBlockProps();

	// Per-session local state — the previewed template is an editor-only
	// convenience, not data the theme author wants persisted into the saved
	// root template's HTML. Each editor instance starts at the home-page
	// hierarchy fallback and remembers what the user picked until they
	// reload or navigate away.
	const [ previewedTemplate, setPreviewedTemplate ] = useState( undefined );

	const { stylesheet, themeTemplates } = useSelect( ( select ) => {
		const { getCurrentTheme, getEntityRecords } = select( coreStore );
		const sheet = getCurrentTheme()?.stylesheet;
		const records = getEntityRecords( 'postType', 'wp_template', {
			per_page: -1,
		} );
		return {
			stylesheet: sheet ?? null,
			themeTemplates:
				records && sheet
					? records.filter( ( t ) => t.theme === sheet )
					: null,
		};
	}, [] );

	// Resolve the template id to render as the preview:
	//   1. The user's session-local pick, if any.
	//   2. Else the first of `front-page` / `home` / `index` that exists.
	// Frontend rendering is unaffected; the swap there always follows the
	// real WordPress hierarchy regardless of this preview.
	const templateId = useMemo( () => {
		if ( ! stylesheet ) {
			return null;
		}
		if ( previewedTemplate ) {
			return `${ stylesheet }//${ previewedTemplate }`;
		}
		if ( ! themeTemplates ) {
			return null;
		}
		const availableSlugs = new Set( themeTemplates.map( ( t ) => t.slug ) );
		for ( const slug of HOMEPAGE_FALLBACKS ) {
			if ( availableSlugs.has( slug ) ) {
				return `${ stylesheet }//${ slug }`;
			}
		}
		return null;
	}, [ stylesheet, previewedTemplate, themeTemplates ] );

	// Whether the user can edit the previewed template. Mirrors
	// `core/template-part`'s gate on the "Edit original" toolbar button so
	// users without permission don't see an action they can't perform.
	const canEditPreviewedTemplate = useSelect(
		( select ) =>
			!! templateId &&
			!! select( coreStore ).canUser( 'update', {
				kind: 'postType',
				name: 'wp_template',
				id: templateId,
			} ),
		[ templateId ]
	);

	const onNavigateToEntityRecord = useSelect(
		( select ) =>
			select( blockEditorStore ).getSettings().onNavigateToEntityRecord,
		[]
	);

	const [ blocks ] = useEntityBlockEditor( 'postType', 'wp_template', {
		id: templateId,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		value: blocks ?? [],
		onInput: () => {},
		onChange: () => {},
		renderAppender: false,
	} );

	useLockInnerBlocks( clientId );

	// Build the dropdown options. Exclude `root` itself — previewing the
	// root template inside its own preview slot would just recurse visually.
	const previewOptions = useMemo( () => {
		const fallbackOption = {
			label: __( 'Default (home page)' ),
			value: '',
		};
		if ( ! themeTemplates ) {
			return [ fallbackOption ];
		}
		return [
			fallbackOption,
			...themeTemplates
				.filter( ( t ) => t.slug !== 'root' )
				.map( ( t ) => ( {
					label: t.title?.rendered || t.slug,
					value: t.slug,
				} ) ),
		];
	}, [ themeTemplates ] );

	const inspector = (
		<InspectorControls>
			<PanelBody title={ __( 'Preview' ) }>
				<SelectControl
					label={ __( 'Preview template' ) }
					help={ __(
						'Pick which template to render inside this block while editing. The frontend always uses the WordPress hierarchy regardless of this setting; the choice is not saved.'
					) }
					value={ previewedTemplate ?? '' }
					options={ previewOptions }
					onChange={ ( value ) =>
						setPreviewedTemplate( value || undefined )
					}
				/>
			</PanelBody>
		</InspectorControls>
	);

	const isLoaded = !! blocks;
	const hasContent = isLoaded && blocks.length > 0;

	const editOriginalToolbar = templateId &&
		canEditPreviewedTemplate &&
		onNavigateToEntityRecord && (
			<BlockControls group="other">
				<ToolbarButton
					onClick={ () =>
						onNavigateToEntityRecord( {
							postId: templateId,
							postType: 'wp_template',
						} )
					}
				>
					{ __( 'Edit original' ) }
				</ToolbarButton>
			</BlockControls>
		);

	if ( hasContent ) {
		return (
			<>
				{ editOriginalToolbar }
				{ inspector }
				<div { ...innerBlocksProps } />
			</>
		);
	}

	return (
		<>
			{ editOriginalToolbar }
			{ inspector }
			<div { ...innerBlocksProps }>
				<Placeholder
					icon={ icon }
					label={ __( 'Template Content' ) }
					instructions={
						isLoaded
							? __(
									'On the frontend, this block renders whichever template the WordPress hierarchy selects (front-page, archive, single, 404, etc.).'
							  )
							: __( 'Loading template preview…' )
					}
				>
					{ ! isLoaded && <Spinner /> }
				</Placeholder>
			</div>
		</>
	);
}
