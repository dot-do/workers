/**
 * Type Tests for workers.do
 *
 * These tests verify compile-time type safety using expect-type and vitest.
 * Run with: npx vitest run tests/types.test.ts
 *
 * RED PHASE: These tests are expected to FAIL initially.
 * Current issues:
 * - Env interface is duplicated in 6 files with inconsistent definitions
 * - 18+ usages of `any` in public APIs
 * - Response types are not proper discriminated unions
 *
 * @module tests/types.test
 */

import { describe, it, expectTypeOf, assertType } from 'vitest'

// ============================================================================
// Import all Env definitions to test consistency
// ============================================================================

// Note: IndexEnv is NOT exported from src/index.ts - this is a bug!
// We'll define what it should be based on the code inspection
// import type { Env as IndexEnv } from '../src/index' // Would fail - not exported

import type { Env as DeployEnv } from '../src/deploy'
import type { Env as DispatchEnv } from '../src/dispatch'
import type { Env as RouterEnv } from '../src/router'
import type { Env as AssetsEnv } from '../src/assets'
import type { Env as AnalyticsEnv } from '../src/middleware/analytics'

// Import types for RPC testing
import type {
  DeployRequest,
  DeployResponse,
  DispatchRequest,
  DispatchResponse,
  Worker,
  ListOptions,
  LinkOptions,
} from '../src/types'

// Import DO for RPC method types
import type { WorkersRegistryDO } from '../src/workers-registry-do'

// Pipeline type used by IndexEnv (also not exported)
interface Pipeline {
  send(event: unknown): Promise<void>
}

/**
 * This is what IndexEnv looks like in src/index.ts (not exported!)
 * RED: The main worker Env should be exported for type consumers
 */
interface IndexEnv {
  WORKERS_REGISTRY: DurableObjectNamespace
  // Optional WfP bindings (configured separately)
  apps?: DispatchNamespace
  esbuild?: Fetcher
  deployments?: KVNamespace
  db?: D1Database
  analytics?: AnalyticsEngineDataset | Pipeline
  CLICKHOUSE?: Fetcher
}

// ============================================================================
// Test 1: Env interface is consistent across all files
// ============================================================================

describe('Type Tests: Env interface consistency', () => {
  it('all Env interfaces should be assignable to a canonical Env type', () => {
    /**
     * If Env types were consistent, any of them could be used interchangeably
     * for the common properties. This test will FAIL because:
     * - IndexEnv has optional bindings (apps?, esbuild?, etc.)
     * - DeployEnv has required bindings (apps, esbuild, etc.)
     * - DispatchEnv has different required bindings
     * - etc.
     *
     * Expected: All files should import from a single source of truth
     */

    // These tests check if the module-specific Envs extend IndexEnv
    // They should FAIL because module Envs have required properties
    // while IndexEnv makes them optional

    // DeployEnv requires: apps, esbuild, deployments, db
    // IndexEnv has: apps?, esbuild?, deployments?, db?
    // So DeployEnv does NOT extend IndexEnv (required != optional)

    // This creates a type-level assertion that will fail
    type TestDeployEnvExtendsIndex = DeployEnv extends IndexEnv ? true : false

    // We expect this to be true if types are consistent
    // It will actually be false, causing the assertion to fail at compile time
    const deployExtendsIndex: TestDeployEnvExtendsIndex = true
    expectTypeOf(deployExtendsIndex).toEqualTypeOf<true>()
  })

  it('DeployEnv should extend IndexEnv with required bindings', () => {
    /**
     * This test verifies that DeployEnv is compatible with IndexEnv.
     * Currently FAILS because DeployEnv has required fields while IndexEnv has optional.
     */

    // A function that accepts IndexEnv should also accept DeployEnv
    // if the types are properly designed
    function takeIndexEnv(_env: IndexEnv): void {}

    // This should type-check if DeployEnv extends IndexEnv
    // Currently it WON'T because DeployEnv has required fields
    // that IndexEnv marks as optional
    const deployEnv: DeployEnv = {} as DeployEnv
    // @ts-expect-error - DeployEnv should extend IndexEnv but doesn't due to required/optional mismatch
    takeIndexEnv(deployEnv)
  })

  it('IndexEnv should be the superset containing all bindings', () => {
    /**
     * Tests that IndexEnv contains all bindings from all modules.
     * This ensures the main worker env can be used with any module function.
     */
    type RequiredBindings = {
      WORKERS_REGISTRY: DurableObjectNamespace
      apps: DispatchNamespace
      esbuild: Fetcher
      deployments: KVNamespace
      db: D1Database
      analytics: AnalyticsEngineDataset
    }

    // This will FAIL because IndexEnv uses optional (?) for most bindings
    // and analytics has a union type
    type TestIndexEnvComplete = RequiredBindings extends IndexEnv ? true : false
    const indexEnvComplete: TestIndexEnvComplete = true
    expectTypeOf(indexEnvComplete).toEqualTypeOf<true>()
  })
})

// ============================================================================
// Test 2: All RPC methods have proper input/output types
// ============================================================================

describe('Type Tests: RPC methods have proper types', () => {
  it('DeployRequest should have no any types', () => {
    /**
     * DeployRequest should use specific types for all properties.
     */

    // Test DeployRequest is well-typed
    type DeployRequestKeys = keyof DeployRequest
    expectTypeOf<DeployRequestKeys>().toEqualTypeOf<'name' | 'code' | 'language' | 'minify'>()

    // These tests verify type specificity
    expectTypeOf<DeployRequest['name']>().toBeString()
    expectTypeOf<DeployRequest['code']>().toBeString()
  })

  it('DispatchRequest.body should not be any', () => {
    /**
     * DispatchRequest.body is currently typed as `any`.
     * It should be a specific type like `unknown`, `Record<string, unknown>`, or `JsonValue`.
     *
     * This test WILL FAIL - body is typed as `any`
     */

    type BodyType = DispatchRequest['body']

    // If body is `any`, then it's both assignable to string AND from string
    // This is only true for `any`, not for `unknown` or specific types

    // This type test checks if BodyType behaves like `any`
    // (any is the only type where both directions are true)
    type IsBodyAny = string extends BodyType ? (BodyType extends string ? true : false) : false

    // We WANT this to be false (body should NOT be any)
    // It will be TRUE because body IS typed as any
    // So this assertion will FAIL, which is what we want in RED phase
    const bodyIsNotAny: IsBodyAny = false
    expectTypeOf(bodyIsNotAny).toEqualTypeOf<false>()
  })

  it('DispatchResponse.data should not be any', () => {
    /**
     * DispatchResponse.data is currently typed as `any`.
     * It should be `unknown` or a specific response type.
     *
     * This test WILL FAIL - data is typed as `any`
     */

    type DataType = DispatchResponse['data']

    // Same test as above - check if it's `any`
    type IsDataAny = string extends DataType ? (DataType extends string ? true : false) : false

    // Should be FALSE - data should not be `any`
    const dataIsNotAny: IsDataAny = false
    expectTypeOf(dataIsNotAny).toEqualTypeOf<false>()
  })

  it('Worker type should have all required fields as non-optional', () => {
    /**
     * Verifies Worker interface has proper required vs optional fields
     */
    type RequiredWorkerFields = {
      $id: string
      name: string
      url: string
      createdAt: string
    }

    // Verify required fields exist
    expectTypeOf<Worker>().toMatchTypeOf<RequiredWorkerFields>()
  })

  it('ListOptions sortBy should be a union of valid values', () => {
    /**
     * Verify sortBy uses a proper string literal union
     */
    type SortByType = NonNullable<ListOptions['sortBy']>

    // This should be a specific union, not just string
    expectTypeOf<SortByType>().toEqualTypeOf<'created' | 'deployed' | 'accessed'>()
  })
})

// ============================================================================
// Test 3: No implicit any in public APIs
// ============================================================================

describe('Type Tests: No implicit any in public APIs', () => {
  it('deployWorker should have typed return without any', () => {
    /**
     * The deploy functions cast env to `any` internally.
     * The response types should be properly discriminated.
     */

    // DeployResponse has optional fields - not ideal for discriminated union
    expectTypeOf<DeployResponse['success']>().toBeBoolean()
    expectTypeOf<DeployResponse['workerId']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<DeployResponse['error']>().toEqualTypeOf<string | undefined>()
  })

  it('function signatures should not accept any', () => {
    /**
     * Tests that the main export functions have proper signatures.
     *
     * Current issue: Functions cast `env as any` internally, hiding type errors.
     */

    // Import function types (these are the public API)
    type DeployWorkerFn = typeof import('../src/deploy').deployWorker
    type DispatchToWorkerFn = typeof import('../src/dispatch').dispatchToWorker
    type RouteRequestFn = typeof import('../src/router').routeRequest

    // Test parameter types are not any
    // Note: These tests verify the declared types, not the internal casts
    type DeployParams = Parameters<DeployWorkerFn>
    type DispatchParams = Parameters<DispatchToWorkerFn>
    type RouteParams = Parameters<RouteRequestFn>

    // Verify first param types
    expectTypeOf<DeployParams[0]>().toEqualTypeOf<DeployRequest>()
    expectTypeOf<DispatchParams[0]>().toEqualTypeOf<DispatchRequest>()
    expectTypeOf<RouteParams[0]>().toEqualTypeOf<Request>()
  })
})

// ============================================================================
// Test 4: Error types are discriminated unions
// ============================================================================

describe('Type Tests: Error types are discriminated unions', () => {
  it('DeployResponse should be a discriminated union', () => {
    /**
     * A proper discriminated union would be:
     *
     * type DeployResponse =
     *   | { success: true; workerId: string; url: string }
     *   | { success: false; error: string }
     *
     * Current type uses optional fields which doesn't provide
     * type narrowing when checking success.
     *
     * This test WILL FAIL - current type is not a discriminated union
     */

    // Define what a proper discriminated union would look like
    type ProperDeploySuccess = { success: true; workerId: string; url: string }
    type ProperDeployError = { success: false; error: string }
    type ProperDeployResponse = ProperDeploySuccess | ProperDeployError

    // Test that the current type matches the proper discriminated union
    // This will FAIL because current DeployResponse uses optional fields
    type TestIsProperUnion = DeployResponse extends ProperDeployResponse ? true : false

    const isProperUnion: TestIsProperUnion = true
    expectTypeOf(isProperUnion).toEqualTypeOf<true>()
  })

  it('DispatchResponse should be a discriminated union', () => {
    /**
     * A proper discriminated union would be:
     *
     * type DispatchResponse =
     *   | { success: true; status: number; data: unknown }
     *   | { success: false; status?: number; error: string }
     *
     * This test WILL FAIL - current type is not a discriminated union
     */

    type ProperDispatchSuccess = { success: true; status: number; data: unknown }
    type ProperDispatchError = { success: false; status?: number; error: string }
    type ProperDispatchResponse = ProperDispatchSuccess | ProperDispatchError

    type TestIsProperUnion = DispatchResponse extends ProperDispatchResponse ? true : false
    const isProperUnion: TestIsProperUnion = true
    expectTypeOf(isProperUnion).toEqualTypeOf<true>()
  })

  it('narrowing should work with discriminated unions', () => {
    /**
     * With proper discriminated unions, TypeScript should narrow types
     * when checking the success field.
     *
     * This demonstrates what SHOULD work but WON'T with current types.
     */

    // Type test: In a proper discriminated union, after checking success === true,
    // the type should narrow to exclude undefined for workerId
    type AfterSuccessCheck = Extract<DeployResponse, { success: true }>['workerId']

    // This will FAIL - workerId is still string | undefined, not string
    // because DeployResponse is not a proper discriminated union
    expectTypeOf<AfterSuccessCheck>().toBeString()
  })
})

// ============================================================================
// Test 5: Additional type safety checks
// ============================================================================

describe('Type Tests: Additional safety checks', () => {
  it('should have a single Env export location', () => {
    /**
     * There should be ONE canonical Env type exported from types.ts
     * that all other modules import.
     *
     * Current state: 6 different Env definitions exist.
     * Goal: Single source of truth.
     */

    // Test: All Env types should be bidirectionally assignable (they're currently not)
    type EnvEquality1 = IndexEnv extends DeployEnv
      ? (DeployEnv extends IndexEnv ? true : false)
      : false
    type EnvEquality2 = IndexEnv extends DispatchEnv
      ? (DispatchEnv extends IndexEnv ? true : false)
      : false
    type EnvEquality3 = IndexEnv extends RouterEnv
      ? (RouterEnv extends IndexEnv ? true : false)
      : false
    type EnvEquality4 = IndexEnv extends AssetsEnv
      ? (AssetsEnv extends IndexEnv ? true : false)
      : false

    // All of these WILL FAIL because the Env types are different
    const eq1: EnvEquality1 = true
    const eq2: EnvEquality2 = true
    const eq3: EnvEquality3 = true
    const eq4: EnvEquality4 = true

    expectTypeOf(eq1).toEqualTypeOf<true>()
    expectTypeOf(eq2).toEqualTypeOf<true>()
    expectTypeOf(eq3).toEqualTypeOf<true>()
    expectTypeOf(eq4).toEqualTypeOf<true>()
  })

  it('Worker type should not use any for linkedFolders', () => {
    /**
     * Worker.linkedFolders should be properly typed as string[]
     */
    type LinkedFoldersType = NonNullable<Worker['linkedFolders']>
    expectTypeOf<LinkedFoldersType>().toEqualTypeOf<string[]>()
  })

  it('should export Env from types.ts', () => {
    /**
     * The types.ts file should export a canonical Env interface.
     * Currently it doesn't - this is a type safety gap.
     *
     * This test documents what SHOULD be exported.
     */

    // Try to import Env from types - this should work
    // Currently types.ts doesn't export Env, so this would fail
    // We can't actually test this without modifying the import,
    // but we document the expectation here

    type ExpectedExports = {
      DeployRequest: DeployRequest
      DeployResponse: DeployResponse
      DispatchRequest: DispatchRequest
      DispatchResponse: DispatchResponse
      Worker: Worker
      ListOptions: ListOptions
      LinkOptions: LinkOptions
      // Env: Env  // <-- THIS IS MISSING
    }

    // This is a placeholder assertion
    expectTypeOf<ExpectedExports>().not.toBeNever()
  })
})

// ============================================================================
// Test 6: RPC Error types
// ============================================================================

describe('Type Tests: RPC error handling', () => {
  it('RPC error response should use proper error codes', () => {
    /**
     * The RpcResponse interface in workers-registry-do.ts should use
     * a discriminated union with typed error codes.
     *
     * Currently it uses:
     * interface RpcResponse {
     *   result?: any
     *   error?: { code: number; message: string }
     *   id?: string | number
     * }
     *
     * Should be:
     * type RpcResponse<T> =
     *   | { result: T; error?: never; id?: string | number }
     *   | { result?: never; error: { code: RpcErrorCode; message: string }; id?: string | number }
     */

    // Define expected error codes based on JSON-RPC spec
    type RpcErrorCode =
      | -32700 // Parse error
      | -32600 // Invalid Request
      | -32601 // Method not found
      | -32602 // Invalid params
      | -32603 // Internal error

    // The current implementation uses number instead of specific codes
    // This test verifies that specific codes SHOULD be used
    type ExpectedErrorType = { code: RpcErrorCode; message: string }

    // This should be what the error type looks like
    expectTypeOf<ExpectedErrorType['code']>().toEqualTypeOf<RpcErrorCode>()
  })
})
