/**
 * Example Integration Test
 *
 * Demonstrates how to write integration tests that test RPC communication between services
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { testRPC, createIntegrationTestEnv, testServiceFlow, assertRPCCalled, createTestThing } from '../test-utils'

describe('Database Service - Integration Tests', () => {
  it('should call DB service via RPC', async () => {
    // Test RPC call to database service
    const result = await testRPC(env.DB, 'getThing', ['agent', 'test-id'])

    expect(result).toBeDefined()
    expect(result.ns).toBe('agent')
    expect(result.id).toBe('test-id')
  })

  it('should create and retrieve a thing via RPC', async () => {
    const thingData = createTestThing({ name: 'Integration Test Thing' })

    // Create thing
    const created = await testRPC(env.DB, 'createThing', ['agent', thingData])

    expect(created.id).toBeDefined()
    expect(created.name).toBe(thingData.name)

    // Retrieve thing
    const retrieved = await testRPC(env.DB, 'getThing', ['agent', created.id])

    expect(retrieved).toEqual(created)
  })

  it('should handle service errors', async () => {
    try {
      await testRPC(env.DB, 'getThing', ['agent', 'non-existent-id'])
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
})

describe('Multi-Service Integration Tests', () => {
  it('should coordinate between DB and AI services', async () => {
    const testEnv = createIntegrationTestEnv({
      DB: env.DB,
      AI: env.AI,
    })

    // Step 1: Get thing from DB
    const thing = await testRPC(testEnv.services.DB, 'getThing', ['agent', 'test-id'])

    // Step 2: Generate AI content for thing
    const aiResult = await testRPC(testEnv.services.AI, 'generateText', [`Generate description for: ${thing.name}`])

    // Step 3: Update thing with AI-generated content
    const updated = await testRPC(testEnv.services.DB, 'updateThing', ['agent', thing.id, { description: aiResult.text }])

    expect(updated.description).toBe(aiResult.text)
  })

  it('should test service flow', async () => {
    const results = await testServiceFlow([
      {
        service: env.DB,
        method: 'createThing',
        args: ['agent', createTestThing()],
      },
      {
        service: env.AI,
        method: 'generateText',
        args: ['Generate a description'],
      },
    ])

    expect(results).toHaveLength(2)
    expect(results[0]).toHaveProperty('id') // Created thing
    expect(results[1]).toHaveProperty('text') // AI result
  })
})

describe('Service Authentication Integration', () => {
  it('should authenticate and call protected service', async () => {
    // Get auth token
    const token = await testRPC(env.AUTH, 'createToken', ['test-user-123', { role: 'admin' }])

    expect(token.token).toBeDefined()

    // Verify token
    const verified = await testRPC(env.AUTH, 'verifyToken', [token.token])

    expect(verified.valid).toBe(true)
    expect(verified.userId).toBe('test-user-123')
  })

  it('should reject invalid tokens', async () => {
    try {
      await testRPC(env.AUTH, 'verifyToken', ['invalid-token'])
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
})

describe('Event System Integration', () => {
  it('should emit and handle events', async () => {
    const testEnv = createIntegrationTestEnv({
      DB: env.DB,
      EVENTS: env.EVENTS,
    })

    // Create a thing
    const thing = await testRPC(testEnv.services.DB, 'createThing', ['agent', createTestThing()])

    // Emit event
    await testRPC(testEnv.services.EVENTS, 'emit', ['thing.created', { thingId: thing.id }])

    // Verify event was emitted (in real test, would check event log or handler)
    assertRPCCalled(testEnv.services.EVENTS, 'emit', ['thing.created', { thingId: thing.id }])
  })
})

describe('Queue Integration', () => {
  it('should send message to queue', async () => {
    const message = {
      type: 'task',
      payload: { action: 'process', data: {} },
    }

    const result = await testRPC(env.QUEUE, 'send', [message])

    expect(result.id).toBeDefined()
    expect(result.timestamp).toBeDefined()
  })

  it('should send batch of messages', async () => {
    const messages = [
      { type: 'task', payload: {} },
      { type: 'task', payload: {} },
      { type: 'task', payload: {} },
    ]

    const result = await testRPC(env.QUEUE, 'sendBatch', [messages])

    expect(result.successful).toBe(3)
    expect(result.failed).toBe(0)
  })
})

describe('Search Integration', () => {
  it('should index and search content', async () => {
    const thing = createTestThing({ name: 'Searchable Content' })

    // Create thing in DB
    const created = await testRPC(env.DB, 'createThing', ['agent', thing])

    // Index in search
    await testRPC(env.SEARCH, 'index', [created.id, created.name, { ns: created.ns }])

    // Search
    const results = await testRPC(env.SEARCH, 'search', ['Searchable', { limit: 10 }])

    expect(results.results).toBeDefined()
    expect(results.total).toBeGreaterThan(0)
  })
})

describe('KV and R2 Integration', () => {
  it('should store and retrieve from KV', async () => {
    const key = 'test-key'
    const value = 'test-value'

    await env.KV.put(key, value)

    const retrieved = await env.KV.get(key)

    expect(retrieved).toBe(value)

    // Cleanup
    await env.KV.delete(key)
  })

  it('should store and retrieve from R2', async () => {
    const key = 'test-file.txt'
    const content = new TextEncoder().encode('Test content')

    await env.R2.put(key, content)

    const retrieved = await env.R2.get(key)
    const retrievedContent = await retrieved?.arrayBuffer()

    expect(retrievedContent).toBeDefined()
    expect(new TextDecoder().decode(retrievedContent)).toBe('Test content')

    // Cleanup
    await env.R2.delete(key)
  })
})

describe('Performance Integration Tests', () => {
  it('should handle concurrent RPC calls', async () => {
    const calls = Array.from({ length: 10 }, (_, i) => testRPC(env.DB, 'getThing', ['agent', `test-${i}`]))

    const results = await Promise.all(calls)

    expect(results).toHaveLength(10)
  })

  it('should measure RPC latency', async () => {
    const startTime = Date.now()

    await testRPC(env.DB, 'getThing', ['agent', 'test-id'])

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(100) // Should be fast for mock
  })
})
