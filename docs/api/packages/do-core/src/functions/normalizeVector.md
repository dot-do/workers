[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / normalizeVector

# Function: normalizeVector()

> **normalizeVector**(`vector`): `number`[]

Defined in: [packages/do-core/src/mrl.ts:96](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mrl.ts#L96)

Normalize a vector to unit length (L2 normalization).

After truncation, vectors must be re-normalized for cosine similarity
to work correctly. This function normalizes to unit length (magnitude = 1).

## Parameters

### vector

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

The vector to normalize

## Returns

`number`[]

A new vector with unit length

## Throws

If the vector has zero magnitude
