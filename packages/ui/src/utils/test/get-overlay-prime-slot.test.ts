import {
	getOverlayPrimeSlot,
	OVERLAY_PRIME_SLOT_ATTRIBUTE,
	__resetOverlayPrimeSlotCacheForTests,
} from '../get-overlay-prime-slot';

function findSlots(): HTMLElement[] {
	return Array.from(
		document.querySelectorAll< HTMLElement >(
			`[${ OVERLAY_PRIME_SLOT_ATTRIBUTE }]`
		)
	);
}

describe( 'getOverlayPrimeSlot', () => {
	afterEach( () => {
		__resetOverlayPrimeSlotCacheForTests();
		findSlots().forEach( ( el ) => el.remove() );
		delete window.__wpUiOverlayPrimeSlotEnabled;
	} );

	describe( 'flag gating', () => {
		it( 'returns null when the flag is unset', () => {
			expect( getOverlayPrimeSlot() ).toBeNull();
			expect( findSlots() ).toHaveLength( 0 );
		} );

		it( 'returns null when the flag is explicitly false', () => {
			window.__wpUiOverlayPrimeSlotEnabled = false;

			expect( getOverlayPrimeSlot() ).toBeNull();
			expect( findSlots() ).toHaveLength( 0 );
		} );

		it.each( [
			[ '1', 1 ],
			[ "'yes'", 'yes' ],
			[ 'null', null ],
			[ 'undefined', undefined ],
		] )(
			'returns null when the flag is %s (strict-equality gate)',
			( _label, value ) => {
				(
					window as unknown as {
						__wpUiOverlayPrimeSlotEnabled: unknown;
					}
				 ).__wpUiOverlayPrimeSlotEnabled = value;

				expect( getOverlayPrimeSlot() ).toBeNull();
				expect( findSlots() ).toHaveLength( 0 );
			}
		);

		it( 'creates and returns the slot when the flag is true', () => {
			window.__wpUiOverlayPrimeSlotEnabled = true;

			const slot = getOverlayPrimeSlot();

			expect( slot ).not.toBeNull();
			expect( slot ).toBeInstanceOf( HTMLDivElement );
			expect( slot?.parentElement ).toBe( document.body );
			expect( slot?.hasAttribute( OVERLAY_PRIME_SLOT_ATTRIBUTE ) ).toBe(
				true
			);
			expect( findSlots() ).toHaveLength( 1 );
		} );
	} );

	describe( 'singleton caching', () => {
		beforeEach( () => {
			window.__wpUiOverlayPrimeSlotEnabled = true;
		} );

		it( 'returns the same element on repeated calls', () => {
			const first = getOverlayPrimeSlot();
			const second = getOverlayPrimeSlot();
			const third = getOverlayPrimeSlot();

			expect( first ).not.toBeNull();
			expect( second ).toBe( first );
			expect( third ).toBe( first );
			expect( findSlots() ).toHaveLength( 1 );
		} );

		it( 'creates a fresh element when the previous one was removed from the DOM, and re-caches it', () => {
			const first = getOverlayPrimeSlot();
			expect( first ).not.toBeNull();

			first?.remove();
			expect( findSlots() ).toHaveLength( 0 );

			const second = getOverlayPrimeSlot();

			expect( second ).not.toBeNull();
			expect( second ).not.toBe( first );
			expect( second?.isConnected ).toBe( true );
			expect( findSlots() ).toHaveLength( 1 );

			// The recreated element should now be cached: a third call must
			// return it directly without creating a third slot.
			const third = getOverlayPrimeSlot();
			expect( third ).toBe( second );
			expect( findSlots() ).toHaveLength( 1 );
		} );

		it( 'returns null after the flag is cleared, even if a slot was previously created', () => {
			const slot = getOverlayPrimeSlot();
			expect( slot ).not.toBeNull();

			delete window.__wpUiOverlayPrimeSlotEnabled;

			expect( getOverlayPrimeSlot() ).toBeNull();
		} );
	} );

	describe( 'document.body unavailable', () => {
		beforeEach( () => {
			window.__wpUiOverlayPrimeSlotEnabled = true;
		} );

		it( 'returns null without throwing when document.body is missing', () => {
			const realBody = document.body;
			const bodyDescriptor = Object.getOwnPropertyDescriptor(
				Document.prototype,
				'body'
			);

			Object.defineProperty( document, 'body', {
				configurable: true,
				get: () => null,
			} );

			try {
				expect( () => getOverlayPrimeSlot() ).not.toThrow();
				expect( getOverlayPrimeSlot() ).toBeNull();
			} finally {
				if ( bodyDescriptor ) {
					Object.defineProperty( document, 'body', bodyDescriptor );
				} else {
					// jsdom typically defines `body` on Document.prototype; if
					// it isn't present, fall back to deleting the override so
					// `document.body` resolves to the live element again.
					delete ( document as unknown as { body: unknown } ).body;
				}
				expect( document.body ).toBe( realBody );
			}
		} );
	} );

	describe( 'DOM identification', () => {
		beforeEach( () => {
			window.__wpUiOverlayPrimeSlotEnabled = true;
		} );

		it( 'tags the element with the data-wp-overlay-prime attribute (no value)', () => {
			const slot = getOverlayPrimeSlot();

			expect( slot?.getAttribute( OVERLAY_PRIME_SLOT_ATTRIBUTE ) ).toBe(
				''
			);
		} );

		it( 'is discoverable via [data-wp-overlay-prime] selector', () => {
			const slot = getOverlayPrimeSlot();

			expect(
				document.querySelector( `[${ OVERLAY_PRIME_SLOT_ATTRIBUTE }]` )
			).toBe( slot );
		} );

		it( 'appends the slot to the top-level document body (same-origin case)', () => {
			const slot = getOverlayPrimeSlot();

			// jsdom: window.top === window, so window.top?.document === document.
			expect( slot?.ownerDocument ).toBe( document );
			expect( slot?.parentElement ).toBe( document.body );
		} );
	} );
} );
