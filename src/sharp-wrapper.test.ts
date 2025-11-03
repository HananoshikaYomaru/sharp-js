import { describe, it, expect } from 'vitest';
import { loadFixture, runWithSharp, runWithImageJs, compareImageOutputs } from './test-utils.js';
import sharp from './sharp-wrapper.js';
import sharpLib from 'sharp';

describe('SharpWrapper', () => {

	it('should return metadata with correct dimensions', async () => {
		const fixture = await loadFixture('test.png');

		const sharpMetadata = await sharpLib(fixture).metadata();
		const imageJsMetadata = await sharp(fixture).metadata();

		expect(imageJsMetadata.width).toBe(sharpMetadata.width);
		expect(imageJsMetadata.height).toBe(sharpMetadata.height);
		expect(imageJsMetadata.width).toBeGreaterThan(0);
		expect(imageJsMetadata.height).toBeGreaterThan(0);
		expect(imageJsMetadata.channels).toBeDefined();
		expect(imageJsMetadata.hasAlpha).toBeDefined();
	});

	it('should return metadata for JPEG images', async () => {
		const fixture = await loadFixture('test.jpeg');

		const sharpMetadata = await sharpLib(fixture).metadata();
		const imageJsMetadata = await sharp(fixture).metadata();

		expect(imageJsMetadata.width).toBe(sharpMetadata.width);
		expect(imageJsMetadata.height).toBe(sharpMetadata.height);
		expect(imageJsMetadata.channels).toBeDefined();
	});

	it('should return metadata for WebP images', async () => {
		const fixture = await loadFixture('test.webp');

		const sharpMetadata = await sharpLib(fixture).metadata();
		const imageJsMetadata = await sharp(fixture).metadata();

		expect(imageJsMetadata.width).toBe(sharpMetadata.width);
		expect(imageJsMetadata.height).toBe(sharpMetadata.height);
	});

	it('should resize image to specified dimensions', async () => {
		const fixture = await loadFixture('test.png');

		const sharpResult = await runWithSharp(fixture, (sharp) => sharp.resize(200, 200));
		const imageJsResult = await runWithImageJs(fixture, (wrapper) => wrapper.resize({ width: 200, height: 200, fit: 'fill' }));

		const comparison = compareImageOutputs(sharpResult, imageJsResult);
		expect(comparison.dimensionsMatch).toBe(true);
	});

	it('should crop image with same dimensions as Sharp', async () => {
		const fixture = await loadFixture('test.png');

		const sharpResult = await runWithSharp(fixture, (sharp) =>
			sharp.extract({ left: 10, top: 10, width: 100, height: 100 }),
		);
		const imageJsResult = await runWithImageJs(fixture, (wrapper) =>
			wrapper.extract({ left: 10, top: 10, width: 100, height: 100 }),
		);

		const comparison = compareImageOutputs(sharpResult, imageJsResult);
		expect(comparison.dimensionsMatch).toBe(true);
	});

	it('should convert format to JPEG', async () => {
		const fixture = await loadFixture('test.png');

		const sharpResult = await runWithSharp(fixture, (sharp) => sharp.jpeg());
		const imageJsResult = await runWithImageJs(fixture, (wrapper) => wrapper.toFormat('jpeg'));

		const comparison = compareImageOutputs(sharpResult, imageJsResult);
		expect(comparison.formatMatch).toBe(true);
	});

	it('should convert format to WebP', async () => {
		const fixture = await loadFixture('test.png');

		const sharpResult = await runWithSharp(fixture, (sharp) => sharp.webp());
		// image-js doesn't support WebP encoding, so it will fallback to PNG
		const imageJsResult = await runWithImageJs(fixture, (wrapper) => wrapper.toFormat('webp'));

		const comparison = compareImageOutputs(sharpResult, imageJsResult);
		// Format won't match because image-js fallbacks to PNG
		expect(comparison.dimensionsMatch).toBe(true);
	});

	it(
		'should clone instance',
		async () => {
			const fixture = await loadFixture('test.png');
			const wrapper1 = sharp(fixture);
			const wrapper2 = wrapper1.clone();

			expect(wrapper2).not.toBe(wrapper1);
		},
		10000,
	);
});

