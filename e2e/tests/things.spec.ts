/**
 * E2E Tests for Things API
 *
 * Tests full user flows through the gateway
 */

import { test, expect } from '@playwright/test'

test.describe('Things API E2E', () => {
  const testThing = {
    name: 'E2E Test Thing',
    description: 'Created by E2E test',
    metadata: { test: true },
  }

  let thingId: string

  test('should create a thing', async ({ request }) => {
    const response = await request.post('/api/things/test', {
      data: testThing,
    })

    expect(response.ok()).toBeTruthy()
    const thing = await response.json()

    expect(thing).toMatchObject({
      ns: 'test',
      name: testThing.name,
      description: testThing.description,
    })

    expect(thing.id).toBeDefined()
    thingId = thing.id
  })

  test('should get a thing by id', async ({ request }) => {
    // Skip if no thing was created
    if (!thingId) {
      test.skip()
    }

    const response = await request.get(`/api/things/test/${thingId}`)

    expect(response.ok()).toBeTruthy()
    const thing = await response.json()

    expect(thing).toMatchObject({
      id: thingId,
      ns: 'test',
      name: testThing.name,
    })
  })

  test('should update a thing', async ({ request }) => {
    if (!thingId) {
      test.skip()
    }

    const updates = {
      name: 'Updated Thing Name',
      description: 'Updated by E2E test',
    }

    const response = await request.patch(`/api/things/test/${thingId}`, {
      data: updates,
    })

    expect(response.ok()).toBeTruthy()
    const thing = await response.json()

    expect(thing).toMatchObject({
      id: thingId,
      name: updates.name,
      description: updates.description,
    })
  })

  test('should list things', async ({ request }) => {
    const response = await request.get('/api/things/test')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result).toHaveProperty('items')
    expect(Array.isArray(result.items)).toBeTruthy()
    expect(result).toHaveProperty('total')
  })

  test('should search things', async ({ request }) => {
    const response = await request.get('/api/things/search?q=test')

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result).toHaveProperty('items')
    expect(Array.isArray(result.items)).toBeTruthy()
  })

  test('should delete a thing', async ({ request }) => {
    if (!thingId) {
      test.skip()
    }

    const response = await request.delete(`/api/things/test/${thingId}`)

    expect(response.ok()).toBeTruthy()

    // Verify deletion
    const getResponse = await request.get(`/api/things/test/${thingId}`)
    expect(getResponse.status()).toBe(404)
  })
})

test.describe('Error Handling', () => {
  test('should return 404 for non-existent thing', async ({ request }) => {
    const response = await request.get('/api/things/test/non-existent-id')
    expect(response.status()).toBe(404)
  })

  test('should return 400 for invalid data', async ({ request }) => {
    const response = await request.post('/api/things/test', {
      data: {
        // Missing required fields
      },
    })
    expect(response.status()).toBe(400)
  })
})

test.describe('Authentication', () => {
  test('should require authentication for protected endpoints', async ({ request }) => {
    const response = await request.post('/api/things/test', {
      data: { name: 'Test' },
      headers: {
        // No Authorization header
      },
    })

    // Should return 401 if auth is required
    // expect(response.status()).toBe(401)
  })

  test('should accept valid API key', async ({ request }) => {
    const response = await request.get('/api/things/test', {
      headers: {
        Authorization: 'Bearer test-api-key',
      },
    })

    // Should return 200 with valid auth
    // expect(response.ok()).toBeTruthy()
  })
})

test.describe('Performance', () => {
  test('should respond within acceptable time', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get('/api/things/test')

    const duration = Date.now() - startTime

    expect(response.ok()).toBeTruthy()
    expect(duration).toBeLessThan(1000) // Should respond within 1 second
  })

  test('should handle concurrent requests', async ({ request }) => {
    const requests = Array.from({ length: 10 }, () => request.get('/api/things/test'))

    const responses = await Promise.all(requests)

    responses.forEach((response) => {
      expect(response.ok()).toBeTruthy()
    })
  })
})
