/**
 * WordPress dependencies
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import type { ReactNode } from 'react';

/**
 * Internal dependencies
 */
import {
	CropperProvider,
	useCropperState,
	type UseCropperStateReturn,
} from '../../image-editor';
import { useHistory } from '../../image-editor/react/hooks/use-history';
import {
	buildModifiers,
	type Modifier,
} from '../media-editor-modal/build-modifiers';

export interface ImageEditingSessionImage {
	src: string;
	width: number;
	height: number;
}

export interface ImageEditingAdjustments {
	brightness: number;
	contrast: number;
	saturation: number;
	grayscale: number;
}

export const DEFAULT_IMAGE_EDITING_ADJUSTMENTS: ImageEditingAdjustments = {
	brightness: 1,
	contrast: 1,
	saturation: 1,
	grayscale: 0,
};

type HistoryDomain = 'cropper' | 'adjustments';

function areImagesEqual(
	a: ImageEditingSessionImage | null,
	b: ImageEditingSessionImage | null
): boolean {
	return (
		a?.src === b?.src && a?.width === b?.width && a?.height === b?.height
	);
}

function areAdjustmentsEqual(
	a: ImageEditingAdjustments,
	b: ImageEditingAdjustments
): boolean {
	return (
		a.brightness === b.brightness &&
		a.contrast === b.contrast &&
		a.saturation === b.saturation &&
		a.grayscale === b.grayscale
	);
}

export interface ImageEditingSession {
	/** Original image source loaded into the current session. */
	sourceImage: ImageEditingSessionImage | null;
	/** Current image source being edited by the image session. */
	workingImage: ImageEditingSessionImage | null;
	/** Low-level cropper controller. */
	cropper: UseCropperStateReturn;
	/** Image adjustment values applied to the current working image. */
	adjustments: ImageEditingAdjustments;
	/** Replace the source image and reset dependent image edits. */
	setSourceImage: ( image: ImageEditingSessionImage | null ) => void;
	/** Set one image adjustment value. */
	setAdjustment: < K extends keyof ImageEditingAdjustments >(
		key: K,
		value: ImageEditingAdjustments[ K ]
	) => void;
	/** Reset image adjustments to their defaults. */
	resetAdjustments: () => void;
	/** Whether the image session has unsaved image edits. */
	isDirty: boolean;
	/** Whether the session contains preview edits that are not saveable yet. */
	hasPreviewOnlyEdits: boolean;
	/** Whether the image session has undo history. */
	hasUndo: boolean;
	/** Whether the image session has redo history. */
	hasRedo: boolean;
	/** Undo the last image session edit. */
	undo: () => void;
	/** Redo the last undone image session edit. */
	redo: () => void;
	/** Reset the current image edits. */
	reset: () => void;
	/** Commit any pending continuous edit to history. */
	commitHistory: () => void;
	/** Build the Core REST media edit modifiers for the current image state. */
	buildSaveModifiers: () => Modifier[];
}

const ImageEditingSessionContext = createContext<
	ImageEditingSession | undefined
>( undefined );

export function ImageEditingSessionProvider( {
	children,
}: {
	children: ReactNode;
} ) {
	const cropper = useCropperState();
	const setCropperImage = cropper.setImage;
	const [ sourceImage, setSourceImageState ] =
		useState< ImageEditingSessionImage | null >( null );
	const [ adjustments, setAdjustments ] = useState< ImageEditingAdjustments >(
		DEFAULT_IMAGE_EDITING_ADJUSTMENTS
	);
	const lastEditedDomainRef = useRef< HistoryDomain | null >( null );
	const lastUndoneDomainRef = useRef< HistoryDomain | null >( null );

	const {
		hasUndo: hasAdjustmentsUndo,
		hasRedo: hasAdjustmentsRedo,
		pushHistory: pushAdjustmentsHistory,
		commitHistory: commitAdjustmentsHistory,
		undo: undoAdjustments,
		redo: redoAdjustments,
		suppressNextChange: suppressNextAdjustmentsChange,
		clearHistory: clearAdjustmentsHistory,
	} = useHistory( {
		state: adjustments,
		isEqual: areAdjustmentsEqual,
		onApplyState: setAdjustments,
		debounceMs: 300,
	} );

	const areAdjustmentsDirty = ! areAdjustmentsEqual(
		adjustments,
		DEFAULT_IMAGE_EDITING_ADJUSTMENTS
	);

	useEffect( () => {
		if ( cropper.isDirty ) {
			lastEditedDomainRef.current = 'cropper';
		}
	}, [ cropper.isDirty, cropper.state ] );

	const setSourceImage = useCallback(
		( image: ImageEditingSessionImage | null ) => {
			if ( areImagesEqual( sourceImage, image ) ) {
				return;
			}
			setSourceImageState( image );
			setAdjustments( DEFAULT_IMAGE_EDITING_ADJUSTMENTS );
			clearAdjustmentsHistory( DEFAULT_IMAGE_EDITING_ADJUSTMENTS );
			setCropperImage(
				image
					? {
							src: image.src,
							naturalWidth: image.width,
							naturalHeight: image.height,
					  }
					: null
			);
		},
		[ clearAdjustmentsHistory, setCropperImage, sourceImage ]
	);

	const setAdjustment = useCallback(
		< K extends keyof ImageEditingAdjustments >(
			key: K,
			value: ImageEditingAdjustments[ K ]
		) => {
			lastEditedDomainRef.current = 'adjustments';
			lastUndoneDomainRef.current = null;
			setAdjustments( ( current ) =>
				current[ key ] === value
					? current
					: { ...current, [ key ]: value }
			);
		},
		[]
	);

	const resetAdjustments = useCallback( () => {
		if ( ! areAdjustmentsDirty ) {
			return;
		}
		commitAdjustmentsHistory();
		pushAdjustmentsHistory();
		suppressNextAdjustmentsChange();
		lastEditedDomainRef.current = 'adjustments';
		lastUndoneDomainRef.current = null;
		setAdjustments( DEFAULT_IMAGE_EDITING_ADJUSTMENTS );
	}, [
		areAdjustmentsDirty,
		commitAdjustmentsHistory,
		pushAdjustmentsHistory,
		suppressNextAdjustmentsChange,
	] );

	const commitHistory = useCallback( () => {
		cropper.commitHistory();
		commitAdjustmentsHistory();
	}, [ commitAdjustmentsHistory, cropper ] );

	const undo = useCallback( () => {
		commitHistory();
		if (
			lastEditedDomainRef.current === 'adjustments' &&
			hasAdjustmentsUndo
		) {
			undoAdjustments();
			lastUndoneDomainRef.current = 'adjustments';
			lastEditedDomainRef.current = cropper.hasUndo ? 'cropper' : null;
			return;
		}
		if ( cropper.hasUndo ) {
			cropper.undo();
			lastUndoneDomainRef.current = 'cropper';
			lastEditedDomainRef.current = hasAdjustmentsUndo
				? 'adjustments'
				: null;
			return;
		}
		if ( hasAdjustmentsUndo ) {
			undoAdjustments();
			lastUndoneDomainRef.current = 'adjustments';
		}
	}, [ commitHistory, cropper, hasAdjustmentsUndo, undoAdjustments ] );

	const redo = useCallback( () => {
		if (
			lastUndoneDomainRef.current === 'adjustments' &&
			hasAdjustmentsRedo
		) {
			redoAdjustments();
			lastEditedDomainRef.current = 'adjustments';
			return;
		}
		if ( lastUndoneDomainRef.current === 'cropper' && cropper.hasRedo ) {
			cropper.redo();
			lastEditedDomainRef.current = 'cropper';
			return;
		}
		if ( cropper.hasRedo ) {
			cropper.redo();
			lastEditedDomainRef.current = 'cropper';
			return;
		}
		if ( hasAdjustmentsRedo ) {
			redoAdjustments();
			lastEditedDomainRef.current = 'adjustments';
		}
	}, [ cropper, hasAdjustmentsRedo, redoAdjustments ] );

	const reset = useCallback( () => {
		cropper.reset();
		resetAdjustments();
	}, [ cropper, resetAdjustments ] );

	const workingImage = sourceImage;

	const buildSaveModifiers = useCallback( () => {
		if ( ! cropper.isDirty || ! workingImage ) {
			return [];
		}
		return buildModifiers( cropper.state, {
			width: workingImage.width,
			height: workingImage.height,
		} );
	}, [ cropper.isDirty, cropper.state, workingImage ] );

	const session = useMemo< ImageEditingSession >(
		() => ( {
			sourceImage,
			workingImage,
			cropper,
			adjustments,
			setSourceImage,
			setAdjustment,
			resetAdjustments,
			isDirty: cropper.isDirty || areAdjustmentsDirty,
			hasPreviewOnlyEdits: areAdjustmentsDirty,
			hasUndo: cropper.hasUndo || hasAdjustmentsUndo,
			hasRedo: cropper.hasRedo || hasAdjustmentsRedo,
			undo,
			redo,
			reset,
			commitHistory,
			buildSaveModifiers,
		} ),
		[
			adjustments,
			areAdjustmentsDirty,
			cropper,
			commitHistory,
			hasAdjustmentsRedo,
			hasAdjustmentsUndo,
			redo,
			reset,
			resetAdjustments,
			setAdjustment,
			setSourceImage,
			sourceImage,
			undo,
			workingImage,
			buildSaveModifiers,
		]
	);

	return (
		<ImageEditingSessionContext.Provider value={ session }>
			<CropperProvider value={ cropper }>{ children }</CropperProvider>
		</ImageEditingSessionContext.Provider>
	);
}

export function useImageEditingSession(): ImageEditingSession {
	const context = useContext( ImageEditingSessionContext );
	if ( ! context ) {
		throw new Error(
			'useImageEditingSession must be used within ImageEditingSessionProvider.'
		);
	}
	return context;
}
