/**
 * Internal dependencies
 */
import { getValueFromObjectPath } from '../../utils/object';
import { getVariationStylesWithRefValues } from '../../hooks/block-style-variation';

/**
 * Keys on a `styles.*` layer that describe tree structure rather than the
 * block's own leaf contributions. They are excluded from the per-layer
 * pick pass before the merge.
 */
const TREE_STRUCTURAL_KEYS = new Set( [ 'blocks', 'variations', 'css' ] );

/**
 * Explicit-empty values do not contribute at their layer, allowing
 * lower-precedence layers to surface instead.
 *
 * `0`, `'0'`, `false`, and `NaN` remain valid user-facing values.
 *
 * @param {*} v
 * @return {boolean} Whether the value should be dropped from the merge.
 */
function isExplicitEmpty( v ) {
	if ( v === '' || v === null ) {
		return true;
	}
	if (
		v !== null &&
		typeof v === 'object' &&
		! Array.isArray( v ) &&
		Object.keys( v ).length === 0
	) {
		return true;
	}
	return false;
}

/**
 * Check whether a value is a `{ ref: '...' }` reference envelope.
 *
 * @param {*} v
 * @return {boolean} Whether `v` is a `{ ref: string }` envelope.
 */
function isRefObject( v ) {
	return (
		v !== null &&
		typeof v === 'object' &&
		! Array.isArray( v ) &&
		typeof v.ref === 'string'
	);
}

/**
 * Pick the root-scope contribution from a single `styles` layer: plain
 * leaves and sub-trees that are not tree-structural and not the
 * `elements` sub-tree itself. The `elements` sub-tree IS preserved as a
 * passthrough on the final payload so panels that read e.g.
 * `inheritedValue.elements.link.color.text` keep working; it just does
 * not participate in the element-scoped fold.
 *
 * Does not recurse or clone; the returned contribution references the
 * original layer's sub-objects. The deep-merge step copies them into a
 * fresh tree and resolves `{ ref }` envelopes inline as it goes.
 *
 * @param {Object} layer Raw styles layer.
 * @return {Object|null} Root-scope contribution, or `null` when the layer is empty.
 */
function pickLayerRootContribution( layer ) {
	if ( ! layer || typeof layer !== 'object' || Array.isArray( layer ) ) {
		return null;
	}
	const contribution = {};
	for ( const key of Object.keys( layer ) ) {
		if ( TREE_STRUCTURAL_KEYS.has( key ) ) {
			continue;
		}
		if ( key === 'elements' ) {
			if ( layer.elements && typeof layer.elements === 'object' ) {
				contribution.elements = layer.elements;
			}
			continue;
		}
		if ( isExplicitEmpty( layer[ key ] ) ) {
			continue;
		}
		contribution[ key ] = layer[ key ];
	}
	return Object.keys( contribution ).length === 0 ? null : contribution;
}

/**
 * Pick the element-scope contribution from `layer.elements[element]`.
 * Returns a plain-object "layer-shaped" contribution — same top-level
 * keys as a normal layer — so it can be merged in the same pipeline as
 * root-scope contributions, inheriting deep-merge semantics.
 *
 * @param {Object}  layer   Raw styles layer.
 * @param {?string} element Element tag (e.g. `h2`, `link`).
 * @return {Object|null} Element-scope contribution, or `null` when no leaves contribute.
 */
function pickLayerElementContribution( layer, element ) {
	if ( ! element || ! layer || ! layer.elements ) {
		return null;
	}
	const folded = layer.elements[ element ];
	if ( ! folded || typeof folded !== 'object' || Array.isArray( folded ) ) {
		return null;
	}
	const contribution = {};
	for ( const key of Object.keys( folded ) ) {
		if ( TREE_STRUCTURAL_KEYS.has( key ) || key === 'elements' ) {
			continue;
		}
		if ( isExplicitEmpty( folded[ key ] ) ) {
			continue;
		}
		contribution[ key ] = folded[ key ];
	}
	return Object.keys( contribution ).length === 0 ? null : contribution;
}

/**
 * Deep-merge `source` into `target` with the following rules:
 * - Plain objects recurse.
 * - `{ ref }` envelopes encountered at source are resolved against
 *   `globalStyles` and merged in place of the envelope.
 * - Arrays, primitives, and null replace wholesale.
 * - Explicit-empty source leaves (`''`, `null`, `{}`) are dropped — the
 *   target's existing value is preserved.
 *
 * Mutates and returns `target`. Does not mutate `source`.
 *
 * @param {Object} target
 * @param {Object} source
 * @param {Object} globalStyles
 * @return {Object} The mutated `target`.
 */
function deepMergeDroppingEmpties( target, source, globalStyles ) {
	if ( ! source || typeof source !== 'object' || Array.isArray( source ) ) {
		return target;
	}
	for ( const key of Object.keys( source ) ) {
		let sVal = source[ key ];
		if ( isExplicitEmpty( sVal ) ) {
			continue;
		}
		if ( isRefObject( sVal ) ) {
			if ( sVal.ref.trim() === '' ) {
				continue;
			}
			const resolved = getValueFromObjectPath( globalStyles, sVal.ref );
			if ( resolved === undefined || resolved === null ) {
				continue;
			}
			sVal = resolved;
		}
		if (
			sVal !== null &&
			typeof sVal === 'object' &&
			! Array.isArray( sVal ) &&
			! isRefObject( sVal )
		) {
			const existing =
				target[ key ] &&
				typeof target[ key ] === 'object' &&
				! Array.isArray( target[ key ] )
					? target[ key ]
					: {};
			target[ key ] = deepMergeDroppingEmpties(
				{ ...existing },
				sVal,
				globalStyles
			);
		} else {
			target[ key ] = sVal;
		}
	}
	return target;
}

/**
 * Compute the merged Global Styles payload for an inspector panel to use as
 * its `inheritedValue`.
 *
 * Layers are merged from low to high precedence: root styles, root element
 * styles, block styles, block element styles, block variation styles, and
 * block variation element styles.
 *
 * Preset strings are left raw so consumer panels can decode them at display
 * time and still access preset slugs for selector controls.
 *
 * @param {Object}  args
 * @param {string}  args.blockName      Block name (e.g. `core/heading`).
 * @param {?string} [args.element]      Element tag to fold (e.g. `h2`, `link`), or null for block-scope only.
 * @param {?string} [args.ownVariation] Active block style variation slug, or null.
 * @param {Object}  [args.globalStyles] The `settings[ globalStylesDataKey ]` payload.
 * @return {Object} Merged panel-scoped payload.
 */
export function buildInheritedValue( {
	blockName,
	element = null,
	ownVariation = null,
	globalStyles,
} = {} ) {
	if ( ! globalStyles || ! globalStyles.styles ) {
		return {};
	}
	if ( ! blockName ) {
		return {};
	}

	const { styles } = globalStyles;

	const root = styles;
	const block = styles.blocks?.[ blockName ] ?? null;
	// Variation layer is pre-resolved for refs via the production helper.
	const variation = ownVariation
		? getVariationStylesWithRefValues(
				globalStyles,
				blockName,
				ownVariation
		  ) ?? null
		: null;

	// Layers are ordered from low to high precedence. Root-scope and
	// element-scope contributions are merged separately so element
	// overrides can replace specific leaves without dropping sibling values.
	const contributions = [
		pickLayerRootContribution( root ),
		element ? pickLayerElementContribution( root, element ) : null,
		block ? pickLayerRootContribution( block ) : null,
		block && element
			? pickLayerElementContribution( block, element )
			: null,
		variation ? pickLayerRootContribution( variation ) : null,
		variation && element
			? pickLayerElementContribution( variation, element )
			: null,
	].filter( Boolean );

	if ( contributions.length === 0 ) {
		return {};
	}

	return contributions.reduce(
		( acc, contribution ) =>
			deepMergeDroppingEmpties( acc, contribution, globalStyles ),
		{}
	);
}

/**
 * Shared memo for `buildInheritedValue`, keyed by Global Styles object
 * identity and a `(blockName, element, ownVariation)` composite.
 *
 * @type {WeakMap<object, Map<string, Object>>}
 */
const memo = new WeakMap();

/**
 * Memoized variant of `buildInheritedValue`. Same signature.
 *
 * @param {Object} args
 * @return {Object} Merged panel-scoped payload; may be a cache hit.
 */
export function buildInheritedValueMemoized( args ) {
	const gs = args?.globalStyles;
	if ( ! gs || typeof gs !== 'object' ) {
		return buildInheritedValue( args );
	}
	let inner = memo.get( gs );
	if ( ! inner ) {
		inner = new Map();
		memo.set( gs, inner );
	}
	const key =
		( args.blockName || '' ) +
		'\u0001' +
		( args.element || '' ) +
		'\u0001' +
		( args.ownVariation || '' );
	if ( inner.has( key ) ) {
		return inner.get( key );
	}
	const result = buildInheritedValue( args );
	inner.set( key, result );
	return result;
}

// Internals exported for tests only — not re-exported from the package
// root.
export const __unstable = {
	isExplicitEmpty,
	isRefObject,
	pickLayerRootContribution,
	pickLayerElementContribution,
	deepMergeDroppingEmpties,
};
