/**
 * Check if mimetype is an image
 */
export const isImage = (mimetype: string): boolean => {
    return mimetype.startsWith('image/');
};

