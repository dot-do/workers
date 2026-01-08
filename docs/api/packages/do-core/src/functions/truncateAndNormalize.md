[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / truncateAndNormalize

# Function: truncateAndNormalize()

> **truncateAndNormalize**(`embedding`, `targetDimensions`): `number`[]

Defined in: [packages/do-core/src/mrl.ts:127](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mrl.ts#L127)

Truncate an embedding and re-normalize in one operation.

This is the recommended way to prepare embeddings for similarity search
after MRL truncation, as it ensures the output is properly normalized.

## Parameters

### embedding

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

The full embedding vector

### targetDimensions

[`MRLDimension`](../type-aliases/MRLDimension.md)

The target number of dimensions

## Returns

`number`[]

The truncated and normalized embedding vector
