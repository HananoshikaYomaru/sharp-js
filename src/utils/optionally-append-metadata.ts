import type { PayloadRequest, WithMetadata } from '../types.js';
import type { SharpWrapper } from '../sharp-wrapper.js';

/**
 * Optionally append metadata to image
 * Note: image-js has limited metadata support compared to Sharp
 */
export const optionallyAppendMetadata = async <T extends SharpWrapper>(args: {
    req: PayloadRequest;
    sharpFile: T;
    withMetadata?: WithMetadata;
}): Promise<T> => {
    // image-js has limited metadata support
    // For now, just return the file as-is
    // This could be extended if image-js adds metadata support
    return args.sharpFile;
};

