/**
 * CDC Mixin Type Compatibility Tests - RED Phase
 *
 * These tests verify that the withCDC mixin function produces a class that:
 * 1. Has all original DO base class methods (fetch, alarm, webSocketMessage, etc.)
 * 2. Has all 6 CDC methods with correct signatures
 * 3. Preserves generic type parameters
 * 4. Works with custom DO subclasses
 *
 * RED PHASE: These tests should FAIL because withCDC mixin doesn't exist yet.
 * The tests define the contract that the GREEN phase implementation must satisfy.
 *
 * @see workers-d35k - RED: Test CDC mixin type compatibility with DO base class
 * @see workers-oqi8 - GREEN: Create withCDC mixin function skeleton
 * @see workers-r99l - EPIC: CDC Architecture - Remove Code Patching Anti-pattern
 */

import { describe, it, expect, expectTypeOf, beforeEach } from 'vitest'
import { DOCore, type DOState, type DOEnv } from '../src/index.js'
import { createMockState } from './helpers.js'

// ============================================================================
// Import the mixin that doesn't exist yet (RED phase - should fail)
// ============================================================================

// This import will cause the tests to fail in RED phase
import { withCDC, type CDCMixin, type ICDCMethods } from '../src/cdc-mixin.js'

// ============================================================================
// Type Definitions - Expected CDC Method Signatures
// ============================================================================

/**
 * CDC Batch represents a collection of change events captured together
 */
interface CDCBatch {
  id: string
  sourceTable: string
  operation: 'insert' | 'update' | 'delete' | 'mixed'
  events: CDCEvent[]
  createdAt: number
  finalizedAt: number | null
  status: 'pending' | 'finalized' | 'transformed' | 'output'
  eventCount: number
  metadata?: Record<string, unknown>
}

/**
 * Individual CDC event representing a single change
 */
interface CDCEvent {
  id: string
  operation: 'insert' | 'update' | 'delete'
  recordId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  timestamp: number
  transactionId?: string
}

/**
 * Query criteria for finding CDC batches
 */
interface CDCBatchQuery {
  sourceTable?: string
  status?: CDCBatch['status']
  operation?: CDCBatch['operation']
  createdAfter?: number
  createdBefore?: number
  limit?: number
  offset?: number
}

/**
 * Result of Parquet transformation
 */
interface ParquetResult {
  data: ArrayBuffer
  batchId: string
  rowCount: number
  sizeBytes: number
  schema: ParquetSchema
  compression: 'none' | 'snappy' | 'gzip' | 'zstd'
}

interface ParquetSchema {
  fields: Array<{
    name: string
    type: string
    nullable: boolean
  }>
}

/**
 * Result of R2 output operation
 */
interface R2OutputResult {
  key: string
  bucket: string
  etag: string
  sizeBytes: number
  batchId: string
  writtenAt: number
}

/**
 * CDC Pipeline execution result
 */
interface CDCPipelineResult {
  batchesProcessed: number
  eventsProcessed: number
  bytesWritten: number
  outputKeys: string[]
  errors: CDCPipelineError[]
  durationMs: number
  success: boolean
}

interface CDCPipelineError {
  batchId: string
  stage: 'transform' | 'output'
  error: string
}

/**
 * CDC Pipeline options
 */
interface CDCPipelineOptions {
  sourceTables?: string[]
  status?: CDCBatch['status']
  maxBatches?: number
  compression?: ParquetResult['compression']
  pathPrefix?: string
  dryRun?: boolean
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Custom DO subclass for testing mixin composition
 */
class CustomDO extends DOCore {
  customMethod(): string {
    return 'custom'
  }

  async customAsyncMethod(): Promise<number> {
    return 42
  }
}

/**
 * Custom environment type for testing generic preservation
 */
interface CustomEnv extends DOEnv {
  MY_BUCKET: R2Bucket
  MY_KV: KVNamespace
}

/**
 * Custom DO with specific environment type
 */
class TypedEnvDO extends DOCore<CustomEnv> {
  getBucket(): R2Bucket {
    return this.env.MY_BUCKET
  }
}

// Mock R2Bucket and KVNamespace for type tests
interface R2Bucket {
  put(key: string, data: ArrayBuffer): Promise<void>
  get(key: string): Promise<R2Object | null>
}

interface R2Object {
  body: ReadableStream
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

// ============================================================================
// Tests
// ============================================================================

describe('CDC Mixin Type Compatibility', () => {
  describe('withCDC Function Existence', () => {
    it('should export withCDC function from cdc-mixin module', () => {
      // RED: This will fail because cdc-mixin.ts doesn't exist
      expect(withCDC).toBeDefined()
      expect(typeof withCDC).toBe('function')
    })

    it('should export CDCMixin type', () => {
      // RED: This will fail because the type doesn't exist
      // This is a compile-time check - if CDCMixin type doesn't exist, TS will error
      const _typeCheck: CDCMixin | undefined = undefined
      expect(_typeCheck).toBeUndefined() // Trivial runtime check
    })

    it('should export ICDCMethods interface', () => {
      // RED: This will fail because the interface doesn't exist
      const _typeCheck: ICDCMethods | undefined = undefined
      expect(_typeCheck).toBeUndefined() // Trivial runtime check
    })
  })

  describe('Mixin Application to DOCore', () => {
    it('should accept DOCore as base class', () => {
      // RED: withCDC function doesn't exist
      const CDCEnabledDO = withCDC(DOCore)
      expect(CDCEnabledDO).toBeDefined()
    })

    it('should return a constructor function', () => {
      const CDCEnabledDO = withCDC(DOCore)
      expect(typeof CDCEnabledDO).toBe('function')
      expect(CDCEnabledDO.prototype).toBeDefined()
    })

    it('should allow instantiation with DOState and DOEnv', () => {
      const CDCEnabledDO = withCDC(DOCore)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCEnabledDO(ctx, env)
      expect(instance).toBeDefined()
      expect(instance).toBeInstanceOf(DOCore)
    })
  })

  describe('DO Base Class Methods Preservation', () => {
    let CDCEnabledDO: ReturnType<typeof withCDC<typeof DOCore>>
    let instance: InstanceType<typeof CDCEnabledDO>

    beforeEach(() => {
      CDCEnabledDO = withCDC(DOCore)
      const ctx = createMockState()
      const env: DOEnv = {}
      instance = new CDCEnabledDO(ctx, env)
    })

    it('should preserve fetch method', () => {
      expect(typeof instance.fetch).toBe('function')
    })

    it('should preserve alarm method', () => {
      expect(typeof instance.alarm).toBe('function')
    })

    it('should preserve webSocketMessage method', () => {
      expect(typeof instance.webSocketMessage).toBe('function')
    })

    it('should preserve webSocketClose method', () => {
      expect(typeof instance.webSocketClose).toBe('function')
    })

    it('should preserve webSocketError method', () => {
      expect(typeof instance.webSocketError).toBe('function')
    })

    it('should preserve ctx property access', () => {
      // ctx is protected, but should still exist on the instance
      expect((instance as unknown as { ctx: DOState }).ctx).toBeDefined()
    })

    it('should preserve env property access', () => {
      // env is protected, but should still exist on the instance
      expect((instance as unknown as { env: DOEnv }).env).toBeDefined()
    })
  })

  describe('CDC Methods Addition - All 6 Methods', () => {
    let CDCEnabledDO: ReturnType<typeof withCDC<typeof DOCore>>
    let instance: InstanceType<typeof CDCEnabledDO>

    beforeEach(() => {
      CDCEnabledDO = withCDC(DOCore)
      const ctx = createMockState()
      const env: DOEnv = {}
      instance = new CDCEnabledDO(ctx, env)
    })

    it('should add createCDCBatch method', () => {
      expect(typeof instance.createCDCBatch).toBe('function')
    })

    it('should add getCDCBatch method', () => {
      expect(typeof instance.getCDCBatch).toBe('function')
    })

    it('should add queryCDCBatches method', () => {
      expect(typeof instance.queryCDCBatches).toBe('function')
    })

    it('should add transformToParquet method', () => {
      expect(typeof instance.transformToParquet).toBe('function')
    })

    it('should add outputToR2 method', () => {
      expect(typeof instance.outputToR2).toBe('function')
    })

    it('should add processCDCPipeline method', () => {
      expect(typeof instance.processCDCPipeline).toBe('function')
    })

    it('should have exactly 6 CDC methods', () => {
      const cdcMethods = [
        'createCDCBatch',
        'getCDCBatch',
        'queryCDCBatches',
        'transformToParquet',
        'outputToR2',
        'processCDCPipeline',
      ] as const

      for (const method of cdcMethods) {
        const hasMethod = typeof (instance as unknown as Record<string, unknown>)[method] === 'function'
        expect(hasMethod, `Expected ${method} to be a function`).toBe(true)
      }
    })
  })

  describe('CDC Method Type Signatures', () => {
    let CDCEnabledDO: ReturnType<typeof withCDC<typeof DOCore>>
    let instance: InstanceType<typeof CDCEnabledDO>

    beforeEach(() => {
      CDCEnabledDO = withCDC(DOCore)
      const ctx = createMockState()
      const env: DOEnv = {}
      instance = new CDCEnabledDO(ctx, env)
    })

    describe('createCDCBatch', () => {
      it('should accept sourceTable and operation parameters', async () => {
        // Type check: should compile without error
        const result = await instance.createCDCBatch('users', 'insert')
        expect(result).toBeDefined()
      })

      it('should accept optional events parameter', async () => {
        const events: CDCEvent[] = []
        const result = await instance.createCDCBatch('users', 'insert', events)
        expect(result).toBeDefined()
      })

      it('should return CDCBatch', async () => {
        const result = await instance.createCDCBatch('users', 'insert')
        // Type assertion - if wrong type, TypeScript will catch it
        const batch: CDCBatch = result
        expect(batch.id).toBeDefined()
      })
    })

    describe('getCDCBatch', () => {
      it('should accept batchId parameter', async () => {
        const result = await instance.getCDCBatch('batch-123')
        // Should return CDCBatch | null
        expect(result === null || typeof result === 'object').toBe(true)
      })

      it('should return CDCBatch or null', async () => {
        const result = await instance.getCDCBatch('nonexistent')
        const batch: CDCBatch | null = result
        expect(batch).toBeNull()
      })
    })

    describe('queryCDCBatches', () => {
      it('should work without parameters', async () => {
        const result = await instance.queryCDCBatches()
        expect(Array.isArray(result)).toBe(true)
      })

      it('should accept query parameter', async () => {
        const query: CDCBatchQuery = { sourceTable: 'users', limit: 10 }
        const result = await instance.queryCDCBatches(query)
        expect(Array.isArray(result)).toBe(true)
      })

      it('should return CDCBatch array', async () => {
        const result = await instance.queryCDCBatches()
        const batches: CDCBatch[] = result
        expect(batches).toBeInstanceOf(Array)
      })
    })

    describe('transformToParquet', () => {
      it('should accept batchId parameter', async () => {
        // This will fail at runtime (no batch exists) but type should be correct
        try {
          await instance.transformToParquet('batch-123')
        } catch {
          // Expected - batch doesn't exist
        }
      })

      it('should accept optional options parameter', async () => {
        try {
          await instance.transformToParquet('batch-123', { compression: 'snappy' })
        } catch {
          // Expected
        }
      })

      it('should return ParquetResult', async () => {
        // Create a batch first, then transform
        const batch = await instance.createCDCBatch('users', 'insert')
        const result = await instance.transformToParquet(batch.id)
        const parquet: ParquetResult = result
        expect(parquet.batchId).toBe(batch.id)
      })
    })

    describe('outputToR2', () => {
      it('should accept parquetData parameter', async () => {
        const batch = await instance.createCDCBatch('users', 'insert')
        const parquet = await instance.transformToParquet(batch.id)
        const result = await instance.outputToR2(parquet)
        expect(result).toBeDefined()
      })

      it('should accept optional options parameter', async () => {
        const batch = await instance.createCDCBatch('users', 'insert')
        const parquet = await instance.transformToParquet(batch.id)
        const result = await instance.outputToR2(parquet, { pathPrefix: 'cdc/' })
        expect(result).toBeDefined()
      })

      it('should return R2OutputResult', async () => {
        const batch = await instance.createCDCBatch('users', 'insert')
        const parquet = await instance.transformToParquet(batch.id)
        const result = await instance.outputToR2(parquet)
        const output: R2OutputResult = result
        expect(output.batchId).toBe(batch.id)
      })
    })

    describe('processCDCPipeline', () => {
      it('should work without parameters', async () => {
        const result = await instance.processCDCPipeline()
        expect(result).toBeDefined()
      })

      it('should accept options parameter', async () => {
        const options: CDCPipelineOptions = {
          sourceTables: ['users'],
          maxBatches: 10,
          dryRun: true,
        }
        const result = await instance.processCDCPipeline(options)
        expect(result).toBeDefined()
      })

      it('should return CDCPipelineResult', async () => {
        const result = await instance.processCDCPipeline()
        const pipelineResult: CDCPipelineResult = result
        expect(typeof pipelineResult.success).toBe('boolean')
      })
    })
  })

  describe('Custom DO Subclass Compatibility', () => {
    it('should work with custom DO subclasses', () => {
      const CDCCustomDO = withCDC(CustomDO)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCCustomDO(ctx, env)
      expect(instance).toBeInstanceOf(CustomDO)
      expect(instance).toBeInstanceOf(DOCore)
    })

    it('should preserve custom methods from subclass', () => {
      const CDCCustomDO = withCDC(CustomDO)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCCustomDO(ctx, env)

      // Custom methods should still exist
      expect(typeof instance.customMethod).toBe('function')
      expect(typeof instance.customAsyncMethod).toBe('function')

      // And they should work
      expect(instance.customMethod()).toBe('custom')
    })

    it('should add CDC methods to custom subclass', () => {
      const CDCCustomDO = withCDC(CustomDO)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCCustomDO(ctx, env)

      // CDC methods should be added
      expect(typeof instance.createCDCBatch).toBe('function')
      expect(typeof instance.processCDCPipeline).toBe('function')
    })

    it('should preserve custom async methods', async () => {
      const CDCCustomDO = withCDC(CustomDO)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCCustomDO(ctx, env)
      const result = await instance.customAsyncMethod()
      expect(result).toBe(42)
    })
  })

  describe('Generic Type Parameter Preservation', () => {
    it('should preserve env type parameter', () => {
      const CDCTypedDO = withCDC(TypedEnvDO)
      const ctx = createMockState()
      const mockBucket: R2Bucket = {
        put: async () => {},
        get: async () => null,
      }
      const env: CustomEnv = {
        MY_BUCKET: mockBucket,
        MY_KV: {
          get: async () => null,
          put: async () => {},
        },
      }

      const instance = new CDCTypedDO(ctx, env)

      // The instance should still have access to typed env methods
      // This is mainly a compile-time check
      expect(instance.getBucket()).toBe(mockBucket)
    })

    it('should allow accessing typed env properties', () => {
      const CDCTypedDO = withCDC(TypedEnvDO)
      const ctx = createMockState()
      const env: CustomEnv = {
        MY_BUCKET: {
          put: async () => {},
          get: async () => null,
        },
        MY_KV: {
          get: async () => null,
          put: async () => {},
        },
      }

      const instance = new CDCTypedDO(ctx, env)

      // Type-safe access to env
      const bucket = instance.getBucket()
      expect(bucket).toBeDefined()
    })
  })

  describe('Multiple Mixin Composition', () => {
    it('should allow composing withCDC with other mixins', () => {
      // Simulate another mixin
      function withLogger<T extends new (...args: unknown[]) => object>(Base: T) {
        return class extends Base {
          log(message: string): void {
            console.log(message)
          }
        }
      }

      // Compose mixins - CDC first, then logger
      // Note: This tests that withCDC returns a proper class that can be extended
      const CDCLoggerDO = withLogger(withCDC(DOCore) as unknown as new (...args: unknown[]) => object)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCLoggerDO(ctx, env)
      expect(typeof instance.log).toBe('function')
    })
  })

  describe('Type Inference Tests', () => {
    it('should infer correct return types for CDC methods', async () => {
      const CDCEnabledDO = withCDC(DOCore)
      const ctx = createMockState()
      const env: DOEnv = {}
      const instance = new CDCEnabledDO(ctx, env)

      // These are compile-time type checks
      // If the types are wrong, TypeScript will error

      // createCDCBatch returns Promise<CDCBatch>
      const batch = await instance.createCDCBatch('test', 'insert')
      expectTypeOf(batch).toMatchTypeOf<CDCBatch>()

      // getCDCBatch returns Promise<CDCBatch | null>
      const maybeBatch = await instance.getCDCBatch('id')
      expectTypeOf(maybeBatch).toMatchTypeOf<CDCBatch | null>()

      // queryCDCBatches returns Promise<CDCBatch[]>
      const batches = await instance.queryCDCBatches()
      expectTypeOf(batches).toMatchTypeOf<CDCBatch[]>()

      // processCDCPipeline returns Promise<CDCPipelineResult>
      const pipelineResult = await instance.processCDCPipeline()
      expectTypeOf(pipelineResult).toMatchTypeOf<CDCPipelineResult>()
    })
  })

  describe('Constructor Signature Preservation', () => {
    it('should maintain DOCore constructor signature', () => {
      const CDCEnabledDO = withCDC(DOCore)

      // Should accept same parameters as DOCore
      const ctx = createMockState()
      const env: DOEnv = {}

      // This should not throw type errors
      const instance = new CDCEnabledDO(ctx, env)
      expect(instance).toBeDefined()
    })

    it('should maintain custom subclass constructor signature', () => {
      // Custom DO with extra constructor logic
      class CustomConstructorDO extends DOCore {
        readonly customProp: string

        constructor(ctx: DOState, env: DOEnv) {
          super(ctx, env)
          this.customProp = 'initialized'
        }
      }

      const CDCCustomDO = withCDC(CustomConstructorDO)
      const ctx = createMockState()
      const env: DOEnv = {}

      const instance = new CDCCustomDO(ctx, env)
      expect(instance.customProp).toBe('initialized')
    })
  })
})
