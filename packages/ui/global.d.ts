// When typeRoots is set in tsconfig, TypeScript only includes
// type definitions found in the specified directories.
// To ensure that global types are included, we need to
// explicitly reference them here.
import '@testing-library/jest-dom';

declare global {
	interface Window {
		/**
		 * Opt-in flag for the `@wordpress/ui` overlay prime slot. When set
		 * to `true` (typically by Gutenberg shell entries during their
		 * first executable line), `getOverlayPrimeSlot()` lazy-creates and
		 * returns a body-level positioned container into which leaf
		 * overlays (Tooltip, Select, Combobox, Autocomplete, Menu) portal.
		 * When unset or `false`, the helper returns `null` and Base UI's
		 * default portal container is used (preserving today's behavior
		 * for external `@wordpress/ui` consumers).
		 */
		__wpUiOverlayPrimeSlotEnabled?: boolean;
	}
}
