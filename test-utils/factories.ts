/**
 * Test Data Factories
 *
 * Provides factory functions to generate test data
 */

import { randomUUID } from 'crypto'

/**
 * Thing factory
 */
export function createTestThing(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()
  const ns = overrides.ns || 'test'

  return {
    ns,
    id,
    slug: `test-thing-${id}`,
    name: `Test Thing ${id.slice(0, 8)}`,
    description: 'A test thing for unit testing',
    metadata: {},
    tags: ['test'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Relationship factory
 */
export function createTestRelationship(overrides: Partial<any> = {}) {
  return {
    id: overrides.id || randomUUID(),
    fromNs: overrides.fromNs || 'test',
    fromId: overrides.fromId || randomUUID(),
    toNs: overrides.toNs || 'test',
    toId: overrides.toId || randomUUID(),
    type: overrides.type || 'related-to',
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * User factory
 */
export function createTestUser(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()
  const username = overrides.username || `testuser${id.slice(0, 8)}`

  return {
    id,
    username,
    email: overrides.email || `${username}@example.com`,
    name: overrides.name || `Test User ${id.slice(0, 8)}`,
    avatar: null,
    bio: 'Test user for unit testing',
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Agent factory
 */
export function createTestAgent(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    ns: 'agent',
    id,
    slug: `test-agent-${id.slice(0, 8)}`,
    name: `Test Agent ${id.slice(0, 8)}`,
    description: 'A test agent for unit testing',
    prompt: 'You are a helpful test agent.',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1000,
    tools: [],
    metadata: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Workflow factory
 */
export function createTestWorkflow(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    ns: 'workflow',
    id,
    slug: `test-workflow-${id.slice(0, 8)}`,
    name: `Test Workflow ${id.slice(0, 8)}`,
    description: 'A test workflow for unit testing',
    steps: [],
    triggers: [],
    metadata: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Function factory
 */
export function createTestFunction(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    ns: 'function',
    id,
    slug: `test-function-${id.slice(0, 8)}`,
    name: `Test Function ${id.slice(0, 8)}`,
    description: 'A test function for unit testing',
    code: 'export default function() { return "test"; }',
    runtime: 'javascript',
    metadata: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Integration factory
 */
export function createTestIntegration(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    ns: 'integration',
    id,
    slug: `test-integration-${id.slice(0, 8)}`,
    name: `Test Integration ${id.slice(0, 8)}`,
    description: 'A test integration for unit testing',
    provider: 'test-provider',
    config: {},
    credentials: {},
    metadata: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * API Key factory
 */
export function createTestApiKey(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    id,
    key: overrides.key || `test_${randomUUID().replace(/-/g, '')}`,
    name: overrides.name || `Test API Key ${id.slice(0, 8)}`,
    userId: overrides.userId || randomUUID(),
    permissions: overrides.permissions || ['read', 'write'],
    expiresAt: overrides.expiresAt || null,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Event factory
 */
export function createTestEvent(overrides: Partial<any> = {}) {
  const id = overrides.id || randomUUID()

  return {
    id,
    type: overrides.type || 'test.event',
    source: overrides.source || 'test',
    data: overrides.data || {},
    metadata: {},
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Batch factory - creates multiple instances
 */
export function createTestBatch<T>(factory: (overrides?: any) => T, count: number, overrides: any[] = []): T[] {
  const items: T[] = []

  for (let i = 0; i < count; i++) {
    items.push(factory(overrides[i] || {}))
  }

  return items
}

/**
 * Random string generator
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Random integer generator
 */
export function randomInt(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Random boolean generator
 */
export function randomBoolean(): boolean {
  return Math.random() < 0.5
}

/**
 * Random date generator
 */
export function randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

/**
 * Random email generator
 */
export function randomEmail(): string {
  return `test${randomString(8)}@example.com`
}

/**
 * Random URL generator
 */
export function randomUrl(): string {
  return `https://example.com/${randomString(10)}`
}

/**
 * Factory builder - creates a configurable factory
 */
export class FactoryBuilder<T> {
  private defaults: Partial<T> = {}
  private overrides: Array<(obj: T) => T> = []

  constructor(private generator: (overrides: Partial<T>) => T) {}

  withDefaults(defaults: Partial<T>): this {
    this.defaults = { ...this.defaults, ...defaults }
    return this
  }

  withOverride(fn: (obj: T) => T): this {
    this.overrides.push(fn)
    return this
  }

  build(overrides: Partial<T> = {}): T {
    let obj = this.generator({ ...this.defaults, ...overrides })

    for (const override of this.overrides) {
      obj = override(obj)
    }

    return obj
  }

  buildMany(count: number, overrides: Partial<T>[] = []): T[] {
    return Array.from({ length: count }, (_, i) => this.build(overrides[i] || {}))
  }
}

/**
 * Create a factory builder
 */
export function defineFactory<T>(generator: (overrides: Partial<T>) => T): FactoryBuilder<T> {
  return new FactoryBuilder(generator)
}
