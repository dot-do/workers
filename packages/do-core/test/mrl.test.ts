/**
 * RED Phase TDD: MRL (Matryoshka Representation Learning) Tests
 *
 * These tests define the contract for MRL embedding truncation and normalization.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Matryoshka Representation Learning enables embeddings to be truncated to smaller
 * dimensions while preserving semantic similarity. This is critical for the tiered
 * storage strategy:
 * - Hot storage: 256-dim embeddings in Durable Objects (fast approximate search)
 * - Cold storage: 768-dim embeddings in R2 (full precision reranking)
 *
 * Key properties:
 * - MRL embeddings can be truncated by taking first N dimensions
 * - Truncation to 256-dim retains ~98% of semantic accuracy
 * - After truncation, vectors must be re-normalized for cosine similarity
 *
 * @see workers-hujpt - [RED] MRL truncation and normalization
 */

import { describe, it, expect } from 'vitest'
import {
  truncateEmbedding,
  normalizeVector,
  truncateAndNormalize,
  cosineSimilarity,
  validateEmbeddingDimensions,
  type MRLDimension,
  type EmbeddingVector,
  SUPPORTED_DIMENSIONS,
  EMBEDDINGGEMMA_DIMENSIONS,
} from '../src/mrl.js'

// ============================================================================
// MRL Truncation Contract Tests
// ============================================================================

describe('MRL (Matryoshka Representation Learning)', () => {
  describe('truncateEmbedding()', () => {
    it('should truncate 768-dim embedding to 256-dim', () => {
      // Create a 768-dimensional embedding (simulating EmbeddingGemma output)
      const embedding768 = new Array(768).fill(0).map((_, i) => i / 768)

      const truncated = truncateEmbedding(embedding768, 256)

      expect(truncated).toHaveLength(256)
      // Should take the first 256 dimensions
      expect(truncated[0]).toBe(embedding768[0])
      expect(truncated[255]).toBe(embedding768[255])
    })

    it('should truncate to 64 dimensions', () => {
      const embedding768 = new Array(768).fill(0).map((_, i) => i / 768)

      const truncated = truncateEmbedding(embedding768, 64)

      expect(truncated).toHaveLength(64)
      expect(truncated[0]).toBe(embedding768[0])
      expect(truncated[63]).toBe(embedding768[63])
    })

    it('should truncate to 128 dimensions', () => {
      const embedding768 = new Array(768).fill(0).map((_, i) => i / 768)

      const truncated = truncateEmbedding(embedding768, 128)

      expect(truncated).toHaveLength(128)
    })

    it('should truncate to 512 dimensions', () => {
      const embedding768 = new Array(768).fill(0).map((_, i) => i / 768)

      const truncated = truncateEmbedding(embedding768, 512)

      expect(truncated).toHaveLength(512)
    })

    it('should return same length if target equals input dimensions', () => {
      const embedding256 = new Array(256).fill(0).map((_, i) => i / 256)

      const truncated = truncateEmbedding(embedding256, 256)

      expect(truncated).toHaveLength(256)
      expect(truncated).toEqual(embedding256)
    })

    it('should error if input is shorter than target dimensions', () => {
      const embedding128 = new Array(128).fill(0).map((_, i) => i / 128)

      expect(() => truncateEmbedding(embedding128, 256)).toThrow()
    })

    it('should error if target dimensions is not a supported MRL dimension', () => {
      const embedding768 = new Array(768).fill(0).map(() => Math.random())

      // 100 is not a standard MRL dimension
      expect(() => truncateEmbedding(embedding768, 100 as MRLDimension)).toThrow()
    })
  })

  describe('normalizeVector()', () => {
    it('should normalize a vector to unit length', () => {
      const vector = [3, 4] // 3-4-5 triangle, magnitude = 5

      const normalized = normalizeVector(vector)

      expect(normalized).toHaveLength(2)
      expect(normalized[0]).toBeCloseTo(0.6, 10)
      expect(normalized[1]).toBeCloseTo(0.8, 10)

      // Verify unit length (magnitude = 1)
      const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude).toBeCloseTo(1, 10)
    })

    it('should normalize high-dimensional vectors', () => {
      const vector = new Array(256).fill(1) // All ones

      const normalized = normalizeVector(vector)

      // Each component should be 1/sqrt(256) = 1/16 = 0.0625
      const expectedComponent = 1 / Math.sqrt(256)
      expect(normalized[0]).toBeCloseTo(expectedComponent, 10)

      // Verify unit length
      const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude).toBeCloseTo(1, 10)
    })

    it('should handle vectors that are already normalized', () => {
      const normalized = [0.6, 0.8] // Already unit length

      const result = normalizeVector(normalized)

      expect(result[0]).toBeCloseTo(0.6, 10)
      expect(result[1]).toBeCloseTo(0.8, 10)
    })

    it('should handle zero vector gracefully', () => {
      const zeroVector = [0, 0, 0]

      // Implementation should handle this case - either return zero vector
      // or throw an error (cannot normalize zero vector)
      expect(() => normalizeVector(zeroVector)).toThrow()
    })

    it('should handle very small magnitude vectors', () => {
      const tinyVector = [1e-10, 1e-10]

      const normalized = normalizeVector(tinyVector)

      // Should still produce unit vector
      const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude).toBeCloseTo(1, 5)
    })
  })

  describe('truncateAndNormalize()', () => {
    it('should truncate and re-normalize in one operation', () => {
      // Create a normalized 768-dim embedding
      const rawEmbedding = new Array(768).fill(0).map(() => Math.random())
      const magnitude768 = Math.sqrt(rawEmbedding.reduce((sum, v) => sum + v * v, 0))
      const normalized768 = rawEmbedding.map((v) => v / magnitude768)

      const result = truncateAndNormalize(normalized768, 256)

      // Should have target dimensions
      expect(result).toHaveLength(256)

      // Should be re-normalized to unit length
      const magnitude256 = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude256).toBeCloseTo(1, 10)
    })

    it('should produce correct values after truncation', () => {
      // Simple case: uniform embedding
      const uniformEmbedding = new Array(768).fill(1 / Math.sqrt(768))

      const result = truncateAndNormalize(uniformEmbedding, 256)

      // After truncation to 256 dims and re-normalization,
      // each component should be 1/sqrt(256) = 0.0625
      expect(result[0]).toBeCloseTo(1 / Math.sqrt(256), 10)
    })

    it('should handle Float32Array inputs and outputs', () => {
      const float32Input = new Float32Array(768).map((_, i) => i / 768)

      const result = truncateAndNormalize(float32Input, 256)

      expect(result).toHaveLength(256)
      // Verify it's normalized
      const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude).toBeCloseTo(1, 5)
    })

    it('should preserve relative ordering after truncation', () => {
      // Create three related embeddings
      // A, B are similar (small angle), A, C are dissimilar (large angle)
      const baseVector = new Array(768).fill(0).map(() => Math.random())
      const mag = Math.sqrt(baseVector.reduce((s, v) => s + v * v, 0))
      const A = baseVector.map((v) => v / mag)

      // B is A with small perturbation
      const B = A.map((v, i) => (i < 100 ? v + 0.01 : v))
      const magB = Math.sqrt(B.reduce((s, v) => s + v * v, 0))
      const normalizedB = B.map((v) => v / magB)

      // C is A with large perturbation (different direction)
      const C = A.map((v, i) => (i < 400 ? -v : v))
      const magC = Math.sqrt(C.reduce((s, v) => s + v * v, 0))
      const normalizedC = C.map((v) => v / magC)

      // Compute similarities in 768-dim space
      const simAB_768 = cosineSimilarity(A, normalizedB)
      const simAC_768 = cosineSimilarity(A, normalizedC)

      // Truncate all to 256-dim
      const A_256 = truncateAndNormalize(A, 256)
      const B_256 = truncateAndNormalize(normalizedB, 256)
      const C_256 = truncateAndNormalize(normalizedC, 256)

      // Compute similarities in 256-dim space
      const simAB_256 = cosineSimilarity(A_256, B_256)
      const simAC_256 = cosineSimilarity(A_256, C_256)

      // The relative ordering should be preserved:
      // If A is closer to B than C in 768-dim, same should hold in 256-dim
      if (simAB_768 > simAC_768) {
        expect(simAB_256).toBeGreaterThan(simAC_256)
      } else {
        expect(simAC_256).toBeGreaterThan(simAB_256)
      }
    })
  })

  describe('cosineSimilarity()', () => {
    it('should compute cosine similarity of identical vectors as 1', () => {
      const vector = [0.6, 0.8]

      const similarity = cosineSimilarity(vector, vector)

      expect(similarity).toBeCloseTo(1, 10)
    })

    it('should compute cosine similarity of opposite vectors as -1', () => {
      const vectorA = [1, 0]
      const vectorB = [-1, 0]

      const similarity = cosineSimilarity(vectorA, vectorB)

      expect(similarity).toBeCloseTo(-1, 10)
    })

    it('should compute cosine similarity of orthogonal vectors as 0', () => {
      const vectorA = [1, 0]
      const vectorB = [0, 1]

      const similarity = cosineSimilarity(vectorA, vectorB)

      expect(similarity).toBeCloseTo(0, 10)
    })

    it('should handle normalized vectors efficiently', () => {
      // For unit vectors, cosine similarity is just the dot product
      const a = [0.6, 0.8]
      const b = [0.8, 0.6]

      const similarity = cosineSimilarity(a, b)

      // Expected: 0.6*0.8 + 0.8*0.6 = 0.96
      expect(similarity).toBeCloseTo(0.96, 10)
    })

    it('should handle high-dimensional vectors', () => {
      const a = new Array(768).fill(1 / Math.sqrt(768))
      const b = new Array(768).fill(1 / Math.sqrt(768))

      const similarity = cosineSimilarity(a, b)

      expect(similarity).toBeCloseTo(1, 10)
    })

    it('should error on mismatched dimensions', () => {
      const a = [1, 0, 0]
      const b = [1, 0]

      expect(() => cosineSimilarity(a, b)).toThrow()
    })
  })

  describe('validateEmbeddingDimensions()', () => {
    it('should validate correct embedding dimensions', () => {
      const embedding768 = new Array(768).fill(0)

      expect(() => validateEmbeddingDimensions(embedding768, 768)).not.toThrow()
    })

    it('should reject incorrect embedding dimensions', () => {
      const embedding500 = new Array(500).fill(0)

      expect(() => validateEmbeddingDimensions(embedding500, 768)).toThrow()
    })

    it('should provide helpful error message', () => {
      const embedding500 = new Array(500).fill(0)

      expect(() => validateEmbeddingDimensions(embedding500, 768)).toThrow(
        /expected.*768.*got.*500/i
      )
    })
  })

  describe('Type Definitions', () => {
    it('should export MRLDimension type with supported values', () => {
      // This test verifies the type exports exist
      const dim64: MRLDimension = 64
      const dim128: MRLDimension = 128
      const dim256: MRLDimension = 256
      const dim512: MRLDimension = 512
      const dim768: MRLDimension = 768

      expect([dim64, dim128, dim256, dim512, dim768]).toBeDefined()
    })

    it('should export SUPPORTED_DIMENSIONS constant', () => {
      expect(SUPPORTED_DIMENSIONS).toContain(64)
      expect(SUPPORTED_DIMENSIONS).toContain(128)
      expect(SUPPORTED_DIMENSIONS).toContain(256)
      expect(SUPPORTED_DIMENSIONS).toContain(512)
      expect(SUPPORTED_DIMENSIONS).toContain(768)
    })

    it('should export EMBEDDINGGEMMA_DIMENSIONS constant as 768', () => {
      // Workers AI embeddinggemma-300m produces 768-dim vectors
      expect(EMBEDDINGGEMMA_DIMENSIONS).toBe(768)
    })

    it('should export EmbeddingVector type accepting number[] or Float32Array', () => {
      const numberArray: EmbeddingVector = [1, 2, 3]
      const float32Array: EmbeddingVector = new Float32Array([1, 2, 3])

      expect(numberArray).toBeDefined()
      expect(float32Array).toBeDefined()
    })
  })

  describe('EmbeddingGemma Model Format', () => {
    it('should support EmbeddingGemma 768-dim output format', () => {
      // Simulates the output from Workers AI @cf/google/embeddinggemma-300m
      const embeddingGemmaOutput = new Float32Array(768)
      for (let i = 0; i < 768; i++) {
        embeddingGemmaOutput[i] = Math.random() * 2 - 1 // Random values in [-1, 1]
      }

      // Should be able to truncate to any supported dimension
      const truncated256 = truncateAndNormalize(embeddingGemmaOutput, 256)
      const truncated128 = truncateAndNormalize(embeddingGemmaOutput, 128)
      const truncated64 = truncateAndNormalize(embeddingGemmaOutput, 64)

      expect(truncated256).toHaveLength(256)
      expect(truncated128).toHaveLength(128)
      expect(truncated64).toHaveLength(64)

      // All should be normalized
      const mag256 = Math.sqrt(truncated256.reduce((s, v) => s + v * v, 0))
      const mag128 = Math.sqrt(truncated128.reduce((s, v) => s + v * v, 0))
      const mag64 = Math.sqrt(truncated64.reduce((s, v) => s + v * v, 0))

      expect(mag256).toBeCloseTo(1, 5)
      expect(mag128).toBeCloseTo(1, 5)
      expect(mag64).toBeCloseTo(1, 5)
    })

    it('should maintain semantic quality at 256-dim truncation', () => {
      // This test documents the expected accuracy retention
      // Real MRL-trained models retain ~98% accuracy at 256-dim
      //
      // Since we're testing the utility functions, not the model,
      // we verify the mathematical properties are preserved

      // Create semantically similar embeddings (simulated)
      const doc1 = new Array(768).fill(0).map((_, i) => Math.sin(i * 0.01))
      const doc2 = new Array(768).fill(0).map((_, i) => Math.sin(i * 0.01 + 0.1))
      const doc3 = new Array(768).fill(0).map((_, i) => Math.cos(i * 0.01)) // Different

      // Normalize them
      const norm = (v: number[]) => {
        const m = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
        return v.map((x) => x / m)
      }

      const d1 = norm(doc1)
      const d2 = norm(doc2)
      const d3 = norm(doc3)

      // Original similarities
      const sim12_orig = cosineSimilarity(d1, d2)
      const sim13_orig = cosineSimilarity(d1, d3)

      // Truncated similarities
      const d1_256 = truncateAndNormalize(d1, 256)
      const d2_256 = truncateAndNormalize(d2, 256)
      const d3_256 = truncateAndNormalize(d3, 256)

      const sim12_trunc = cosineSimilarity(d1_256, d2_256)
      const sim13_trunc = cosineSimilarity(d1_256, d3_256)

      // Relative ordering should be preserved
      // (doc1 should still be more similar to doc2 than doc3)
      expect(sim12_orig > sim13_orig).toBe(sim12_trunc > sim13_trunc)
    })
  })

  describe('Performance Considerations', () => {
    it('should handle batch truncation efficiently', () => {
      // Simulates processing multiple embeddings (batch search)
      const embeddings = Array.from({ length: 100 }, () =>
        new Array(768).fill(0).map(() => Math.random())
      )

      const startTime = performance.now()
      const truncated = embeddings.map((e) => truncateAndNormalize(e, 256))
      const elapsed = performance.now() - startTime

      expect(truncated).toHaveLength(100)
      expect(truncated[0]).toHaveLength(256)

      // Should complete in reasonable time (< 100ms for 100 embeddings)
      expect(elapsed).toBeLessThan(100)
    })

    it('should not allocate unnecessary intermediate arrays', () => {
      // This is a design constraint - implementation should be memory-efficient
      const embedding = new Array(768).fill(0).map(() => Math.random())

      // The function should work without excessive memory allocation
      // We can't directly test this, but the implementation should be aware
      const result = truncateAndNormalize(embedding, 256)

      expect(result).toHaveLength(256)
    })
  })
})

describe('MRL Integration Scenarios', () => {
  describe('Two-Phase Search Pattern', () => {
    it('should support fast approximate search on truncated embeddings', () => {
      // Phase 1: Use 256-dim for fast approximate search
      // This simulates the "hot" storage in Durable Objects

      const queryEmbedding768 = new Array(768).fill(0).map(() => Math.random())
      const queryEmbedding256 = truncateAndNormalize(queryEmbedding768, 256)

      // Simulated document embeddings (already truncated in hot storage)
      const documents256 = Array.from({ length: 10 }, () =>
        truncateAndNormalize(
          new Array(768).fill(0).map(() => Math.random()),
          256
        )
      )

      // Compute approximate similarities
      const similarities = documents256.map((doc) =>
        cosineSimilarity(queryEmbedding256, doc)
      )

      // Should be able to rank documents
      expect(similarities.every((s) => s >= -1 && s <= 1)).toBe(true)
    })

    it('should support full precision reranking on original embeddings', () => {
      // Phase 2: Use full 768-dim for precise reranking
      // This simulates the "cold" storage in R2

      const queryEmbedding768 = new Array(768).fill(0).map(() => Math.random())
      const queryNormalized = normalizeVector(queryEmbedding768)

      // Simulated full embeddings (retrieved from R2 for top candidates)
      const topCandidates768 = Array.from({ length: 5 }, () =>
        normalizeVector(new Array(768).fill(0).map(() => Math.random()))
      )

      // Compute precise similarities
      const preciseSimilarities = topCandidates768.map((doc) =>
        cosineSimilarity(queryNormalized, doc)
      )

      // Should be able to rerank with full precision
      expect(preciseSimilarities.every((s) => s >= -1 && s <= 1)).toBe(true)
    })
  })

  describe('Tiered Storage Strategy', () => {
    it('should enable hot storage with 256-dim embeddings', () => {
      // Hot storage (DO): ~1KB per 256-dim float32 embedding
      // This enables storing more embeddings in DO memory limits

      const embedding768 = new Array(768).fill(0).map(() => Math.random())
      const compact256 = truncateAndNormalize(embedding768, 256)

      // Size calculations
      const originalSize = 768 * 4 // 768 float32 values = 3072 bytes
      const compactSize = 256 * 4 // 256 float32 values = 1024 bytes

      expect(compact256).toHaveLength(256)
      expect(compactSize).toBe(originalSize / 3)
    })

    it('should enable cold storage with full 768-dim embeddings', () => {
      // Cold storage (R2): Full precision for reranking

      const embedding768 = new Array(768).fill(0).map(() => Math.random())
      const normalized768 = normalizeVector(embedding768)

      // Full embedding preserved for precision
      expect(normalized768).toHaveLength(768)

      // Can be used for final reranking after approximate search
      const query = normalizeVector(new Array(768).fill(0).map(() => Math.random()))
      const similarity = cosineSimilarity(query, normalized768)

      expect(similarity).toBeGreaterThanOrEqual(-1)
      expect(similarity).toBeLessThanOrEqual(1)
    })
  })
})
