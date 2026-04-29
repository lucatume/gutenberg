/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	useBlockEditingMode,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useEntityBlockEditor } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { Placeholder } from '@wordpress/components';
import { layout as icon } from '@wordpress/icons';

/**
 * Editable preview of an inner template loaded inside a `root` template.
 *
 * Re-enables block editing (the surrounding `root` canvas is locked when
 * wrapping is active) and pulls the inner template's blocks via
 * `useEntityBlockEditor`. Edits round-trip to the inner template's entity
 * record, leaving `root` untouched.
 */
function InnerTemplatePreview( { innerTemplateId, blockProps } ) {
	useBlockEditingMode( 'default' );

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

	return <div { ...innerBlocksProps } />;
}

export default function TemplateContentEdit() {
	const blockProps = useBlockProps();

	const innerTemplateId = useSelect( ( select ) => {
		return (
			select( blockEditorStore ).getSettings()
				.__experimentalRootInnerTemplateId ?? null
		);
	}, [] );

	if ( innerTemplateId ) {
		return (
			<InnerTemplatePreview
				innerTemplateId={ innerTemplateId }
				blockProps={ blockProps }
			/>
		);
	}

	return (
		<div { ...blockProps }>
			<Placeholder
				icon={ icon }
				label={ __( 'Template Content' ) }
				instructions={ __(
					'On the frontend, this is replaced by the template the WordPress hierarchy selects (front-page, archive, single, 404, etc.).'
				) }
			/>
		</div>
	);
}
