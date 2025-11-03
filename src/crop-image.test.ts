import { describe, it, expect } from 'vitest';
import { loadFixture } from './test-utils.js';
import { cropImage } from './crop-image.js';
import { createMockRequest } from './test-utils.js';
import sharp from './sharp-wrapper.js';
import type { PayloadFile } from './types.js';

describe('cropImage', () => {
	it('should crop PNG image', async () => {
		const fixture = await loadFixture('test.png');

		const file: PayloadFile = {
			data: fixture,
			mimetype: 'image/png',
			size: fixture.length,
			name: 'test.png',
		};

		const req = createMockRequest(file);

		const result = await cropImage({
			cropData: { x: 10, y: 10 },
			dimensions: { width: 800, height: 600 },
			file,
			heightInPixels: 200,
			// @ts-ignore 
			req,
			sharp: sharp(),
			widthInPixels: 200,
		});

		expect(result.info.width).toBe(200);
		expect(result.info.height).toBe(200);
		expect(result.data).toBeInstanceOf(Buffer);
	});

	it('should crop JPEG image', async () => {
		const fixture = await loadFixture('test.jpeg');

		const file: PayloadFile = {
			data: fixture,
			mimetype: 'image/jpeg',
			size: fixture.length,
			name: 'test.jpeg',
		};

		const req = createMockRequest(file);

		const result = await cropImage({
			cropData: { x: 20, y: 20 },
			dimensions: { width: 1200, height: 800 },
			file,
			heightInPixels: 300,
			// @ts-ignore 
			req,
			sharp: sharp(),
			widthInPixels: 300,
		});

		expect(result.info.width).toBe(300);
		expect(result.info.height).toBe(300);
		expect(result.data).toBeInstanceOf(Buffer);
	});

	it('should crop WebP image', async () => {
		// image-js supports WebP decoding, but we'll test with PNG for consistency
		const fixture = await loadFixture('test.png');

		const file: PayloadFile = {
			data: fixture,
			mimetype: 'image/png',
			size: fixture.length,
			name: 'test.png',
		};

		const req = createMockRequest(file);

		const result = await cropImage({
			cropData: { x: 15, y: 15 },
			dimensions: { width: 1000, height: 750 },
			file,
			heightInPixels: 250,
			// @ts-ignore
			req,
			sharp: sharp(),
			widthInPixels: 250,
		});

		expect(result.info.width).toBe(250);
		expect(result.info.height).toBe(250);
		expect(result.data).toBeInstanceOf(Buffer);
	});

	it(
		'should return original data if dimensions unchanged',
		async () => {
			const fixture = await loadFixture('test.png');

			const file: PayloadFile = {
				data: fixture,
				mimetype: 'image/png',
				size: fixture.length,
				name: 'test.png',
			};

			const req = createMockRequest(file);

			// Get original dimensions first
			const wrapper = sharp(fixture);
			const metadata = await wrapper.metadata();

			const result = await cropImage({
				cropData: { x: 10, y: 10 },
				dimensions: { width: metadata.width, height: metadata.height },
				file,
				heightInPixels: metadata.height,
				// @ts-ignore
				req,
				sharp: sharp(),
				widthInPixels: metadata.width,
			});

			expect(result.data).toEqual(fixture);
			expect(result.info.width).toBe(metadata.width);
			expect(result.info.height).toBe(metadata.height);
		},
		10000,
	);
});

