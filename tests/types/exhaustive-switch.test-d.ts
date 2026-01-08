/**
 * Type Tests for Exhaustive Switch Checks
 *
 * RED PHASE: These tests define the contract for exhaustive switch handling.
 * The tests SHOULD FAIL on the current codebase because:
 * 1. assertNever utility doesn't exist in @dotdo/do-core
 * 2. Current switch statements don't enforce exhaustiveness
 *
 * Expected failures when running: npx tsc --noEmit tests/types/exhaustive-switch.test-d.ts
 * - Cannot find module '@dotdo/do-core' exports for assertNever
 * - @ts-expect-error directives will error if assertNever doesn't exist
 *
 * GREEN PHASE will add the assertNever utility and update switch statements.
 */

// =============================================================================
// TEST 1: assertNever Utility Type Contract
// =============================================================================
// The assertNever function should accept only `never` type and return `never`
// This is the foundation for exhaustive switch checks

// This import SHOULD FAIL - assertNever doesn't exist yet
// When GREEN phase adds it, this import will work
import { assertNever } from '@dotdo/do-core'

// Test: assertNever accepts never and returns never
declare const neverValue: never
// @ts-expect-error - assertNever should exist but doesn't yet
const result: never = assertNever(neverValue)

// Test: assertNever rejects non-never types
// @ts-expect-error - string is not never, should fail
assertNever('not-never' as string)

// =============================================================================
// TEST 2: Discriminated Union Exhaustiveness - Basic
// =============================================================================
// A properly typed switch should become exhaustive when all cases are handled

type Action =
  | { type: 'create'; data: string }
  | { type: 'update'; id: number }
  | { type: 'delete'; id: number }

/**
 * INCOMPLETE handler - missing 'delete' case
 * This should cause a compile error in default case with assertNever
 */
function handleActionIncomplete(action: Action): string {
  switch (action.type) {
    case 'create':
      return 'created'
    case 'update':
      return 'updated'
    // 'delete' case is missing
    default:
      // @ts-expect-error - action is NOT never (delete case not handled)
      // This error proves exhaustiveness check works
      return assertNever(action)
  }
}

/**
 * COMPLETE handler - all cases handled
 * The default case should properly narrow to never
 */
function handleActionComplete(action: Action): string {
  switch (action.type) {
    case 'create':
      return 'created'
    case 'update':
      return 'updated'
    case 'delete':
      return 'deleted'
    default:
      // action is now `never` - all cases handled
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(action)
  }
}

// =============================================================================
// TEST 3: Filter Operator Union (from repository.ts)
// =============================================================================
// Tests based on actual types in the codebase

type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'

/**
 * Incomplete filter handler - missing 'in' case
 */
function matchesFilterIncomplete(operator: FilterOperator): boolean {
  switch (operator) {
    case 'eq':
      return true
    case 'ne':
      return true
    case 'gt':
      return true
    case 'gte':
      return true
    case 'lt':
      return true
    case 'lte':
      return true
    case 'like':
      return true
    // 'in' is missing
    default:
      // @ts-expect-error - operator is NOT never ('in' not handled)
      return assertNever(operator)
  }
}

/**
 * Complete filter handler - all cases handled
 */
function matchesFilterComplete(operator: FilterOperator): boolean {
  switch (operator) {
    case 'eq':
      return true
    case 'ne':
      return true
    case 'gt':
      return true
    case 'gte':
      return true
    case 'lt':
      return true
    case 'lte':
      return true
    case 'like':
      return true
    case 'in':
      return true
    default:
      // operator is now `never`
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(operator)
  }
}

// =============================================================================
// TEST 4: Distance Metric Union (from cluster-manager.ts)
// =============================================================================

type DistanceMetric = 'euclidean' | 'cosine' | 'dotProduct'

/**
 * Incomplete distance handler - missing 'dotProduct' case
 */
function calculateDistanceIncomplete(metric: DistanceMetric): number {
  switch (metric) {
    case 'euclidean':
      return 1
    case 'cosine':
      return 2
    // 'dotProduct' is missing
    default:
      // @ts-expect-error - metric is NOT never ('dotProduct' not handled)
      return assertNever(metric)
  }
}

/**
 * Complete distance handler - all cases handled
 */
function calculateDistanceComplete(metric: DistanceMetric): number {
  switch (metric) {
    case 'euclidean':
      return 1
    case 'cosine':
      return 2
    case 'dotProduct':
      return 3
    default:
      // metric is now `never`
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(metric)
  }
}

// =============================================================================
// TEST 5: MCP Error Code Exhaustiveness
// =============================================================================
// Based on McpErrorCode enum from mcp-error.ts

const enum McpErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
}

/**
 * Incomplete error handler - missing ServerError
 */
function getDefaultMessageIncomplete(code: McpErrorCode): string {
  switch (code) {
    case McpErrorCode.ParseError:
      return 'Parse error'
    case McpErrorCode.InvalidRequest:
      return 'Invalid Request'
    case McpErrorCode.MethodNotFound:
      return 'Method not found'
    case McpErrorCode.InvalidParams:
      return 'Invalid params'
    case McpErrorCode.InternalError:
      return 'Internal error'
    // ServerError is missing
    default:
      // @ts-expect-error - code is NOT never (ServerError not handled)
      return assertNever(code)
  }
}

/**
 * Complete error handler - all cases handled
 */
function getDefaultMessageComplete(code: McpErrorCode): string {
  switch (code) {
    case McpErrorCode.ParseError:
      return 'Parse error'
    case McpErrorCode.InvalidRequest:
      return 'Invalid Request'
    case McpErrorCode.MethodNotFound:
      return 'Method not found'
    case McpErrorCode.InvalidParams:
      return 'Invalid params'
    case McpErrorCode.InternalError:
      return 'Internal error'
    case McpErrorCode.ServerError:
      return 'Server error'
    default:
      // code is now `never`
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(code)
  }
}

// =============================================================================
// TEST 6: Union Extension Safety
// =============================================================================
// When a union is extended, existing switches should fail to compile

type BaseStatus = 'pending' | 'active' | 'completed'
type ExtendedStatus = BaseStatus | 'archived' | 'deleted'

/**
 * Handler written for BaseStatus
 * Should FAIL when called with ExtendedStatus
 */
function handleBaseStatus(status: BaseStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    default:
      // status is `never` for BaseStatus
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(status)
  }
}

/**
 * Test that passing ExtendedStatus to BaseStatus handler is caught
 */
declare const extendedStatus: ExtendedStatus
// @ts-expect-error - ExtendedStatus is not assignable to BaseStatus
handleBaseStatus(extendedStatus)

/**
 * Handler for ExtendedStatus must handle all cases
 */
function handleExtendedStatus(status: ExtendedStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'archived':
      return 'Archived'
    case 'deleted':
      return 'Deleted'
    default:
      // status is now `never`
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(status)
  }
}

// =============================================================================
// TEST 7: Nested Discriminated Unions
// =============================================================================
// More complex patterns seen in real applications

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestBase<M extends HttpMethod> {
  method: M
  url: string
}

interface GetRequest extends RequestBase<'GET'> {
  params?: Record<string, string>
}

interface PostRequest extends RequestBase<'POST'> {
  body: unknown
}

interface PutRequest extends RequestBase<'PUT'> {
  body: unknown
}

interface DeleteRequest extends RequestBase<'DELETE'> {}

interface PatchRequest extends RequestBase<'PATCH'> {
  body: Partial<unknown>
}

type HttpRequest = GetRequest | PostRequest | PutRequest | DeleteRequest | PatchRequest

/**
 * Incomplete request handler - missing PATCH
 */
function handleRequestIncomplete(request: HttpRequest): Response {
  switch (request.method) {
    case 'GET':
      return new Response('get')
    case 'POST':
      return new Response('post')
    case 'PUT':
      return new Response('put')
    case 'DELETE':
      return new Response('delete')
    // PATCH is missing
    default:
      // @ts-expect-error - request is NOT never (PATCH not handled)
      return assertNever(request)
  }
}

/**
 * Complete request handler - all methods handled
 */
function handleRequestComplete(request: HttpRequest): Response {
  switch (request.method) {
    case 'GET':
      return new Response('get')
    case 'POST':
      return new Response('post')
    case 'PUT':
      return new Response('put')
    case 'DELETE':
      return new Response('delete')
    case 'PATCH':
      return new Response('patch')
    default:
      // request is now `never`
      // @ts-expect-error - assertNever doesn't exist yet
      return assertNever(request)
  }
}

// =============================================================================
// TEST 8: Type-only assertNever alternative
// =============================================================================
// For cases where we want compile-time only checks without runtime overhead

/**
 * Type-level exhaustiveness check (no runtime function needed)
 * This pattern uses conditional types to verify exhaustiveness
 */
type AssertExhaustive<T extends never> = T

/**
 * Complete handler using type-level assertion
 */
function handleWithTypeAssertion(action: Action): string {
  switch (action.type) {
    case 'create':
      return 'created'
    case 'update':
      return 'updated'
    case 'delete':
      return 'deleted'
    default: {
      // Type-level assertion - action should be never
      type _exhaustiveCheck = AssertExhaustive<typeof action>
      throw new Error('Unreachable')
    }
  }
}

/**
 * Incomplete handler - type assertion should fail
 */
function handleWithTypeAssertionIncomplete(action: Action): string {
  switch (action.type) {
    case 'create':
      return 'created'
    case 'update':
      return 'updated'
    // 'delete' missing
    default: {
      // @ts-expect-error - action is NOT never, type constraint fails
      type _exhaustiveCheck = AssertExhaustive<typeof action>
      throw new Error('Unreachable')
    }
  }
}

// =============================================================================
// Export for module validation
// =============================================================================
export {
  handleActionIncomplete,
  handleActionComplete,
  matchesFilterIncomplete,
  matchesFilterComplete,
  calculateDistanceIncomplete,
  calculateDistanceComplete,
  getDefaultMessageIncomplete,
  getDefaultMessageComplete,
  handleBaseStatus,
  handleExtendedStatus,
  handleRequestIncomplete,
  handleRequestComplete,
  handleWithTypeAssertion,
  handleWithTypeAssertionIncomplete,
}
