[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetSerializeResult

# Interface: ParquetSerializeResult

Defined in: [packages/do-core/src/parquet-serializer.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L84)

Result of serialization

## Properties

### buffer

> **buffer**: `ArrayBuffer`

Defined in: [packages/do-core/src/parquet-serializer.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L86)

The Parquet file as an ArrayBuffer

***

### metadata

> **metadata**: [`ParquetMetadata`](ParquetMetadata.md)

Defined in: [packages/do-core/src/parquet-serializer.ts:88](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L88)

Metadata about the generated file
