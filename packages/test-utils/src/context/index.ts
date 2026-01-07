/**
 * Test context setup and teardown utilities.
 *
 * Provides helpers for managing test lifecycle, fixtures, and cleanup.
 */

import {
  createMockEnv,
  createMockExecutionContext,
  type MockExecutionContext,
} from '../mocks/index.js'

// ============================================================================
// Types
// ============================================================================

export interface TestContext {
  env: Record<string, unknown>
  executionContext: MockExecutionContext
  getWaitUntilPromises(): Promise<unknown>[]
  didPassThroughOnException(): boolean
  flushWaitUntil(): Promise<void>
  getCleanupCount(): number
  _cleanupFns: Array<() => void | Promise<void>>
}

export interface TestContextOptions {
  env?: Record<string, unknown>
  executionContext?: MockExecutionContext
}

export interface Fixture<T, O = void> {
  name: string
  create: (options?: O) => T
  createAsync: (options?: O) => Promise<T>
  _factory: (options?: O) => T | Promise<T>
  _cleanup?: () => void | Promise<void>
}

// ============================================================================
// Test Context Setup/Teardown
// ============================================================================

export function createTestContext(options: TestContextOptions = {}): TestContext {
  const env = options.env ?? createMockEnv()
  const executionContext = options.executionContext ?? createMockExecutionContext()
  const cleanupFns: Array<() => void | Promise<void>> = []

  return {
    env,
    executionContext,
    getWaitUntilPromises(): Promise<unknown>[] {
      return executionContext._waitUntilPromises
    },
    didPassThroughOnException(): boolean {
      return executionContext._passThroughOnException
    },
    async flushWaitUntil(): Promise<void> {
      await Promise.all(executionContext._waitUntilPromises)
    },
    getCleanupCount(): number {
      return cleanupFns.length
    },
    _cleanupFns: cleanupFns,
  }
}

export async function withTestContext<T>(
  fn: (ctx: TestContext) => Promise<T>,
  options: TestContextOptions = {}
): Promise<T> {
  const ctx = createTestContext(options)
  try {
    return await fn(ctx)
  } finally {
    await runCleanup(ctx)
  }
}

// ============================================================================
// Test Fixture Management
// ============================================================================

export function createFixture<T, O = void>(
  name: string,
  factory: (options?: O) => T | Promise<T>,
  cleanup?: () => void | Promise<void>
): Fixture<T, O> {
  return {
    name,
    _factory: factory,
    _cleanup: cleanup,
    create(options?: O): T {
      const result = factory(options)
      if (result instanceof Promise) {
        throw new Error(
          `Fixture "${name}" returned a Promise. Use createAsync() for async fixtures.`
        )
      }
      return result
    },
    async createAsync(options?: O): Promise<T> {
      return factory(options)
    },
  }
}

export function useFixture<T, O = void>(ctx: TestContext, fixture: Fixture<T, O>, options?: O): T {
  const instance = fixture.create(options)

  if (fixture._cleanup) {
    registerCleanup(ctx, fixture._cleanup)
  }

  return instance
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

export function registerCleanup(ctx: TestContext, fn: () => void | Promise<void>): void {
  ctx._cleanupFns.push(fn)
}

export async function runCleanup(ctx: TestContext): Promise<void> {
  const errors: Error[] = []

  // Run cleanup functions in reverse order (LIFO)
  const cleanupFns = [...ctx._cleanupFns].reverse()
  ctx._cleanupFns.length = 0

  for (const fn of cleanupFns) {
    try {
      await fn()
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    throw errors[0]
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export interface RequestAssertionOptions {
  method?: string
  url?: string | RegExp
  headers?: Record<string, string>
  jsonBody?: unknown
}

/**
 * Assert properties of a Request.
 * For sync checks (method, url, headers), throws synchronously.
 * For async checks (jsonBody), returns a Promise.
 */
export function assertRequest(
  request: Request,
  options: RequestAssertionOptions
): void | Promise<void> {
  // Synchronous assertions
  if (options.method !== undefined) {
    if (request.method !== options.method) {
      throw new Error(
        `Expected request method to be "${options.method}" but got "${request.method}"`
      )
    }
  }

  if (options.url !== undefined) {
    if (typeof options.url === 'string') {
      if (request.url !== options.url) {
        throw new Error(`Expected request URL to be "${options.url}" but got "${request.url}"`)
      }
    } else {
      if (!options.url.test(request.url)) {
        throw new Error(`Expected request URL to match ${options.url} but got "${request.url}"`)
      }
    }
  }

  if (options.headers !== undefined) {
    for (const [key, value] of Object.entries(options.headers)) {
      const actual = request.headers.get(key)
      if (actual !== value) {
        throw new Error(
          `Expected request header "${key}" to be "${value}" but got "${actual}"`
        )
      }
    }
  }

  // Async assertion for body
  if (options.jsonBody !== undefined) {
    return (async () => {
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()
      const expectedJson = JSON.stringify(options.jsonBody)
      const actualJson = JSON.stringify(body)
      if (expectedJson !== actualJson) {
        throw new Error(
          `Expected request JSON body to be ${expectedJson} but got ${actualJson}`
        )
      }
    })()
  }
}

export interface ResponseAssertionOptions {
  status?: number
  ok?: boolean
  headers?: Record<string, string>
  jsonBody?: unknown
}

/**
 * Assert properties of a Response.
 * For sync checks (status, ok, headers), throws synchronously.
 * For async checks (jsonBody), returns a Promise.
 */
export function assertResponse(
  response: Response,
  options: ResponseAssertionOptions
): void | Promise<void> {
  // Synchronous assertions
  if (options.status !== undefined) {
    if (response.status !== options.status) {
      throw new Error(
        `Expected response status to be ${options.status} but got ${response.status}`
      )
    }
  }

  if (options.ok !== undefined) {
    if (response.ok !== options.ok) {
      throw new Error(`Expected response.ok to be ${options.ok} but got ${response.ok}`)
    }
  }

  if (options.headers !== undefined) {
    for (const [key, value] of Object.entries(options.headers)) {
      const actual = response.headers.get(key)
      if (actual !== value) {
        throw new Error(
          `Expected response header "${key}" to be "${value}" but got "${actual}"`
        )
      }
    }
  }

  // Async assertion for body
  if (options.jsonBody !== undefined) {
    return (async () => {
      const clonedResponse = response.clone()
      const body = await clonedResponse.json()
      const expectedJson = JSON.stringify(options.jsonBody)
      const actualJson = JSON.stringify(body)
      if (expectedJson !== actualJson) {
        throw new Error(
          `Expected response JSON body to be ${expectedJson} but got ${actualJson}`
        )
      }
    })()
  }
}

export interface DurableObjectStateAssertionOptions {
  hasKey?: string
  keyValue?: Record<string, unknown>
  keyCount?: number
}

export async function assertDurableObjectState(
  state: { storage: { get(key: string): Promise<unknown>; list(): Promise<Map<string, unknown>> } },
  options: DurableObjectStateAssertionOptions
): Promise<void> {
  if (options.hasKey !== undefined) {
    const value = await state.storage.get(options.hasKey)
    if (value === undefined) {
      throw new Error(`Expected storage to have key "${options.hasKey}" but it was not found`)
    }
  }

  if (options.keyValue !== undefined) {
    for (const [key, expectedValue] of Object.entries(options.keyValue)) {
      const actualValue = await state.storage.get(key)
      const expectedJson = JSON.stringify(expectedValue)
      const actualJson = JSON.stringify(actualValue)
      if (expectedJson !== actualJson) {
        throw new Error(
          `Expected storage key "${key}" to have value ${expectedJson} but got ${actualJson}`
        )
      }
    }
  }

  if (options.keyCount !== undefined) {
    const allKeys = await state.storage.list()
    if (allKeys.size !== options.keyCount) {
      throw new Error(
        `Expected storage to have ${options.keyCount} keys but got ${allKeys.size}`
      )
    }
  }
}
