/**
 * Check if image format supports resizing
 * image-js supports: PNG, JPEG (WebP decoding only, encoding fallback to PNG)
 */
export const canResizeImage = (mimetype: string): boolean => {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return supportedTypes.includes(mimetype.toLowerCase());
};

