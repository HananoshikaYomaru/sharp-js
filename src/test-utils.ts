import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import sharpFactory from './sharp-wrapper.js';
import type { SharpWrapper } from './sharp-wrapper.js';
import type { OutputInfo } from './types.js';
import type { PayloadFile } from './types.js';

/**
 * Load fixture image as Buffer
 */
export const loadFixture = async (imageName: string): Promise<Buffer> => {
	const fixturePath = path.join(process.cwd(), 'fixtures', imageName);
	return await fs.readFile(fixturePath);
};

/**
 * Run operation with Sharp and return result
 */
export const runWithSharp = async (
	input: Buffer,
	operation: (sharp: sharp.Sharp) => sharp.Sharp | Promise<sharp.Sharp>,
): Promise<{ data: Buffer; info: OutputInfo }> => {
	let sharpInstance = sharp(input);
	sharpInstance = await operation(sharpInstance);
	const result = await sharpInstance.toBuffer({ resolveWithObject: true });
	return {
		data: result.data,
		info: {
			format: result.info.format as string,
			size: result.info.size,
			width: result.info.width,
			height: result.info.height,
			channels: result.info.channels as 1 | 2 | 3 | 4,
		},
	};
};

/**
 * Run operation with image-js and return result
 */
export const runWithImageJs = async (
	input: Buffer,
	operation: (wrapper: SharpWrapper) => SharpWrapper | Promise<SharpWrapper>,
): Promise<{ data: Buffer; info: OutputInfo }> => {
	let wrapper = sharpFactory(input);
	wrapper = await operation(wrapper);
	const result = await wrapper.toBuffer({ resolveWithObject: true });

	if (!('data' in result) || !('info' in result)) {
		throw new Error('Unexpected result format from toBuffer');
	}

	return {
		data: result.data,
		info: result.info,
	};
};

/**
 * Compare image outputs - dimensions, file sizes, format
 */
export const compareImageOutputs = (
	sharpResult: { data: Buffer; info: OutputInfo },
	imageJsResult: { data: Buffer; info: OutputInfo },
	tolerance?: { sizeTolerance?: number },
): {
	dimensionsMatch: boolean;
	sizeComparable: boolean;
	formatMatch: boolean;
} => {
	const dimensionsMatch =
		sharpResult.info.width === imageJsResult.info.width &&
		sharpResult.info.height === imageJsResult.info.height;

	const sizeTolerance = tolerance?.sizeTolerance || 0.2; // 20% tolerance for compression differences
	const sizeDiff = Math.abs(sharpResult.info.size - imageJsResult.info.size);
	const sizeComparable = sizeDiff / sharpResult.info.size < sizeTolerance;

	const formatMatch = sharpResult.info.format === imageJsResult.info.format;

	return {
		dimensionsMatch,
		sizeComparable,
		formatMatch,
	};
};

/**
 * Compare buffers with pixel-level tolerance
 */
export const compareBuffers = (
	sharpBuffer: Buffer,
	imageJsBuffer: Buffer,
	tolerance: number = 0.1,
): boolean => {
	// Simple size comparison first
	if (sharpBuffer.length !== imageJsBuffer.length) {
		return false;
	}

	// For exact matches, check byte-by-byte
	// For tolerance, we'd need to decode and compare pixels
	// This is a simplified version
	return sharpBuffer.equals(imageJsBuffer);
};

/**
 * Compare metadata fields
 */
export const compareMetadata = (
	sharpMetadata: Record<string, unknown>,
	imageJsMetadata: Record<string, unknown>,
): {
	widthMatch: boolean;
	heightMatch: boolean;
	channelsMatch: boolean;
} => {
	return {
		widthMatch: sharpMetadata.width === imageJsMetadata.width,
		heightMatch: sharpMetadata.height === imageJsMetadata.height,
		channelsMatch: sharpMetadata.channels === imageJsMetadata.channels,
	};
};

/**
 * Create mock request object for testing
 */
export const createMockRequest = (file: PayloadFile): {
	file: PayloadFile;
	query?: { uploadEdits?: unknown };
	payloadUploadSizes?: Record<string, Buffer>;
	payload?: {
		config?: { sharp?: unknown };
		logger?: { error: (err: unknown) => void };
	};
	t?: (key: string, ...args: unknown[]) => string;
} => {
	return {
		file,
		query: {},
		payloadUploadSizes: {},
		payload: {
			config: {
				sharp: sharpFactory(),
			},
			logger: {
				error: (err: unknown) => {
					console.error('Mock logger error:', err);
				},
			},
		},
		t: (key: string) => key,
	};
};

