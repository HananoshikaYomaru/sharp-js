import type { Metadata } from '../types.js';

/**
 * Extract height from image metadata, accounting for animated images
 * For animated images, height is divided by number of pages
 */
export const extractHeightFromImage = (metadata: Metadata): number => {
    if (metadata.pages && metadata.pages > 1) {
        return metadata.height / metadata.pages;
    }
    return metadata.height;
};

