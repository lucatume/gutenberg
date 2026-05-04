/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useEntityBlockEditor } from '@wordpress/core-data';
import { useSelect, useRegistry } from '@wordpress/data';
import { useLayoutEffect, useMemo } from '@wordpress/element';
import { Placeholder, Spinner, ToolbarButton } from '@wordpress/components';

/**
 * Internal dependencies
 */
import icon from './icon';

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
	// DIAGNOSTIC: stripped to a plain placeholder. No `useEntityBlockEditor`,
	// no `useInnerBlocksProps`, no editing-mode locking. If the
	// "Maximum update depth" loop stops with this in place, the cause is one
	// of those interactions; if it persists, the cause is upstream of this
	// block.
	return (
		<div { ...blockProps }>
			<Placeholder
				icon={ icon }
				label={ __( 'Template Content' ) }
				instructions={ __(
					'Diagnostic: preview-mode rendering is temporarily disabled.'
				) }
			/>
		</div>
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
