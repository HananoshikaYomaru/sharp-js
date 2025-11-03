import { Image } from 'imagescript';
import sizeOf from 'image-size';
import type {
    SharpOptions,
    ResizeOptions,
    Region,
    OutputInfo,
    Metadata,
    TrimOptions,
    RotateOptions,
} from './types.js';
import { readFile } from "fs/promises";
/**
 * Sharp-compatible wrapper using ImageScript
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
            // Clone the image by decoding again
            // Note: ImageScript doesn't have a clone method, so we'll decode on use
            cloned.image = null;
        }
        cloned.format = this.format;
        cloned.encodeOptions = { ...this.encodeOptions };
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

        this.image = await Image.decode(buffer);
        return this.image;
    }

    /**
     * Rotate image by angle or auto-orient based on EXIF
     * Note: ImageScript has limited rotation support
     */
    rotate(angle?: number, options?: RotateOptions): SharpWrapper {
        // ImageScript doesn't have direct rotation, we'll handle this in resize/extract
        // For now, just return self for chaining
        // EXIF auto-orientation is not supported by ImageScript
        return this;
    }

    /**
     * Auto-orient image based on EXIF
     * Alias for rotate() without angle
     */
    autoOrient(): SharpWrapper {
        // EXIF orientation not supported by ImageScript
        return this;
    }

    /**
     * Resize image
     */
    async resize(options?: ResizeOptions | number | null, height?: number | null): Promise<SharpWrapper> {
        const image = await this.getImage();

        let targetWidth: number | null = null;
        let targetHeight: number | null = null;
        let fit: ResizeOptions['fit'] = 'cover';

        if (typeof options === 'number' || options === null) {
            // Legacy signature: resize(width, height)
            targetWidth = options === null ? null : options;
            targetHeight = height === null || height === undefined ? null : height;
        } else if (options) {
            targetWidth = options.width ?? null;
            targetHeight = options.height ?? null;
            fit = options.fit || 'cover';
        }

        // Calculate dimensions based on fit mode
        // Initialize to original dimensions as fallback
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

        // Perform resize
        this.image = image.resize(finalWidth, finalHeight);

        return this;
    }

    /**
     * Extract/crop a region from the image
     */
    extract(region: Region): SharpWrapper {
        // We need to ensure image is loaded
        // Since this is synchronous in Sharp but async in ImageScript, we'll defer
        // This will be handled in toBuffer
        (this as unknown as { _extractRegion?: Region })._extractRegion = region;
        return this;
    }

    /**
     * Trim edges
     * Note: ImageScript doesn't have trim, so this is a no-op for now
     */
    trim(options?: TrimOptions): SharpWrapper {
        // ImageScript doesn't support trim
        // Store options for potential future implementation
        (this as unknown as { _trimOptions?: TrimOptions })._trimOptions = options;
        return this;
    }

    /**
     * Convert to specific format
     */
    toFormat(format: 'jpeg' | 'jpg' | 'png' | 'webp', options?: Record<string, unknown>): SharpWrapper {
        if (format === 'jpg') {
            this.format = 'jpeg';
        } else if (format === 'png' || format === 'jpeg' || format === 'webp') {
            this.format = format;
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
            // If image-size fails, fallback to ImageScript (should be rare)
            // This can happen with unsupported formats or corrupted headers
        }

        // Fallback to ImageScript full decode only if header parsing fails
        const image = await this.getImage();
        return {
            width: image.width,
            height: image.height,
            channels: 4, // RGBA
            hasAlpha: true,
            format: this.format,
        };
    }

    /**
     * Encode image to buffer
     */
    async toBuffer(options?: { resolveWithObject?: boolean }): Promise<Buffer | { data: Buffer; info: OutputInfo }> {
        let image = await this.getImage();

        // Handle extract if specified
        const extractRegion = (this as unknown as { _extractRegion?: Region })._extractRegion;
        if (extractRegion) {
            try {
                image = image.crop(extractRegion.left, extractRegion.top, extractRegion.width, extractRegion.height);
            } catch (error) {
                throw new Error(`Failed to extract region: ${error instanceof Error ? error.message : String(error)}`);
            }
            delete (this as unknown as { _extractRegion?: Region })._extractRegion;
        }

        // Encode based on format
        let encoded: Uint8Array;
        let mimeType: string;

        if (this.format === 'jpeg') {
            const qualityNum = Math.max(1, Math.min(100, (this.encodeOptions.quality as number) ?? 80));
            // ImageScript JPEGQuality is 1-100
            encoded = await image.encodeJPEG(qualityNum as never);
            mimeType = 'image/jpeg';
        } else if (this.format === 'webp') {
            const qualityNum = Math.max(0, Math.min(100, (this.encodeOptions.quality as number) ?? 80));
            // ImageScript WEBPQuality is 0-100 or null
            encoded = await image.encodeWEBP(qualityNum === 100 ? null : (qualityNum as never));
            mimeType = 'image/webp';
        } else {
            // PNG (default) - uses encode() method
            encoded = await image.encode();
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

