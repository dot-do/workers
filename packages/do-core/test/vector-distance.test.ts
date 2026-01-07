/**
 * Tests for Vector Distance/Similarity Functions
 *
 * TDD RED Phase: These tests define the expected behavior for vector distance
 * calculations used in embedding similarity search.
 *
 * Workers AI embeddings typically produce Float32Array vectors of dimension 768 or 1536.
 * These functions need to be performant for real-time similarity search.
 */

import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  normalize,
  type Vector,
  type VectorInput,
} from '../src/vector-distance.js'

describe('VectorDistance', () => {
  describe('cosineSimilarity', () => {
    it('should return 0 for orthogonal vectors', () => {
      // [1,0] and [0,1] are perpendicular, cosine similarity = 0
      const a: Vector = [1, 0]
      const b: Vector = [0, 1]

      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10)
    })

    it('should return 1 for identical vectors', () => {
      // [1,0] and [1,0] are identical, cosine similarity = 1
      const a: Vector = [1, 0]
      const b: Vector = [1, 0]

      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10)
    })

    it('should return 1 for parallel vectors of different magnitudes', () => {
      // [1,1] and [2,2] point in same direction, cosine similarity = 1
      const a: Vector = [1, 1]
      const b: Vector = [2, 2]

      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10)
    })

    it('should return -1 for opposite vectors', () => {
      // [1,0] and [-1,0] point in opposite directions, cosine similarity = -1
      const a: Vector = [1, 0]
      const b: Vector = [-1, 0]

      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 10)
    })

    it('should handle 3D vectors correctly', () => {
      // [1,0,0] and [0,1,0] are orthogonal in 3D
      const a: Vector = [1, 0, 0]
      const b: Vector = [0, 1, 0]

      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10)
    })

    it('should calculate correctly for known vector pair', () => {
      // Known calculation: [1,2,3] and [4,5,6]
      // dot = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      // |a| = sqrt(1 + 4 + 9) = sqrt(14)
      // |b| = sqrt(16 + 25 + 36) = sqrt(77)
      // cosine = 32 / (sqrt(14) * sqrt(77)) = 32 / sqrt(1078) ~= 0.9746
      const a: Vector = [1, 2, 3]
      const b: Vector = [4, 5, 6]
      const expected = 32 / Math.sqrt(14 * 77)

      expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 10)
    })

    it('should throw error for vectors of different dimensions', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [1, 2]

      expect(() => cosineSimilarity(a, b)).toThrow()
    })

    it('should throw error for zero vector', () => {
      const a: Vector = [0, 0, 0]
      const b: Vector = [1, 2, 3]

      expect(() => cosineSimilarity(a, b)).toThrow()
    })

    it('should handle empty vectors', () => {
      const a: Vector = []
      const b: Vector = []

      expect(() => cosineSimilarity(a, b)).toThrow()
    })
  })

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const a: Vector = [0, 0, 0]
      const b: Vector = [0, 0, 0]

      expect(euclideanDistance(a, b)).toBeCloseTo(0, 10)
    })

    it('should calculate 2D distance correctly (3-4-5 triangle)', () => {
      // [0,0] to [3,4] should be 5 (Pythagorean triple)
      const a: Vector = [0, 0]
      const b: Vector = [3, 4]

      expect(euclideanDistance(a, b)).toBeCloseTo(5, 10)
    })

    it('should calculate 3D distance correctly', () => {
      // [0,0,0] to [1,2,2] should be 3 (sqrt(1+4+4) = 3)
      const a: Vector = [0, 0, 0]
      const b: Vector = [1, 2, 2]

      expect(euclideanDistance(a, b)).toBeCloseTo(3, 10)
    })

    it('should be symmetric', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [4, 5, 6]

      expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a), 10)
    })

    it('should satisfy triangle inequality', () => {
      const a: Vector = [0, 0]
      const b: Vector = [1, 0]
      const c: Vector = [0, 1]

      const ab = euclideanDistance(a, b)
      const bc = euclideanDistance(b, c)
      const ac = euclideanDistance(a, c)

      expect(ab + bc).toBeGreaterThanOrEqual(ac - 1e-10)
    })

    it('should throw error for vectors of different dimensions', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [1, 2]

      expect(() => euclideanDistance(a, b)).toThrow()
    })

    it('should handle high-dimensional vectors', () => {
      // 10D vector with known distance
      const a: Vector = new Array(10).fill(0)
      const b: Vector = new Array(10).fill(1)
      // Distance should be sqrt(10) ~= 3.162
      const expected = Math.sqrt(10)

      expect(euclideanDistance(a, b)).toBeCloseTo(expected, 10)
    })
  })

  describe('normalize', () => {
    it('should produce unit vector from simple vector', () => {
      const v: Vector = [3, 4]
      const normalized = normalize(v)

      // Should be [0.6, 0.8]
      expect(normalized[0]).toBeCloseTo(0.6, 10)
      expect(normalized[1]).toBeCloseTo(0.8, 10)
    })

    it('should produce vector with magnitude 1', () => {
      const v: Vector = [1, 2, 3, 4, 5]
      const normalized = normalize(v)

      // Calculate magnitude of normalized vector
      const magnitude = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0))

      expect(magnitude).toBeCloseTo(1, 10)
    })

    it('should not change direction', () => {
      const v: Vector = [1, 2, 3]
      const normalized = normalize(v)

      // Cosine similarity between original and normalized should be 1
      const dot = v.reduce((sum, x, i) => sum + x * normalized[i], 0)
      const magV = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
      const magN = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0))
      const similarity = dot / (magV * magN)

      expect(similarity).toBeCloseTo(1, 10)
    })

    it('should already be normalized for unit vectors', () => {
      const v: Vector = [1, 0, 0]
      const normalized = normalize(v)

      expect(normalized[0]).toBeCloseTo(1, 10)
      expect(normalized[1]).toBeCloseTo(0, 10)
      expect(normalized[2]).toBeCloseTo(0, 10)
    })

    it('should throw error for zero vector', () => {
      const v: Vector = [0, 0, 0]

      expect(() => normalize(v)).toThrow()
    })

    it('should return new array, not modify original', () => {
      const v: Vector = [3, 4]
      const normalized = normalize(v)

      expect(normalized).not.toBe(v)
      expect(v[0]).toBe(3)
      expect(v[1]).toBe(4)
    })

    it('should handle negative values', () => {
      const v: Vector = [-3, 4]
      const normalized = normalize(v)

      expect(normalized[0]).toBeCloseTo(-0.6, 10)
      expect(normalized[1]).toBeCloseTo(0.8, 10)
    })
  })

  describe('dotProduct', () => {
    it('should return 0 for orthogonal vectors', () => {
      const a: Vector = [1, 0]
      const b: Vector = [0, 1]

      expect(dotProduct(a, b)).toBeCloseTo(0, 10)
    })

    it('should calculate correctly for simple vectors', () => {
      // [1,2,3] . [4,5,6] = 4 + 10 + 18 = 32
      const a: Vector = [1, 2, 3]
      const b: Vector = [4, 5, 6]

      expect(dotProduct(a, b)).toBeCloseTo(32, 10)
    })

    it('should be commutative', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [4, 5, 6]

      expect(dotProduct(a, b)).toBeCloseTo(dotProduct(b, a), 10)
    })

    it('should equal cosine similarity for normalized vectors', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [4, 5, 6]

      const normA = normalize(a)
      const normB = normalize(b)

      const dot = dotProduct(normA, normB)
      const cosine = cosineSimilarity(a, b)

      expect(dot).toBeCloseTo(cosine, 10)
    })

    it('should return squared magnitude for self dot product', () => {
      const v: Vector = [3, 4]
      const selfDot = dotProduct(v, v)

      // |v|^2 = 9 + 16 = 25
      expect(selfDot).toBeCloseTo(25, 10)
    })

    it('should throw error for vectors of different dimensions', () => {
      const a: Vector = [1, 2, 3]
      const b: Vector = [1, 2]

      expect(() => dotProduct(a, b)).toThrow()
    })

    it('should handle negative values', () => {
      const a: Vector = [1, -2, 3]
      const b: Vector = [-1, 2, -3]
      // -1 + -4 + -9 = -14

      expect(dotProduct(a, b)).toBeCloseTo(-14, 10)
    })
  })

  describe('Float32Array support', () => {
    it('should handle Float32Array inputs for cosineSimilarity', () => {
      const a = new Float32Array([1, 0])
      const b = new Float32Array([0, 1])

      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
    })

    it('should handle Float32Array inputs for euclideanDistance', () => {
      const a = new Float32Array([0, 0])
      const b = new Float32Array([3, 4])

      expect(euclideanDistance(a, b)).toBeCloseTo(5, 5)
    })

    it('should handle Float32Array inputs for normalize', () => {
      const v = new Float32Array([3, 4])
      const normalized = normalize(v)

      // Magnitude should be 1
      const mag = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0))
      expect(mag).toBeCloseTo(1, 5)
    })

    it('should handle Float32Array inputs for dotProduct', () => {
      const a = new Float32Array([1, 2, 3])
      const b = new Float32Array([4, 5, 6])

      expect(dotProduct(a, b)).toBeCloseTo(32, 5)
    })

    it('should handle mixed array types', () => {
      const a: Vector = [1, 2, 3]
      const b = new Float32Array([4, 5, 6])

      expect(dotProduct(a, b)).toBeCloseTo(32, 5)
    })

    it('should handle Workers AI embedding dimensions (768)', () => {
      // Create realistic 768-dim vectors
      const a = new Float32Array(768)
      const b = new Float32Array(768)

      // Fill with pseudo-random values
      for (let i = 0; i < 768; i++) {
        a[i] = Math.sin(i * 0.1)
        b[i] = Math.cos(i * 0.1)
      }

      // Should complete without error
      const similarity = cosineSimilarity(a, b)
      expect(typeof similarity).toBe('number')
      expect(similarity).toBeGreaterThanOrEqual(-1)
      expect(similarity).toBeLessThanOrEqual(1)
    })

    it('should handle Workers AI embedding dimensions (1536)', () => {
      // Create realistic 1536-dim vectors (OpenAI ada-002 size)
      const a = new Float32Array(1536)
      const b = new Float32Array(1536)

      for (let i = 0; i < 1536; i++) {
        a[i] = Math.sin(i * 0.1)
        b[i] = Math.cos(i * 0.1)
      }

      const similarity = cosineSimilarity(a, b)
      expect(typeof similarity).toBe('number')
      expect(similarity).toBeGreaterThanOrEqual(-1)
      expect(similarity).toBeLessThanOrEqual(1)
    })
  })

  describe('Performance benchmarks', () => {
    it('should calculate 1000 cosine similarities for 768-dim vectors in <100ms', () => {
      const vectors: Float32Array[] = []
      // Pre-generate 100 vectors to compare against
      for (let i = 0; i < 100; i++) {
        const v = new Float32Array(768)
        for (let j = 0; j < 768; j++) {
          v[j] = Math.random() * 2 - 1
        }
        vectors.push(v)
      }

      const query = new Float32Array(768)
      for (let i = 0; i < 768; i++) {
        query[i] = Math.random() * 2 - 1
      }

      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        cosineSimilarity(query, vectors[i % 100])
      }
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })

    it('should calculate 1000 euclidean distances for 768-dim vectors in <100ms', () => {
      const vectors: Float32Array[] = []
      for (let i = 0; i < 100; i++) {
        const v = new Float32Array(768)
        for (let j = 0; j < 768; j++) {
          v[j] = Math.random() * 2 - 1
        }
        vectors.push(v)
      }

      const query = new Float32Array(768)
      for (let i = 0; i < 768; i++) {
        query[i] = Math.random() * 2 - 1
      }

      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        euclideanDistance(query, vectors[i % 100])
      }
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })

    it('should normalize 1000 768-dim vectors in <100ms', () => {
      const vectors: Float32Array[] = []
      for (let i = 0; i < 1000; i++) {
        const v = new Float32Array(768)
        for (let j = 0; j < 768; j++) {
          v[j] = Math.random() * 2 - 1
        }
        vectors.push(v)
      }

      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        normalize(vectors[i])
      }
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })

    it('should average <0.1ms per cosine similarity calculation', () => {
      const a = new Float32Array(768)
      const b = new Float32Array(768)

      for (let i = 0; i < 768; i++) {
        a[i] = Math.random() * 2 - 1
        b[i] = Math.random() * 2 - 1
      }

      const iterations = 10000
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        cosineSimilarity(a, b)
      }
      const elapsed = performance.now() - start
      const avgTime = elapsed / iterations

      expect(avgTime).toBeLessThan(0.1)
    })
  })

  describe('Edge cases', () => {
    it('should handle very small values', () => {
      const a: Vector = [1e-15, 1e-15]
      const b: Vector = [1e-15, 1e-15]

      // Should not produce NaN or Infinity
      const similarity = cosineSimilarity(a, b)
      expect(Number.isFinite(similarity)).toBe(true)
    })

    it('should handle very large values', () => {
      const a: Vector = [1e15, 1e15]
      const b: Vector = [1e15, 1e15]

      // Should not produce NaN or Infinity
      const similarity = cosineSimilarity(a, b)
      expect(Number.isFinite(similarity)).toBe(true)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it('should handle mixed magnitudes', () => {
      const a: Vector = [1e-10, 1e10]
      const b: Vector = [1e-10, 1e10]

      const similarity = cosineSimilarity(a, b)
      expect(Number.isFinite(similarity)).toBe(true)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it('should handle single-element vectors', () => {
      const a: Vector = [5]
      const b: Vector = [10]

      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10)
      expect(euclideanDistance(a, b)).toBeCloseTo(5, 10)
    })

    it('should handle negative zero', () => {
      const a: Vector = [0, -0, 1]
      const b: Vector = [-0, 0, 1]

      const similarity = cosineSimilarity(a, b)
      expect(Number.isFinite(similarity)).toBe(true)
    })
  })

  describe('Type exports', () => {
    it('should export Vector type that accepts number array', () => {
      const v: Vector = [1, 2, 3]
      expect(Array.isArray(v) || v instanceof Float32Array).toBe(true)
    })

    it('should export VectorInput type that accepts Float32Array', () => {
      const v: VectorInput = new Float32Array([1, 2, 3])
      expect(v instanceof Float32Array || Array.isArray(v)).toBe(true)
    })
  })
})
