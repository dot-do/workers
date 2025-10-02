/**
 * Example Unit Test
 *
 * Demonstrates how to write unit tests for Cloudflare Workers services
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { mockDatabaseService, createTestThing, createMockExecutionContext } from '../test-utils'

describe('Database Service - Unit Tests', () => {
  let db: ReturnType<typeof mockDatabaseService>

  beforeEach(() => {
    // Create a fresh mock for each test
    db = mockDatabaseService()
  })

  it('should get a thing by id', async () => {
    const testThing = createTestThing({ ns: 'agent', id: 'test-123' })

    // Mock the getThing method to return our test thing
    db.getThing.mockResolvedValue(testThing)

    // Call the method
    const result = await db.getThing('agent', 'test-123')

    // Assertions
    expect(result).toBeDefined()
    expect(result.id).toBe('test-123')
    expect(result.ns).toBe('agent')

    // Verify the mock was called correctly
    expect(db.getThing).toHaveBeenCalledWith('agent', 'test-123')
    expect(db.getThing).toHaveBeenCalledTimes(1)
  })

  it('should create a thing', async () => {
    const newThing = { name: 'New Thing', description: 'Test description' }
    const createdThing = createTestThing({ ns: 'agent', ...newThing })

    db.createThing.mockResolvedValue(createdThing)

    const result = await db.createThing('agent', newThing)

    expect(result).toBeDefined()
    expect(result.name).toBe(newThing.name)
    expect(result.description).toBe(newThing.description)
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()

    expect(db.createThing).toHaveBeenCalledWith('agent', newThing)
  })

  it('should update a thing', async () => {
    const updates = { name: 'Updated Name' }
    const updatedThing = createTestThing({ id: 'test-123', ...updates })

    db.updateThing.mockResolvedValue(updatedThing)

    const result = await db.updateThing('agent', 'test-123', updates)

    expect(result.name).toBe(updates.name)
    expect(result.updatedAt).toBeDefined()

    expect(db.updateThing).toHaveBeenCalledWith('agent', 'test-123', updates)
  })

  it('should delete a thing', async () => {
    db.deleteThing.mockResolvedValue({ success: true })

    const result = await db.deleteThing('agent', 'test-123')

    expect(result.success).toBe(true)
    expect(db.deleteThing).toHaveBeenCalledWith('agent', 'test-123')
  })

  it('should list things with pagination', async () => {
    const things = [createTestThing({ ns: 'agent' }), createTestThing({ ns: 'agent' })]

    db.listThings.mockResolvedValue({
      items: things,
      total: 2,
      page: 1,
      perPage: 10,
    })

    const result = await db.listThings('agent', { page: 1, perPage: 10 })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
  })

  it('should search things', async () => {
    const searchResults = [createTestThing({ name: 'Searchable Thing' })]

    db.searchThings.mockResolvedValue({
      items: searchResults,
      total: 1,
    })

    const result = await db.searchThings('searchable', { limit: 10 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toContain('Searchable')
  })
})

describe('Worker Request Handling - Unit Tests', () => {
  it('should handle GET request', async () => {
    const request = new Request('http://example.com/test')
    const ctx = createMockExecutionContext()

    // Mock worker fetch handler
    const response = new Response(JSON.stringify({ message: 'Hello' }), {
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const data = await response.json()
    expect(data).toEqual({ message: 'Hello' })
  })

  it('should handle POST request with JSON body', async () => {
    const requestBody = { name: 'Test' }

    const request = new Request('http://example.com/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const body = await request.json()
    expect(body).toEqual(requestBody)
  })

  it('should handle errors gracefully', async () => {
    const db = mockDatabaseService()

    // Mock an error
    db.getThing.mockRejectedValue(new Error('Database connection failed'))

    try {
      await db.getThing('agent', 'test-123')
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Database connection failed')
    }
  })
})

describe('Environment and Bindings - Unit Tests', () => {
  it('should access environment variables', () => {
    // Access test environment
    expect(env.ENVIRONMENT).toBeDefined()

    // Mock environment can be customized per test
    const customEnv = { ...env, CUSTOM_VAR: 'test-value' }
    expect(customEnv.CUSTOM_VAR).toBe('test-value')
  })

  it('should access service bindings', () => {
    // Service bindings are available in env
    expect(env.DB).toBeDefined()
    expect(env.AUTH).toBeDefined()
  })
})
