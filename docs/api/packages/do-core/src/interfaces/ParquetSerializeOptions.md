[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetSerializeOptions

# Interface: ParquetSerializeOptions

Defined in: [packages/do-core/src/parquet-serializer.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L28)

Options for Parquet serialization

## Properties

### compression?

> `optional` **compression**: `"zstd"` \| `"snappy"` \| `"gzip"` \| `"none"`

Defined in: [packages/do-core/src/parquet-serializer.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L30)

Compression algorithm (default: 'zstd')

***

### compressionLevel?

> `optional` **compressionLevel**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L32)

Compression level for zstd (1-22, default: 3)

***

### rowGroupSize?

> `optional` **rowGroupSize**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:34](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L34)

Row group size for batching (default: 1000)

***

### includeSchema?

> `optional` **includeSchema**: `boolean`

Defined in: [packages/do-core/src/parquet-serializer.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L36)

Whether to include schema metadata (default: true)
