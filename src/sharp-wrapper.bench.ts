import { bench, describe, beforeAll } from 'vitest';
import { loadFixture, runWithSharp, runWithImageJs } from './test-utils.js';
import sharp from './sharp-wrapper.js';
import Sharp from 'sharp';

describe('SharpWrapper Performance Benchmarks', async () => {
    let pngFixture: Buffer = await loadFixture('test.png');

    describe('resize', () => {
        bench('Sharp', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithSharp(pngFixture, (sharp) => sharp.resize(200, 200));
            }
        });

        bench('image-js', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithImageJs(pngFixture, (wrapper) => wrapper.resize({ width: 200, height: 200, fit: 'fill' }));
            }
        });
    });

    describe('crop/extract', () => {
        bench('Sharp', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithSharp(pngFixture, (sharp) => sharp.extract({ left: 10, top: 10, width: 100, height: 100 }));
            }
        });

        bench('image-js', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithImageJs(pngFixture, (wrapper) => wrapper.extract({ left: 10, top: 10, width: 100, height: 100 }));
            }
        });
    });

    describe('format conversion to JPEG', () => {
        bench('Sharp', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithSharp(pngFixture, (sharp) => sharp.jpeg());
            }
        });

        bench('image-js', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithImageJs(pngFixture, (wrapper) => wrapper.toFormat('jpeg'));
            }
        });
    });

    describe('format conversion to WebP', () => {
        bench('Sharp', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithSharp(pngFixture, (sharp) => sharp.webp());
            }
        });

        bench('image-js', async () => {
            for (let i = 0; i < 1; i++) {
                await runWithImageJs(pngFixture, (wrapper) => wrapper.toFormat('webp'));
            }
        });
    });

    describe('decode image', () => {
        bench('Sharp', async () => {
            for (let i = 0; i < 1; i++) {
                await Sharp(pngFixture).metadata();
            }
        });

        bench('image-js', async () => {
            for (let i = 0; i < 1; i++) {
                const wrapper = sharp(pngFixture);
                await wrapper.metadata();
            }
        });
    });

    describe('clone instance', () => {
        bench('image-js', () => {
            for (let i = 0; i < 1; i++) {
                const wrapper1 = sharp(pngFixture);
                wrapper1.clone();
            }
        });
    });
});

