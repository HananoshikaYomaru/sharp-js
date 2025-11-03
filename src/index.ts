// Main entry point - exports Sharp-compatible wrapper and functions

export { SharpWrapper } from './sharp-wrapper.js';
export { cropImage } from './crop-image.js';
export { resizeAndTransformImageSizes } from './resize-and-transform.js';
export { generateFileData } from './generate-file-data.js';
import type sharp from 'sharp';

// Export types
export type * from './types.js';

// Default export - Sharp-compatible constructor
import { SharpWrapper } from './sharp-wrapper.js';
export default SharpWrapper as unknown as typeof sharp;

