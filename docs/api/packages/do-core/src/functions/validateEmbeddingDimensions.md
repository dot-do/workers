[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / validateEmbeddingDimensions

# Function: validateEmbeddingDimensions()

> **validateEmbeddingDimensions**(`embedding`, `expectedDimensions`): `void`

Defined in: [packages/do-core/src/mrl.ts:209](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mrl.ts#L209)

Validate that an embedding has the expected dimensions.

## Parameters

### embedding

[`EmbeddingVector`](../type-aliases/EmbeddingVector.md)

The embedding vector to validate

### expectedDimensions

`number`

The expected number of dimensions

## Returns

`void`

## Throws

If dimensions don't match (with helpful error message)
