/**
 * E2E Tests for Relationships API
 *
 * Tests relationship creation and querying
 */

import { test, expect } from '@playwright/test'

test.describe('Relationships API E2E', () => {
  let fromThingId: string
  let toThingId: string
  let relationshipId: string

  test.beforeAll(async ({ request }) => {
    // Create two things to relate
    const from = await request.post('/api/things/test', {
      data: { name: 'From Thing', description: 'Source thing' },
    })
    const to = await request.post('/api/things/test', {
      data: { name: 'To Thing', description: 'Target thing' },
    })

    fromThingId = (await from.json()).id
    toThingId = (await to.json()).id
  })

  test('should create a relationship', async ({ request }) => {
    const response = await request.post('/api/relationships', {
      data: {
        fromNs: 'test',
        fromId: fromThingId,
        toNs: 'test',
        toId: toThingId,
        type: 'related-to',
        metadata: { test: true },
      },
    })

    expect(response.ok()).toBeTruthy()
    const relationship = await response.json()

    expect(relationship).toMatchObject({
      fromNs: 'test',
      fromId: fromThingId,
      toNs: 'test',
      toId: toThingId,
      type: 'related-to',
    })

    relationshipId = relationship.id
  })

  test('should get relationships for a thing', async ({ request }) => {
    const response = await request.get(`/api/relationships/test/${fromThingId}`)

    expect(response.ok()).toBeTruthy()
    const relationships = await response.json()

    expect(Array.isArray(relationships)).toBeTruthy()
    expect(relationships.length).toBeGreaterThan(0)
  })

  test('should get relationships by type', async ({ request }) => {
    const response = await request.get(`/api/relationships/test/${fromThingId}?type=related-to`)

    expect(response.ok()).toBeTruthy()
    const relationships = await response.json()

    relationships.forEach((rel: any) => {
      expect(rel.type).toBe('related-to')
    })
  })

  test('should delete a relationship', async ({ request }) => {
    if (!relationshipId) {
      test.skip()
    }

    const response = await request.delete(`/api/relationships/${relationshipId}`)

    expect(response.ok()).toBeTruthy()
  })

  test.afterAll(async ({ request }) => {
    // Cleanup: delete test things
    if (fromThingId) {
      await request.delete(`/api/things/test/${fromThingId}`)
    }
    if (toThingId) {
      await request.delete(`/api/things/test/${toThingId}`)
    }
  })
})

test.describe('Relationship Queries', () => {
  test('should handle bidirectional queries', async ({ request }) => {
    // Create two related things
    const thing1 = await request.post('/api/things/test', {
      data: { name: 'Thing 1' },
    })
    const thing2 = await request.post('/api/things/test', {
      data: { name: 'Thing 2' },
    })

    const id1 = (await thing1.json()).id
    const id2 = (await thing2.json()).id

    // Create bidirectional relationship
    await request.post('/api/relationships', {
      data: {
        fromNs: 'test',
        fromId: id1,
        toNs: 'test',
        toId: id2,
        type: 'linked-to',
      },
    })

    // Query from both directions
    const outgoing = await request.get(`/api/relationships/test/${id1}?direction=outgoing`)
    const incoming = await request.get(`/api/relationships/test/${id2}?direction=incoming`)

    expect(outgoing.ok()).toBeTruthy()
    expect(incoming.ok()).toBeTruthy()

    // Cleanup
    await request.delete(`/api/things/test/${id1}`)
    await request.delete(`/api/things/test/${id2}`)
  })
})
