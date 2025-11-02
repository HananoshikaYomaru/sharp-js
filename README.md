# sharp-js

A Sharp-compatible pure JavaScript image processing library using [ImageScript](https://github.com/matmen/ImageScript). This library provides a drop-in replacement for Sharp's API, making it perfect for environments where native dependencies aren't feasible (e.g., edge runtimes, serverless functions, or pure JavaScript environments).

## Features

- **Sharp-compatible API** - Drop-in replacement for Sharp with the same method chaining interface
- **Pure JavaScript** - No native dependencies, works anywhere Node.js runs
- **Image Processing Operations**:
  - Resize with multiple fit modes (cover, contain, fill, inside, outside)
  - Crop/extract regions
  - Format conversion (PNG, JPEG, WebP)
  - Image manipulation utilities
- **Multi-size Generation** - Generate multiple image sizes with focal point support
- **TypeScript Support** - Full type definitions included

## Installation

### From npm
```bash
npm install sharp-js
# or
pnpm add sharp-js
# or
yarn add sharp-js
```

### From GitHub Packages
```bash
npm install @yomaru/sharp-js
# or
pnpm add @yomaru/sharp-js
# or
yarn add @yomaru/sharp-js
```

## Usage

### Basic Usage

```typescript
import sharp from '@yomaru/sharp-js';

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
import { cropImage, resizeAndTransformImageSizes, generateFileData } from '@yomaru/sharp-js';

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

1. **WebP Decoding** - ImageScript cannot decode WebP files directly. You'll need to convert WebP to PNG/JPEG first using Sharp or another tool for input processing.

2. **EXIF Auto-orientation** - Automatic EXIF orientation correction is not supported.

3. **Animated Images** - Limited support for animated images (GIF, WebP). Only the first frame is processed.

4. **AVIF Support** - AVIF format is not supported and will fallback to PNG.

5. **Metadata** - Limited metadata preservation compared to Sharp.

6. **Performance** - Pure JavaScript implementation is slower than Sharp's native performance, especially for large images.

## Cross-Testing with Sharp

The library includes cross-testing utilities to verify compatibility with Sharp:

```typescript
import { loadFixture, runWithSharp, runWithImageScript, compareImageOutputs } from '@yomaru/sharp-js/test-utils';

const fixture = await loadFixture('test.png');
const sharpResult = await runWithSharp(fixture, (sharp) => sharp.resize(200, 200));
const imageScriptResult = await runWithImageScript(fixture, (wrapper) => wrapper.resize({ width: 200, height: 200 }));

const comparison = compareImageOutputs(sharpResult, imageScriptResult);
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

## License

MIT

## Repository

https://github.com/hananoshikayomaru/sharp-js

## Acknowledgments

- [ImageScript](https://github.com/matmen/ImageScript) - The underlying pure JavaScript image processing library
- [Sharp](https://github.com/lovell/sharp) - The reference implementation this library aims to be compatible with

