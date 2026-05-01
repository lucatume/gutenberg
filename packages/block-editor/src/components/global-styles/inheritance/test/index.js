/**
 * Internal dependencies
 */
import { getInheritanceProps } from '../';

describe( 'getInheritanceProps', () => {
	test( 'returns an empty object when neither flag is set', () => {
		expect( getInheritanceProps( false, false ) ).toEqual( {} );
	} );

	test( 'returns ONLY the inherited className when isInherited is set', () => {
		// The visual treatment for the inherited state is wired by the
		// `<InheritanceToolsPanelItem>` wrapper, which renders its
		// children inside a `<Tooltip>` from `@wordpress/components`.
		// `getInheritanceProps` only emits the className that gates
		// the label colouring; the tooltip text is supplied by the
		// wrapper.
		expect( getInheritanceProps( true, false ) ).toEqual( {
			className: 'is-inherited-from-global-styles',
		} );
	} );

	test( 'returns the local-override className when hasLocalOverride is set', () => {
		expect( getInheritanceProps( false, true ) ).toEqual( {
			className: 'has-local-override-from-global-styles',
		} );
	} );

	test( 'returns ONLY the local-override className when both flags are passed (mutual exclusion)', () => {
		// A buggy caller could pass both as `true`. The visual
		// contract is mutual exclusion — local-override always wins.
		const result = getInheritanceProps( true, true );
		expect( result.className ).not.toContain(
			'is-inherited-from-global-styles'
		);
		expect( result.className ).toContain(
			'has-local-override-from-global-styles'
		);
	} );

	test( 'coerces truthy/falsy non-boolean inputs', () => {
		// Common pattern: callers pass an undefined or null inherited
		// value that we want to treat as "no local override" rather
		// than letting it slip through as truthy.
		expect( getInheritanceProps( undefined, undefined ) ).toEqual( {} );
		expect( getInheritanceProps( null, null ) ).toEqual( {} );
		expect( getInheritanceProps( '', '' ) ).toEqual( {} );
		// Truthy non-boolean
		expect( getInheritanceProps( 'inherited', 0 ) ).toEqual( {
			className: 'is-inherited-from-global-styles',
		} );
		expect( getInheritanceProps( 0, 'local' ) ).toEqual( {
			className: 'has-local-override-from-global-styles',
		} );
	} );

	test( 'merges a base className with the inherited class hook', () => {
		expect( getInheritanceProps( true, false, 'single-column' ) ).toEqual( {
			className: 'single-column is-inherited-from-global-styles',
		} );
	} );

	test( 'merges a base className with the local-override class hook', () => {
		expect( getInheritanceProps( false, true, 'single-column' ) ).toEqual( {
			className: 'single-column has-local-override-from-global-styles',
		} );
	} );

	test( 'returns just the base className when neither flag is set', () => {
		expect( getInheritanceProps( false, false, 'single-column' ) ).toEqual(
			{
				className: 'single-column',
			}
		);
	} );
} );
