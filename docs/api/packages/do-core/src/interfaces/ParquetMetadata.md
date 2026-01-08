[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetMetadata

# Interface: ParquetMetadata

Defined in: [packages/do-core/src/parquet-serializer.ts:66](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L66)

Parquet file metadata

## Properties

### rowCount

> **rowCount**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:68](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L68)

Number of rows in the file

***

### rowGroupCount

> **rowGroupCount**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L70)

Number of row groups

***

### schema

> **schema**: [`ParquetSchemaField`](ParquetSchemaField.md)[]

Defined in: [packages/do-core/src/parquet-serializer.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L72)

Schema definition

***

### fileSize

> **fileSize**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:74](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L74)

File size in bytes

***

### compression

> **compression**: `string`

Defined in: [packages/do-core/src/parquet-serializer.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L76)

Compression codec used

***

### keyValueMetadata?

> `optional` **keyValueMetadata**: `Record`\<`string`, `string`\>

Defined in: [packages/do-core/src/parquet-serializer.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L78)

Custom key-value metadata
