import { decode, resize, crop, encodePng, encodeJpeg } from 'image-js';
import type { Image } from 'image-js';
import sizeOf from 'image-size';
import type {
    SharpOptions,
    SharpInput,
    ResizeOptions,
    Region,
    OutputInfo,
    Metadata,
    TrimOptions,
    RotateOptions,
} from './types.js';
import { readFile } from "fs/promises";
/**
 * Sharp-compatible wrapper using image-js
 */
export class SharpWrapper {
    private image: Image | null = null;
    private inputBuffer: Buffer | null = null;
    private options: SharpOptions;
    private format: 'png' | 'jpeg' | 'webp' = 'png';
    private encodeOptions: Record<string, unknown> = {};

    constructor(input?: Buffer | string, options?: SharpOptions) {
        this.options = options || {};
        this.inputBuffer = input instanceof Buffer ? input : typeof input === 'string' ? null : null;
        // Note: file path support would require async loading, which we'll handle in getImage()
        if (typeof input === 'string') {
            (this as unknown as { _filePath?: string })._filePath = input;
        }
    }


    /**
     * Clone this instance
     */
    clone(): SharpWrapper {
        const filePath = (this as unknown as { _filePath?: string })._filePath;
        const cloned = new SharpWrapper(filePath ? filePath : this.inputBuffer ?? undefined, this.options);
        if (this.image) {
            // Clone the image using image-js clone method
            cloned.image = this.image.clone();
        }
        cloned.format = this.format;
        cloned.encodeOptions = { ...this.encodeOptions };

        // Copy stored operations
        const resizeOptions = (this as unknown as { _resizeOptions?: ResizeOptions })._resizeOptions;
        if (resizeOptions) {
            (cloned as unknown as { _resizeOptions?: ResizeOptions })._resizeOptions = { ...resizeOptions };
        }
        const extractRegion = (this as unknown as { _extractRegion?: Region })._extractRegion;
        if (extractRegion) {
            (cloned as unknown as { _extractRegion?: Region })._extractRegion = { ...extractRegion };
        }

        return cloned;
    }

    /**
     * Get image instance, loading if needed
     */
    private async getImage(): Promise<Image> {
        if (this.image) {
            return this.image;
        }

        let buffer: Buffer;
        const filePath = (this as unknown as { _filePath?: string })._filePath;

        if (filePath) {
            // Load from file path
            buffer = await readFile(filePath);
        } else if (this.inputBuffer) {
            buffer = this.inputBuffer;
        } else {
            throw new Error('No input provided');
        }

        // image-js decode is synchronous, but we need to handle it as async for compatibility
        this.image = decode(buffer);
        return this.image;
    }

    /**
     * Rotate image by angle or auto-orient based on EXIF
     * Note: image-js has limited EXIF rotation support
     */
    rotate(angle?: number, options?: RotateOptions): SharpWrapper {
        // image-js doesn't have direct EXIF rotation support
        // For now, just return self for chaining
        // EXIF auto-orientation is not supported by image-js
        return this;
    }

    /**
     * Auto-orient image based on EXIF
     * Alias for rotate() without angle
     */
    autoOrient(): SharpWrapper {
        // EXIF orientation not supported by image-js
        return this;
    }

    /**
     * Resize image
     * Synchronous method like Sharp - stores resize options and applies them in toBuffer()
     */
    resize(options?: ResizeOptions | number | null, height?: number | null): SharpWrapper {
        // Store resize options to be applied lazily in toBuffer()
        let resizeOptions: ResizeOptions | undefined;

        if (typeof options === 'number' || options === null) {
            // Legacy signature: resize(width, height)
            resizeOptions = {
                width: options === null ? undefined : options,
                height: height === null || height === undefined ? undefined : height,
            };
        } else if (options) {
            resizeOptions = { ...options };
        }

        (this as unknown as { _resizeOptions?: ResizeOptions })._resizeOptions = resizeOptions;

        return this;
    }

    /**
     * Extract/crop a region from the image
     */
    extract(region: Region): SharpWrapper {
        // We need to ensure image is loaded
        // Since this is synchronous in Sharp but async in image-js, we'll defer
        // This will be handled in toBuffer
        (this as unknown as { _extractRegion?: Region })._extractRegion = region;
        return this;
    }

    /**
     * Trim edges
     * Note: image-js doesn't have trim, so this is a no-op for now
     */
    trim(options?: TrimOptions): SharpWrapper {
        // image-js doesn't support trim
        // Store options for potential future implementation
        (this as unknown as { _trimOptions?: TrimOptions })._trimOptions = options;
        return this;
    }

    /**
     * Flip the image about the vertical Y axis
     * Note: image-js doesn't support flip, so this is a no-op
     */
    flip(flip?: boolean): SharpWrapper {
        // image-js doesn't support flip
        return this;
    }

    /**
     * Flop the image about the horizontal X axis
     * Note: image-js doesn't support flop, so this is a no-op
     */
    flop(flop?: boolean): SharpWrapper {
        // image-js doesn't support flop
        return this;
    }

    /**
     * Sharpen the image
     * Note: image-js doesn't support sharpen, so this is a no-op
     */
    sharpen(sigma?: number | { sigma: number; m1?: number; m2?: number; x1?: number; y2?: number; y3?: number }, flat?: number, jagged?: number): SharpWrapper {
        // image-js doesn't support sharpen
        return this;
    }

    /**
     * Apply median filter
     * Note: image-js doesn't support median filter, so this is a no-op
     */
    median(size?: number): SharpWrapper {
        // image-js doesn't support median filter
        return this;
    }

    /**
     * Blur the image
     * Note: image-js doesn't support blur, so this is a no-op
     */
    blur(sigma?: number | boolean | { sigma: number; minAmplitude?: number; precision?: 'integer' | 'float' | 'approximate' }): SharpWrapper {
        // image-js doesn't support blur
        return this;
    }

    /**
     * Expand foreground objects using dilate morphological operator
     * Note: image-js doesn't support dilate, so this is a no-op
     */
    dilate(width?: number): SharpWrapper {
        // image-js doesn't support dilate
        return this;
    }

    /**
     * Shrink foreground objects using erode morphological operator
     * Note: image-js doesn't support erode, so this is a no-op
     */
    erode(width?: number): SharpWrapper {
        // image-js doesn't support erode
        return this;
    }

    /**
     * Merge alpha transparency channel with background
     * Note: image-js has limited flatten support, so this is a no-op
     */
    flatten(flatten?: boolean | { background?: string | { r?: number; g?: number; b?: number; alpha?: number } }): SharpWrapper {
        // image-js has limited flatten support
        return this;
    }

    /**
     * Ensure the image has an alpha channel with all white pixel values made fully transparent
     * Note: image-js doesn't support unflatten, so this is a no-op
     */
    unflatten(): SharpWrapper {
        // image-js doesn't support unflatten
        return this;
    }

    /**
     * Apply gamma correction
     * Note: image-js doesn't support gamma, so this is a no-op
     */
    gamma(gamma?: number, gammaOut?: number): SharpWrapper {
        // image-js doesn't support gamma correction
        return this;
    }

    /**
     * Produce the "negative" of the image
     * Note: image-js doesn't support negate, so this is a no-op
     */
    negate(negate?: boolean | { alpha?: boolean }): SharpWrapper {
        // image-js doesn't support negate
        return this;
    }

    /**
     * Enhance output image contrast by stretching luminance
     * Note: image-js doesn't support normalise, so this is a no-op
     */
    normalise(normalise?: { lower?: number; upper?: number }): SharpWrapper {
        // image-js doesn't support normalise
        return this;
    }

    /**
     * Alternative spelling of normalise
     */
    normalize(normalize?: { lower?: number; upper?: number }): SharpWrapper {
        return this.normalise(normalize);
    }

    /**
     * Extend/pad/extrude edges of the image
     * Note: image-js doesn't support extend, so this is a no-op
     */
    extend(extend: number | { top?: number; left?: number; bottom?: number; right?: number; background?: string | { r?: number; g?: number; b?: number; alpha?: number }; extendWith?: 'background' | 'copy' | 'repeat' | 'mirror' }): SharpWrapper {
        // image-js doesn't support extend
        return this;
    }

    /**
     * Keep all EXIF metadata from input image
     * Note: image-js has limited EXIF support
     */
    keepExif(): SharpWrapper {
        // image-js has limited EXIF support
        return this;
    }

    /**
     * Set EXIF metadata in output image
     * Note: image-js has limited EXIF support
     */
    withExif(exif: Record<string, Record<string, string>>): SharpWrapper {
        // image-js has limited EXIF support
        return this;
    }

    /**
     * Update EXIF metadata from input image
     * Note: image-js has limited EXIF support
     */
    withExifMerge(exif: Record<string, Record<string, string>>): SharpWrapper {
        // image-js has limited EXIF support
        return this;
    }

    /**
     * Keep ICC profile from input image
     * Note: image-js has limited ICC support
     */
    keepIccProfile(): SharpWrapper {
        // image-js has limited ICC support
        return this;
    }

    /**
     * Transform using ICC profile
     * Note: image-js has limited ICC support
     */
    withIccProfile(icc: string, options?: { attach?: boolean }): SharpWrapper {
        // image-js has limited ICC support
        return this;
    }

    /**
     * Keep all XMP metadata from input image
     * Note: image-js has limited XMP support
     */
    keepXmp(): SharpWrapper {
        // image-js has limited XMP support
        return this;
    }

    /**
     * Set XMP metadata in output image
     * Note: image-js has limited XMP support
     */
    withXmp(xmp: string): SharpWrapper {
        // image-js has limited XMP support
        return this;
    }

    /**
     * Include all metadata (EXIF, XMP, IPTC) from input image
     * Note: image-js has limited metadata support
     */
    withMetadata(withMetadata?: { density?: number; orientation?: number; icc?: string; exif?: Record<string, Record<string, string>> }): SharpWrapper {
        // image-js has limited metadata support
        return this;
    }

    /**
     * Use JPEG options for output image
     */
    jpeg(options?: { quality?: number; progressive?: boolean; chromaSubsampling?: string; trellisQuantisation?: boolean; overshootDeringing?: boolean; optimiseScans?: boolean; optimizeScans?: boolean; optimiseCoding?: boolean; optimizeCoding?: boolean; quantisationTable?: number; quantizationTable?: number; mozjpeg?: boolean; force?: boolean }): SharpWrapper {
        this.format = 'jpeg';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use PNG options for output image
     */
    png(options?: { progressive?: boolean; compressionLevel?: number; adaptiveFiltering?: boolean; quality?: number; effort?: number; palette?: boolean; colours?: number; colors?: number; dither?: number; force?: boolean }): SharpWrapper {
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use WebP options for output image
     * Note: image-js doesn't support WebP encoding, fallback to PNG
     */
    webp(options?: { quality?: number; alphaQuality?: number; lossless?: boolean; nearLossless?: boolean; smartSubsample?: boolean; smartDeblock?: boolean; effort?: number; minSize?: boolean; mixed?: boolean; preset?: string; force?: boolean }): SharpWrapper {
        // image-js doesn't support WebP encoding, fallback to PNG
        this.format = 'webp';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use AVIF options for output image
     * Note: image-js doesn't support AVIF, fallback to PNG
     */
    avif(options?: { quality?: number; lossless?: boolean; effort?: number; chromaSubsampling?: string; bitdepth?: 8 | 10 | 12; force?: boolean }): SharpWrapper {
        // image-js doesn't support AVIF, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use HEIF options for output image
     * Note: image-js doesn't support HEIF, fallback to PNG
     */
    heif(options?: { quality?: number; compression?: 'av1' | 'hevc'; lossless?: boolean; effort?: number; chromaSubsampling?: string; bitdepth?: 8 | 10 | 12; force?: boolean }): SharpWrapper {
        // image-js doesn't support HEIF, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use TIFF options for output image
     * Note: image-js doesn't support TIFF, fallback to PNG
     */
    tiff(options?: { quality?: number; compression?: string; predictor?: string; pyramid?: boolean; tile?: boolean; tileWidth?: number; tileHeight?: number; xres?: number; yres?: number; bitdepth?: 1 | 2 | 4 | 8; miniswhite?: boolean; resolutionUnit?: 'inch' | 'cm'; force?: boolean }): SharpWrapper {
        // image-js doesn't support TIFF, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use GIF options for output image
     * Note: image-js doesn't support GIF encoding, fallback to PNG
     */
    gif(options?: { reuse?: boolean; progressive?: boolean; colours?: number; colors?: number; effort?: number; dither?: number; interFrameMaxError?: number; interPaletteMaxError?: number; keepDuplicateFrames?: boolean; force?: boolean }): SharpWrapper {
        // image-js doesn't support GIF encoding, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use JP2 (JPEG 2000) options for output image
     * Note: image-js doesn't support JP2, fallback to PNG
     */
    jp2(options?: { quality?: number; lossless?: boolean; tileWidth?: number; tileHeight?: number; chromaSubsampling?: '4:4:4' | '4:2:0'; force?: boolean }): SharpWrapper {
        // image-js doesn't support JP2, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use JPEG-XL (JXL) options for output image
     * Note: image-js doesn't support JXL, fallback to PNG
     */
    jxl(options?: { distance?: number; quality?: number; decodingTier?: number; lossless?: boolean; effort?: number; force?: boolean }): SharpWrapper {
        // image-js doesn't support JXL, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Force output to be raw pixel data
     * Note: image-js doesn't support raw output, fallback to PNG
     */
    raw(options?: { depth?: string; force?: boolean }): SharpWrapper {
        // image-js doesn't support raw output, fallback to PNG
        this.format = 'png';
        if (options) {
            this.encodeOptions = { ...options };
        }
        return this;
    }

    /**
     * Use tile-based deep zoom output
     * Note: image-js doesn't support tile output, so this is a no-op
     */
    tile(tile?: { size?: number; overlap?: number; angle?: number; background?: string | { r?: number; g?: number; b?: number; alpha?: number }; depth?: string; skipBlanks?: number; container?: 'fs' | 'zip'; layout?: 'dz' | 'iiif' | 'iiif3' | 'zoomify' | 'google'; centre?: boolean; center?: boolean; id?: string; basename?: string }): SharpWrapper {
        // image-js doesn't support tile output
        return this;
    }

    /**
     * Set timeout for processing
     * Note: This is a no-op in our implementation
     */
    timeout(options: { seconds: number }): SharpWrapper {
        // Timeout not applicable in our implementation
        return this;
    }

    /**
     * Convert to specific format
     */
    toFormat(format: 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif' | 'heif' | 'tiff' | 'gif' | 'jp2' | 'jxl' | 'raw', options?: Record<string, unknown>): SharpWrapper {
        if (format === 'jpg') {
            this.format = 'jpeg';
        } else if (format === 'png' || format === 'jpeg' || format === 'webp') {
            this.format = format;
        } else if (format === 'avif' || format === 'heif' || format === 'tiff' || format === 'gif' || format === 'jp2' || format === 'jxl' || format === 'raw') {
            // image-js doesn't support these formats, fallback to PNG
            this.format = 'png';
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }

        if (options) {
            this.encodeOptions = { ...options };
        }

        return this;
    }

    /**
     * Get image metadata
     * Uses image-size library for fast header-only parsing without full decode
     */
    async metadata(): Promise<Metadata> {
        // Use image-size library for fast metadata reading (header-only, no full decode)
        let buffer: Buffer;
        const filePath = (this as unknown as { _filePath?: string })._filePath;

        if (filePath) {
            buffer = await readFile(filePath);
        } else if (this.inputBuffer) {
            buffer = this.inputBuffer;
        } else {
            throw new Error('No input provided');
        }

        try {
            // image-size reads dimensions from headers without full decode
            const dimensions = sizeOf(buffer);
            if (dimensions.width && dimensions.height) {
                return {
                    width: dimensions.width,
                    height: dimensions.height,
                    channels: 4, // RGBA
                    hasAlpha: true,
                    format: dimensions.type || this.format,
                };
            }
        } catch (error) {
            // If image-size fails, fallback to image-js (should be rare)
            // This can happen with unsupported formats or corrupted headers
        }

        // Fallback to image-js full decode only if header parsing fails
        const image = await this.getImage();
        // Ensure channels is in the valid range (1-4)
        const channels = Math.min(4, Math.max(1, image.channels)) as 1 | 2 | 3 | 4;
        return {
            width: image.width,
            height: image.height,
            channels,
            hasAlpha: image.alpha,
            format: this.format,
        };
    }

    /**
     * Perform an affine transform on an image
     * Note: image-js doesn't support affine transform, so this is a no-op
     */
    affine(matrix: [number, number, number, number] | [[number, number], [number, number]], options?: { background?: string | { r?: number; g?: number; b?: number; alpha?: number }; idx?: number; idy?: number; odx?: number; ody?: number; interpolator?: string }): SharpWrapper {
        // image-js doesn't support affine transform
        return this;
    }

    /**
     * Perform contrast limiting adaptive histogram equalization (CLAHE)
     * Note: image-js doesn't support CLAHE, so this is a no-op
     */
    clahe(options: { width: number; height: number; maxSlope?: number }): SharpWrapper {
        // image-js doesn't support CLAHE
        return this;
    }

    /**
     * Convolve the image with the specified kernel
     * Note: image-js doesn't support convolution, so this is a no-op
     */
    convolve(kernel: { width: number; height: number; kernel: ArrayLike<number>; scale?: number; offset?: number }): SharpWrapper {
        // image-js doesn't support convolution
        return this;
    }

    /**
     * Apply threshold to image
     * Note: image-js doesn't support threshold, so this is a no-op
     */
    threshold(threshold?: number, options?: { greyscale?: boolean; grayscale?: boolean }): SharpWrapper {
        // image-js doesn't support threshold
        return this;
    }

    /**
     * Perform a bitwise boolean operation with operand image
     * Note: image-js doesn't support boolean operations, so this is a no-op
     */
    boolean(operand: string | Buffer, operator: 'and' | 'or' | 'eor', options?: { raw?: { width: number; height: number; channels: 1 | 2 | 3 | 4; premultiplied?: boolean; pageHeight?: number } }): SharpWrapper {
        // image-js doesn't support boolean operations
        return this;
    }

    /**
     * Apply linear formula a * input + b to the image (levels adjustment)
     * Note: image-js doesn't support linear transformation, so this is a no-op
     */
    linear(a?: number | number[] | null, b?: number | number[]): SharpWrapper {
        // image-js doesn't support linear transformation
        return this;
    }

    /**
     * Recomb the image with the specified matrix
     * Note: image-js doesn't support recombination, so this is a no-op
     */
    recomb(inputMatrix: [[number, number, number], [number, number, number], [number, number, number]] | [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]]): SharpWrapper {
        // image-js doesn't support recombination
        return this;
    }

    /**
     * Transform the image using brightness, saturation, hue rotation and lightness
     * Note: image-js doesn't support modulation, so this is a no-op
     */
    modulate(options?: { brightness?: number; saturation?: number; hue?: number; lightness?: number }): SharpWrapper {
        // image-js doesn't support modulation
        return this;
    }

    /**
     * Write output image data to a file
     */
    async toFile(fileOut: string): Promise<OutputInfo>;
    async toFile(fileOut: string, callback: (err: Error, info: OutputInfo) => void): Promise<SharpWrapper>;
    async toFile(fileOut: string, callback?: (err: Error, info: OutputInfo) => void): Promise<OutputInfo | SharpWrapper> {
        const buffer = await this.toBuffer({ resolveWithObject: true });

        if (!('data' in buffer) || !('info' in buffer)) {
            throw new Error('Unexpected result format from toBuffer');
        }

        const { data, info } = buffer;

        await import('fs/promises').then((fs) => fs.writeFile(fileOut, data));

        if (callback) {
            // Callback signature - return SharpWrapper for chaining
            callback(null as unknown as Error, info);
            return this;
        }

        // Promise signature - return OutputInfo
        return info;
    }

    /**
     * Calculate final resize dimensions based on options and original image
     */
    private calculateResizeDimensions(image: Image, resizeOptions: ResizeOptions): { width: number; height: number } {
        const targetWidth = resizeOptions.width ?? null;
        const targetHeight = resizeOptions.height ?? null;
        const fit = resizeOptions.fit || 'cover';

        let finalWidth: number = image.width;
        let finalHeight: number = image.height;

        if (targetWidth && targetHeight) {
            // Both dimensions specified
            if (fit === 'fill') {
                // Exact dimensions, no aspect ratio preservation
                finalWidth = targetWidth;
                finalHeight = targetHeight;
            } else if (fit === 'contain' || fit === 'inside') {
                // Maintain aspect ratio, fit within bounds
                const aspectRatio = image.width / image.height;
                if (image.width / image.height > targetWidth / targetHeight) {
                    // Width is limiting factor
                    finalWidth = targetWidth;
                    finalHeight = Math.round(targetWidth / aspectRatio);
                    if (finalHeight > targetHeight && fit === 'inside') {
                        finalHeight = targetHeight;
                        finalWidth = Math.round(targetHeight * aspectRatio);
                    }
                } else {
                    // Height is limiting factor
                    finalHeight = targetHeight;
                    finalWidth = Math.round(targetHeight * aspectRatio);
                    if (finalWidth > targetWidth && fit === 'inside') {
                        finalWidth = targetWidth;
                        finalHeight = Math.round(targetWidth / aspectRatio);
                    }
                }
            } else if (fit === 'cover' || !fit) {
                // Default behavior when both dimensions specified: cover (maintain aspect ratio, cover bounds)
                // Maintain aspect ratio, cover bounds (may crop)
                const aspectRatio = image.width / image.height;
                const targetAspectRatio = targetWidth / targetHeight;

                if (aspectRatio > targetAspectRatio) {
                    // Image is wider, fit to height
                    finalHeight = targetHeight;
                    finalWidth = Math.round(targetHeight * aspectRatio);
                } else {
                    // Image is taller, fit to width
                    finalWidth = targetWidth;
                    finalHeight = Math.round(targetWidth / aspectRatio);
                }
            } else if (fit === 'outside') {
                // Maintain aspect ratio, ensure dimensions >= target
                const aspectRatio = image.width / image.height;
                const targetAspectRatio = targetWidth / targetHeight;

                if (aspectRatio > targetAspectRatio) {
                    // Image is wider, ensure width >= target
                    finalWidth = Math.max(targetWidth, Math.round(targetHeight * aspectRatio));
                    finalHeight = Math.round(finalWidth / aspectRatio);
                } else {
                    // Image is taller, ensure height >= target
                    finalHeight = Math.max(targetHeight, Math.round(targetWidth / aspectRatio));
                    finalWidth = Math.round(finalHeight * aspectRatio);
                }
            }
            // 'fill' uses exact dimensions (no aspect ratio preservation)
        } else if (targetWidth) {
            // Only width specified
            const aspectRatio = image.width / image.height;
            finalWidth = targetWidth;
            finalHeight = Math.round(targetWidth / aspectRatio);
        } else if (targetHeight) {
            // Only height specified
            const aspectRatio = image.width / image.height;
            finalHeight = targetHeight;
            finalWidth = Math.round(targetHeight * aspectRatio);
        } else {
            // No dimensions specified, keep original
            finalWidth = image.width;
            finalHeight = image.height;
        }

        return { width: finalWidth, height: finalHeight };
    }

    /**
     * Encode image to buffer
     */
    async toBuffer(options?: { resolveWithObject?: boolean }): Promise<Buffer | { data: Buffer; info: OutputInfo }> {
        let image = await this.getImage();

        // Handle resize if specified (resize happens before extract)
        const resizeOptions = (this as unknown as { _resizeOptions?: ResizeOptions })._resizeOptions;
        if (resizeOptions) {
            const { width, height } = this.calculateResizeDimensions(image, resizeOptions);
            image = resize(image, { width, height });
            delete (this as unknown as { _resizeOptions?: ResizeOptions })._resizeOptions;
        }

        // Handle extract if specified
        const extractRegion = (this as unknown as { _extractRegion?: Region })._extractRegion;
        if (extractRegion) {
            // Validate and clamp extract region to image bounds
            const imgWidth = image.width;
            const imgHeight = image.height;

            // Clamp coordinates to non-negative values
            let left = Math.max(0, Math.floor(extractRegion.left));
            let top = Math.max(0, Math.floor(extractRegion.top));

            // Clamp width and height to positive values and within image bounds
            let width = Math.max(1, Math.floor(extractRegion.width));
            let height = Math.max(1, Math.floor(extractRegion.height));

            // Ensure the region doesn't exceed image boundaries
            if (left + width > imgWidth) {
                // Adjust width to fit within bounds
                width = Math.max(1, imgWidth - left);
            }

            if (top + height > imgHeight) {
                // Adjust height to fit within bounds
                height = Math.max(1, imgHeight - top);
            }

            // Final validation - ensure we have valid dimensions after clamping
            if (width <= 0 || height <= 0 || left >= imgWidth || top >= imgHeight) {
                throw new Error(
                    `Cannot extract region: resulting region is invalid after clamping. ` +
                    `Requested: left=${extractRegion.left}, top=${extractRegion.top}, width=${extractRegion.width}, height=${extractRegion.height}. ` +
                    `Clamped: left=${left}, top=${top}, width=${width}, height=${height}. ` +
                    `Image size: ${imgWidth}x${imgHeight}`
                );
            }

            try {
                // image-js crop uses { origin: { row, column }, width, height }
                // row = top (Y coordinate), column = left (X coordinate)
                image = crop(image, {
                    origin: {
                        row: top,
                        column: left,
                    },
                    width: width,
                    height: height,
                });
            } catch (error) {
                throw new Error(
                    `Failed to extract region: ${error instanceof Error ? error.message : String(error)}. ` +
                    `Region: left=${left}, top=${top}, width=${width}, height=${height}. ` +
                    `Image size: ${imgWidth}x${imgHeight}`
                );
            }
            delete (this as unknown as { _extractRegion?: Region })._extractRegion;
        }

        // Encode based on format
        let encoded: Uint8Array;
        let mimeType: string;

        if (this.format === 'jpeg') {
            const qualityNum = Math.max(1, Math.min(100, (this.encodeOptions.quality as number) ?? 80));
            // image-js encodeJpeg quality is 1-100
            encoded = encodeJpeg(image, { quality: qualityNum });
            mimeType = 'image/jpeg';
        } else if (this.format === 'webp') {
            // image-js doesn't support WebP encoding, fallback to PNG
            encoded = encodePng(image);
            mimeType = 'image/png';
        } else {
            // PNG (default)
            encoded = encodePng(image);
            mimeType = 'image/png';
        }

        const buffer = Buffer.from(encoded);

        if (options?.resolveWithObject) {
            return {
                data: buffer,
                info: {
                    format: this.format,
                    size: buffer.length,
                    width: image.width,
                    height: image.height,
                    channels: 4, // RGBA
                },
            };
        }

        return buffer;
    }
}

/**
 * Convert SharpInput to Buffer or string for SharpWrapper
 */
function normalizeInput(input?: SharpInput | Array<SharpInput>): Buffer | string | undefined {
    if (input === undefined) {
        return undefined;
    }

    // Handle array of inputs - Sharp doesn't support arrays in this context typically,
    // but we'll take the first element if array is provided
    if (Array.isArray(input)) {
        if (input.length === 0) {
            return undefined;
        }
        input = input[0];
    }

    // String or Buffer can be passed directly
    if (typeof input === 'string' || Buffer.isBuffer(input)) {
        return input;
    }

    // Convert TypedArrays and ArrayBuffer to Buffer
    if (input instanceof ArrayBuffer) {
        return Buffer.from(input);
    }

    // Handle various TypedArray types
    if (
        input instanceof Uint8Array ||
        input instanceof Uint8ClampedArray ||
        input instanceof Int8Array ||
        input instanceof Uint16Array ||
        input instanceof Int16Array ||
        input instanceof Uint32Array ||
        input instanceof Int32Array ||
        input instanceof Float32Array ||
        input instanceof Float64Array
    ) {
        return Buffer.from(input);
    }

    return undefined;
}

/**
 * Factory function matching Sharp's API signature
 * Can be called without `new` to create SharpWrapper instances
 */
function sharp(input?: SharpInput | Array<SharpInput>, options?: SharpOptions): SharpWrapper;
function sharp(options?: SharpOptions): SharpWrapper;
function sharp(
    inputOrOptions?: SharpInput | Array<SharpInput> | SharpOptions,
    options?: SharpOptions,
): SharpWrapper {
    // Handle case: sharp(options) - only options provided
    if (options === undefined && inputOrOptions !== undefined) {
        // Check if inputOrOptions looks like SharpOptions (object with SharpOptions properties)
        if (
            typeof inputOrOptions === 'object' &&
            inputOrOptions !== null &&
            !Buffer.isBuffer(inputOrOptions) &&
            !(inputOrOptions instanceof ArrayBuffer) &&
            !(
                inputOrOptions instanceof Uint8Array ||
                inputOrOptions instanceof Uint8ClampedArray ||
                inputOrOptions instanceof Int8Array ||
                inputOrOptions instanceof Uint16Array ||
                inputOrOptions instanceof Int16Array ||
                inputOrOptions instanceof Uint32Array ||
                inputOrOptions instanceof Int32Array ||
                inputOrOptions instanceof Float32Array ||
                inputOrOptions instanceof Float64Array
            ) &&
            !Array.isArray(inputOrOptions) &&
            typeof inputOrOptions !== 'string'
        ) {
            // It's likely options, not input
            return new SharpWrapper(undefined, inputOrOptions as SharpOptions);
        }
    }

    // Handle case: sharp(input, options) or sharp(input)
    const normalizedInput = normalizeInput(inputOrOptions as SharpInput | Array<SharpInput> | undefined);
    return new SharpWrapper(normalizedInput, options);
}

export default sharp;
