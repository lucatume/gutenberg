/**
 * WordPress dependencies
 */
import { createContext, useContext, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as blocksStore } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { store as blockEditorStore } from '../../store';
import { globalStylesDataKey } from '../../store/private-keys';
import { buildInheritedValueMemoized } from './build-inherited-value';
import { getVariationNameFromClass } from '../../hooks/block-style-variation';

/**
 * React context carrying the block-level inputs required to build a
 * panel-scoped `inheritedValue` payload. The Provider collapses the
 * `useSelect` subscription to one per mount, so individual panels do not
 * each re-subscribe to the `globalStylesDataKey` settings slice.
 *
 * `null` means "no Provider above this panel"; the consumer hook then
 * returns an empty object and each panel preserves its existing behavior.
 *
 * @type {React.Context<?{ globalStyles: ?Object, blockName: ?string, ownVariation: ?string }>}
 */
export const InheritedValueContext = createContext( null );

/**
 * Provider component. Reads the Global Styles payload once via
 * `useSelect` and propagates it alongside the selected block's
 * `blockName` and `ownVariation` to every descendant panel.
 *
 * @param {Object}  props
 * @param {?string} props.blockName      Selected block name (e.g. `core/heading`).
 * @param {?string} [props.ownVariation] Detected variation slug (see `getVariationNameFromClass`).
 * @param {*}       props.children
 */
export function InheritedValueProvider( {
	blockName,
	ownVariation = null,
	children,
} ) {
	const globalStyles = useSelect(
		( select ) =>
			select( blockEditorStore ).getSettings()[ globalStylesDataKey ] ??
			null,
		[]
	);
	const contextValue = useMemo(
		() => ( { globalStyles, blockName: blockName ?? null, ownVariation } ),
		[ globalStyles, blockName, ownVariation ]
	);
	return (
		<InheritedValueContext.Provider value={ contextValue }>
			{ children }
		</InheritedValueContext.Provider>
	);
}

/**
 * Hook: returns the merged `inheritedValue` payload for a panel. Call
 * once per panel, passing the element tag (if any) the panel folds.
 *
 * Before the Provider is mounted, or during hydration before the
 * `globalStylesDataKey` payload settles, the hook returns an empty object.
 * Each panel's existing `inheritedValue = value` default then keeps
 * pre-feature behavior.
 *
 * The returned object identity is stable across renders when none of
 * `(globalStyles, blockName, element, ownVariation)` have changed.
 *
 * @param {Object}  [args]
 * @param {?string} [args.element] Element tag to fold (e.g. `h2`, `link`).
 * @return {Object} Merged panel-scoped payload, or `{}` before the Provider / Global Styles payload settles.
 */
export function useInheritedValue( { element = null } = {} ) {
	const ctx = useContext( InheritedValueContext );
	return useMemo( () => {
		if ( ! ctx || ! ctx.blockName ) {
			return {};
		}
		return buildInheritedValueMemoized( {
			blockName: ctx.blockName,
			element,
			ownVariation: ctx.ownVariation,
			globalStyles: ctx.globalStyles,
		} );
	}, [ ctx, element ] );
}

/**
 * Hook: derives the active block-style-variation slug from a block's
 * `className` by matching registered styles via
 * `getVariationNameFromClass`. Returns `null` when no registered
 * variation class is present (the most common case).
 *
 * Intended to be called by each inspector panel's hook wrapper
 * (e.g. `hooks/typography.js`, `hooks/color.js`) so the derived slug
 * can be passed to `<InheritedValueProvider ownVariation={...}>`. The
 * lookup is scoped to a single `useSelect` subscription per call; the
 * `@wordpress/blocks` registered-styles slice changes only when a
 * block's styles are (un)registered, so this subscription is cold in
 * steady-state editor use.
 *
 * @param {?string} blockName Block name (e.g. `core/heading`).
 * @param {?string} className Space-separated class string from block attributes.
 * @return {?string} Variation slug (without the `is-style-` prefix) or `null`.
 */
export function useOwnVariation( blockName, className ) {
	return useSelect(
		( select ) => {
			if ( ! blockName || ! className ) {
				return null;
			}
			const registeredStyles =
				select( blocksStore ).getBlockStyles( blockName );
			return getVariationNameFromClass( className, registeredStyles );
		},
		[ blockName, className ]
	);
}
