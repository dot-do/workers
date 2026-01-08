[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / cosineSimilarity

# Function: cosineSimilarity()

> **cosineSimilarity**(`a`, `b`): `number`

Defined in: [packages/do-core/src/mrl.ts:176](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mrl.ts#L176)

Compute the cosine similarity between two vectors.

For unit vectors (normalized), this is equivalent to the dot product.
Returns a value between -1 (opposite) and 1 (identical).

## Parameters

### a

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

First vector

### b

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

Second vector

## Returns

`number`

Cosine similarity (-1 to 1)

## Throws

If vectors have different dimensions
