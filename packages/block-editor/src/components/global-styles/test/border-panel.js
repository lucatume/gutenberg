/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Internal dependencies
 */
import BorderPanel from '../border-panel';

/**
 * Tests the per-control placeholder pattern in `BorderPanel` for border
 * radius, border, and shadow controls.
 */

const settingsAll = {
	border: {
		color: true,
		radius: true,
		style: true,
		width: true,
	},
	shadow: {
		defaultPresets: true,
		presets: {
			default: [
				{
					name: 'Soft',
					slug: 'soft',
					shadow: '0 4px 8px rgba(0,0,0,0.1)',
				},
				{
					name: 'Hard',
					slug: 'hard',
					shadow: '0 8px 16px rgba(0,0,0,0.2)',
				},
			],
		},
	},
};

describe( 'BorderPanel — per-control placeholder pattern', () => {
	describe( 'Border radius (input archetype)', () => {
		it( 'renders an inherited string radius as placeholder when local is empty', () => {
			const inheritedValue = { border: { radius: '8px' } };

			render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			const radiusInput = screen.getByRole( 'spinbutton', {
				name: /border radius/i,
			} );
			expect( radiusInput ).toHaveValue( null );
			expect( radiusInput ).toHaveAttribute( 'placeholder', '8px' );
			expect(
				// eslint-disable-next-line testing-library/no-node-access
				radiusInput.closest( '.is-inherited-placeholder' )
			).not.toBeNull();
		} );

		it( 'renders a locally-set radius as the value with no placeholder', () => {
			const inheritedValue = { border: { radius: '8px' } };
			const value = { border: { radius: '12px' } };

			render(
				<BorderPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			const radiusInput = screen.getByRole( 'spinbutton', {
				name: /border radius/i,
			} );
			expect( radiusInput ).toHaveValue( 12 );
			expect( radiusInput ).not.toHaveAttribute( 'placeholder' );
			expect(
				// eslint-disable-next-line testing-library/no-node-access
				radiusInput.closest( '.is-inherited-placeholder' )
			).toBeNull();
		} );

		it( 'does not invoke onChange on mount when only an inherited radius is present (display-without-commit)', () => {
			const onChange = jest.fn();
			const inheritedValue = { border: { radius: '8px' } };

			render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();
		} );

		it( 'commits a typed local radius override without copying any inherited values', async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			const inheritedValue = {
				border: { radius: '8px' },
				shadow: 'var:preset|shadow|soft',
			};

			render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			const radiusInput = screen.getByRole( 'spinbutton', {
				name: /border radius/i,
			} );
			await user.type( radiusInput, '20' );

			expect( onChange ).toHaveBeenCalled();
			const lastCall = onChange.mock.calls.at( -1 )[ 0 ];
			expect( lastCall?.border?.radius ).toBeDefined();
			expect( lastCall?.shadow ).toBeUndefined();
		} );
	} );

	describe( 'Border box (compound archetype)', () => {
		it( 'applies the at-rest className to BorderBoxControl when local is unset and inherited is defined', () => {
			const inheritedValue = {
				border: {
					color: '#000000',
					style: 'solid',
					width: '1px',
				},
			};

			const { container } = render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// The class lands on the outer BorderBoxControl wrapper,
			// which wraps the `Border` ToolsPanelItem content.
			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholderRoots = container.querySelectorAll(
				'.is-inherited-placeholder'
			);
			// One for BorderBoxControl, none for BorderRadius (no
			// inherited radius in this test), none for ShadowPopover.
			expect( placeholderRoots.length ).toBeGreaterThanOrEqual( 1 );
		} );

		it( 'does not apply the at-rest className when a local border is defined', () => {
			const inheritedValue = {
				border: {
					color: '#000000',
					style: 'solid',
					width: '1px',
					radius: '8px',
				},
			};
			const value = {
				border: {
					color: '#ff0000',
					style: 'dashed',
					width: '2px',
					radius: '12px',
				},
			};

			const { container } = render(
				<BorderPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// No is-inherited-placeholder anywhere in the panel.
			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholderRoots = container.querySelectorAll(
				'.is-inherited-placeholder'
			);
			expect( placeholderRoots ).toHaveLength( 0 );
		} );

		it( 'does not invoke onChange on mount when only an inherited border is present', () => {
			const onChange = jest.fn();
			const inheritedValue = {
				border: {
					color: '#000000',
					style: 'solid',
					width: '1px',
				},
			};

			render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'Shadow (popover-trigger archetype)', () => {
		it( 'applies the at-rest className to the shadow Dropdown wrapper when local is unset and inherited is defined', () => {
			const inheritedValue = {
				shadow: 'var:preset|shadow|soft',
			};

			const { container } = render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const dropdown = container.querySelector(
				'.block-editor-global-styles__shadow-dropdown'
			);
			expect( dropdown ).not.toBeNull();
			expect( dropdown ).toHaveClass( 'is-inherited-placeholder' );
		} );

		it( 'does not apply the at-rest className when a local shadow is set', () => {
			const inheritedValue = {
				shadow: 'var:preset|shadow|soft',
			};
			const value = { shadow: 'var:preset|shadow|hard' };

			const { container } = render(
				<BorderPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const dropdown = container.querySelector(
				'.block-editor-global-styles__shadow-dropdown'
			);
			expect( dropdown ).not.toBeNull();
			expect( dropdown ).not.toHaveClass( 'is-inherited-placeholder' );
		} );

		it( 'does not invoke onChange on mount when only an inherited shadow is present', () => {
			const onChange = jest.fn();
			const inheritedValue = {
				shadow: 'var:preset|shadow|soft',
			};

			render(
				<BorderPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsAll }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();
		} );
	} );
} );
