/**
 * Vector Distance/Similarity Functions
 *
 * Optimized functions for calculating distances and similarities between vectors.
 * Used primarily for embedding similarity search with Workers AI.
 *
 * Workers AI embeddings typically produce Float32Array vectors of dimension 768 or 1536.
 */

/**
 * A vector represented as a number array.
 */
export type Vector = number[]

/**
 * Input type that accepts both number arrays and Float32Array.
 */
export type VectorInput = number[] | Float32Array

/**
 * Validates that two vectors have the same dimension.
 * @throws Error if vectors have different dimensions
 */
function validateDimensions(a: VectorInput, b: VectorInput): void {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} !== ${b.length}`)
  }
}

/**
 * Validates that a vector is non-empty.
 * @throws Error if vector is empty
 */
function validateNonEmpty(v: VectorInput): void {
  if (v.length === 0) {
    throw new Error('Vector cannot be empty')
  }
}

/**
 * Calculates the dot product of two vectors.
 *
 * The dot product is the sum of the products of corresponding elements.
 *
 * @param a First vector
 * @param b Second vector
 * @returns The dot product a · b
 * @throws Error if vectors have different dimensions
 */
export function dotProduct(a: VectorInput, b: VectorInput): number {
  validateDimensions(a, b)

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

/**
 * Calculates the Euclidean distance between two vectors.
 *
 * Also known as L2 distance or straight-line distance.
 * Formula: sqrt(sum((a[i] - b[i])^2))
 *
 * @param a First vector
 * @param b Second vector
 * @returns The Euclidean distance between a and b
 * @throws Error if vectors have different dimensions
 */
export function euclideanDistance(a: VectorInput, b: VectorInput): number {
  validateDimensions(a, b)

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Normalizes a vector to unit length (magnitude = 1).
 *
 * The resulting vector points in the same direction but has magnitude 1.
 *
 * @param v The vector to normalize
 * @returns A new vector with magnitude 1
 * @throws Error if the vector is a zero vector (cannot be normalized)
 */
export function normalize(v: VectorInput): number[] {
  validateNonEmpty(v)

  let sumSquares = 0
  for (let i = 0; i < v.length; i++) {
    sumSquares += v[i] * v[i]
  }

  const magnitude = Math.sqrt(sumSquares)

  if (magnitude === 0) {
    throw new Error('Cannot normalize zero vector')
  }

  const result: number[] = new Array(v.length)
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] / magnitude
  }
  return result
}

/**
 * Calculates the cosine similarity between two vectors.
 *
 * Cosine similarity measures the cosine of the angle between vectors.
 * - 1 means vectors point in the same direction
 * - 0 means vectors are orthogonal (perpendicular)
 * - -1 means vectors point in opposite directions
 *
 * Formula: (a · b) / (|a| * |b|)
 *
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity in range [-1, 1]
 * @throws Error if vectors have different dimensions or if either is a zero vector
 */
export function cosineSimilarity(a: VectorInput, b: VectorInput): number {
  validateDimensions(a, b)
  validateNonEmpty(a)

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitudeA = Math.sqrt(magA)
  const magnitudeB = Math.sqrt(magB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot calculate cosine similarity with zero vector')
  }

  return dot / (magnitudeA * magnitudeB)
}
