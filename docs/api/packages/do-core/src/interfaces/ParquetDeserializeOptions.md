[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetDeserializeOptions

# Interface: ParquetDeserializeOptions

Defined in: [packages/do-core/src/parquet-serializer.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L42)

Options for Parquet deserialization

## Properties

### columns?

> `optional` **columns**: `string`[]

Defined in: [packages/do-core/src/parquet-serializer.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L44)

Columns to read (default: all)

***

### limit?

> `optional` **limit**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L46)

Maximum number of rows to read (default: all)

***

### offset?

> `optional` **offset**: `number`

Defined in: [packages/do-core/src/parquet-serializer.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L48)

Number of rows to skip (default: 0)
