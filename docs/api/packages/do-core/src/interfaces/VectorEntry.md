[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / VectorEntry

# Interface: VectorEntry

Defined in: [packages/do-core/src/cold-vector-search.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L32)

Vector entry stored in cold storage (Parquet partitions)

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:34](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L34)

Unique identifier for the vector

***

### embedding

> **embedding**: `Float32Array`

Defined in: [packages/do-core/src/cold-vector-search.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L36)

Full 768-dimensional embedding

***

### sourceTable

> **sourceTable**: `"things"` \| `"relationships"`

Defined in: [packages/do-core/src/cold-vector-search.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L38)

Source table: 'things' or 'relationships'

***

### sourceRowid

> **sourceRowid**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:40](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L40)

Rowid of the source record

***

### metadata

> **metadata**: `object`

Defined in: [packages/do-core/src/cold-vector-search.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L42)

Additional metadata

#### ns

> **ns**: `string`

Namespace for isolation

#### type

> **type**: `string` \| `null`

Type of the source entity

#### textContent

> **textContent**: `string` \| `null`

Original text content that was embedded
