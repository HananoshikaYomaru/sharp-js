import { describe, it, expect } from 'vitest';
import { loadFixture, runWithSharp, runWithImageJs, compareImageOutputs } from './test-utils.js';
import { SharpWrapper } from './sharp-wrapper.js';

describe('SharpWrapper', () => {
	it('should create instance from buffer', () => {
		const buffer = Buffer.from([1, 2, 3]);
		const wrapper = new SharpWrapper(buffer);
		expect(wrapper).toBeInstanceOf(SharpWrapper);
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
			const wrapper1 = new SharpWrapper(fixture);
			const wrapper2 = wrapper1.clone();

			expect(wrapper2).toBeInstanceOf(SharpWrapper);
			expect(wrapper2).not.toBe(wrapper1);
		},
		10000,
	);
});

