/**
 * Integration Test Setup and Utilities
 *
 * Provides mocks, utilities, and configuration for integration tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'

/**
 * Test environment configuration
 */
export const TEST_ENV = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:8787',
  TEST_API_KEY: process.env.TEST_API_KEY || 'test-api-key',
  TEST_DB: 'test',
  TIMEOUT: 30000, // 30 seconds
}

/**
 * Mock service bindings for testing
 */
export function createMockEnv() {
  return {
    // Service bindings (mocked)
    DB_SERVICE: createMockService('db'),
    AUTH_SERVICE: createMockService('auth'),
    SCHEDULE_SERVICE: createMockService('schedule'),
    WEBHOOKS_SERVICE: createMockService('webhooks'),
    EMAIL_SERVICE: createMockService('email'),
    MCP_SERVICE: createMockService('mcp'),
    QUEUE_SERVICE: createMockService('queue'),

    // Database binding
    DB: {},

    // KV namespaces
    KV: {},
    CACHE: {},

    // Environment variables
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'debug',
  }
}

/**
 * Create mock RPC service
 */
function createMockService(name: string) {
  return new Proxy({}, {
    get(_target, prop) {
      return async (...args: any[]) => {
        console.log(`[MOCK] ${name}.${String(prop)}(`, args, ')')
        return { success: true, data: null }
      }
    },
  })
}

/**
 * Test data generators
 */
export const testData = {
  user: () => ({
    id: `user_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date().toISOString(),
  }),

  apiKey: () => ({
    id: `key_${Date.now()}`,
    key: `test_key_${Math.random().toString(36).substring(7)}`,
    name: 'Test API Key',
    createdAt: new Date().toISOString(),
  }),

  webhook: () => ({
    id: `webhook_${Date.now()}`,
    url: 'https://example.com/webhook',
    events: ['test.event'],
    active: true,
  }),

  email: () => ({
    to: 'test@example.com',
    from: 'noreply@test.com',
    subject: 'Test Email',
    html: '<p>Test email content</p>',
  }),
}

/**
 * HTTP request helper with automatic auth
 */
export async function testRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${TEST_ENV.BASE_URL}${path}`

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TEST_ENV.TEST_API_KEY}`,
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Wait for service to be ready
 */
export async function waitForService(
  serviceName: string,
  maxAttempts = 10,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${TEST_ENV.BASE_URL}/health/${serviceName}`)
      if (response.ok) return true
    } catch (error) {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}

/**
 * Retry helper for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('Retry failed')
}

/**
 * Clean up test data after each test
 */
export async function cleanupTestData() {
  // Delete test users
  // Delete test API keys
  // Delete test webhooks
  // Reset test database
  console.log('[TEST] Cleaning up test data...')
}

/**
 * Setup test environment before all tests
 */
beforeAll(async () => {
  console.log('[TEST] Setting up integration test environment...')

  // Wait for all services to be ready
  const services = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue']
  for (const service of services) {
    const ready = await waitForService(service, 10, 2000)
    if (!ready) {
      console.warn(`[TEST] Service ${service} not ready, tests may fail`)
    }
  }

  console.log('[TEST] Integration test environment ready')
})

/**
 * Cleanup after each test
 */
beforeEach(async () => {
  await cleanupTestData()
})

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  console.log('[TEST] Tearing down integration test environment...')
  await cleanupTestData()
})

/**
 * Assert response is successful
 */
export function assertSuccess(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
}

/**
 * Assert response matches expected status
 */
export function assertStatus(response: Response, expected: number) {
  if (response.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${response.status}`)
  }
}

/**
 * Assert performance within budget
 */
export function assertPerformance(duration: number, budget: number) {
  if (duration > budget) {
    throw new Error(`Performance budget exceeded: ${duration}ms > ${budget}ms`)
  }
}
