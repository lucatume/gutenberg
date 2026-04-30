import styles from './css/overlay-prime-slot.module.css';

/**
 * Attribute that identifies the overlay prime slot DOM element. Used as the
 * architectural marker for cross-tooling discovery; styling is delivered via
 * the CSS-module class on the same element.
 *
 * Exported for tests and other in-package callers; not re-exported from the
 * package entry point. Treat it as an internal constant rather than a public
 * API symbol.
 */
export const OVERLAY_PRIME_SLOT_ATTRIBUTE = 'data-wp-overlay-prime';

/**
 * Resolves the document that should own the prime slot. Cross-iframe handling:
 * if `window.top` is same-origin, the slot lives in the top-level document
 * (so a `@wordpress/ui` overlay rendered inside the editor canvas iframe
 * still portals out to the editor's top-level body, where it can stack above
 * `@wordpress/components` overlays). If `window.top` is cross-origin (rare,
 * but accessing `.document` would throw) or otherwise unreachable, fall back
 * to the local document.
 *
 * Note: the cross-origin `try/catch` and the cross-document re-resolution it
 * enables are best-effort defenses. They aren't exercised by the unit tests
 * because jsdom only provides one document with `window.top === window`.
 * They're shaped to fail safe (return the local document) rather than to be
 * provably correct in every embedding scenario.
 */
function resolveTopDocument(): Document | null {
	if ( typeof document === 'undefined' ) {
		return null;
	}
	try {
		return window.top?.document ?? document;
	} catch {
		return document;
	}
}

/**
 * Cached reference to the prime slot. Revalidated on each call against the
 * current top document and the slot's connection state, so a stale reference
 * from a previous top document (e.g. test cleanup tearing down jsdom) or an
 * externally-detached element doesn't get returned. Single variable rather
 * than a Map: in practice there's only ever one top document worth caching
 * for.
 */
let cachedSlot: HTMLDivElement | null = null;

function createSlot( ownerDocument: Document ): HTMLDivElement {
	const element = ownerDocument.createElement( 'div' );
	element.setAttribute( OVERLAY_PRIME_SLOT_ATTRIBUTE, '' );
	if ( styles.slot ) {
		element.classList.add( styles.slot );
	}
	ownerDocument.body.appendChild( element );
	return element;
}

/**
 * Returns the body-level overlay prime slot element when Gutenberg has opted
 * in via `window.__wpUiOverlayPrimeSlotEnabled`, lazily creating it on first
 * call. Returns `null` for external `@wordpress/ui` consumers (no flag set),
 * which leaves Base UI's default portal container in effect.
 *
 * The slot is a single `<div data-wp-overlay-prime>` appended to the
 * top-level document's body, with `position: fixed; top: 0; left: 0;
 * z-index: 1000000003; isolation: isolate;` (see the co-located CSS module
 * for why each value is what it is). It exists so that `@wordpress/ui` leaf
 * overlays (Tooltip, Select, Combobox, Autocomplete, Menu) reliably stack
 * above `@wordpress/components` overlays in mixed-library compositions
 * without per-instance plumbing.
 *
 * Subsequent calls return the same element. If the element has been removed
 * from the DOM (e.g. by an unrelated script or a test teardown) it is
 * recreated transparently on the next call.
 *
 * A plain function — rather than a React hook — is appropriate because:
 * - The window flag is set once at shell module init and doesn't change at
 *   runtime, so there's no React state to subscribe to.
 * - The slot creation is synchronous DOM manipulation
 *   (`document.body.appendChild`), so no `useLayoutEffect` timing is needed.
 * - The same function shape works in any context (render or non-render).
 *
 * Wired into leaf overlays as `props.portal ?? getOverlayPrimeSlot()` in a
 * follow-up; not yet consumed by any overlay in this PR.
 */
export function getOverlayPrimeSlot(): HTMLDivElement | null {
	if ( typeof window === 'undefined' ) {
		return null;
	}
	if ( window.__wpUiOverlayPrimeSlotEnabled !== true ) {
		return null;
	}

	const ownerDocument = resolveTopDocument();
	// `document.body` can be null if the helper is called before `<body>` has
	// been parsed (e.g. from a `<script>` placed in `<head>` ahead of body).
	// Bail in that case rather than throwing in `createSlot`'s `appendChild`;
	// callers fall through to Base UI's default container, which is the same
	// no-op behavior as when the flag is unset.
	if ( ! ownerDocument || ! ownerDocument.body ) {
		return null;
	}

	if (
		cachedSlot &&
		cachedSlot.ownerDocument === ownerDocument &&
		cachedSlot.isConnected
	) {
		return cachedSlot;
	}

	// If the cached slot still belongs to a (different) document that owns it,
	// detach it before replacing the cache so we don't leave an orphaned slot
	// in a document we no longer manage. Slots that are already disconnected
	// (e.g. removed by a test or by external code in the same document) need
	// no cleanup here.
	if ( cachedSlot?.isConnected ) {
		cachedSlot.remove();
	}

	cachedSlot = createSlot( ownerDocument );
	return cachedSlot;
}

/**
 * Test-only escape hatch that drops the cached singleton so a fresh element
 * is created on the next `getOverlayPrimeSlot()` call. Not part of the
 * public package API.
 */
export function __resetOverlayPrimeSlotCacheForTests(): void {
	cachedSlot = null;
}
