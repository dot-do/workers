/**
 * Deployments Store Tests - TDD GREEN Phase
 *
 * These tests define the API contract for DO-based deployment storage.
 * The DeploymentsService is added to WorkersRegistryDO and provides:
 * - CRUD operations for deployments
 * - O(1) lookup by name via secondary index
 * - Paginated listing with cursor support
 *
 * NOTE: Uses JSON-RPC via fetch() for DO access (same pattern as existing tests).
 * Direct RPC (stub.deployments.create()) has known issues with vitest-pool-workers.
 *
 * Run with: npx vitest run tests/deployments-store.test.ts
 *
 * @module tests/deployments-store.test
 */

import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Deployment record stored in DO
 */
interface Deployment {
  workerId: string
  name: string
  code: string
  url: string
  createdAt: string
  updatedAt?: string
}

/**
 * Options for creating a deployment
 */
interface CreateDeploymentOptions {
  workerId: string
  name: string
  code: string
  url: string
}

/**
 * Options for listing deployments
 */
interface ListDeploymentsOptions {
  limit?: number
  cursor?: string
}

/**
 * Result of listing deployments with pagination
 */
interface ListDeploymentsResult {
  deployments: Deployment[]
  cursor?: string
  hasMore: boolean
}

/**
 * Options for updating a deployment
 */
interface UpdateDeploymentOptions {
  url?: string
  code?: string
}

/**
 * JSON-RPC response format
 */
interface RpcResponse<T = unknown> {
  result?: T
  error?: { code: number; message: string }
  id?: string | number
}

/**
 * Environment type with DO binding
 */
interface TestEnv {
  WORKERS_REGISTRY: DurableObjectNamespace
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Get a fresh DO stub for testing
 */
function getDeploymentsStub(userId: string = 'test-user') {
  const testEnv = env as unknown as TestEnv
  const id = testEnv.WORKERS_REGISTRY.idFromName(userId)
  return testEnv.WORKERS_REGISTRY.get(id)
}

/**
 * Send RPC request to DO via fetch
 * Uses JSON-RPC format: { method: "deployments.methodName", params: [...], id }
 */
async function rpc<T = unknown>(
  stub: DurableObjectStub,
  method: string,
  params: unknown[] = [],
  id: string | number = 1
): Promise<RpcResponse<T>> {
  const response = await stub.fetch('https://test.workers.do/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params, id }),
  })
  return response.json() as Promise<RpcResponse<T>>
}

/**
 * Generate a unique worker ID for test isolation
 */
function uniqueWorkerId(): string {
  return `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================================
// Deployments Store Tests
// ============================================================================

describe('DeploymentsService', () => {
  describe('deployments.create', () => {
    /**
     * Test: Create stores a deployment and returns it with metadata
     */
    it('stores deployment and returns with createdAt', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      const res = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'my-api',
          code: 'export default { fetch() { return new Response("ok") } }',
          url: 'https://my-api.workers.do',
        },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result).toBeDefined()
      const deployment = res.result!
      expect(deployment.workerId).toBe(workerId)
      expect(deployment.name).toBe('my-api')
      expect(deployment.code).toBe('export default { fetch() { return new Response("ok") } }')
      expect(deployment.url).toBe('https://my-api.workers.do')
      expect(deployment.createdAt).toBeDefined()
      expect(new Date(deployment.createdAt).getTime()).toBeLessThanOrEqual(Date.now())
    })

    /**
     * Test: Create with duplicate name throws error
     */
    it('throws error when name already exists', async () => {
      const stub = getDeploymentsStub()

      // Create first deployment
      const res1 = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId: uniqueWorkerId(),
          name: 'duplicate-name',
          code: 'console.log("first")',
          url: 'https://first.workers.do',
        },
      ])
      expect(res1.error).toBeUndefined()

      // Try to create second with same name
      const res2 = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId: uniqueWorkerId(),
          name: 'duplicate-name',
          code: 'console.log("second")',
          url: 'https://second.workers.do',
        },
      ])
      expect(res2.error).toBeDefined()
      expect(res2.error!.message).toMatch(/already exists|duplicate/i)
    })

    /**
     * Test: Create with duplicate workerId throws error
     */
    it('throws error when workerId already exists', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create first deployment
      const res1 = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'first-deployment',
          code: 'console.log("first")',
          url: 'https://first.workers.do',
        },
      ])
      expect(res1.error).toBeUndefined()

      // Try to create second with same workerId
      const res2 = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId, // Same workerId
          name: 'second-deployment',
          code: 'console.log("second")',
          url: 'https://second.workers.do',
        },
      ])
      expect(res2.error).toBeDefined()
      expect(res2.error!.message).toMatch(/already exists|duplicate/i)
    })
  })

  describe('deployments.get', () => {
    /**
     * Test: Get retrieves deployment by workerId
     */
    it('retrieves deployment by workerId', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'get-test-api',
          code: 'export default {}',
          url: 'https://get-test.workers.do',
        },
      ])

      // Get it back
      const res = await rpc<Deployment | null>(stub, 'deployments.get', [workerId])

      expect(res.error).toBeUndefined()
      expect(res.result).not.toBeNull()
      expect(res.result!.workerId).toBe(workerId)
      expect(res.result!.name).toBe('get-test-api')
    })

    /**
     * Test: Get returns null for non-existent workerId
     */
    it('returns null for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const res = await rpc<Deployment | null>(stub, 'deployments.get', ['non-existent-worker-id'])

      expect(res.error).toBeUndefined()
      expect(res.result).toBeNull()
    })
  })

  describe('deployments.getByName', () => {
    /**
     * Test: GetByName retrieves deployment by name in O(1)
     * Uses secondary index: name:{name} -> workerId
     */
    it('retrieves deployment by name via secondary index', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'indexed-api',
          code: 'export default {}',
          url: 'https://indexed.workers.do',
        },
      ])

      // Get by name
      const res = await rpc<Deployment | null>(stub, 'deployments.getByName', ['indexed-api'])

      expect(res.error).toBeUndefined()
      expect(res.result).not.toBeNull()
      expect(res.result!.workerId).toBe(workerId)
      expect(res.result!.name).toBe('indexed-api')
    })

    /**
     * Test: GetByName returns null for non-existent name
     */
    it('returns null for non-existent name', async () => {
      const stub = getDeploymentsStub()

      const res = await rpc<Deployment | null>(stub, 'deployments.getByName', ['non-existent-name'])

      expect(res.error).toBeUndefined()
      expect(res.result).toBeNull()
    })

    /**
     * Test: GetByName is case-sensitive
     */
    it('is case-sensitive', async () => {
      const stub = getDeploymentsStub()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId: uniqueWorkerId(),
          name: 'CaseSensitive',
          code: 'export default {}',
          url: 'https://case.workers.do',
        },
      ])

      const lowercase = await rpc<Deployment | null>(stub, 'deployments.getByName', ['casesensitive'])
      const uppercase = await rpc<Deployment | null>(stub, 'deployments.getByName', ['CASESENSITIVE'])
      const correct = await rpc<Deployment | null>(stub, 'deployments.getByName', ['CaseSensitive'])

      expect(lowercase.result).toBeNull()
      expect(uppercase.result).toBeNull()
      expect(correct.result).not.toBeNull()
    })
  })

  describe('deployments.list', () => {
    /**
     * Test: List returns all deployments with default limit
     */
    it('returns deployments with default limit', async () => {
      const stub = getDeploymentsStub('list-test-user-1')

      // Create a few deployments
      for (let i = 0; i < 3; i++) {
        await rpc<Deployment>(stub, 'deployments.create', [
          {
            workerId: uniqueWorkerId(),
            name: `list-api-${i}`,
            code: `// deployment ${i}`,
            url: `https://list-${i}.workers.do`,
          },
        ])
      }

      const res = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [{}])

      expect(res.error).toBeUndefined()
      expect(res.result!.deployments).toHaveLength(3)
      expect(res.result!.hasMore).toBe(false)
      expect(res.result!.cursor).toBeUndefined()
    })

    /**
     * Test: List respects limit parameter
     */
    it('respects limit parameter', async () => {
      const stub = getDeploymentsStub('list-test-user-2')

      // Create 5 deployments
      for (let i = 0; i < 5; i++) {
        await rpc<Deployment>(stub, 'deployments.create', [
          {
            workerId: uniqueWorkerId(),
            name: `limit-api-${i}`,
            code: `// deployment ${i}`,
            url: `https://limit-${i}.workers.do`,
          },
        ])
      }

      const res = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [{ limit: 2 }])

      expect(res.error).toBeUndefined()
      expect(res.result!.deployments).toHaveLength(2)
      expect(res.result!.hasMore).toBe(true)
      expect(res.result!.cursor).toBeDefined()
    })

    /**
     * Test: List supports cursor-based pagination
     */
    it('supports cursor-based pagination', async () => {
      const stub = getDeploymentsStub('list-test-user-3')

      // Create 5 deployments
      const createdWorkerIds: string[] = []
      for (let i = 0; i < 5; i++) {
        const workerId = uniqueWorkerId()
        createdWorkerIds.push(workerId)
        await rpc<Deployment>(stub, 'deployments.create', [
          {
            workerId,
            name: `paginate-api-${i}`,
            code: `// deployment ${i}`,
            url: `https://paginate-${i}.workers.do`,
          },
        ])
      }

      // First page
      const page1 = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [{ limit: 2 }])
      expect(page1.result!.deployments).toHaveLength(2)
      expect(page1.result!.hasMore).toBe(true)

      // Second page
      const page2 = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [
        { limit: 2, cursor: page1.result!.cursor },
      ])
      expect(page2.result!.deployments).toHaveLength(2)
      expect(page2.result!.hasMore).toBe(true)

      // Third page (last)
      const page3 = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [
        { limit: 2, cursor: page2.result!.cursor },
      ])
      expect(page3.result!.deployments).toHaveLength(1)
      expect(page3.result!.hasMore).toBe(false)

      // Verify no duplicates across pages
      const allWorkerIds = [
        ...page1.result!.deployments.map((d) => d.workerId),
        ...page2.result!.deployments.map((d) => d.workerId),
        ...page3.result!.deployments.map((d) => d.workerId),
      ]
      expect(new Set(allWorkerIds).size).toBe(5)
    })

    /**
     * Test: List returns empty array when no deployments
     */
    it('returns empty array when no deployments', async () => {
      const stub = getDeploymentsStub('empty-user')

      const res = await rpc<ListDeploymentsResult>(stub, 'deployments.list', [{}])

      expect(res.error).toBeUndefined()
      expect(res.result!.deployments).toHaveLength(0)
      expect(res.result!.hasMore).toBe(false)
    })
  })

  describe('deployments.delete', () => {
    /**
     * Test: Delete removes deployment and returns true
     */
    it('removes deployment and returns true', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'to-delete-api',
          code: 'export default {}',
          url: 'https://delete.workers.do',
        },
      ])

      // Delete it
      const deleteRes = await rpc<boolean>(stub, 'deployments.delete', [workerId])

      expect(deleteRes.error).toBeUndefined()
      expect(deleteRes.result).toBe(true)

      // Verify it's gone
      const getRes = await rpc<Deployment | null>(stub, 'deployments.get', [workerId])
      expect(getRes.result).toBeNull()
    })

    /**
     * Test: Delete removes secondary index (name lookup fails after delete)
     */
    it('removes secondary index on delete', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'indexed-delete-api',
          code: 'export default {}',
          url: 'https://indexed-delete.workers.do',
        },
      ])

      // Delete it
      await rpc<boolean>(stub, 'deployments.delete', [workerId])

      // Name lookup should also return null
      const res = await rpc<Deployment | null>(stub, 'deployments.getByName', ['indexed-delete-api'])
      expect(res.result).toBeNull()
    })

    /**
     * Test: Delete returns false for non-existent workerId
     */
    it('returns false for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const res = await rpc<boolean>(stub, 'deployments.delete', ['non-existent-worker-id'])

      expect(res.error).toBeUndefined()
      expect(res.result).toBe(false)
    })

    /**
     * Test: Delete allows reusing name after deletion
     */
    it('allows reusing name after deletion', async () => {
      const stub = getDeploymentsStub()
      const workerId1 = uniqueWorkerId()
      const workerId2 = uniqueWorkerId()

      // Create first deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId: workerId1,
          name: 'reusable-name',
          code: 'console.log("first")',
          url: 'https://first.workers.do',
        },
      ])

      // Delete it
      await rpc<boolean>(stub, 'deployments.delete', [workerId1])

      // Should be able to create with same name
      const res = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId: workerId2,
          name: 'reusable-name',
          code: 'console.log("second")',
          url: 'https://second.workers.do',
        },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result!.workerId).toBe(workerId2)
      expect(res.result!.name).toBe('reusable-name')
    })
  })

  describe('deployments.update', () => {
    /**
     * Test: Update modifies url and sets updatedAt
     */
    it('updates url and sets updatedAt', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      const createRes = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'update-url-api',
          code: 'export default {}',
          url: 'https://original.workers.do',
        },
      ])
      const original = createRes.result!

      // Small delay to ensure updatedAt differs
      await new Promise((r) => setTimeout(r, 10))

      // Update it
      const updateRes = await rpc<Deployment | null>(stub, 'deployments.update', [
        workerId,
        { url: 'https://updated.workers.do' },
      ])

      expect(updateRes.error).toBeUndefined()
      expect(updateRes.result).not.toBeNull()
      const updated = updateRes.result!
      expect(updated.url).toBe('https://updated.workers.do')
      expect(updated.code).toBe(original.code) // Unchanged
      expect(updated.name).toBe(original.name) // Unchanged
      expect(updated.updatedAt).toBeDefined()
      expect(new Date(updated.updatedAt!).getTime()).toBeGreaterThan(new Date(original.createdAt).getTime())
    })

    /**
     * Test: Update modifies code
     */
    it('updates code', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'update-code-api',
          code: 'console.log("original")',
          url: 'https://update-code.workers.do',
        },
      ])

      // Update code
      const res = await rpc<Deployment | null>(stub, 'deployments.update', [
        workerId,
        { code: 'console.log("updated")' },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result).not.toBeNull()
      expect(res.result!.code).toBe('console.log("updated")')
    })

    /**
     * Test: Update can modify both url and code
     */
    it('updates multiple fields at once', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'update-multi-api',
          code: 'console.log("original")',
          url: 'https://original.workers.do',
        },
      ])

      // Update both
      const res = await rpc<Deployment | null>(stub, 'deployments.update', [
        workerId,
        { url: 'https://new-url.workers.do', code: 'console.log("new code")' },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result).not.toBeNull()
      expect(res.result!.url).toBe('https://new-url.workers.do')
      expect(res.result!.code).toBe('console.log("new code")')
    })

    /**
     * Test: Update returns null for non-existent workerId
     */
    it('returns null for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const res = await rpc<Deployment | null>(stub, 'deployments.update', [
        'non-existent-worker-id',
        { url: 'https://new.workers.do' },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result).toBeNull()
    })

    /**
     * Test: Update preserves createdAt
     */
    it('preserves createdAt timestamp', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      // Create deployment
      const createRes = await rpc<Deployment>(stub, 'deployments.create', [
        {
          workerId,
          name: 'preserve-created-api',
          code: 'export default {}',
          url: 'https://preserve.workers.do',
        },
      ])
      const original = createRes.result!

      // Update it
      const updateRes = await rpc<Deployment | null>(stub, 'deployments.update', [
        workerId,
        { url: 'https://new.workers.do' },
      ])

      expect(updateRes.result!.createdAt).toBe(original.createdAt)
    })
  })

  describe('isolation', () => {
    /**
     * Test: Different users have isolated deployment stores
     */
    it('isolates deployments between users', async () => {
      const stub1 = getDeploymentsStub('user-alice')
      const stub2 = getDeploymentsStub('user-bob')

      // Create deployments for each user
      await rpc<Deployment>(stub1, 'deployments.create', [
        {
          workerId: 'alice-worker',
          name: 'alice-api',
          code: 'console.log("alice")',
          url: 'https://alice.workers.do',
        },
      ])

      await rpc<Deployment>(stub2, 'deployments.create', [
        {
          workerId: 'bob-worker',
          name: 'bob-api',
          code: 'console.log("bob")',
          url: 'https://bob.workers.do',
        },
      ])

      // Alice can't see Bob's deployment
      const aliceSeeBob = await rpc<Deployment | null>(stub1, 'deployments.get', ['bob-worker'])
      expect(aliceSeeBob.result).toBeNull()

      // Bob can't see Alice's deployment
      const bobSeeAlice = await rpc<Deployment | null>(stub2, 'deployments.get', ['alice-worker'])
      expect(bobSeeAlice.result).toBeNull()

      // Each sees only their own in list
      const aliceList = await rpc<ListDeploymentsResult>(stub1, 'deployments.list', [{}])
      const bobList = await rpc<ListDeploymentsResult>(stub2, 'deployments.list', [{}])

      expect(aliceList.result!.deployments).toHaveLength(1)
      expect(bobList.result!.deployments).toHaveLength(1)
      expect(aliceList.result!.deployments[0].name).toBe('alice-api')
      expect(bobList.result!.deployments[0].name).toBe('bob-api')
    })

    /**
     * Test: Same name can exist in different user stores
     */
    it('allows same name in different user stores', async () => {
      const stub1 = getDeploymentsStub('user-charlie')
      const stub2 = getDeploymentsStub('user-diana')

      // Create deployment for Charlie
      await rpc<Deployment>(stub1, 'deployments.create', [
        {
          workerId: 'charlie-worker',
          name: 'shared-name',
          code: 'console.log("charlie")',
          url: 'https://charlie.workers.do',
        },
      ])

      // Should not fail - different DO instance
      const res = await rpc<Deployment>(stub2, 'deployments.create', [
        {
          workerId: 'diana-worker',
          name: 'shared-name',
          code: 'console.log("diana")',
          url: 'https://diana.workers.do',
        },
      ])

      expect(res.error).toBeUndefined()
      expect(res.result!.name).toBe('shared-name')
    })
  })
})
