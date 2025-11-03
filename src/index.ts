// Main entry point - exports Sharp-compatible wrapper and functions

export { cropImage } from './crop-image.js';
export { resizeAndTransformImageSizes } from './resize-and-transform.js';
export { generateFileData } from './generate-file-data.js';
import type sharp from 'sharp';

// Export types
export type * from './types.js';

// Default export - Sharp-compatible factory function
import sharpFactory from './sharp-wrapper.js';
export default sharpFactory as unknown as typeof sharp;

