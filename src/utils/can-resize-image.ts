/**
 * Check if image format supports resizing
 * ImageScript supports: PNG, JPEG, WebP
 */
export const canResizeImage = (mimetype: string): boolean => {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return supportedTypes.includes(mimetype.toLowerCase());
};

