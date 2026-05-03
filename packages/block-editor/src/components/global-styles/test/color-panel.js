/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Internal dependencies
 */
import ColorPanel from '../color-panel';

/**
 * Tests for the inherited Global Styles label treatment in `ColorPanel`.
 * The visual treatment lands on the parent `ToolsPanelItem` of each color slot via the
 * `.is-inherited-from-global-styles` /
 * `.has-local-override-from-global-styles` class hooks. The inner
 * `Dropdown` carries no special className for inheritance state.
 *
 * The panel renders one `ColorPanelDropdown` per top-level slot
 * (text / background / link / element-scoped colors); each dropdown
 * has one or more `ColorPanelTab`s exposing `ColorGradientControl`.
 * The `ColorPanelTab.onChange` interceptor remains in place so clicking the active inherited swatch commits
 * the inherited value to local rather than clearing the slot.
 */

const baseSettings = {
	color: {
		text: true,
		background: true,
		link: true,
		heading: false,
		button: false,
		caption: false,
		defaultPalette: true,
		palette: {
			default: [
				{ name: 'Red', slug: 'red', color: '#ff0000' },
				{ name: 'Blue', slug: 'blue', color: '#0000ff' },
			],
		},
	},
};

describe( 'ColorPanel — inherited Global Styles label treatment', () => {
	describe( 'Text color', () => {
		it( 'applies the inherited-label className when local is unset and inherited is defined', () => {
			const inheritedValue = { color: { text: '#ff0000' } };

			const { container } = render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const dropdown = container.querySelector(
				'.block-editor-tools-panel-color-gradient-settings__dropdown'
			);
			expect( dropdown ).not.toBeNull();
			expect(
				// eslint-disable-next-line testing-library/no-node-access
				dropdown.closest( '.is-inherited-from-global-styles' )
			).not.toBeNull();
		} );

		it( 'applies the local-override className when a local text color is set', () => {
			const inheritedValue = { color: { text: '#ff0000' } };
			const value = { color: { text: '#0000ff' } };

			const { container } = render(
				<ColorPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const inheritedItems = container.querySelectorAll(
				'.is-inherited-from-global-styles'
			);
			// Background and Link items have no inherited value here,
			// so neither carries the inherited class. Text has a local
			// value, so it doesn't either.
			expect( inheritedItems ).toHaveLength( 0 );

			// And the local-override class is present at least once
			// (on the Text slot's ToolsPanelItem).
			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const overrideItems = container.querySelectorAll(
				'.has-local-override-from-global-styles'
			);
			expect( overrideItems.length ).toBeGreaterThanOrEqual( 1 );
		} );

		it( 'does not invoke onChange on mount when only inherited colors are present (display-without-commit)', () => {
			const onChange = jest.fn();
			const inheritedValue = {
				color: { text: '#ff0000', background: '#00ff00' },
				elements: { link: { color: { text: '#0000ff' } } },
			};

			render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'Background color', () => {
		it( 'applies the inherited-label className when only inherited background is defined', () => {
			const inheritedValue = {
				color: { background: '#00ff00' },
			};

			const { container } = render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const inheritedItems = container.querySelectorAll(
				'.is-inherited-from-global-styles'
			);
			// Only the Background slot should carry the inherited
			// class; Text and Link have no inherited value.
			expect( inheritedItems ).toHaveLength( 1 );
		} );

		it( 'applies the local-override className when local background overrides the inherited', () => {
			const inheritedValue = {
				color: { background: '#00ff00' },
			};
			const value = { color: { background: '#aaaaaa' } };

			const { container } = render(
				<ColorPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const inheritedItems = container.querySelectorAll(
				'.is-inherited-from-global-styles'
			);
			expect( inheritedItems ).toHaveLength( 0 );

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const overrideItems = container.querySelectorAll(
				'.has-local-override-from-global-styles'
			);
			expect( overrideItems.length ).toBeGreaterThanOrEqual( 1 );
		} );

		it( 'opens a multi-tab dropdown on the tab with only an inherited value', async () => {
			const user = userEvent.setup();
			const inheritedValue = {
				color: {
					gradient:
						'linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)',
				},
			};

			render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ {
						...baseSettings,
						color: {
							...baseSettings.color,
							gradients: {
								default: [
									{
										name: 'Red to blue',
										slug: 'red-to-blue',
										gradient:
											'linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)',
									},
								],
							},
							defaultGradients: true,
						},
					} }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			const trigger = screen.getByRole( 'button', {
				name: /background/i,
			} );
			await user.click( trigger );

			expect(
				screen.getByRole( 'tab', { selected: true } )
			).toHaveTextContent( 'Gradient' );
		} );
	} );

	describe( 'Link color', () => {
		it( 'applies the inherited-label className when inherited link is defined and local link is fully unset', () => {
			const inheritedValue = {
				elements: { link: { color: { text: '#0000ff' } } },
			};

			const { container } = render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const inheritedItems = container.querySelectorAll(
				'.is-inherited-from-global-styles'
			);
			expect( inheritedItems ).toHaveLength( 1 );
		} );

		it( 'applies the local-override className when local link.text is set', () => {
			const inheritedValue = {
				elements: { link: { color: { text: '#0000ff' } } },
			};
			const value = {
				elements: { link: { color: { text: '#aaaaaa' } } },
			};

			const { container } = render(
				<ColorPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const inheritedItems = container.querySelectorAll(
				'.is-inherited-from-global-styles'
			);
			expect( inheritedItems ).toHaveLength( 0 );

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const overrideItems = container.querySelectorAll(
				'.has-local-override-from-global-styles'
			);
			expect( overrideItems.length ).toBeGreaterThanOrEqual( 1 );
		} );
	} );

	describe( 'Display-without-commit behavior', () => {
		it( 'commits the inherited value when the user clicks the active swatch at-rest', async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			const inheritedValue = {
				color: { text: '#ff0000' },
			};

			render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			// Open the Text dropdown.
			const trigger = screen.getByRole( 'button', {
				name: /text/i,
			} );
			await user.click( trigger );

			// `ColorPalette` renders the swatches as buttons whose
			// accessible name is the color name. At-rest, the inherited
			// red swatch is the selected one; clicking it must commit
			// `local = inherited`, not clear local.
			const redSwatch = screen.getByRole( 'option', {
				name: /red/i,
			} );
			await user.click( redSwatch );

			expect( onChange ).toHaveBeenCalled();
			const last = onChange.mock.calls.at( -1 )[ 0 ];
			// The interceptor commits the inherited
			// value (encoded as the `red` preset slug).
			expect( last?.color?.text ).toBe( 'var:preset|color|red' );
		} );

		it( 'commits a different swatch as the local value (normal commit path)', async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			const inheritedValue = {
				color: { text: '#ff0000' },
			};

			render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			const trigger = screen.getByRole( 'button', {
				name: /text/i,
			} );
			await user.click( trigger );

			const blueSwatch = screen.getByRole( 'option', {
				name: /blue/i,
			} );
			await user.click( blueSwatch );

			expect( onChange ).toHaveBeenCalled();
			const last = onChange.mock.calls.at( -1 )[ 0 ];
			expect( last?.color?.text ).toBe( 'var:preset|color|blue' );
		} );

		it( 'opens the dropdown without committing (display-without-commit)', async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			const inheritedValue = {
				color: { text: '#ff0000' },
			};

			render(
				<ColorPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			const trigger = screen.getByRole( 'button', {
				name: /text/i,
			} );
			await user.click( trigger );

			// Popover is open — but no commit until the user picks
			// a swatch.
			expect( onChange ).not.toHaveBeenCalled();
		} );
	} );
} );
