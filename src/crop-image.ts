import { SharpWrapper } from './sharp-wrapper.js';
import type {
	CropImageArgs,
	PayloadRequest,
	ProbedImageSize,
	SanitizedConfig,
	UploadEdits,
	WithMetadata,
} from './types.js';
import { percentToPixel } from './utils/percent-to-pixel.js';
import { optionallyAppendMetadata } from './utils/optionally-append-metadata.js';
import { readFile } from "fs/promises";

/**
 * Crop image based on crop data and dimensions
 */
export async function cropImage({
	cropData,
	dimensions,
	file: fileArg,
	heightInPixels,
	req,
	sharp,
	widthInPixels,
	withMetadata,
}: CropImageArgs): Promise<{ data: Buffer; info: { height: number; size: number; width: number } }> {
	try {
		const { x, y } = cropData!;
		if (!fileArg) {
			throw new Error('File is required for crop operation');
		}
		const file = fileArg;
		const fileIsAnimatedType = ['image/avif', 'image/gif', 'image/webp'].includes(file.mimetype);

		const { height: originalHeight, width: originalWidth } = dimensions;
		const newWidth = Number(widthInPixels);
		const newHeight = Number(heightInPixels);
		const dimensionsChanged = originalWidth !== newWidth || originalHeight !== newHeight;

		if (!dimensionsChanged) {
			let adjustedHeight = originalHeight;

			if (fileIsAnimatedType) {
				// image-js has limited animated support
				// For now, we'll treat animated images as single frames
				const wrapper = new SharpWrapper(file.tempFilePath ? await readFile(file.tempFilePath!) : file.data);
				const animatedMetadata = await wrapper.metadata();
				adjustedHeight = animatedMetadata.pages ? animatedMetadata.height! : originalHeight;
			}

			return {
				data: file.data,
				info: {
					height: adjustedHeight,
					size: file.size,
					width: originalWidth,
				},
			};
		}

		const formattedCropData = {
			height: Number(heightInPixels),
			left: percentToPixel(x, dimensions.width),
			top: percentToPixel(y, dimensions.height),
			width: Number(widthInPixels),
		};

		const input = file.tempFilePath
			? await import('fs/promises').then((fs) => fs.readFile(file.tempFilePath!))
			: file.data;

		let cropped = new SharpWrapper(input);
		if (fileIsAnimatedType) {
			// Note: image-js has limited animated support
			// This may only process the first frame
		}

		cropped = cropped.extract(formattedCropData);

		cropped = await optionallyAppendMetadata({
			req: req!,
			sharpFile: cropped,
			withMetadata: withMetadata!,
		});

		const result = await cropped.toBuffer({
			resolveWithObject: true,
		});

		if ('data' in result && 'info' in result) {
			return {
				data: result.data,
				info: {
					height: result.info.height,
					size: result.info.size,
					width: result.info.width,
				},
			};
		}

		throw new Error('Unexpected result format from toBuffer');
	} catch (error) {
		console.error(`Error cropping image:`, error);
		throw error;
	}
}

