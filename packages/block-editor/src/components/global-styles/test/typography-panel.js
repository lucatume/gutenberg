/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * Internal dependencies
 */
import TypographyPanel from '../typography-panel';

/** @typedef {import('../types').InheritedValue} InheritedValue */

/**
 * Task 1 round-trip tests for the `inheritedValue` prop on `TypographyPanel`.
 *
 * The panel is the canonical consumer of the `InheritedValue` shape defined
 * in `../types.ts`. These tests assert that a representative `InheritedValue`
 * payload — the one Task 2's builder will produce — flows through to the
 * rendered controls without being mutated or dropped.
 *
 * Phase 0 findings that pin the contract:
 * - Step B verified the four-layer merge (root, element, block-default,
 *   own-variation) produces exactly the shape below.
 * - Step C verified this shape can be built cheaply (~1.4 µs cold,
 *   ~0.14 µs warm per call).
 * - Step E verified preset values are decoded via `getValueFromVariable`
 *   before placement, so panels receive the displayable form.
 *
 * The tests intentionally target the simplest round-trip path per control
 * archetype rather than full panel coverage; comprehensive panel-render
 * tests are slotted for Task 9.
 */

const baseSettings = {
	typography: {
		lineHeight: true,
		textColumns: true,
		fontSize: true,
		customFontSize: true,
		fontSizes: {
			theme: [
				{ slug: 'large', size: '24px', name: 'Large' },
				{ slug: 'huge', size: '42px', name: 'Huge' },
			],
		},
	},
};

describe( 'TypographyPanel — inheritedValue round-trip', () => {
	it( 'renders a numeric leaf from `inheritedValue` when `value` is empty', () => {
		/** @type {InheritedValue} */
		const inheritedValue = {
			typography: { lineHeight: '1.7' },
		};

		render(
			<TypographyPanel
				value={ {} }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		const lineHeightInput = screen.getByLabelText( /line height/i );
		expect( lineHeightInput ).toHaveValue( 1.7 );
	} );

	it( 'renders an integer leaf from `inheritedValue` when `value` is empty', () => {
		/** @type {InheritedValue} */
		const inheritedValue = {
			typography: { textColumns: 3 },
		};

		render(
			<TypographyPanel
				value={ {} }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		const columnsInput = screen.getByLabelText( /columns/i );
		expect( columnsInput ).toHaveValue( 3 );
	} );

	it( 'displays `inheritedValue` for a leaf even when `value` also defines it (merged builder is the source of truth for display)', () => {
		// Task 2's builder composes `inheritedValue` from merged Global
		// Styles AT the block layer — so when a local override exists,
		// the builder includes it in `inheritedValue` already. This test
		// verifies the panel unconditionally displays `inheritedValue`,
		// per the Step B architecture: panels are display-only consumers
		// of `inheritedValue` and never read from `value` for their
		// rendered state.
		/** @type {InheritedValue} */
		const inheritedValue = {
			typography: { lineHeight: '2.2' },
		};
		const value = {
			typography: { lineHeight: '1.4' },
		};

		render(
			<TypographyPanel
				value={ value }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		expect( screen.getByLabelText( /line height/i ) ).toHaveValue( 2.2 );
	} );

	it( 'falls back to `value` when `inheritedValue` is omitted (pre-feature behaviour is preserved)', () => {
		// The `inheritedValue = value` default keeps every call site that
		// has not yet been updated (Task 3) on the exact pre-feature code
		// path. No placeholder, no regression.
		render(
			<TypographyPanel
				value={ { typography: { lineHeight: '1.9' } } }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		expect( screen.getByLabelText( /line height/i ) ).toHaveValue( 1.9 );
	} );

	it( 'renders nothing for a leaf when both `value` and `inheritedValue` omit it', () => {
		render(
			<TypographyPanel
				value={ {} }
				inheritedValue={ {} }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		// An empty NumberControl input has no `value` attribute applied;
		// RTL returns `null` (not `0`, not the empty string) for that case.
		expect( screen.getByLabelText( /line height/i ) ).toHaveValue( null );
	} );

	it( 'accepts a `var:preset|font-size|…` leaf in `inheritedValue` without throwing', () => {
		// Step E's 47-case matrix covered preset-decoding correctness in
		// isolation (see `notes/step-e/round-trip.test.js`). Here we only
		// assert that the panel accepts the preset-shaped `InheritedValue`
		// contract at its prop boundary and renders the Font size control.
		// The decoded value flows through the panel's internal
		// `decodeValue` pipe into `FontSizePicker`; the visible
		// representation of a selected preset is owned by that component
		// and is not part of the `inheritedValue` contract.
		/** @type {InheritedValue} */
		const inheritedValue = {
			typography: { fontSize: 'var:preset|font-size|large' },
		};

		expect( () => {
			render(
				<TypographyPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);
		} ).not.toThrow();

		// The Font size ToolsPanelItem label is rendered in the DOM.
		expect( screen.getAllByText( /font size/i ).length ).toBeGreaterThan(
			0
		);
	} );
} );
