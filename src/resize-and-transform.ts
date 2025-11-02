import { SharpWrapper } from './sharp-wrapper.js';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import sanitize from 'sanitize-filename';
import type {
    ResizeArgs,
    ImageSizesResult,
    ImageSize,
    ProbedImageSize,
    PayloadFile,
    PayloadRequest,
    UploadEdits,
    WithMetadata,
    FileSize,
    FileSizes,
    FileToSave,
    SanitizedCollectionConfig,
} from './types.js';
import { extractHeightFromImage } from './utils/extract-height-from-image.js';
import { getImageSize } from './utils/get-image-size.js';
import { canResizeImage } from './utils/can-resize-image.js';
import { isNumber } from './utils/is-number.js';
import { optionallyAppendMetadata } from './utils/optionally-append-metadata.js';
import { fileExists } from './utils/file-exists.js';

/**
 * Sanitize the image name and extract the extension from the source image
 */
const getSanitizedImageData = (sourceImage: string): { ext: string; name: string } => {
    const extension = sourceImage.split('.').pop();
    const name = sanitize(sourceImage.substring(0, sourceImage.lastIndexOf('.')) || sourceImage);
    return { name, ext: extension || 'png' };
};

/**
 * Create a new image name based on the output image name, the dimensions and the extension
 */
const createImageName = ({
    extension,
    height,
    outputImageName,
    width,
}: {
    extension: string;
    height: number;
    outputImageName: string;
    width: number;
}): string => {
    return `${outputImageName}-${width}x${height}.${extension}`;
};

/**
 * Create the result object for the image resize operation
 */
const createResult = ({
    name,
    filename = null,
    filesize = null,
    height = null,
    mimeType = null,
    sizesToSave = [],
    width = null,
}: {
    name: string;
    filename?: string | null;
    filesize?: number | null;
    height?: number | null;
    mimeType?: string | null;
    sizesToSave?: FileToSave[];
    width?: number | null;
}): ImageSizesResult => {
    return {
        sizeData: {
            [name]: {
                filename,
                filesize,
                height,
                mimeType,
                width,
            },
        },
        sizesToSave,
    };
};

/**
 * Determine whether or not to resize the image
 */
const getImageResizeAction = ({
    dimensions: originalImage,
    hasFocalPoint,
    imageResizeConfig,
}: {
    dimensions: ProbedImageSize;
    hasFocalPoint?: boolean;
    imageResizeConfig: ImageSize;
}): 'omit' | 'resize' | 'resizeWithFocalPoint' => {
    const { fit, withoutEnlargement, withoutReduction } = imageResizeConfig;
    const targetWidth = imageResizeConfig.width;
    const targetHeight = imageResizeConfig.height;

    // Prevent upscaling by default when both dimensions are smaller than target
    if (targetHeight && targetWidth) {
        const originalImageIsSmallerXAndY =
            originalImage.width < targetWidth && originalImage.height < targetHeight;
        if (withoutEnlargement === undefined && originalImageIsSmallerXAndY) {
            return 'omit';
        }
    }

    if (withoutEnlargement === undefined && (!targetWidth || !targetHeight)) {
        if (
            (targetWidth && originalImage.width < targetWidth) ||
            (targetHeight && originalImage.height < targetHeight)
        ) {
            return 'omit';
        }
    }

    const originalImageIsSmallerXOrY =
        originalImage.width < (targetWidth || 0) || originalImage.height < (targetHeight || 0);

    if (fit === 'contain' || fit === 'inside') {
        return 'resize';
    }

    if (!isNumber(targetHeight) && !isNumber(targetWidth)) {
        return 'resize';
    }

    const targetAspectRatio = (targetWidth || 1) / (targetHeight || 1);
    const originalAspectRatio = originalImage.width / originalImage.height;

    if (originalAspectRatio === targetAspectRatio) {
        return 'resize';
    }

    if (withoutEnlargement && originalImageIsSmallerXOrY) {
        return 'resize';
    }

    if (withoutReduction && !originalImageIsSmallerXOrY) {
        return 'resize';
    }

    return hasFocalPoint ? 'resizeWithFocalPoint' : 'resize';
};

/**
 * Sanitize the resize config
 */
const sanitizeResizeConfig = (resizeConfig: ImageSize): ImageSize => {
    if (resizeConfig.withoutReduction) {
        return {
            ...resizeConfig,
            fit: resizeConfig?.fit || 'contain',
            position: resizeConfig?.position || 'left top',
        };
    }
    return resizeConfig;
};

/**
 * For the provided image sizes, handle the resizing and the transforms
 */
export async function resizeAndTransformImageSizes({
    config,
    dimensions,
    file,
    mimeType,
    req,
    savedFilename,
    sharp,
    staticPath,
    uploadEdits,
    withMetadata,
}: ResizeArgs): Promise<ImageSizesResult> {
    const { focalPoint: focalPointEnabled = true, imageSizes } = config.upload || {};

    const incomingFocalPoint = uploadEdits?.focalPoint
        ? {
            x: isNumber(uploadEdits.focalPoint.x) ? Math.round(uploadEdits.focalPoint.x) : 50,
            y: isNumber(uploadEdits.focalPoint.y) ? Math.round(uploadEdits.focalPoint.y) : 50,
        }
        : undefined;

    const defaultResult: ImageSizesResult = {
        ...(focalPointEnabled && incomingFocalPoint && { focalPoint: incomingFocalPoint }),
        sizeData: {},
        sizesToSave: [],
    };

    if (!imageSizes || !sharp) {
        return defaultResult;
    }

    const fileIsAnimatedType = ['image/avif', 'image/gif', 'image/webp'].includes(file!.mimetype);

    const input = file!.tempFilePath
        ? await fs.readFile(file!.tempFilePath!)
        : file!.data;

    const sharpBase = new SharpWrapper(input);

    const originalImageMeta = await sharpBase.metadata();

    let adjustedDimensions = { ...dimensions };

    // Note: ImageScript doesn't handle EXIF orientation automatically
    // We'll keep dimensions as-is

    const resizeImageMeta = {
        height: extractHeightFromImage(originalImageMeta),
        width: originalImageMeta.width,
    };

    const results: ImageSizesResult[] = await Promise.all(
        imageSizes.map(async (imageResizeConfig): Promise<ImageSizesResult> => {
            const sanitizedConfig = sanitizeResizeConfig(imageResizeConfig);

            const resizeAction = getImageResizeAction({
                dimensions,
                hasFocalPoint: Boolean(incomingFocalPoint),
                imageResizeConfig: sanitizedConfig,
            });

            if (resizeAction === 'omit') {
                return createResult({ name: imageResizeConfig.name });
            }

            const imageToResize = sharpBase.clone();

            let resized = imageToResize;

            if (resizeAction === 'resizeWithFocalPoint') {
                let { height: resizeHeight, width: resizeWidth } = imageResizeConfig;

                const originalAspectRatio = adjustedDimensions.width / adjustedDimensions.height;

                if (resizeHeight && !resizeWidth) {
                    resizeWidth = Math.round(resizeHeight * originalAspectRatio);
                }

                if (resizeWidth && !resizeHeight) {
                    resizeHeight = Math.round(resizeWidth / originalAspectRatio);
                }

                if (!resizeHeight) {
                    resizeHeight = resizeImageMeta.height;
                }

                if (!resizeWidth) {
                    resizeWidth = resizeImageMeta.width;
                }

                const resizeAspectRatio = resizeWidth! / resizeHeight!;
                const prioritizeHeight = resizeAspectRatio < originalAspectRatio;

                // Scale the image before extracting from it
                resized = await resized.resize({
                    fastShrinkOnLoad: false,
                    height: prioritizeHeight ? resizeHeight : undefined,
                    width: prioritizeHeight ? undefined : resizeWidth,
                    fit: 'cover',
                });

                const metadataAppendedFile = await optionallyAppendMetadata({
                    req,
                    sharpFile: resized,
                    withMetadata: withMetadata!,
                });

                const bufferResult = await metadataAppendedFile.toBuffer({ resolveWithObject: true });
                const { info } = 'info' in bufferResult ? bufferResult : { info: { width: 0, height: 0, size: 0, format: 'png', channels: 4 } };

                resizeImageMeta.height = extractHeightFromImage({
                    ...originalImageMeta,
                    height: info.height,
                });
                resizeImageMeta.width = info.width;

                const halfResizeX = resizeWidth! / 2;
                const xFocalCenter = resizeImageMeta.width * (incomingFocalPoint!.x / 100);
                const calculatedRightPixelBound = xFocalCenter + halfResizeX;
                let leftBound = xFocalCenter - halfResizeX;

                if (calculatedRightPixelBound > resizeImageMeta.width) {
                    leftBound = resizeImageMeta.width - resizeWidth!;
                }

                if (leftBound < 0) {
                    leftBound = 0;
                }

                const halfResizeY = resizeHeight! / 2;
                const yFocalCenter = resizeImageMeta.height * (incomingFocalPoint!.y / 100);
                const calculatedBottomPixelBound = yFocalCenter + halfResizeY;
                let topBound = yFocalCenter - halfResizeY;

                if (calculatedBottomPixelBound > resizeImageMeta.height) {
                    topBound = resizeImageMeta.height - resizeHeight!;
                }

                if (topBound < 0) {
                    topBound = 0;
                }

                resized = resized.extract({
                    height: resizeHeight!,
                    left: Math.floor(leftBound),
                    top: Math.floor(topBound),
                    width: resizeWidth!,
                });
            } else {
                resized = await resized.resize({
                    width: sanitizedConfig.width,
                    height: sanitizedConfig.height,
                    fit: sanitizedConfig.fit,
                    position: sanitizedConfig.position,
                    withoutEnlargement: sanitizedConfig.withoutEnlargement,
                    withoutReduction: sanitizedConfig.withoutReduction,
                });
            }

            if (imageResizeConfig.formatOptions) {
                // ImageScript doesn't support AVIF, use PNG as fallback
                const format = imageResizeConfig.formatOptions.format === 'avif' ? 'png' : imageResizeConfig.formatOptions.format;
                resized = resized.toFormat(
                    format as 'png' | 'jpeg' | 'jpg' | 'webp',
                    imageResizeConfig.formatOptions.options as Record<string, unknown>,
                );
            }

            if (imageResizeConfig.trimOptions) {
                resized = resized.trim(imageResizeConfig.trimOptions);
            }

            const metadataAppendedFile = await optionallyAppendMetadata({
                req,
                sharpFile: resized,
                withMetadata: withMetadata!,
            });

            const bufferResult = await metadataAppendedFile.toBuffer({
                resolveWithObject: true,
            });

            if (!('data' in bufferResult) || !('info' in bufferResult)) {
                throw new Error('Unexpected result format from toBuffer');
            }

            const { data: bufferData, info: bufferInfo } = bufferResult;

            const sanitizedImage = getSanitizedImageData(savedFilename);

            if (req.payloadUploadSizes) {
                req.payloadUploadSizes[imageResizeConfig.name] = bufferData;
            }

            const mimeInfo = await fileTypeFromBuffer(bufferData);

            const imageNameWithDimensions = imageResizeConfig.generateImageName
                ? imageResizeConfig.generateImageName({
                    extension: mimeInfo?.ext || sanitizedImage.ext,
                    height: extractHeightFromImage({
                        ...originalImageMeta,
                        height: bufferInfo.height,
                    }),
                    originalName: sanitizedImage.name,
                    sizeName: imageResizeConfig.name,
                    width: bufferInfo.width,
                })
                : createImageName({
                    extension: mimeInfo?.ext || sanitizedImage.ext,
                    height: extractHeightFromImage({
                        ...originalImageMeta,
                        height: bufferInfo.height,
                    }),
                    outputImageName: sanitizedImage.name,
                    width: bufferInfo.width,
                });

            const imagePath = `${staticPath}/${imageNameWithDimensions}`;

            if (await fileExists(imagePath)) {
                try {
                    await fs.unlink(imagePath);
                } catch {
                    // Ignore unlink errors
                }
            }

            const { height, size, width } = bufferInfo;

            return createResult({
                name: imageResizeConfig.name,
                filename: imageNameWithDimensions,
                filesize: size,
                height:
                    fileIsAnimatedType && originalImageMeta.pages
                        ? height / originalImageMeta.pages!
                        : height,
                mimeType: mimeInfo?.mime || mimeType,
                sizesToSave: [{ buffer: bufferData, path: imagePath }],
                width,
            });
        }),
    );

    return results.reduce(
        (acc, result) => {
            Object.assign(acc.sizeData, result.sizeData);
            acc.sizesToSave.push(...result.sizesToSave);
            return acc;
        },
        { ...defaultResult },
    );
}

