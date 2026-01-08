[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetSchemaField

# Interface: ParquetSchemaField

Defined in: [packages/do-core/src/parquet-serializer.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L54)

Parquet schema field definition

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/parquet-serializer.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L55)

***

### type

> **type**: `"INT64"` \| `"DOUBLE"` \| `"BYTE_ARRAY"` \| `"BOOLEAN"` \| `"INT32"`

Defined in: [packages/do-core/src/parquet-serializer.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L56)

***

### optional?

> `optional` **optional**: `boolean`

Defined in: [packages/do-core/src/parquet-serializer.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L58)

Whether the field can be null

***

### logicalType?

> `optional` **logicalType**: `string`

Defined in: [packages/do-core/src/parquet-serializer.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L60)

Logical type annotation (e.g., 'UTF8', 'JSON', 'TIMESTAMP_MILLIS')
