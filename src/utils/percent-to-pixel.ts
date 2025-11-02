/**
 * Convert a percentage value to pixel value based on dimension
 */
export const percentToPixel = (value: number, dimension: number): number => {
    return Math.floor((value / 100) * dimension);
};

