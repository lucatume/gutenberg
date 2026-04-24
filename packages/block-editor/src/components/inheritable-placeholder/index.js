/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Visually-hidden description element used to communicate to screen
 * readers that a control's displayed value is inherited from Global
 * Styles rather than locally set on the block.
 *
 * Intended use: a control panel renders this element next to a control
 * that is in placeholder state and points the control's
 * `aria-describedby` attribute at the element's id. Controls with a
 * native `placeholder` slot (text/number/unit inputs) get a
 * placeholder hint announced by most screen readers automatically;
 * this helper is the equivalent surface for non-input controls and an
 * additional clarifier for inputs whose placeholder text alone is
 * ambiguous.
 *
 * Usage:
 * ```jsx
 * import { useId } from '@wordpress/element';
 * import { InheritedValueDescription } from '../inheritable-placeholder';
 *
 * function MyControl( { isPlaceholder, ...props } ) {
 *     const descriptionId = useId();
 *     return (
 *         <>
 *             <SomeControl
 *                 { ...props }
 *                 aria-describedby={
 *                     isPlaceholder ? descriptionId : undefined
 *                 }
 *             />
 *             { isPlaceholder && (
 *                 <InheritedValueDescription id={ descriptionId } />
 *             ) }
 *         </>
 *     );
 * }
 * ```
 *
 * @param {Object} props
 * @param {string} props.id DOM id the consumer wires into the
 *                          control's `aria-describedby` attribute.
 *                          Typically generated with `useId()`.
 */
export function InheritedValueDescription( { id } ) {
	return (
		<span id={ id } className="block-editor-inherited-value-description">
			{ __( 'Inherited value' ) }
		</span>
	);
}
