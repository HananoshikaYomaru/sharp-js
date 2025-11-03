# sharp-js

A Sharp-compatible pure JavaScript image processing library using [image-js](https://github.com/image-js/image-js). This library provides a drop-in replacement for Sharp's API, making it perfect for environments where native dependencies aren't feasible (e.g., edge runtimes, serverless functions, or pure JavaScript environments).

## Features

- **Sharp-compatible API** - Drop-in replacement for Sharp with the same method chaining interface
- **Pure JavaScript** - No native dependencies, works anywhere Node.js runs
- **Image Processing Operations**:
  - Resize with multiple fit modes (cover, contain, fill, inside, outside)
  - Crop/extract regions
  - Format conversion (PNG, JPEG; WebP decoding only, encoding fallback to PNG)
  - Image manipulation utilities
- **Multi-size Generation** - Generate multiple image sizes with focal point support
- **TypeScript Support** - Full type definitions included

## Installation

```bash
npm install sharp-js
# or
pnpm add sharp-js
# or
yarn add sharp-js
```

## Usage

### Basic Usage

```typescript
import sharp from 'sharp-js';

// Resize an image
const resized = await sharp(inputBuffer)
  .resize(800, 600)
  .toBuffer();

// Crop an image
const cropped = await sharp(inputBuffer)
  .extract({ left: 100, top: 100, width: 400, height: 300 })
  .toBuffer();

// Convert format
const jpeg = await sharp(inputBuffer)
  .toFormat('jpeg', { quality: 80 })
  .toBuffer();
```

### Advanced Usage

```typescript
import { cropImage, resizeAndTransformImageSizes, generateFileData } from 'sharp-js';

// Crop with percentage-based coordinates
const cropped = await cropImage({
  cropData: { x: 10, y: 20 },
  dimensions: { width: 1000, height: 800 },
  file: { data: buffer, mimetype: 'image/png', size: buffer.length, name: 'image.png' },
  heightInPixels: 400,
  widthInPixels: 500,
  // ... other options
});

// Generate multiple sizes with focal point
const result = await resizeAndTransformImageSizes({
  config: { upload: { imageSizes: [...] } },
  dimensions: { width: 2000, height: 1500 },
  file: { /* file object */ },
  // ... other options
});
```

## API

The API closely follows Sharp's interface. Key methods include:

- `sharp(input)` - Create a new instance
- `.resize(options)` - Resize image with fit modes
- `.extract(region)` - Crop/extract region
- `.toFormat(format, options)` - Convert image format
- `.toBuffer(options)` - Get output as buffer
- `.metadata()` - Get image metadata
- `.clone()` - Clone instance for multiple outputs

### Resize Options

```typescript
sharp(buffer).resize({
  width: 800,
  height: 600,
  fit: 'cover', // 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position: 'center'
});
```

### Format Conversion

Supported formats:
- `png` - PNG format
- `jpeg` / `jpg` - JPEG format
- `webp` - WebP format

```typescript
sharp(buffer).toFormat('jpeg', { quality: 80 });
```

## Limitations

Compared to Sharp, this library has some limitations:

1. **WebP Encoding** - image-js cannot encode WebP files. WebP encoding requests will fallback to PNG format. WebP decoding is supported.

2. **EXIF Auto-orientation** - Automatic EXIF orientation correction is not supported.

3. **Animated Images** - Limited support for animated images (GIF, WebP). Only the first frame is processed.

4. **AVIF Support** - AVIF format is not supported and will fallback to PNG.

5. **Metadata** - Limited metadata preservation compared to Sharp.

6. **Performance** - Pure JavaScript implementation is slower than Sharp's native performance, especially for large images.

## Cross-Testing with Sharp

The library includes cross-testing utilities to verify compatibility with Sharp:

```typescript
import { loadFixture, runWithSharp, runWithImageJs, compareImageOutputs } from 'sharp-js/test-utils';

const fixture = await loadFixture('test.png');
const sharpResult = await runWithSharp(fixture, (sharp) => sharp.resize(200, 200));
const imageJsResult = await runWithImageJs(fixture, (wrapper) => wrapper.resize({ width: 200, height: 200 }));

const comparison = compareImageOutputs(sharpResult, imageJsResult);
// comparison.dimensionsMatch, comparison.sizeComparable, comparison.formatMatch
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

## Testing

The test suite includes:
- Unit tests for all core operations
- Cross-tests comparing output with Sharp
- Tests using fixtures (PNG, JPEG, WebP)

```bash
pnpm test
```


### Benchmarks

```
 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > resize 9978ms
     name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · Sharp        3.7496  264.06  273.31  266.69  267.30  273.31  273.31  273.31  ±0.72%       10
   · image-js     2.5337  391.67  397.87  394.69  396.13  397.87  397.87  397.87  ±0.34%       10

 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > crop/extract 5985ms
     name              hz      min      max     mean      p75      p99     p995     p999     rme  samples
   · Sharp        86.8452  11.2835  11.8265  11.5147  11.5745  11.8265  11.8265  11.8265  ±0.32%       44
   · image-js      2.8017   352.80   359.75   356.92   358.74   359.75   359.75   359.75  ±0.40%       10

 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > format conversion to JPEG 13819ms
     name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · Sharp        3.1068  313.74  336.65  321.88  324.58  336.65  336.65  336.65  ±1.42%       10
   · image-js     1.6641  594.84  609.18  600.92  606.41  609.18  609.18  609.18  ±0.57%       10

 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > format conversion to WebP 47962ms
     name             hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · Sharp        0.6763  1,470.70  1,489.91  1,478.61  1,481.45  1,489.91  1,489.91  1,489.91  ±0.26%       10
   · image-js     0.5849  1,693.34  1,767.95  1,709.70  1,713.08  1,767.95  1,767.95  1,767.95  ±0.92%       10

 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > decode image 1268ms
     name                 hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · Sharp          1,813.40  0.4845  0.7527  0.5515  0.5586  0.6593  0.6985  0.7527  ±0.32%      907
   · image-js    428,427.19  0.0020  0.2646  0.0023  0.0023  0.0031  0.0061  0.0336  ±0.36%   214214

 ✓ src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > clone instance 1228ms
     name                   hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · image-js    4,432,529.89  0.0001  1.7772  0.0002  0.0002  0.0004  0.0006  0.0016  ±1.09%  2216265

 BENCH  Summary

  Sharp - src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > resize
    1.48x faster than image-js

  Sharp - src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > crop/extract
    31.00x faster than image-js

  Sharp - src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > format conversion to JPEG
    1.87x faster than image-js

  Sharp - src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > format conversion to WebP
    1.16x faster than image-js

  image-js - src/sharp-wrapper.bench.ts > SharpWrapper Performance Benchmarks > decode image
    236.26x faster than Sharp
```

## License

MIT

## Repository

https://github.com/hananoshikayomaru/sharp-js

## Acknowledgments

- [image-js](https://github.com/image-js/image-js) - The underlying pure JavaScript image processing library
- [Sharp](https://github.com/lovell/sharp) - The reference implementation this library aims to be compatible with

