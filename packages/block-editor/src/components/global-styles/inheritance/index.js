/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import {
	Button,
	Dropdown,
	MenuGroup,
	MenuItem,
	NavigableMenu,
	Tooltip,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import {
	createPortal,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Returns props to spread onto a wrapping `<InheritanceToolsPanelItem>`
 * so its descendant label picks up the inherited-from-Global-Styles
 * visual treatment.
 *
 * When `isInherited` is true without a local override, the descendant
 * label text is tinted and the wrapped control receives the standard
 * "Inherited from Global Styles" tooltip.
 *
 * When `hasLocalOverride` is true, a small dropdown trigger is portaled
 * into the visible label and exposes a "Reset to inherited value" action.
 *
 * The two states are mutually exclusive at the source. If both are passed,
 * only the local-override class is returned.
 *
 * Returned object shape allows direct spread:
 *
 *     <InheritanceToolsPanelItem
 *         { ...getInheritanceProps( isInherited, hasLocalOverride ) }
 *         label={ __( 'Line height' ) }
 *         …
 *     >
 *
 * @param {boolean}             isInherited      Control is inheriting at rest.
 * @param {boolean}             hasLocalOverride Local override is set AND
 *                                               there is an inherited value
 *                                               being overridden.
 * @param {string|Array|Object} [baseClassName]  Optional className(s) to fold
 *                                               into the returned `className`.
 *
 * @return {{ className?: string }} Props for the wrapping
 *                                  `InheritanceToolsPanelItem`.
 */
export function getInheritanceProps(
	isInherited,
	hasLocalOverride,
	baseClassName
) {
	const inheritedOnly = !! isInherited && ! hasLocalOverride;
	const className = clsx( baseClassName, {
		'is-inherited-from-global-styles': inheritedOnly,
		'has-local-override-from-global-styles': !! hasLocalOverride,
	} );
	return className ? { className } : {};
}

/**
 * Renders the small blue-dot toggle and its dropdown menu. Used by
 * `<InheritanceToolsPanelItem>` and not exported standalone.
 *
 * Built on the lower-level `<Dropdown>` rather than `<DropdownMenu>`
 * so we have complete control over the trigger markup. The trigger
 * is a `<Button>` with the dot `<span>` as its only child — no
 * `icon` prop is set, so `Button` does not interfere with the
 * rendered children.
 *
 * @param {Object}   props
 * @param {Function} props.onResetToInherited Reset handler.
 *
 * @return {Element} The dot menu.
 */
function InheritanceDot( { onResetToInherited } ) {
	return (
		<Dropdown
			className="has-local-override-from-global-styles__menu"
			contentClassName="has-local-override-from-global-styles__menu-content"
			popoverProps={ { placement: 'bottom-start' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				// Intentionally small (14×14) circular trigger; exempt
				// from the 40px default-size enforcement rule.
				// eslint-disable-next-line @wordpress/components-no-missing-40px-size-prop
				<Button
					__next40pxDefaultSize={ false }
					aria-haspopup="menu"
					aria-expanded={ isOpen }
					aria-label={ __( 'Local override options' ) }
					className="has-local-override-from-global-styles__toggle"
					onClick={ ( event ) => {
						// Prevent the click from reaching any wrapping
						// `<label htmlFor>` association, which would
						// otherwise focus/activate the inner control.
						event.preventDefault();
						event.stopPropagation();
						onToggle();
					} }
				>
					<span
						aria-hidden="true"
						className="has-local-override-from-global-styles__dot"
					/>
				</Button>
			) }
			renderContent={ ( { onClose } ) => (
				<NavigableMenu role="menu">
					<MenuGroup>
						<MenuItem
							onClick={ () => {
								onClose();
								onResetToInherited?.();
							} }
						>
							{ __( 'Reset to inherited value' ) }
						</MenuItem>
					</MenuGroup>
				</NavigableMenu>
			) }
		/>
	);
}

/**
 * Helper that portals the dot menu into the panel item's visible
 * label so the dot sits inline with the label text rather than
 * floating in the panel item's box.
 *
 * Mounts a hidden sentinel `<span>` whose `parentElement` is the
 * `ToolsPanelItem` content wrapper. From the sentinel we run a
 * `querySelector` for the supported label selectors and create a
 * portal targeting the first match. The label DOM node may be
 * replaced by the inner control on re-render, so we re-query on
 * every render and only call `setState` when the target changes
 * (referential equality through `Object.is`, so React skips the
 * re-render when stable).
 *
 * @param {Object}   props
 * @param {Function} props.onResetToInherited Reset handler forwarded to the
 *                                            dot menu.
 *
 * @return {Element} The sentinel span plus a portaled dot menu.
 */
function PortaledInheritanceDot( { onResetToInherited } ) {
	const sentinelRef = useRef( null );
	const [ labelEl, setLabelEl ] = useState( null );

	useLayoutEffect( () => {
		const sentinel = sentinelRef.current;
		if ( ! sentinel ) {
			return;
		}
		// `parentElement` is the `ToolsPanelItem` content wrapper. Scope
		// the lookup so we don't match label elements outside this
		// panel item.
		const scope = sentinel.parentElement;
		if ( ! scope ) {
			return;
		}
		const target = scope.querySelector(
			'.components-base-control__label, .block-editor-panel-color-gradient-settings__color-name'
		);
		setLabelEl( target ?? null );

		// Watch for label DOM replacement when the inner control
		// re-renders (e.g. on value change). Only observe direct
		// child changes within this panel item — cheap and bounded.
		const observer = new window.MutationObserver( () => {
			const next = scope.querySelector(
				'.components-base-control__label, .block-editor-panel-color-gradient-settings__color-name'
			);
			setLabelEl( ( prev ) => ( prev === next ? prev : next ?? null ) );
		} );
		observer.observe( scope, { childList: true, subtree: true } );
		return () => observer.disconnect();
	}, [] );

	return (
		<>
			<span
				ref={ sentinelRef }
				aria-hidden="true"
				style={ { display: 'none' } }
			/>
			{ labelEl &&
				createPortal(
					<InheritanceDot
						onResetToInherited={ onResetToInherited }
					/>,
					labelEl
				) }
		</>
	);
}

/**
 * Drop-in replacement for `<ToolsPanelItem>` that automatically wires
 * the inherited-from-Global-Styles visual treatment and the
 * local-override interactive menu (blue dot + dropdown).
 *
 * Panels swap `<ToolsPanelItem>` for `<InheritanceToolsPanelItem>` and
 * keep the existing `{ ...getInheritanceProps( a, b ) }` spread. The
 * wrapper detects the inheritance state by inspecting the spread
 * `className` so the call site does not need to repeat the booleans.
 *
 * The reset action wired into the override menu calls `onDeselect`,
 * which is the same callback `ToolsPanel` uses for its native
 * "Reset" menu item — so the override menu reset re-uses the existing
 * `attributesResetAllFilter` pipeline and yields a single
 * `setAttributes` undo step.
 *
 * @param {Object}   props
 * @param {string}   [props.className] ClassName forwarded to ToolsPanelItem.
 * @param {string}   props.label       Visible label.
 * @param {Function} props.onDeselect  Reset handler.
 * @param {Element}  props.children    Inner control.
 *
 * @return {Element} The wrapped ToolsPanelItem.
 */
export function InheritanceToolsPanelItem( {
	className,
	label,
	onDeselect,
	children,
	...rest
} ) {
	const isInherited = !! className?.includes(
		'is-inherited-from-global-styles'
	);
	const hasLocalOverride = !! className?.includes(
		'has-local-override-from-global-styles'
	);

	const wrapped = isInherited ? (
		<Tooltip text={ __( 'Inherited from Global Styles' ) }>
			<div className="global-styles-inheritance-tooltip-anchor">
				{ children }
			</div>
		</Tooltip>
	) : (
		children
	);

	return (
		<ToolsPanelItem
			className={ className }
			label={ label }
			onDeselect={ onDeselect }
			{ ...rest }
		>
			{ wrapped }
			{ hasLocalOverride && (
				<PortaledInheritanceDot onResetToInherited={ onDeselect } />
			) }
		</ToolsPanelItem>
	);
}
