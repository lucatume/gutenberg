/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { select } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import initBlock from '../utils/init-block';
import metadata from './block.json';
import edit from './edit';
import icon from './icon';

const { name } = metadata;
export { metadata, name };

export const settings = {
	// Just `src` — letting CSS colour the icon. The `is-synced` class on the
	// List View row (added because `isTemplatePart()` now returns `true` for
	// this block) already paints the icon purple when not selected and white
	// when selected. Setting `foreground` here would apply an inline style
	// that overrides the selected-state colour.
	icon,
	edit,
};

/**
 * Returns true when the editor is currently editing the `root` wp_template
 * entity directly (not wrapping another template). Reads selectors via
 * `select()` to avoid a hard dependency on `@wordpress/editor`.
 *
 * The wrapping case (Site Editor swaps in `root` to preview e.g. archive.html)
 * is excluded so users don't accidentally nest a `core/template-content` block
 * inside the inner template, which would create a render-time loop.
 */
function isEditingRootTemplate() {
	const editor = select( 'core/editor' );
	const postType = editor?.getCurrentPostType?.();
	if ( postType !== 'wp_template' ) {
		return false;
	}
	const postId = editor?.getCurrentPostId?.();
	if ( ! postId ) {
		return false;
	}
	const record = select( coreStore ).getEditedEntityRecord(
		'postType',
		'wp_template',
		postId
	);
	if ( record?.slug !== 'root' ) {
		return false;
	}
	const settings = select( 'core/block-editor' )?.getSettings?.();
	if ( settings?.__experimentalRootInnerTemplateId ) {
		return false;
	}
	return true;
}

export const init = () => {
	addFilter(
		'blockEditor.__unstableCanInsertBlockType',
		'core/template-content/restrict-to-root-template',
		( canInsert, blockType ) => {
			if ( blockType.name !== 'core/template-content' ) {
				return canInsert;
			}
			return isEditingRootTemplate();
		}
	);

	return initBlock( { name, metadata, settings } );
};
