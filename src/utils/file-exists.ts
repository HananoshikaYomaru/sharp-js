import { access } from 'fs/promises';

/**
 * Check if file exists
 */
export const fileExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

