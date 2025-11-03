// Type definitions matching Sharp's API surface

export type SharpInput =
    | Buffer
    | ArrayBuffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string;

export interface SharpOptions {
    animated?: boolean;
    autoOrient?: boolean;
    failOn?: 'none' | 'truncated' | 'error' | 'warning';
    limitInputPixels?: number | boolean;
    sequentialRead?: boolean;
    density?: number;
    ignoreIcc?: boolean;
    pages?: number;
    page?: number;
}

export interface ResizeOptions {
    width?: number | null;
    height?: number | null;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: number | string;
    background?: string | { r: number; g: number; b: number; alpha?: number };
    kernel?: 'nearest' | 'cubic' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    fastShrinkOnLoad?: boolean;
}

export interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface OutputInfo {
    format: string;
    size: number;
    width: number;
    height: number;
    channels: 1 | 2 | 3 | 4;
    premultiplied?: boolean;
    cropOffsetLeft?: number;
    cropOffsetTop?: number;
    trimOffsetLeft?: number;
    trimOffsetTop?: number;
    pages?: number;
    pageHeight?: number;
}

export interface Metadata {
    format?: string;
    size?: number;
    width: number;
    height: number;
    channels: 1 | 2 | 3 | 4;
    density?: number;
    orientation?: number;
    hasAlpha?: boolean;
    hasProfile?: boolean;
    space?: string;
    depth?: string;
    isProgressive?: boolean;
    pages?: number;
    pageHeight?: number;
}

export interface TrimOptions {
    background?: string | { r: number; g: number; b: number; alpha?: number };
    threshold?: number;
    lineArt?: boolean;
}

export interface RotateOptions {
    background?: string | { r: number; g: number; b: number; alpha?: number };
}

// Project-specific types matching the provided code

export interface PayloadRequest {
    file?: PayloadFile;
    query?: {
        uploadEdits?: UploadEdits;
    };
    payloadUploadSizes?: Record<string, Buffer>;
    payload?: {
        config?: {
            sharp?: unknown;
        };
        logger?: {
            error: (err: unknown) => void;
        };
    };
    t?: (key: string, ...args: unknown[]) => string;
}

export interface PayloadFile {
    data: Buffer;
    mimetype: string;
    size: number;
    name: string;
    tempFilePath?: string;
}

export interface UploadEdits {
    crop?: {
        x: number;
        y: number;
    };
    widthInPixels?: number;
    heightInPixels?: number;
    focalPoint?: {
        x: number;
        y: number;
    };
}

export interface WithMetadata {
    // Metadata options
}

export interface SanitizedConfig {
    sharp?: unknown;
}

export interface Collection {
    config: SanitizedCollectionConfig;
}

export interface SanitizedCollectionConfig {
    slug: string;
    upload?: UploadConfig;
}

export interface UploadConfig {
    staticDir?: string;
    disableLocalStorage?: boolean;
    focalPoint?: boolean;
    imageSizes?: ImageSize[];
    resizeOptions?: ResizeOptions;
    formatOptions?: FormatOptions;
    trimOptions?: TrimOptions;
    constructorOptions?: SharpOptions;
    withMetadata?: WithMetadata;
}

export interface ImageSize {
    name: string;
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: number | string;
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    formatOptions?: FormatOptions;
    trimOptions?: TrimOptions;
    generateImageName?: (args: {
        extension: string;
        height: number;
        originalName: string;
        sizeName: string;
        width: number;
    }) => string;
}

export interface FormatOptions {
    format: 'jpeg' | 'png' | 'webp' | 'avif';
    options?: Record<string, unknown>;
}

export interface ProbedImageSize {
    width: number;
    height: number;
}

export interface FileSize {
    filename: string | null;
    filesize: number | null;
    height: number | null;
    mimeType: string | null;
    width: number | null;
}

export interface FileSizes {
    [name: string]: FileSize;
}

export interface FileToSave {
    buffer: Buffer;
    path: string;
}

export interface FileData {
    filename: string;
    filesize: number;
    width: number;
    height: number;
    mimeType: string;
    sizes?: FileSizes;
    focalX?: number;
    focalY?: number;
    url?: string;
}

export interface ImageSizesResult {
    focalPoint?: UploadEdits['focalPoint'];
    sizeData: FileSizes;
    sizesToSave: FileToSave[];
}

export interface CropImageArgs {
    cropData: UploadEdits['crop'];
    dimensions: ProbedImageSize;
    file: PayloadRequest['file'];
    heightInPixels: number;
    req?: PayloadRequest;
    sharp: SanitizedConfig['sharp'];
    widthInPixels: number;
    withMetadata?: WithMetadata;
}

export interface ResizeArgs {
    config: SanitizedCollectionConfig;
    dimensions: ProbedImageSize;
    file: PayloadRequest['file'];
    mimeType: string;
    req: PayloadRequest;
    savedFilename: string;
    sharp?: unknown;
    staticPath: string;
    uploadEdits?: UploadEdits;
    withMetadata?: WithMetadata;
}

