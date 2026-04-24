/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useId } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { InheritedValueDescription } from '../';

describe( 'InheritedValueDescription', () => {
	function ControlledDescription() {
		const id = useId();
		return <InheritedValueDescription id={ id } />;
	}

	test( 'renders the inherited-value text with the documented class', () => {
		render( <ControlledDescription /> );
		const description = screen.getByText( 'Inherited value' );
		expect( description ).toBeInTheDocument();
		expect( description ).toHaveClass(
			'block-editor-inherited-value-description'
		);
		// The id is allocated by useId so we cannot match it literally,
		// but the element must carry one for callers to point
		// `aria-describedby` at it.
		expect( description.id ).toBeTruthy();
	} );

	test( 'wires aria-describedby to the consumer when used as documented', () => {
		// Sanity check the documented usage pattern: a control's
		// aria-describedby points at this description's id.
		function ControlledExample() {
			const id = useId();
			return (
				<>
					<input
						type="text"
						aria-label="Padding"
						aria-describedby={ id }
						placeholder="16"
					/>
					<InheritedValueDescription id={ id } />
				</>
			);
		}
		render( <ControlledExample /> );
		const input = screen.getByRole( 'textbox' );
		expect( input ).toHaveAccessibleDescription( 'Inherited value' );
	} );
} );
