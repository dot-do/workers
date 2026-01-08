[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ParquetSerializer

# Class: ParquetSerializer

Defined in: [packages/do-core/src/parquet-serializer.ts:679](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L679)

ParquetSerializer - Parquet-compatible binary serialization for Things

Provides efficient columnar-like storage with compression support.
Optimized for Cloudflare Workers (no WASM dependencies).

## Implements

- [`IParquetSerializer`](../interfaces/IParquetSerializer.md)

## Constructors

### Constructor

> **new ParquetSerializer**(): `ParquetSerializer`

#### Returns

`ParquetSerializer`

## Methods

### getThingsSchema()

> **getThingsSchema**(): [`ParquetSchemaField`](../interfaces/ParquetSchemaField.md)[]

Defined in: [packages/do-core/src/parquet-serializer.ts:683](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L683)

Get the Parquet schema for Things

#### Returns

[`ParquetSchemaField`](../interfaces/ParquetSchemaField.md)[]

#### Implementation of

[`IParquetSerializer`](../interfaces/IParquetSerializer.md).[`getThingsSchema`](../interfaces/IParquetSerializer.md#getthingsschema)

***

### serialize()

> **serialize**(`things`, `options?`): `Promise`\<[`ParquetSerializeResult`](../interfaces/ParquetSerializeResult.md)\>

Defined in: [packages/do-core/src/parquet-serializer.ts:700](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L700)

Serialize Things to Parquet-compatible binary format

#### Parameters

##### things

[`Thing`](../interfaces/Thing.md)[]

##### options?

[`ParquetSerializeOptions`](../interfaces/ParquetSerializeOptions.md)

#### Returns

`Promise`\<[`ParquetSerializeResult`](../interfaces/ParquetSerializeResult.md)\>

#### Implementation of

[`IParquetSerializer`](../interfaces/IParquetSerializer.md).[`serialize`](../interfaces/IParquetSerializer.md#serialize)

***

### deserialize()

> **deserialize**(`buffer`, `options?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/parquet-serializer.ts:831](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L831)

Deserialize Things from Parquet-compatible binary format

#### Parameters

##### buffer

`ArrayBuffer`

##### options?

[`ParquetDeserializeOptions`](../interfaces/ParquetDeserializeOptions.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

#### Implementation of

[`IParquetSerializer`](../interfaces/IParquetSerializer.md).[`deserialize`](../interfaces/IParquetSerializer.md#deserialize)

***

### getMetadata()

> **getMetadata**(`buffer`): `Promise`\<[`ParquetMetadata`](../interfaces/ParquetMetadata.md)\>

Defined in: [packages/do-core/src/parquet-serializer.ts:935](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/parquet-serializer.ts#L935)

Read metadata from Parquet buffer without loading all data

#### Parameters

##### buffer

`ArrayBuffer`

#### Returns

`Promise`\<[`ParquetMetadata`](../interfaces/ParquetMetadata.md)\>

#### Implementation of

[`IParquetSerializer`](../interfaces/IParquetSerializer.md).[`getMetadata`](../interfaces/IParquetSerializer.md#getmetadata)
