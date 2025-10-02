/**
 * Integration Test Utilities
 *
 * Provides helpers for testing RPC communication between services
 */

import { vi } from 'vitest'
import type { RpcStub } from 'cloudflare:workers'

/**
 * Test RPC call to a service
 */
export async function testRPC<T = any>(service: any, method: string, args: any[] = []): Promise<T> {
  if (!service || typeof service[method] !== 'function') {
    throw new Error(`Service method ${method} not found`)
  }
  return await service[method](...args)
}

/**
 * Create a mock RPC service that tracks calls
 */
export function createMockRPCService<T extends Record<string, Function>>(methods: T): T & { getCalls: (method: keyof T) => any[][] } {
  const calls = new Map<keyof T, any[][]>()

  const mockService = {} as any

  for (const [methodName, implementation] of Object.entries(methods)) {
    calls.set(methodName as keyof T, [])

    mockService[methodName] = vi.fn(async (...args: any[]) => {
      calls.get(methodName as keyof T)!.push(args)
      return await implementation(...args)
    })
  }

  mockService.getCalls = (method: keyof T) => calls.get(method) || []

  return mockService
}

/**
 * Assert RPC call was made
 */
export function assertRPCCalled(service: any, method: string, expectedArgs?: any[]) {
  if (!service[method] || !vi.isMockFunction(service[method])) {
    throw new Error(`${method} is not a mock function`)
  }

  const calls = (service[method] as any).mock.calls
  if (calls.length === 0) {
    throw new Error(`Expected ${method} to be called, but it was not`)
  }

  if (expectedArgs) {
    const lastCall = calls[calls.length - 1]
    if (JSON.stringify(lastCall) !== JSON.stringify(expectedArgs)) {
      throw new Error(`Expected ${method} to be called with ${JSON.stringify(expectedArgs)}, but got ${JSON.stringify(lastCall)}`)
    }
  }
}

/**
 * Assert RPC call count
 */
export function assertRPCCallCount(service: any, method: string, expectedCount: number) {
  if (!service[method] || !vi.isMockFunction(service[method])) {
    throw new Error(`${method} is not a mock function`)
  }

  const calls = (service[method] as any).mock.calls
  if (calls.length !== expectedCount) {
    throw new Error(`Expected ${method} to be called ${expectedCount} times, but was called ${calls.length} times`)
  }
}

/**
 * Create a test service binding
 */
export function createTestServiceBinding<T extends Record<string, Function>>(implementation: T): T {
  const binding = {} as T

  for (const [methodName, fn] of Object.entries(implementation)) {
    binding[methodName as keyof T] = vi.fn(fn) as any
  }

  return binding
}

/**
 * Mock service-to-service communication
 */
export class MockServiceCommunication {
  private services = new Map<string, any>()
  private callHistory: Array<{ service: string; method: string; args: any[]; result: any; timestamp: number }> = []

  registerService(name: string, implementation: any) {
    this.services.set(name, implementation)
  }

  async callService<T = any>(serviceName: string, method: string, ...args: any[]): Promise<T> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`)
    }

    if (typeof service[method] !== 'function') {
      throw new Error(`Method ${method} not found on service ${serviceName}`)
    }

    const result = await service[method](...args)

    this.callHistory.push({
      service: serviceName,
      method,
      args,
      result,
      timestamp: Date.now(),
    })

    return result
  }

  getCallHistory() {
    return this.callHistory
  }

  clearHistory() {
    this.callHistory = []
  }

  reset() {
    this.services.clear()
    this.callHistory = []
  }
}

/**
 * Integration test helper
 */
export class IntegrationTestHelper {
  private services = new Map<string, any>()
  private cleanup: Array<() => Promise<void>> = []

  /**
   * Register a service for testing
   */
  registerService(name: string, service: any) {
    this.services.set(name, service)
  }

  /**
   * Get a registered service
   */
  getService<T = any>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not found`)
    }
    return service
  }

  /**
   * Add cleanup function
   */
  addCleanup(fn: () => Promise<void>) {
    this.cleanup.push(fn)
  }

  /**
   * Run all cleanup functions
   */
  async runCleanup() {
    for (const fn of this.cleanup) {
      await fn()
    }
    this.cleanup = []
  }

  /**
   * Reset the test helper
   */
  reset() {
    this.services.clear()
    this.cleanup = []
  }
}

/**
 * Test a full request flow through multiple services
 */
export async function testServiceFlow<T = any>(steps: Array<{ service: any; method: string; args: any[] }>): Promise<T[]> {
  const results: T[] = []

  for (const step of steps) {
    const result = await testRPC<T>(step.service, step.method, step.args)
    results.push(result)
  }

  return results
}

/**
 * Mock parallel service calls
 */
export async function testParallelRPC<T = any>(calls: Array<{ service: any; method: string; args: any[] }>): Promise<T[]> {
  const promises = calls.map(({ service, method, args }) => testRPC<T>(service, method, args))

  return await Promise.all(promises)
}

/**
 * Test service with retry logic
 */
export async function testRPCWithRetry<T = any>(
  service: any,
  method: string,
  args: any[] = [],
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await testRPC<T>(service, method, args)
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Create integration test environment
 */
export function createIntegrationTestEnv(services: Record<string, any> = {}) {
  return {
    services,
    helper: new IntegrationTestHelper(),
    communication: new MockServiceCommunication(),
  }
}
