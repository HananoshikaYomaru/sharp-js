import { decode } from 'image-js';
import type { ProbedImageSize, PayloadFile } from '../types.js';

/**
 * Get image dimensions from file buffer
 */
export const getImageSize = async (file: PayloadFile): Promise<ProbedImageSize> => {
    try {
        const image = decode(file.data);
        return {
            width: image.width,
            height: image.height,
        };
    } catch (error) {
        throw new Error(`Failed to get image size: ${error instanceof Error ? error.message : String(error)}`);
    }
};

