/**
 * MRL (Matryoshka Representation Learning) Utilities
 *
 * Provides embedding truncation and normalization for MRL-trained models.
 * MRL embeddings can be truncated to smaller dimensions while preserving
 * semantic similarity properties.
 *
 * This module supports the tiered storage strategy:
 * - Hot storage: 256-dim embeddings in Durable Objects (fast approximate search)
 * - Cold storage: 768-dim embeddings in R2 (full precision reranking)
 *
 * @see workers-hujpt - MRL truncation and normalization
 *
 * RED PHASE: This file contains type definitions and stub implementations.
 * All functions throw "Not implemented" errors until GREEN phase.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported MRL truncation dimensions.
 * These are the standard dimensions that MRL models support for truncation.
 */
export type MRLDimension = 64 | 128 | 256 | 512 | 768

/**
 * Embedding vector type - supports both regular arrays and typed arrays.
 */
export type EmbeddingVector = number[] | Float32Array

/**
 * Supported dimensions for MRL truncation.
 */
export const SUPPORTED_DIMENSIONS: readonly MRLDimension[] = [64, 128, 256, 512, 768] as const

/**
 * Default output dimensions for EmbeddingGemma-300M model.
 * Workers AI @cf/google/embeddinggemma-300m produces 768-dimensional vectors.
 */
export const EMBEDDINGGEMMA_DIMENSIONS = 768

// ============================================================================
// Stub Implementations (RED Phase)
// ============================================================================

/**
 * Truncate an embedding to a smaller dimension by taking the first N components.
 *
 * MRL (Matryoshka Representation Learning) embeddings are trained such that
 * the first N dimensions contain the most important semantic information.
 *
 * @param embedding - The full embedding vector
 * @param targetDimensions - The target number of dimensions
 * @returns The truncated embedding vector
 * @throws If input is shorter than target dimensions
 * @throws If targetDimensions is not a supported MRL dimension
 */
export function truncateEmbedding(
  embedding: EmbeddingVector,
  targetDimensions: MRLDimension
): number[] {
  // Validate target dimension is supported
  if (!SUPPORTED_DIMENSIONS.includes(targetDimensions)) {
    throw new Error(
      `Unsupported MRL dimension: ${targetDimensions}. Supported: ${SUPPORTED_DIMENSIONS.join(', ')}`
    )
  }

  // Validate input is long enough
  if (embedding.length < targetDimensions) {
    throw new Error(
      `Cannot truncate embedding of length ${embedding.length} to ${targetDimensions} dimensions`
    )
  }

  // Take the first N dimensions
  const result: number[] = new Array(targetDimensions)
  for (let i = 0; i < targetDimensions; i++) {
    result[i] = embedding[i]
  }
  return result
}

/**
 * Normalize a vector to unit length (L2 normalization).
 *
 * After truncation, vectors must be re-normalized for cosine similarity
 * to work correctly. This function normalizes to unit length (magnitude = 1).
 *
 * @param vector - The vector to normalize
 * @returns A new vector with unit length
 * @throws If the vector has zero magnitude
 */
export function normalizeVector(vector: EmbeddingVector): number[] {
  // Compute magnitude (L2 norm)
  let sumSquares = 0
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i]
  }
  const magnitude = Math.sqrt(sumSquares)

  // Cannot normalize zero vector
  if (magnitude === 0) {
    throw new Error('Cannot normalize zero vector')
  }

  // Normalize to unit length
  const result: number[] = new Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] / magnitude
  }
  return result
}

/**
 * Truncate an embedding and re-normalize in one operation.
 *
 * This is the recommended way to prepare embeddings for similarity search
 * after MRL truncation, as it ensures the output is properly normalized.
 *
 * @param embedding - The full embedding vector
 * @param targetDimensions - The target number of dimensions
 * @returns The truncated and normalized embedding vector
 */
export function truncateAndNormalize(
  embedding: EmbeddingVector,
  targetDimensions: MRLDimension
): number[] {
  // Validate target dimension is supported
  if (!SUPPORTED_DIMENSIONS.includes(targetDimensions)) {
    throw new Error(
      `Unsupported MRL dimension: ${targetDimensions}. Supported: ${SUPPORTED_DIMENSIONS.join(', ')}`
    )
  }

  // Validate input is long enough
  if (embedding.length < targetDimensions) {
    throw new Error(
      `Cannot truncate embedding of length ${embedding.length} to ${targetDimensions} dimensions`
    )
  }

  // Compute magnitude of truncated portion in one pass
  let sumSquares = 0
  for (let i = 0; i < targetDimensions; i++) {
    sumSquares += embedding[i] * embedding[i]
  }
  const magnitude = Math.sqrt(sumSquares)

  // Cannot normalize zero vector
  if (magnitude === 0) {
    throw new Error('Cannot normalize zero vector')
  }

  // Truncate and normalize in one pass
  const result: number[] = new Array(targetDimensions)
  for (let i = 0; i < targetDimensions; i++) {
    result[i] = embedding[i] / magnitude
  }
  return result
}

/**
 * Compute the cosine similarity between two vectors.
 *
 * For unit vectors (normalized), this is equivalent to the dot product.
 * Returns a value between -1 (opposite) and 1 (identical).
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (-1 to 1)
 * @throws If vectors have different dimensions
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  // Compute dot product and magnitudes in one pass
  let dotProduct = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)

  // Handle zero magnitude case
  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

/**
 * Validate that an embedding has the expected dimensions.
 *
 * @param embedding - The embedding vector to validate
 * @param expectedDimensions - The expected number of dimensions
 * @throws If dimensions don't match (with helpful error message)
 */
export function validateEmbeddingDimensions(
  embedding: EmbeddingVector,
  expectedDimensions: number
): void {
  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`
    )
  }
}
