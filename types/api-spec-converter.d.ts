declare module 'api-spec-converter' {
  type Format = 
    | 'swagger_1'
    | 'swagger_2'
    | 'openapi_3'
    | 'io_docs'
    | 'api_blueprint'
    | 'google'
    | 'raml'
    | 'wadl';

  type Syntax = 'json' | 'yaml';
  type Order = 'alpha' | 'openapi';

  interface ConvertOptions {
    from: Format;
    to: Format;
    source: string | object;
  }

  interface StringifyOptions {
    syntax?: Syntax;
    order?: Order;
  }

  interface ValidationResult {
    errors?: any[];
    warnings?: any[];
  }

  interface ConvertedSpec {
    fillMissing(): void;
    validate(): Promise<ValidationResult>;
    stringify(options?: StringifyOptions): string;
  }

  interface Converter {
    convert(options: ConvertOptions): Promise<ConvertedSpec>;
    convert(options: ConvertOptions, callback: (err: Error | null, converted: ConvertedSpec) => void): void;
  }

  const Converter: Converter;
  export = Converter;
} 