/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	buildInheritedValue,
	buildInheritedValueMemoized,
	__unstable,
} from '../build-inherited-value';
import {
	InheritedValueProvider,
	useInheritedValue,
} from '../inherited-value-context';
import { globalStylesDataKey } from '../../../store/private-keys';

const {
	isExplicitEmpty,
	isRefObject,
	pickLayerRootContribution,
	pickLayerElementContribution,
	deepMergeDroppingEmpties,
} = __unstable;

jest.mock( '@wordpress/data', () => ( {
	useSelect: jest.fn(),
	useDispatch: jest.fn( () => ( {} ) ),
	useRegistry: jest.fn( () => ( {} ) ),
	createReduxStore: jest.fn(),
	createRegistry: jest.fn(),
	register: jest.fn(),
	select: jest.fn(),
	dispatch: jest.fn(),
	combineReducers: jest.fn( ( reducers ) => reducers ),
	subscribe: jest.fn(),
	RegistryProvider: ( { children } ) => children,
	RegistryConsumer: ( { children } ) => children( {} ),
	AsyncModeProvider: ( { children } ) => children,
	useRegistrySelect: jest.fn(),
	useRegistryDispatch: jest.fn( () => ( {} ) ),
	withSelect: ( mapStateToProps ) => ( Component ) => ( props ) =>
		Component( {
			...props,
			...( mapStateToProps?.( () => ( {} ) ) || {} ),
		} ),
	withDispatch: () => ( Component ) => ( props ) => Component( props ),
	withRegistry: ( Component ) => Component,
} ) );

jest.mock( '../../../store', () => ( {
	store: { name: 'core/block-editor' },
} ) );

// `inherited-value-context.js` imports `store as blocksStore` from
// `@wordpress/blocks` for `useOwnVariation`. The blocks store's transitive
// import chain fails under this file's `@wordpress/data` mock (missing
// `createSelector`), so stub the blocks module with just the shape needed.
jest.mock( '@wordpress/blocks', () => ( {
	store: { name: 'core/blocks' },
} ) );

// Short-circuit the variation-ref resolution path; ref handling is covered
// by dedicated builder tests.
jest.mock( '../../../hooks/block-style-variation', () => ( {
	getVariationStylesWithRefValues: ( gs, blockName, variation ) =>
		gs?.styles?.blocks?.[ blockName ]?.variations?.[ variation ] ?? null,
} ) );
describe( 'buildInheritedValue – pure builder', () => {
	describe( 'internals', () => {
		test( 'isExplicitEmpty drops "", null, {} only', () => {
			expect( isExplicitEmpty( '' ) ).toBe( true );
			expect( isExplicitEmpty( null ) ).toBe( true );
			expect( isExplicitEmpty( {} ) ).toBe( true );
			expect( isExplicitEmpty( 0 ) ).toBe( false );
			expect( isExplicitEmpty( '0' ) ).toBe( false );
			expect( isExplicitEmpty( false ) ).toBe( false );
			expect( isExplicitEmpty( NaN ) ).toBe( false );
			expect( isExplicitEmpty( undefined ) ).toBe( false );
			expect( isExplicitEmpty( [] ) ).toBe( false );
			expect( isExplicitEmpty( { a: 1 } ) ).toBe( false );
		} );

		test( 'isRefObject recognises { ref: "..." } envelopes', () => {
			expect( isRefObject( { ref: 'styles.color.text' } ) ).toBe( true );
			expect( isRefObject( { ref: '' } ) ).toBe( true );
			expect( isRefObject( { ref: 42 } ) ).toBe( false );
			expect( isRefObject( null ) ).toBe( false );
			expect( isRefObject( 'var:preset|color|red' ) ).toBe( false );
		} );

		test( 'pickLayerElementContribution folds element-tag branch', () => {
			const layer = {
				typography: { lineHeight: '1.2' },
				elements: {
					h2: { typography: { fontSize: '32px' } },
				},
			};
			const out = pickLayerElementContribution( layer, 'h2' );
			expect( out ).toEqual( {
				typography: { fontSize: '32px' },
			} );
		} );

		test( 'pickLayerRootContribution preserves elements sub-tree passthrough', () => {
			const layer = {
				typography: { lineHeight: '1.2' },
				elements: {
					h2: { typography: { fontSize: '32px' } },
				},
			};
			const out = pickLayerRootContribution( layer );
			expect( out.typography ).toEqual( { lineHeight: '1.2' } );
			expect( out.elements ).toBe( layer.elements );
		} );

		test( 'pickLayerRootContribution returns null for empty layers', () => {
			expect( pickLayerRootContribution( null ) ).toBeNull();
			expect( pickLayerRootContribution( {} ) ).toBeNull();
			expect( pickLayerRootContribution( [] ) ).toBeNull();
		} );

		test( 'pickLayerElementContribution returns null when no element present', () => {
			expect(
				pickLayerElementContribution(
					{ typography: { lineHeight: '1.2' } },
					'h2'
				)
			).toBeNull();
			expect( pickLayerElementContribution( null, 'h2' ) ).toBeNull();
			expect( pickLayerElementContribution( {}, null ) ).toBeNull();
		} );

		test( 'deepMergeDroppingEmpties resolves refs inline', () => {
			const gs = {
				styles: {
					color: { text: '#cf2e2e' },
				},
			};
			const target = {};
			const source = { color: { text: { ref: 'styles.color.text' } } };
			const out = deepMergeDroppingEmpties( target, source, gs );
			expect( out ).toEqual( { color: { text: '#cf2e2e' } } );
		} );

		test( 'deepMergeDroppingEmpties skips invalid refs', () => {
			const gs = { styles: {} };
			const out = deepMergeDroppingEmpties(
				{ color: { text: '#000' } },
				{ color: { text: { ref: '   ' } } },
				gs
			);
			expect( out ).toEqual( { color: { text: '#000' } } );
		} );

		test( 'deepMergeDroppingEmpties drops explicit-empty source leaves', () => {
			const out = deepMergeDroppingEmpties(
				{ typography: { fontSize: '32px', lineHeight: '1.2' } },
				{ typography: { fontSize: '', lineHeight: null } },
				{}
			);
			expect( out ).toEqual( {
				typography: { fontSize: '32px', lineHeight: '1.2' },
			} );
		} );
	} );

	describe( 'layer precedence', () => {
		const gs = {
			styles: {
				typography: { fontSize: '16px', lineHeight: '1.5' },
				elements: {
					h2: { typography: { fontSize: '24px' } },
				},
				blocks: {
					'core/heading': {
						typography: { fontSize: '28px' },
						elements: {
							h2: { typography: { fontSize: '32px' } },
						},
						variations: {
							plain: {
								typography: {
									fontSize: '20px',
									lineHeight: '1.1',
								},
							},
						},
					},
				},
			},
		};

		test( 'root only (layer 1)', () => {
			const out = buildInheritedValue( {
				blockName: 'core/paragraph',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '16px' );
			expect( out.typography.lineHeight ).toBe( '1.5' );
		} );

		test( 'element layer (layer 2) overrides root for shared leaf', () => {
			const out = buildInheritedValue( {
				blockName: 'core/paragraph',
				element: 'h2',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '24px' );
			expect( out.typography.lineHeight ).toBe( '1.5' );
		} );

		test( 'block-default (layer 3) overrides element + root', () => {
			const out = buildInheritedValue( {
				blockName: 'core/heading',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '28px' );
			expect( out.typography.lineHeight ).toBe( '1.5' );
		} );

		test( "block-element (layer 3') overrides block-default", () => {
			const out = buildInheritedValue( {
				blockName: 'core/heading',
				element: 'h2',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '32px' );
		} );

		test( 'own-variation (layer 4b) wins', () => {
			const out = buildInheritedValue( {
				blockName: 'core/heading',
				ownVariation: 'plain',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '20px' );
			expect( out.typography.lineHeight ).toBe( '1.1' );
		} );
	} );

	describe( 'explicit-empty normalization', () => {
		test( 'empty leaf at block layer lets root win', () => {
			const gs = {
				styles: {
					typography: { fontSize: '16px' },
					blocks: {
						'core/heading': {
							typography: { fontSize: '' },
						},
					},
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/heading',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '16px' );
		} );

		test( 'zero-valued leaf is NOT empty', () => {
			const gs = {
				styles: {
					spacing: { padding: { top: '0' } },
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/group',
				globalStyles: gs,
			} );
			expect( out.spacing.padding.top ).toBe( '0' );
		} );
	} );

	describe( 'hydration + edge cases', () => {
		test( 'falsy globalStyles returns {}', () => {
			expect(
				buildInheritedValue( {
					blockName: 'core/heading',
					globalStyles: null,
				} )
			).toEqual( {} );
			expect(
				buildInheritedValue( {
					blockName: 'core/heading',
					globalStyles: {},
				} )
			).toEqual( {} );
		} );

		test( 'missing blockName returns {}', () => {
			expect(
				buildInheritedValue( {
					globalStyles: {
						styles: { typography: { fontSize: '16px' } },
					},
				} )
			).toEqual( {} );
		} );

		test( 'unknown block still inherits from root', () => {
			const gs = { styles: { typography: { fontSize: '16px' } } };
			const out = buildInheritedValue( {
				blockName: 'core/does-not-exist',
				globalStyles: gs,
			} );
			expect( out.typography.fontSize ).toBe( '16px' );
		} );
	} );

	describe( 'preset passthrough', () => {
		test( 'var:preset| strings are preserved raw for panels to decode', () => {
			const gs = {
				styles: {
					color: { text: 'var:preset|color|vivid-red' },
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/paragraph',
				globalStyles: gs,
			} );
			expect( out.color.text ).toBe( 'var:preset|color|vivid-red' );
		} );

		test( 'var(--wp--preset--...) strings are preserved raw', () => {
			const gs = {
				styles: {
					color: { text: 'var(--wp--preset--color--vivid-red)' },
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/paragraph',
				globalStyles: gs,
			} );
			expect( out.color.text ).toBe(
				'var(--wp--preset--color--vivid-red)'
			);
		} );
	} );

	describe( 'shape contract', () => {
		test( 'tree-structural keys are stripped from root contribution', () => {
			const gs = {
				styles: {
					typography: { fontSize: '16px' },
					blocks: {
						'core/heading': { typography: { fontSize: '28px' } },
					},
					css: ':root { --x: 1; }',
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/heading',
				globalStyles: gs,
			} );
			expect( out ).not.toHaveProperty( 'blocks' );
			expect( out ).not.toHaveProperty( 'variations' );
			expect( out ).not.toHaveProperty( 'css' );
		} );

		test( 'elements sub-tree is preserved for block-scoped element reads', () => {
			const gs = {
				styles: {
					elements: {
						link: { color: { text: '#0073aa' } },
					},
				},
			};
			const out = buildInheritedValue( {
				blockName: 'core/paragraph',
				globalStyles: gs,
			} );
			expect( out.elements.link.color.text ).toBe( '#0073aa' );
		} );
	} );
} );

describe( 'buildInheritedValueMemoized – cache behaviour', () => {
	test( 'returns the same object identity for identical keys', () => {
		const gs = { styles: { typography: { fontSize: '16px' } } };
		const a = buildInheritedValueMemoized( {
			blockName: 'core/paragraph',
			globalStyles: gs,
		} );
		const b = buildInheritedValueMemoized( {
			blockName: 'core/paragraph',
			globalStyles: gs,
		} );
		expect( a ).toBe( b );
	} );

	test( 'different composite key → different result', () => {
		const gs = {
			styles: {
				typography: { fontSize: '16px' },
				elements: { h2: { typography: { fontSize: '24px' } } },
			},
		};
		const a = buildInheritedValueMemoized( {
			blockName: 'core/heading',
			globalStyles: gs,
		} );
		const b = buildInheritedValueMemoized( {
			blockName: 'core/heading',
			element: 'h2',
			globalStyles: gs,
		} );
		expect( a.typography.fontSize ).toBe( '16px' );
		expect( b.typography.fontSize ).toBe( '24px' );
		expect( a ).not.toBe( b );
	} );

	test( 'different globalStyles reference → re-computed', () => {
		const gs1 = { styles: { typography: { fontSize: '16px' } } };
		const gs2 = { styles: { typography: { fontSize: '18px' } } };
		const a = buildInheritedValueMemoized( {
			blockName: 'core/paragraph',
			globalStyles: gs1,
		} );
		const b = buildInheritedValueMemoized( {
			blockName: 'core/paragraph',
			globalStyles: gs2,
		} );
		expect( a.typography.fontSize ).toBe( '16px' );
		expect( b.typography.fontSize ).toBe( '18px' );
		expect( a ).not.toBe( b );
	} );

	test( 'falsy globalStyles delegates to the pure builder', () => {
		const a = buildInheritedValueMemoized( {
			blockName: 'core/paragraph',
			globalStyles: null,
		} );
		expect( a ).toEqual( {} );
	} );
} );

describe( 'useInheritedValue / InheritedValueProvider', () => {
	beforeEach( () => {
		useSelect.mockReset();
	} );

	function Probe( { element } ) {
		const v = useInheritedValue( element ? { element } : undefined );
		return <div data-testid="probe">{ JSON.stringify( v ) }</div>;
	}

	test( 'without Provider, hook returns {}', () => {
		useSelect.mockReturnValue( null );
		render( <Probe /> );
		expect( screen.getByTestId( 'probe' ) ).toHaveTextContent( '{}' );
	} );

	test( 'Provider issues exactly one useSelect subscription per mount', () => {
		// `globalStylesDataKey` holds the BARE merged styles tree in
		// production (see `editor/src/components/provider/
		// use-block-editor-settings.js:237`, `mergedGlobalStyles.styles`),
		// not the wrapped `{ settings, styles }` envelope. The Provider
		// wraps the bare tree before passing to the builder.
		const rawGlobalStyles = {
			typography: { fontSize: '16px' },
			elements: { h2: { typography: { fontSize: '24px' } } },
		};
		useSelect.mockImplementation( ( mapSelect ) =>
			mapSelect( () => ( {
				getSettings: () => ( {
					[ globalStylesDataKey ]: rawGlobalStyles,
				} ),
			} ) )
		);
		// Two panels under one Provider: the useSelect inside the
		// Provider runs once; the Probes consume context only.
		render(
			<InheritedValueProvider blockName="core/heading">
				<Probe element="h2" />
				<Probe />
			</InheritedValueProvider>
		);
		// One useSelect call from the Provider, none from the Probes.
		expect( useSelect ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'hook returns element-folded payload when element is supplied', () => {
		const rawGlobalStyles = {
			typography: { fontSize: '16px' },
			elements: { h2: { typography: { fontSize: '24px' } } },
		};
		useSelect.mockImplementation( ( mapSelect ) =>
			mapSelect( () => ( {
				getSettings: () => ( {
					[ globalStylesDataKey ]: rawGlobalStyles,
				} ),
			} ) )
		);
		render(
			<InheritedValueProvider blockName="core/heading">
				<Probe element="h2" />
			</InheritedValueProvider>
		);
		const parsed = JSON.parse( screen.getByTestId( 'probe' ).textContent );
		expect( parsed.typography.fontSize ).toBe( '24px' );
	} );

	test( 'hook returns {} during hydration (globalStyles not yet present)', () => {
		useSelect.mockImplementation( ( mapSelect ) =>
			mapSelect( () => ( {
				getSettings: () => ( {} ),
			} ) )
		);
		render(
			<InheritedValueProvider blockName="core/heading">
				<Probe />
			</InheritedValueProvider>
		);
		expect( screen.getByTestId( 'probe' ) ).toHaveTextContent( '{}' );
	} );
} );
