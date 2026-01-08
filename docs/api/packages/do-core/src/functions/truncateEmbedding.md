[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / truncateEmbedding

# Function: truncateEmbedding()

> **truncateEmbedding**(`embedding`, `targetDimensions`): `number`[]

Defined in: [packages/do-core/src/mrl.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mrl.ts#L60)

Truncate an embedding to a smaller dimension by taking the first N components.

MRL (Matryoshka Representation Learning) embeddings are trained such that
the first N dimensions contain the most important semantic information.

## Parameters

### embedding

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

The full embedding vector

### targetDimensions

[`MRLDimension`](../type-aliases/MRLDimension.md)

The target number of dimensions

## Returns

`number`[]

The truncated embedding vector

## Throws

If input is shorter than target dimensions

## Throws

If targetDimensions is not a supported MRL dimension
