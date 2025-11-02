import { SharpWrapper } from './sharp-wrapper.js';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import sanitize from 'sanitize-filename';
import type {
	Collection,
	SanitizedCollectionConfig,
	SanitizedConfig,
	PayloadRequest,
	PayloadFile,
	ProbedImageSize,
	FileData,
	FileToSave,
	UploadEdits,
	WithMetadata,
	OutputInfo,
} from './types.js';
import { canResizeImage } from './utils/can-resize-image.js';
import { isImage } from './utils/is-image.js';
import { getImageSize } from './utils/get-image-size.js';
import { optionallyAppendMetadata } from './utils/optionally-append-metadata.js';
import { cropImage } from './crop-image.js';
import { resizeAndTransformImageSizes } from './resize-and-transform.js';

type Args<T> = {
	collection: { config: Collection['config'] };
	config: SanitizedConfig;
	data: T;
	isDuplicating?: boolean;
	operation: 'create' | 'update';
	originalDoc?: T;
	overwriteExistingFiles?: boolean;
	req: PayloadRequest;
	throwOnMissingFile?: boolean;
};

type Result<T> = Promise<{
	data: T;
	files: FileToSave[];
}>;

/**
 * Determine if reupload is needed based on upload edits
 */
const shouldReupload = (uploadEdits: UploadEdits, fileData: Record<string, unknown> | undefined): boolean => {
	if (!fileData) {
		return false;
	}

	if (uploadEdits.crop || uploadEdits.heightInPixels || uploadEdits.widthInPixels) {
		return true;
	}

	// Since uploadEdits always has focalPoint, compare to the value in the data if it was changed
	if (uploadEdits.focalPoint) {
		const incomingFocalX = uploadEdits.focalPoint.x;
		const incomingFocalY = uploadEdits.focalPoint.y;
		const currentFocalX = 'focalX' in fileData && fileData.focalX;
		const currentFocalY = 'focalY' in fileData && fileData.focalY;

		const isEqual = incomingFocalX === currentFocalX && incomingFocalY === currentFocalY;
		return !isEqual;
	}

	return false;
};

/**
 * Parse upload edits from req or incoming data
 */
function parseUploadEditsFromReqOrIncomingData(args: {
	data: unknown;
	isDuplicating?: boolean;
	operation: 'create' | 'update';
	originalDoc: unknown;
	req: PayloadRequest;
}): UploadEdits {
	const { data, isDuplicating, operation, originalDoc, req } = args;

	// Get intended focal point change from query string or incoming data
	const uploadEdits: UploadEdits =
		req.query?.uploadEdits && typeof req.query.uploadEdits === 'object'
			? (req.query.uploadEdits as UploadEdits)
			: {};

	if (uploadEdits.focalPoint) {
		return uploadEdits;
	}

	const incomingData = data as FileData;
	const origDoc = originalDoc as FileData;

	if (origDoc && 'focalX' in origDoc && 'focalY' in origDoc) {
		// If no change in focal point, return undefined.
		// This prevents a refocal operation triggered from admin, because it always sends the focal point.
		if (incomingData.focalX === origDoc.focalX && incomingData.focalY === origDoc.focalY) {
			return {} as UploadEdits;
		}

		if (isDuplicating) {
			uploadEdits.focalPoint = {
				x: incomingData?.focalX || origDoc.focalX!,
				y: incomingData?.focalY || origDoc.focalY!,
			};
		}
	}

	if (incomingData?.focalX && incomingData?.focalY) {
		uploadEdits.focalPoint = {
			x: incomingData.focalX,
			y: incomingData.focalY,
		};
		return uploadEdits;
	}

	// If no focal point is set, default to center
	if (operation === 'create') {
		uploadEdits.focalPoint = {
			x: 50,
			y: 50,
		};
	}

	return uploadEdits;
}

/**
 * Get safe file name, checking for conflicts
 */
const getSafeFileName = async (args: {
	collectionSlug: string;
	desiredFilename: string;
	req: PayloadRequest;
	staticPath: string;
}): Promise<string> => {
	const { desiredFilename, staticPath } = args;
	const { fileExists } = await import('./utils/file-exists.js');

	let counter = 0;
	let fsSafeName = desiredFilename;
	const baseName = fsSafeName.substring(0, fsSafeName.lastIndexOf('.')) || fsSafeName;
	const extension = fsSafeName.substring(fsSafeName.lastIndexOf('.')) || '';

	while (await fileExists(`${staticPath}/${fsSafeName}`)) {
		counter++;
		fsSafeName = `${baseName}-${counter}${extension}`;
	}

	return fsSafeName;
};

/**
 * Check file restrictions
 */
const checkFileRestrictions = async (args: {
	collection: SanitizedCollectionConfig;
	file: PayloadFile;
	req: PayloadRequest;
}): Promise<void> => {
	// Implement file restriction checking if needed
	// For now, just return
};

/**
 * Get file by path
 */
const getFileByPath = async (filePath: string): Promise<PayloadFile> => {
	const buffer = await fs.readFile(filePath);
	const stats = await fs.stat(filePath);
	const ext = filePath.split('.').pop()?.toLowerCase() || '';

	const mimeTypes: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		webp: 'image/webp',
		gif: 'image/gif',
	};

	return {
		data: buffer,
		mimetype: mimeTypes[ext] || 'application/octet-stream',
		size: stats.size,
		name: filePath.split('/').pop() || 'unknown',
	};
};

/**
 * Generate file data from uploaded file
 */
export const generateFileData = async <T>({
	collection: { config: collectionConfig },
	data,
	isDuplicating,
	operation,
	originalDoc,
	overwriteExistingFiles,
	req,
	throwOnMissingFile,
}: Args<T>): Result<T> => {
	if (!collectionConfig.upload) {
		return {
			data,
			files: [],
		};
	}

	const { sharp } = req.payload?.config || {};
	let file = req.file;

	const uploadEdits = parseUploadEditsFromReqOrIncomingData({
		data,
		isDuplicating,
		operation,
		originalDoc,
		req,
	});

	const {
		constructorOptions,
		disableLocalStorage,
		focalPoint: focalPointEnabled = true,
		formatOptions,
		imageSizes,
		resizeOptions,
		staticDir,
		trimOptions,
		withMetadata,
	} = collectionConfig.upload;

	const staticPath = staticDir;
	const incomingFileData = isDuplicating ? originalDoc : data;

	if (
		!file &&
		(isDuplicating || shouldReupload(uploadEdits, incomingFileData as Record<string, unknown>))
	) {
		const { filename, url } = incomingFileData as unknown as FileData;
		if (filename && (filename.includes('../') || filename.includes('..\\'))) {
			throw new Error('Invalid filename');
		}

		try {
			if (url && url.startsWith('/') && !disableLocalStorage) {
				const filePath = `${staticPath}/${filename}`;
				const response = await getFileByPath(filePath);
				file = response;
				overwriteExistingFiles = true;
			} else if (filename && url) {
				// External file handling would go here
				// For now, throw an error
				throw new Error('External file retrieval not implemented');
			}
		} catch (err: unknown) {
			throw new Error(`File retrieval error: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	if (isDuplicating) {
		overwriteExistingFiles = false;
	}

	if (!file) {
		if (throwOnMissingFile) {
			throw new Error('Missing file');
		}
		return {
			data,
			files: [],
		};
	}

	await checkFileRestrictions({
		collection: collectionConfig,
		file,
		req,
	});

	if (!disableLocalStorage) {
		await fs.mkdir(staticPath!, { recursive: true });
	}

	let newData = data;
	const filesToSave: FileToSave[] = [];
	const fileData: Partial<FileData> = {};

	const fileIsAnimatedType = ['image/avif', 'image/gif', 'image/webp'].includes(file.mimetype);
	const cropData = typeof uploadEdits === 'object' && 'crop' in uploadEdits ? uploadEdits.crop : undefined;

	try {
		const fileSupportsResize = canResizeImage(file.mimetype);
		let fsSafeName: string;
		let sharpFile: SharpWrapper | undefined;
		let dimensions: ProbedImageSize | undefined;
		let fileBuffer: { data: Buffer; info: OutputInfo } | undefined;
		let ext: string | undefined;
		let mime: string;

		const fileHasAdjustments =
			fileSupportsResize &&
			Boolean(resizeOptions || formatOptions || trimOptions || constructorOptions || file.tempFilePath);

		const sharpOptions = { ...constructorOptions };

		if (fileIsAnimatedType) {
			sharpOptions.animated = true;
		}

		if (sharp && (fileIsAnimatedType || fileHasAdjustments)) {
			const input = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;

			sharpFile = new SharpWrapper(input, sharpOptions);
			sharpFile = sharpFile.rotate(); // Auto-orient

			if (fileHasAdjustments) {
				if (resizeOptions) {
					sharpFile = await sharpFile.resize(resizeOptions);
				}

				if (formatOptions) {
					const format = formatOptions.format === 'avif' ? 'png' : formatOptions.format;
					sharpFile = sharpFile.toFormat(format as 'png' | 'jpeg' | 'webp', formatOptions.options as Record<string, unknown>);
				}

				if (trimOptions) {
					sharpFile = sharpFile.trim(trimOptions);
				}
			}
		}

		if (fileSupportsResize || isImage(file.mimetype)) {
			dimensions = await getImageSize(file);
			fileData.width = dimensions.width;
			fileData.height = dimensions.height;
		}

		if (sharpFile) {
			const metadata = await sharpFile.metadata();
			sharpFile = await optionallyAppendMetadata({
				req,
				sharpFile,
				withMetadata: withMetadata!,
			});

			const result = await sharpFile.toBuffer({ resolveWithObject: true });

			if (!('data' in result) || !('info' in result)) {
				throw new Error('Unexpected result format from toBuffer');
			}

			fileBuffer = result;
			const mimeInfo = await fileTypeFromBuffer(result.data);
			({ ext } = (mimeInfo || { ext: 'png' }) as { ext: string });
			mime = mimeInfo?.mime || file.mimetype;

			fileData.width = result.info.width;
			fileData.height = result.info.height;
			fileData.filesize = result.info.size;

			// Animated GIFs + WebP aggregate the height from every frame, so we need to use divide by number of pages
			if (metadata.pages) {
				fileData.height = result.info.height / metadata.pages;
				fileData.filesize = result.data.length;
			}
		} else {
			mime = file.mimetype;
			fileData.filesize = file.size;
			if (file.name.includes('.')) {
				ext = file.name.split('.').pop()?.split('?')[0];
			} else {
				ext = '';
			}
		}

		// Adjust SVG mime type. fromBuffer modifies it.
		if (mime === 'application/xml' && ext === 'svg') {
			mime = 'image/svg+xml';
		}

		fileData.mimeType = mime;

		const baseFilename = sanitize(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
		fsSafeName = `${baseFilename}${ext ? `.${ext}` : ''}`;

		if (!overwriteExistingFiles) {
			fsSafeName = await getSafeFileName({
				collectionSlug: collectionConfig.slug,
				desiredFilename: fsSafeName,
				req,
				staticPath: staticPath!,
			});
		}

		fileData.filename = fsSafeName;

		let fileForResize = file;

		if (cropData && sharp) {
			const { data: croppedImage, info } = await cropImage({
				cropData,
				dimensions: dimensions!,
				file,
				heightInPixels: uploadEdits.heightInPixels!,
				req,
				sharp,
				widthInPixels: uploadEdits.widthInPixels!,
				withMetadata,
			});

			// Apply resize after cropping to ensure it conforms to resizeOptions
			if (resizeOptions && !resizeOptions.withoutEnlargement) {
				const wrapper = new SharpWrapper(croppedImage);
				const resizedWrapper = await wrapper.resize(resizeOptions);
				const resizedAfterCrop = await resizedWrapper.toBuffer({ resolveWithObject: true });

				if (!('data' in resizedAfterCrop) || !('info' in resizedAfterCrop)) {
					throw new Error('Unexpected result format from toBuffer');
				}

				filesToSave.push({
					buffer: resizedAfterCrop.data,
					path: `${staticPath}/${fsSafeName}`,
				});

				fileForResize = {
					...fileForResize,
					data: resizedAfterCrop.data,
					size: resizedAfterCrop.info.size,
				};

				fileData.width = resizedAfterCrop.info.width;
				fileData.height = resizedAfterCrop.info.height;

				if (fileIsAnimatedType) {
					const metadata = await sharpFile!.metadata();
					fileData.height = metadata.pages ? resizedAfterCrop.info.height / metadata.pages! : resizedAfterCrop.info.height;
				}

				fileData.filesize = resizedAfterCrop.info.size;
			} else {
				// If resizeOptions is not present, just save the cropped image
				filesToSave.push({
					buffer: croppedImage,
					path: `${staticPath}/${fsSafeName}`,
				});

				fileForResize = {
					...file,
					data: croppedImage,
					size: info.size,
				};

				fileData.width = info.width;
				fileData.height = info.height;

				if (fileIsAnimatedType) {
					const metadata = await sharpFile!.metadata();
					fileData.height = metadata.pages ? info.height / metadata.pages! : info.height;
				}

				fileData.filesize = info.size;
			}

			if (file.tempFilePath) {
				await fs.writeFile(file.tempFilePath, croppedImage);
			} else {
				req.file = fileForResize;
			}
		} else {
			filesToSave.push({
				buffer: fileBuffer?.data || file.data,
				path: `${staticPath}/${fsSafeName}`,
			});

			// If using temp files and the image is being resized, write the file to the temp path
			if (fileBuffer?.data || file.data.length > 0) {
				if (file.tempFilePath) {
					await fs.writeFile(file.tempFilePath, fileBuffer?.data || file.data);
				} else {
					// Assign the _possibly modified_ file to the request object
					req.file = {
						...file,
						data: fileBuffer?.data || file.data,
						size: fileBuffer?.info.size || file.size,
					};
				}
			}
		}

		if (fileSupportsResize && (Array.isArray(imageSizes) || focalPointEnabled !== false)) {
			req.payloadUploadSizes = {};

			const { focalPoint, sizeData, sizesToSave } = await resizeAndTransformImageSizes({
				config: collectionConfig,
				dimensions: !cropData
					? dimensions!
					: {
							...dimensions,
							height: fileData.height!,
							width: fileData.width!,
						},
				file: fileForResize,
				mimeType: fileData.mimeType!,
				req,
				savedFilename: fsSafeName || file.name,
				sharp,
				staticPath: staticPath!,
				uploadEdits,
				withMetadata,
			});

			fileData.sizes = sizeData;
			fileData.focalX = focalPoint?.x;
			fileData.focalY = focalPoint?.y;
			filesToSave.push(...sizesToSave);
		}
	} catch (err) {
		req.payload?.logger?.error(err);
		throw new Error(`File upload error: ${err instanceof Error ? err.message : String(err)}`);
	}

	newData = {
		...newData,
		...fileData,
	};

	return {
		data: newData,
		files: filesToSave,
	};
};

