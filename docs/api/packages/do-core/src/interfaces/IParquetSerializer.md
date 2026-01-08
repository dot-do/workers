[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IParquetSerializer

# Interface: IParquetSerializer

Defined in: [packages/do-core/src/parquet-serializer.ts:94](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L94)

ParquetSerializer interface

## Methods

### serialize()

> **serialize**(`things`, `options?`): `Promise`\<[`ParquetSerializeResult`](ParquetSerializeResult.md)\>

Defined in: [packages/do-core/src/parquet-serializer.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L95)

#### Parameters

##### things

[`Thing`](Thing.md)[]

##### options?

[`ParquetSerializeOptions`](ParquetSerializeOptions.md)

#### Returns

`Promise`\<[`ParquetSerializeResult`](ParquetSerializeResult.md)\>

***

### deserialize()

> **deserialize**(`buffer`, `options?`): `Promise`\<[`Thing`](Thing.md)[]\>

Defined in: [packages/do-core/src/parquet-serializer.ts:96](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L96)

#### Parameters

##### buffer

`ArrayBuffer`

##### options?

[`ParquetDeserializeOptions`](ParquetDeserializeOptions.md)

#### Returns

`Promise`\<[`Thing`](Thing.md)[]\>

***

### getMetadata()

> **getMetadata**(`buffer`): `Promise`\<[`ParquetMetadata`](ParquetMetadata.md)\>

Defined in: [packages/do-core/src/parquet-serializer.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L97)

#### Parameters

##### buffer

`ArrayBuffer`

#### Returns

`Promise`\<[`ParquetMetadata`](ParquetMetadata.md)\>

***

### getThingsSchema()

> **getThingsSchema**(): [`ParquetSchemaField`](ParquetSchemaField.md)[]

Defined in: [packages/do-core/src/parquet-serializer.ts:98](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L98)

#### Returns

[`ParquetSchemaField`](ParquetSchemaField.md)[]
