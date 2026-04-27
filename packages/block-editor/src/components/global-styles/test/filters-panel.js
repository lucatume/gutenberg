/**
 * External dependencies
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Internal dependencies
 */
import FiltersPanel from '../filters-panel';

/**
 * Tests inherited duotone behavior for the Filters panel.
 */

const baseSettings = {
	color: {
		customDuotone: true,
		defaultDuotone: true,
		duotone: {
			default: [
				{
					name: 'Black and white',
					slug: 'black-and-white',
					colors: [ '#000000', '#ffffff' ],
				},
				{
					name: 'Purple and yellow',
					slug: 'purple-and-yellow',
					colors: [ '#8c00b7', '#fcff41' ],
				},
			],
		},
		palette: {
			default: [
				{ name: 'Black', slug: 'black', color: '#000000' },
				{ name: 'White', slug: 'white', color: '#ffffff' },
			],
		},
	},
};

describe( 'FiltersPanel inherited values', () => {
	it( 'applies the at-rest className to the dropdown when local duotone is unset and inherited is defined', () => {
		const inheritedValue = {
			filter: { duotone: [ '#000000', '#ffffff' ] },
		};

		const { container } = render(
			<FiltersPanel
				value={ {} }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
		const dropdown = container.querySelector(
			'.block-editor-global-styles-filters-panel__dropdown'
		);
		expect( dropdown ).not.toBeNull();
		expect( dropdown ).toHaveClass( 'is-inherited-placeholder' );
	} );

	it( 'does not apply the at-rest className when local duotone is set', () => {
		const inheritedValue = {
			filter: { duotone: [ '#000000', '#ffffff' ] },
		};
		const value = {
			filter: { duotone: [ '#8c00b7', '#fcff41' ] },
		};

		const { container } = render(
			<FiltersPanel
				value={ value }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ () => {} }
				panelId="test-panel"
			/>
		);

		// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
		const dropdown = container.querySelector(
			'.block-editor-global-styles-filters-panel__dropdown'
		);
		expect( dropdown ).not.toHaveClass( 'is-inherited-placeholder' );
	} );

	it( 'does not invoke onChange on mount when only inherited duotone is present (display-without-commit)', () => {
		const onChange = jest.fn();
		const inheritedValue = {
			filter: { duotone: [ '#000000', '#ffffff' ] },
		};

		render(
			<FiltersPanel
				value={ {} }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ onChange }
				panelId="test-panel"
			/>
		);

		expect( onChange ).not.toHaveBeenCalled();
	} );

	it( 'commits the inherited value when the user clicks the preselected duotone preset', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		const inheritedValue = {
			filter: { duotone: [ '#000000', '#ffffff' ] },
		};

		const { container } = render(
			<FiltersPanel
				value={ {} }
				inheritedValue={ inheritedValue }
				settings={ baseSettings }
				onChange={ onChange }
				panelId="test-panel"
			/>
		);

		// Open the duotone dropdown.
		// eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
		const toggle = container.querySelector(
			'.block-editor-global-styles-filters-panel__dropdown-toggle'
		);
		expect( toggle ).not.toBeNull();
		await user.click( toggle );

		// The popover content is portalled to `document.body`, so it
		// is queried directly. The `DuotonePicker` is rendered with
		// `value={ duotone }` where `duotone` resolves to the inherited
		// value at-rest, so the matching preset has
		// `aria-selected="true"` (the picker is a `role="listbox"`).
		// eslint-disable-next-line testing-library/no-node-access
		const presetButton = document.body.querySelector(
			'.components-circular-option-picker__option[aria-selected="true"]'
		);
		expect( presetButton ).not.toBeNull();
		await user.click( presetButton );

		// The interceptor commits the inherited duotone value rather
		// than clearing the slot.
		expect( onChange ).toHaveBeenCalledTimes( 1 );
		const lastCallArg = onChange.mock.calls[ 0 ][ 0 ];
		expect( lastCallArg?.filter?.duotone ).toEqual( [
			'#000000',
			'#ffffff',
		] );
	} );

	it( 'does not invoke onChange on mount when a local duotone is set (no spurious commit)', () => {
		const onChange = jest.fn();
		const value = {
			filter: { duotone: [ '#8c00b7', '#fcff41' ] },
		};

		render(
			<FiltersPanel
				value={ value }
				inheritedValue={ value }
				settings={ baseSettings }
				onChange={ onChange }
				panelId="test-panel"
			/>
		);

		expect( onChange ).not.toHaveBeenCalled();
	} );
} );
