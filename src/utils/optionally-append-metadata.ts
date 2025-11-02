import type { PayloadRequest, WithMetadata } from '../types.js';
import type { SharpWrapper } from '../sharp-wrapper.js';

/**
 * Optionally append metadata to image
 * Note: ImageScript has limited metadata support compared to Sharp
 */
export const optionallyAppendMetadata = async <T extends SharpWrapper>(args: {
    req: PayloadRequest;
    sharpFile: T;
    withMetadata?: WithMetadata;
}): Promise<T> => {
    // ImageScript has limited metadata support
    // For now, just return the file as-is
    // This could be extended if ImageScript adds metadata support
    return args.sharpFile;
};

