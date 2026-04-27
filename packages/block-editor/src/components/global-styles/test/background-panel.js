/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Internal dependencies
 */

import BackgroundPanel, {
	hasBackgroundImageValue,
	hasBackgroundGradientValue,
} from '../background-panel';

describe( 'hasBackgroundImageValue', () => {
	it( 'should return `true` when id and url exist', () => {
		expect(
			hasBackgroundImageValue( {
				background: { backgroundImage: { id: 1, url: 'url' } },
			} )
		).toBe( true );
	} );

	it( 'should return `true` when only url exists', () => {
		expect(
			hasBackgroundImageValue( {
				background: { backgroundImage: { url: 'url' } },
			} )
		).toBe( true );
	} );

	it( 'should return `true` when only id exists', () => {
		expect(
			hasBackgroundImageValue( {
				background: { backgroundImage: { id: 1 } },
			} )
		).toBe( true );
	} );

	it( 'should return `false` when id and url do not exist', () => {
		expect(
			hasBackgroundImageValue( {
				background: { backgroundImage: {} },
			} )
		).toBe( false );
	} );
} );

describe( 'hasBackgroundGradientValue', () => {
	it( 'should return `true` when a gradient string is set', () => {
		expect(
			hasBackgroundGradientValue( {
				background: {
					gradient: 'linear-gradient(135deg, red 0%, blue 100%)',
				},
			} )
		).toBe( true );
	} );

	it( 'should return `true` for a preset slug reference', () => {
		expect(
			hasBackgroundGradientValue( {
				background: { gradient: 'var:preset|gradient|vivid-cyan-blue' },
			} )
		).toBe( true );
	} );

	it( 'should return `false` when gradient is undefined', () => {
		expect( hasBackgroundGradientValue( { background: {} } ) ).toBe(
			false
		);
	} );

	it( 'should return `false` when gradient is an empty string', () => {
		expect(
			hasBackgroundGradientValue( { background: { gradient: '' } } )
		).toBe( false );
	} );

	it( 'should return `false` when background is undefined', () => {
		expect( hasBackgroundGradientValue( {} ) ).toBe( false );
	} );

	it( 'should return `false` when style is undefined', () => {
		expect( hasBackgroundGradientValue( undefined ) ).toBe( false );
	} );
} );

/**
 * Tests background panel inherited-value behavior for gradient, image, and
 * image sub-control slots.
 */

const baseSettings = {
	background: {
		backgroundImage: true,
		backgroundSize: true,
		gradient: true,
	},
	color: {
		gradients: {
			theme: [
				{
					name: 'Purple',
					slug: 'purple-blue',
					gradient:
						'linear-gradient(135deg, rgb(74, 0, 224) 0%, rgb(142, 45, 226) 100%)',
				},
			],
		},
	},
};

describe( 'BackgroundPanel inherited values', () => {
	describe( 'Background gradient slot', () => {
		it( 'applies the at-rest className to the gradient dropdown when local is unset and inherited is defined', () => {
			const inheritedValue = {
				background: {
					gradient:
						'linear-gradient(135deg, rgb(74, 0, 224) 0%, rgb(142, 45, 226) 100%)',
				},
			};

			const { container } = render(
				<BackgroundPanel
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
			expect( dropdown ).toHaveClass( 'is-inherited-placeholder' );
		} );

		it( 'does not apply the at-rest className when a local gradient is set', () => {
			const inheritedValue = {
				background: {
					gradient:
						'linear-gradient(135deg, rgb(74, 0, 224) 0%, rgb(142, 45, 226) 100%)',
				},
			};
			const value = {
				background: {
					gradient:
						'linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)',
				},
			};

			const { container } = render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholder = container.querySelector(
				'.block-editor-tools-panel-color-gradient-settings__dropdown.is-inherited-placeholder'
			);
			expect( placeholder ).toBeNull();
		} );

		it( 'does not commit on mount when at-rest (display-without-commit)', () => {
			const inheritedValue = {
				background: {
					gradient:
						'linear-gradient(135deg, rgb(74, 0, 224) 0%, rgb(142, 45, 226) 100%)',
				},
			};
			const onChange = jest.fn();

			render(
				<BackgroundPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();
		} );

		it( 'falls back to legacy color.gradient inherited path when background.gradient is unset', () => {
			const inheritedValue = {
				color: {
					gradient:
						'linear-gradient(135deg, rgb(74, 0, 224) 0%, rgb(142, 45, 226) 100%)',
				},
			};

			const { container } = render(
				<BackgroundPanel
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
			expect( dropdown ).toHaveClass( 'is-inherited-placeholder' );
		} );
	} );

	describe( 'Background image slot', () => {
		it( 'marks the inspector container as at-rest when local has no image but inherited does (no size support — bare picker path)', () => {
			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
						title: 'inherited.jpg',
						source: 'theme',
					},
				},
			};

			// Theme without backgroundSize / backgroundPosition /
			// backgroundRepeat support takes the bare-picker path
			// inside `BackgroundImagePanel` (the inner one in
			// `background-image-control/index.js`). The container
			// `<div>` carries the placeholder class directly.
			const settingsNoSize = {
				background: {
					backgroundImage: true,
					backgroundSize: false,
				},
			};
			const { container } = render(
				<BackgroundPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ settingsNoSize }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholderWrapper = container.querySelector(
				'.block-editor-global-styles-background-panel__inspector-media-replace-container.is-inherited-placeholder'
			);
			expect( placeholderWrapper ).not.toBeNull();
		} );

		it( 'marks the dropdown wrapper as at-rest when size support is enabled and local image is unset', () => {
			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
						title: 'inherited.jpg',
						source: 'theme',
					},
				},
			};

			const { container } = render(
				<BackgroundPanel
					value={ {} }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// In the dropdown path (`shouldShowBackgroundImageControls`
			// is true), `BackgroundControlsPanel` renders the
			// `Dropdown` whose wrapping `<div>` receives the
			// `is-inherited-placeholder` class.
			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const dropdownWrappers = container.querySelectorAll(
				'.is-inherited-placeholder'
			);
			expect( dropdownWrappers.length ).toBeGreaterThan( 0 );
		} );

		it( 'does not apply the at-rest className when a local image is set', () => {
			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
					},
				},
			};
			const value = {
				background: {
					backgroundImage: {
						id: 2,
						url: 'http://example.com/local.jpg',
					},
				},
			};

			const settingsImageOnly = {
				background: {
					backgroundImage: true,
					backgroundSize: false,
				},
			};
			const { container } = render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ settingsImageOnly }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholderWrapper = container.querySelector(
				'.is-inherited-placeholder'
			);
			expect( placeholderWrapper ).toBeNull();
		} );

		it( 'does not apply the at-rest className when local explicitly removes the image (sentinel "none")', () => {
			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
					},
				},
			};
			const value = {
				background: {
					backgroundImage: 'none',
				},
			};

			const settingsImageOnly = {
				background: {
					backgroundImage: true,
					backgroundSize: false,
				},
			};
			const { container } = render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ settingsImageOnly }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
			const placeholderWrapper = container.querySelector(
				'.is-inherited-placeholder'
			);
			expect( placeholderWrapper ).toBeNull();
		} );

		it( 'does not commit on mount when at-rest (display-without-commit)', () => {
			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
					},
				},
			};
			const onChange = jest.fn();

			render(
				<BackgroundPanel
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

	describe( 'Background image inner sub-controls', () => {
		it( 'marks the size, repeat, attachment and focal point sub-controls as at-rest when each value comes purely from inherited', async () => {
			const user = userEvent.setup();

			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
						title: 'inherited.jpg',
					},
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
					backgroundAttachment: 'fixed',
					backgroundPosition: '25% 75%',
				},
			};
			// Local has the same image so the dropdown opens (image
			// controls render only when an image value exists in
			// either local or inherited; opening exposes the inner
			// sub-controls, which are placeholder because their
			// local backgroundSize / backgroundRepeat /
			// backgroundAttachment / backgroundPosition are all
			// undefined).
			const value = {
				background: {
					backgroundImage: {
						id: 2,
						url: 'http://example.com/local.jpg',
						title: 'local.jpg',
					},
				},
			};

			render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			// Open the popover by clicking the size/position/repeat
			// dropdown toggle. The popover renders in a portal so
			// querying must happen on `document.body` rather than
			// the rendered container.
			const toggle = screen.getByRole( 'button', {
				name: /background size, position and repeat options/i,
			} );
			await user.click( toggle );

			// Focal point picker container marked at-rest.
			// eslint-disable-next-line testing-library/no-node-access
			const focalPoint = document.body.querySelector(
				'.block-editor-global-styles-background-panel__focal-point.is-inherited-placeholder'
			);
			expect( focalPoint ).not.toBeNull();

			// Size ToggleGroupControl wrapper marked at-rest.
			// eslint-disable-next-line testing-library/no-node-access
			const sizeToggleGroup = document.body.querySelector(
				'.components-toggle-group-control.is-inherited-placeholder'
			);
			expect( sizeToggleGroup ).not.toBeNull();

			// Background image width UnitControl marked at-rest.
			// eslint-disable-next-line testing-library/no-node-access
			const widthUnitControl = document.body.querySelector(
				'.components-unit-control-wrapper.is-inherited-placeholder, .components-input-control.is-inherited-placeholder'
			);
			expect( widthUnitControl ).not.toBeNull();

			// At least two ToggleControls (Fixed background, Repeat)
			// marked at-rest.
			// eslint-disable-next-line testing-library/no-node-access
			const toggles = document.body.querySelectorAll(
				'.components-toggle-control.is-inherited-placeholder'
			);
			expect( toggles.length ).toBeGreaterThanOrEqual( 2 );
		} );

		it( 'does not mark sub-controls as at-rest when a local value is supplied', async () => {
			const user = userEvent.setup();

			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
					},
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
					backgroundAttachment: 'fixed',
					backgroundPosition: '25% 75%',
				},
			};
			const value = {
				background: {
					backgroundImage: {
						id: 2,
						url: 'http://example.com/local.jpg',
					},
					// All sub-control values set locally.
					backgroundSize: 'contain',
					backgroundRepeat: 'repeat',
					backgroundAttachment: 'scroll',
					backgroundPosition: '50% 50%',
				},
			};

			render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);

			const toggle = screen.getByRole( 'button', {
				name: /background size, position and repeat options/i,
			} );
			await user.click( toggle );

			// No focal-point at-rest, no toggle-group at-rest, no
			// repeat/fixed toggle at-rest.
			// eslint-disable-next-line testing-library/no-node-access
			const innerPlaceholders = document.body.querySelectorAll(
				'.block-editor-global-styles-background-panel__focal-point.is-inherited-placeholder, .components-toggle-group-control.is-inherited-placeholder, .components-toggle-control.is-inherited-placeholder'
			);
			expect( innerPlaceholders.length ).toBe( 0 );
		} );

		it( 'does not commit on mount or popover open when at-rest (display-without-commit, sub-controls)', async () => {
			const user = userEvent.setup();

			const inheritedValue = {
				background: {
					backgroundImage: {
						id: 1,
						url: 'http://example.com/inherited.jpg',
					},
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
					backgroundAttachment: 'fixed',
					backgroundPosition: '25% 75%',
				},
			};
			const value = {
				background: {
					backgroundImage: {
						id: 2,
						url: 'http://example.com/local.jpg',
					},
				},
			};
			const onChange = jest.fn();

			render(
				<BackgroundPanel
					value={ value }
					inheritedValue={ inheritedValue }
					settings={ baseSettings }
					onChange={ onChange }
					panelId="test-panel"
				/>
			);

			expect( onChange ).not.toHaveBeenCalled();

			// Opening the popover renders the inner sub-controls;
			// none of their value-prop reads must result in a
			// commit (display-without-commit invariant).
			const toggle = screen.getByRole( 'button', {
				name: /background size, position and repeat options/i,
			} );
			await user.click( toggle );

			expect( onChange ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'shape regression', () => {
		it( 'returns null when no controls are enabled', () => {
			const { container } = render(
				<BackgroundPanel
					value={ {} }
					inheritedValue={ {} }
					settings={ {
						background: {
							backgroundImage: false,
							gradient: false,
						},
					} }
					onChange={ () => {} }
					panelId="test-panel"
				/>
			);
			expect( container ).toBeEmptyDOMElement();
		} );
	} );
} );
