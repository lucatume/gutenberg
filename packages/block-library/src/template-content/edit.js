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
	__experimentalUseBlockPreview as useBlockPreview,
} from '@wordpress/block-editor';
import {
	useEntityBlockEditor,
	store as coreStore,
} from '@wordpress/core-data';
import { parse } from '@wordpress/blocks';
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
 * Hierarchy used to find a default preview template when the user is editing
 * `root.html` directly and hasn't picked one explicitly. Walks the same
 * precedence WordPress uses to resolve the home page on the frontend.
 */
const HOMEPAGE_FALLBACKS = [ 'front-page', 'home', 'index' ];

/**
 * Stabilises the array reference returned from selectors so it only changes
 * when contents change. `getBlockOrder` returns a fresh array per state
 * mutation; without this every dispatch would invalidate dependent effects
 * and re-trigger the dispatches that caused the state mutation, looping.
 */
function useStableClientIds( clientIds ) {
	return useMemo(
		() => clientIds,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ clientIds.join( ',' ) ]
	);
}

/**
 * Locks the canvas down to "edit only the inner template's blocks" when the
 * Site Editor is wrapping a non-root template inside `root.html`. Mirrors
 * the page-editor's `DisableNonPageContentBlocks` pattern:
 *
 *   - Disable the entire canvas (`''` clientId).
 *   - Promote `core/template-content` itself to `'contentOnly'` so it stays
 *     visible in List View (the only non-`disabled` mode that does).
 *   - Re-enable each direct child of `core/template-content` so the inner
 *     template's blocks can be edited normally.
 *
 * Three separate effects with stabilised dep arrays + read-before-dispatch
 * guards. The `setBlockEditingMode` reducer creates a new state Map even
 * when the value is unchanged, so unconditional dispatches would loop:
 * dispatch → state changes → `getBlockOrder` returns new array → effect
 * re-runs → dispatch → … . Reading `getBlockEditingMode` first and
 * skipping no-op writes breaks that cycle at the source.
 */
function useWrapModeLocking( clientId, childClientIds ) {
	const registry = useRegistry();
	const stableChildClientIds = useStableClientIds( childClientIds );

	useLayoutEffect( () => {
		const { getBlockEditingMode } = registry.select( blockEditorStore );
		const { setBlockEditingMode, unsetBlockEditingMode } =
			registry.dispatch( blockEditorStore );
		if ( getBlockEditingMode( '' ) !== 'disabled' ) {
			setBlockEditingMode( '', 'disabled' );
		}
		return () => {
			unsetBlockEditingMode( '' );
		};
	}, [ registry ] );

	useLayoutEffect( () => {
		if ( ! clientId ) {
			return;
		}
		const { getBlockEditingMode } = registry.select( blockEditorStore );
		const { setBlockEditingMode, unsetBlockEditingMode } =
			registry.dispatch( blockEditorStore );
		if ( getBlockEditingMode( clientId ) !== 'contentOnly' ) {
			setBlockEditingMode( clientId, 'contentOnly' );
		}
		return () => {
			unsetBlockEditingMode( clientId );
		};
	}, [ clientId, registry ] );

	useLayoutEffect( () => {
		if ( stableChildClientIds.length === 0 ) {
			return;
		}
		const { getBlockEditingMode } = registry.select( blockEditorStore );
		const { setBlockEditingMode, unsetBlockEditingMode } =
			registry.dispatch( blockEditorStore );
		const toSet = stableChildClientIds.filter(
			( id ) => getBlockEditingMode( id ) !== 'default'
		);
		if ( toSet.length > 0 ) {
			registry.batch( () => {
				for ( const id of toSet ) {
					setBlockEditingMode( id, 'default' );
				}
			} );
		}
		return () => {
			registry.batch( () => {
				for ( const id of stableChildClientIds ) {
					unsetBlockEditingMode( id );
				}
			} );
		};
	}, [ stableChildClientIds, registry ] );
}

/**
 * Wrap-mode rendering: the user navigated to a non-root template (e.g.
 * `archive`) but the Site Editor is wrapping it in `root.html`. The inner
 * template's blocks render here as fully editable inner blocks; their edits
 * round-trip to the inner template's entity. Root chrome around us is
 * locked via `useWrapModeLocking`.
 */
function WrapModeEdit( { innerTemplateId, blockProps, clientId } ) {
	const [ blocks, onInput, onChange ] = useEntityBlockEditor(
		'postType',
		'wp_template',
		{ id: innerTemplateId }
	);

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		value: blocks,
		onInput,
		onChange,
		templateLock: false,
	} );

	const childClientIds = useSelect(
		( select ) =>
			clientId
				? select( blockEditorStore ).getBlockOrder( clientId )
				: [],
		[ clientId ]
	);
	useWrapModeLocking( clientId, childClientIds );

	const onNavigateToEntityRecord = useSelect(
		( select ) =>
			select( blockEditorStore ).getSettings().onNavigateToEntityRecord,
		[]
	);

	const editOriginalToolbar = onNavigateToEntityRecord && (
		<BlockControls group="other">
			<ToolbarButton
				onClick={ () =>
					onNavigateToEntityRecord( {
						postId: innerTemplateId,
						postType: 'wp_template',
					} )
				}
			>
				{ __( 'Edit original' ) }
			</ToolbarButton>
		</BlockControls>
	);

	if ( ! blocks ) {
		return (
			<>
				{ editOriginalToolbar }
				<div { ...blockProps }>
					<Placeholder
						icon={ icon }
						label={ __( 'Template Content' ) }
						instructions={ __( 'Loading template…' ) }
					>
						<Spinner />
					</Placeholder>
				</div>
			</>
		);
	}

	return (
		<>
			{ editOriginalToolbar }
			<div { ...innerBlocksProps } />
		</>
	);
}

/**
 * Direct-edit-root rendering: the user is editing `root.html`. Show a
 * non-editable preview of the active theme's home-hierarchy fallback (or a
 * user-picked template) inside this slot, with an "Edit original" button to
 * navigate to focus mode for the previewed template.
 */
function PreviewModeEdit( { blockProps } ) {
	// Per-session local state — the previewed template is an editor-only
	// convenience, not data the theme author wants persisted into the saved
	// root template's HTML.
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

	// 1. The user's session-local pick, if any.
	// 2. Else the first of `front-page` / `home` / `index` that exists.
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

	// Read the previewed template's content directly. We deliberately avoid
	// `useEntityBlockEditor` here because its `_id ?? providerId` fallback
	// would resolve to the surrounding entity (the root template itself)
	// when `templateId` is null, causing recursive preview.
	const content = useSelect(
		( select ) => {
			if ( ! templateId ) {
				return null;
			}
			// `getEntityRecord` triggers the resolver on first call.
			const record = select( coreStore ).getEntityRecord(
				'postType',
				'wp_template',
				templateId
			);
			return record?.content?.raw ?? null;
		},
		[ templateId ]
	);

	const previewBlocks = useMemo( () => {
		return content ? parse( content ) : [];
	}, [ content ] );

	const blockPreviewProps = useBlockPreview( {
		blocks: previewBlocks,
		props: blockProps,
	} );

	const onNavigateToEntityRecord = useSelect(
		( select ) =>
			select( blockEditorStore ).getSettings().onNavigateToEntityRecord,
		[]
	);

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

	const isLoaded = templateId !== null && content !== null;
	const hasContent = isLoaded && previewBlocks.length > 0;

	if ( hasContent ) {
		return (
			<>
				{ editOriginalToolbar }
				{ inspector }
				<div { ...blockPreviewProps } />
			</>
		);
	}

	return (
		<>
			{ editOriginalToolbar }
			{ inspector }
			<div { ...blockProps }>
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

export default function TemplateContentEdit( { clientId } ) {
	const blockProps = useBlockProps();

	// `__experimentalRootInnerTemplateId` is set by edit-site when wrapping
	// a non-root template inside `root.html`. When set, this block's
	// children are the inner template's blocks; when not, we're being
	// rendered inside `root.html` itself and show a non-editable preview.
	const innerTemplateId = useSelect( ( select ) => {
		return (
			select( blockEditorStore ).getSettings()
				.__experimentalRootInnerTemplateId ?? null
		);
	}, [] );

	if ( innerTemplateId ) {
		return (
			<WrapModeEdit
				innerTemplateId={ innerTemplateId }
				blockProps={ blockProps }
				clientId={ clientId }
			/>
		);
	}

	return <PreviewModeEdit blockProps={ blockProps } />;
}
