/**
 * Test Setup Utilities
 *
 * Provides helpers for setting up test environments across all microservices
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { ExecutionContext } from '@cloudflare/workers-types'

/**
 * Creates a mock execution context for Workers
 */
export function createMockExecutionContext(): ExecutionContext {
  const waitUntilPromises: Promise<unknown>[] = []
  const passThroughPromises: Promise<unknown>[] = []

  return {
    waitUntil(promise: Promise<unknown>) {
      waitUntilPromises.push(promise)
    },
    passThroughOnException() {
      // Mock implementation
    },
  }
}

/**
 * Wait for all promises in execution context
 */
export async function waitOnExecutionContext(ctx: ExecutionContext): Promise<void> {
  // Access private property for testing
  const context = ctx as any
  if (context.waitUntilPromises) {
    await Promise.all(context.waitUntilPromises)
  }
}

/**
 * Creates a test request with optional overrides
 */
export function createTestRequest(url: string, init?: RequestInit): Request {
  return new Request(url, {
    method: 'GET',
    ...init,
  })
}

/**
 * Creates a test response
 */
export function createTestResponse(body?: BodyInit, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/**
 * Setup function for database tests
 */
export async function setupDatabase(db: any) {
  // Run migrations or seed data
  // This should be implemented based on your database setup
  console.log('Setting up test database...')
}

/**
 * Cleanup function for database tests
 */
export async function cleanupDatabase(db: any) {
  // Clear test data
  console.log('Cleaning up test database...')
}

/**
 * Global test setup
 */
export function setupTestEnvironment() {
  beforeAll(async () => {
    // Global setup
    console.log('Starting test suite...')
  })

  afterAll(async () => {
    // Global cleanup
    console.log('Test suite completed')
  })

  beforeEach(async () => {
    // Per-test setup
  })

  afterEach(async () => {
    // Per-test cleanup
  })
}

/**
 * Helper to parse JSON response
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  return JSON.parse(text) as T
}

/**
 * Helper to assert response status
 */
export function assertResponseStatus(response: Response, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
}

/**
 * Helper to create mock environment bindings
 */
export function createMockEnv(overrides: Record<string, any> = {}): any {
  return {
    // Default environment variables
    ENVIRONMENT: 'test',
    ...overrides,
  }
}

/**
 * Sleep utility for tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry utility for flaky tests
 */
export async function retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delayMs: number = 100): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt)
      }
    }
  }

  throw lastError
}

/**
 * Timeout utility for tests
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)),
  ])
}
