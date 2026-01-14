/**
 * Deployments Store Tests - TDD RED Phase
 *
 * These tests define the API contract for DO-based deployment storage.
 * They MUST fail initially since DeploymentsService doesn't exist yet.
 *
 * The DeploymentsService will be added to WorkersRegistryDO and provide:
 * - CRUD operations for deployments
 * - O(1) lookup by name via secondary index
 * - Paginated listing with cursor support
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
 * DeploymentsService interface - the API we're defining
 */
interface DeploymentsService {
  create(options: CreateDeploymentOptions): Promise<Deployment>
  get(workerId: string): Promise<Deployment | null>
  getByName(name: string): Promise<Deployment | null>
  list(options?: ListDeploymentsOptions): Promise<ListDeploymentsResult>
  delete(workerId: string): Promise<boolean>
  update(workerId: string, options: UpdateDeploymentOptions): Promise<Deployment | null>
}

/**
 * Environment type with DO binding
 */
interface TestEnv {
  WORKERS_REGISTRY: DurableObjectNamespace<{
    deployments: DeploymentsService
  }>
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

      const deployment = await stub.deployments.create({
        workerId,
        name: 'my-api',
        code: 'export default { fetch() { return new Response("ok") } }',
        url: 'https://my-api.workers.do',
      })

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

      await stub.deployments.create({
        workerId: uniqueWorkerId(),
        name: 'duplicate-name',
        code: 'console.log("first")',
        url: 'https://first.workers.do',
      })

      await expect(
        stub.deployments.create({
          workerId: uniqueWorkerId(),
          name: 'duplicate-name',
          code: 'console.log("second")',
          url: 'https://second.workers.do',
        })
      ).rejects.toThrow(/already exists|duplicate/i)
    })

    /**
     * Test: Create with duplicate workerId throws error
     */
    it('throws error when workerId already exists', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'first-deployment',
        code: 'console.log("first")',
        url: 'https://first.workers.do',
      })

      await expect(
        stub.deployments.create({
          workerId, // Same workerId
          name: 'second-deployment',
          code: 'console.log("second")',
          url: 'https://second.workers.do',
        })
      ).rejects.toThrow(/already exists|duplicate/i)
    })
  })

  describe('deployments.get', () => {
    /**
     * Test: Get retrieves deployment by workerId
     */
    it('retrieves deployment by workerId', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'get-test-api',
        code: 'export default {}',
        url: 'https://get-test.workers.do',
      })

      const deployment = await stub.deployments.get(workerId)

      expect(deployment).not.toBeNull()
      expect(deployment!.workerId).toBe(workerId)
      expect(deployment!.name).toBe('get-test-api')
    })

    /**
     * Test: Get returns null for non-existent workerId
     */
    it('returns null for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const deployment = await stub.deployments.get('non-existent-worker-id')

      expect(deployment).toBeNull()
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

      await stub.deployments.create({
        workerId,
        name: 'indexed-api',
        code: 'export default {}',
        url: 'https://indexed.workers.do',
      })

      const deployment = await stub.deployments.getByName('indexed-api')

      expect(deployment).not.toBeNull()
      expect(deployment!.workerId).toBe(workerId)
      expect(deployment!.name).toBe('indexed-api')
    })

    /**
     * Test: GetByName returns null for non-existent name
     */
    it('returns null for non-existent name', async () => {
      const stub = getDeploymentsStub()

      const deployment = await stub.deployments.getByName('non-existent-name')

      expect(deployment).toBeNull()
    })

    /**
     * Test: GetByName is case-sensitive
     */
    it('is case-sensitive', async () => {
      const stub = getDeploymentsStub()

      await stub.deployments.create({
        workerId: uniqueWorkerId(),
        name: 'CaseSensitive',
        code: 'export default {}',
        url: 'https://case.workers.do',
      })

      const lowercase = await stub.deployments.getByName('casesensitive')
      const uppercase = await stub.deployments.getByName('CASESENSITIVE')
      const correct = await stub.deployments.getByName('CaseSensitive')

      expect(lowercase).toBeNull()
      expect(uppercase).toBeNull()
      expect(correct).not.toBeNull()
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
        await stub.deployments.create({
          workerId: uniqueWorkerId(),
          name: `list-api-${i}`,
          code: `// deployment ${i}`,
          url: `https://list-${i}.workers.do`,
        })
      }

      const result = await stub.deployments.list()

      expect(result.deployments).toHaveLength(3)
      expect(result.hasMore).toBe(false)
      expect(result.cursor).toBeUndefined()
    })

    /**
     * Test: List respects limit parameter
     */
    it('respects limit parameter', async () => {
      const stub = getDeploymentsStub('list-test-user-2')

      // Create 5 deployments
      for (let i = 0; i < 5; i++) {
        await stub.deployments.create({
          workerId: uniqueWorkerId(),
          name: `limit-api-${i}`,
          code: `// deployment ${i}`,
          url: `https://limit-${i}.workers.do`,
        })
      }

      const result = await stub.deployments.list({ limit: 2 })

      expect(result.deployments).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.cursor).toBeDefined()
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
        await stub.deployments.create({
          workerId,
          name: `paginate-api-${i}`,
          code: `// deployment ${i}`,
          url: `https://paginate-${i}.workers.do`,
        })
      }

      // First page
      const page1 = await stub.deployments.list({ limit: 2 })
      expect(page1.deployments).toHaveLength(2)
      expect(page1.hasMore).toBe(true)

      // Second page
      const page2 = await stub.deployments.list({ limit: 2, cursor: page1.cursor })
      expect(page2.deployments).toHaveLength(2)
      expect(page2.hasMore).toBe(true)

      // Third page (last)
      const page3 = await stub.deployments.list({ limit: 2, cursor: page2.cursor })
      expect(page3.deployments).toHaveLength(1)
      expect(page3.hasMore).toBe(false)

      // Verify no duplicates across pages
      const allWorkerIds = [
        ...page1.deployments.map((d) => d.workerId),
        ...page2.deployments.map((d) => d.workerId),
        ...page3.deployments.map((d) => d.workerId),
      ]
      expect(new Set(allWorkerIds).size).toBe(5)
    })

    /**
     * Test: List returns empty array when no deployments
     */
    it('returns empty array when no deployments', async () => {
      const stub = getDeploymentsStub('empty-user')

      const result = await stub.deployments.list()

      expect(result.deployments).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('deployments.delete', () => {
    /**
     * Test: Delete removes deployment and returns true
     */
    it('removes deployment and returns true', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'to-delete-api',
        code: 'export default {}',
        url: 'https://delete.workers.do',
      })

      const result = await stub.deployments.delete(workerId)

      expect(result).toBe(true)

      // Verify it's gone
      const deployment = await stub.deployments.get(workerId)
      expect(deployment).toBeNull()
    })

    /**
     * Test: Delete removes secondary index (name lookup fails after delete)
     */
    it('removes secondary index on delete', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'indexed-delete-api',
        code: 'export default {}',
        url: 'https://indexed-delete.workers.do',
      })

      await stub.deployments.delete(workerId)

      // Name lookup should also return null
      const byName = await stub.deployments.getByName('indexed-delete-api')
      expect(byName).toBeNull()
    })

    /**
     * Test: Delete returns false for non-existent workerId
     */
    it('returns false for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const result = await stub.deployments.delete('non-existent-worker-id')

      expect(result).toBe(false)
    })

    /**
     * Test: Delete allows reusing name after deletion
     */
    it('allows reusing name after deletion', async () => {
      const stub = getDeploymentsStub()
      const workerId1 = uniqueWorkerId()
      const workerId2 = uniqueWorkerId()

      await stub.deployments.create({
        workerId: workerId1,
        name: 'reusable-name',
        code: 'console.log("first")',
        url: 'https://first.workers.do',
      })

      await stub.deployments.delete(workerId1)

      // Should be able to create with same name
      const deployment = await stub.deployments.create({
        workerId: workerId2,
        name: 'reusable-name',
        code: 'console.log("second")',
        url: 'https://second.workers.do',
      })

      expect(deployment.workerId).toBe(workerId2)
      expect(deployment.name).toBe('reusable-name')
    })
  })

  describe('deployments.update', () => {
    /**
     * Test: Update modifies url and sets updatedAt
     */
    it('updates url and sets updatedAt', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      const original = await stub.deployments.create({
        workerId,
        name: 'update-url-api',
        code: 'export default {}',
        url: 'https://original.workers.do',
      })

      // Small delay to ensure updatedAt differs
      await new Promise((r) => setTimeout(r, 10))

      const updated = await stub.deployments.update(workerId, {
        url: 'https://updated.workers.do',
      })

      expect(updated).not.toBeNull()
      expect(updated!.url).toBe('https://updated.workers.do')
      expect(updated!.code).toBe(original.code) // Unchanged
      expect(updated!.name).toBe(original.name) // Unchanged
      expect(updated!.updatedAt).toBeDefined()
      expect(new Date(updated!.updatedAt!).getTime()).toBeGreaterThan(
        new Date(original.createdAt).getTime()
      )
    })

    /**
     * Test: Update modifies code
     */
    it('updates code', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'update-code-api',
        code: 'console.log("original")',
        url: 'https://update-code.workers.do',
      })

      const updated = await stub.deployments.update(workerId, {
        code: 'console.log("updated")',
      })

      expect(updated).not.toBeNull()
      expect(updated!.code).toBe('console.log("updated")')
    })

    /**
     * Test: Update can modify both url and code
     */
    it('updates multiple fields at once', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      await stub.deployments.create({
        workerId,
        name: 'update-multi-api',
        code: 'console.log("original")',
        url: 'https://original.workers.do',
      })

      const updated = await stub.deployments.update(workerId, {
        url: 'https://new-url.workers.do',
        code: 'console.log("new code")',
      })

      expect(updated).not.toBeNull()
      expect(updated!.url).toBe('https://new-url.workers.do')
      expect(updated!.code).toBe('console.log("new code")')
    })

    /**
     * Test: Update returns null for non-existent workerId
     */
    it('returns null for non-existent workerId', async () => {
      const stub = getDeploymentsStub()

      const result = await stub.deployments.update('non-existent-worker-id', {
        url: 'https://new.workers.do',
      })

      expect(result).toBeNull()
    })

    /**
     * Test: Update preserves createdAt
     */
    it('preserves createdAt timestamp', async () => {
      const stub = getDeploymentsStub()
      const workerId = uniqueWorkerId()

      const original = await stub.deployments.create({
        workerId,
        name: 'preserve-created-api',
        code: 'export default {}',
        url: 'https://preserve.workers.do',
      })

      const updated = await stub.deployments.update(workerId, {
        url: 'https://new.workers.do',
      })

      expect(updated!.createdAt).toBe(original.createdAt)
    })
  })

  describe('isolation', () => {
    /**
     * Test: Different users have isolated deployment stores
     */
    it('isolates deployments between users', async () => {
      const stub1 = getDeploymentsStub('user-alice')
      const stub2 = getDeploymentsStub('user-bob')

      await stub1.deployments.create({
        workerId: 'alice-worker',
        name: 'alice-api',
        code: 'console.log("alice")',
        url: 'https://alice.workers.do',
      })

      await stub2.deployments.create({
        workerId: 'bob-worker',
        name: 'bob-api',
        code: 'console.log("bob")',
        url: 'https://bob.workers.do',
      })

      // Alice can't see Bob's deployment
      const aliceSeeBob = await stub1.deployments.get('bob-worker')
      expect(aliceSeeBob).toBeNull()

      // Bob can't see Alice's deployment
      const bobSeeAlice = await stub2.deployments.get('alice-worker')
      expect(bobSeeAlice).toBeNull()

      // Each sees only their own in list
      const aliceList = await stub1.deployments.list()
      const bobList = await stub2.deployments.list()

      expect(aliceList.deployments).toHaveLength(1)
      expect(bobList.deployments).toHaveLength(1)
      expect(aliceList.deployments[0].name).toBe('alice-api')
      expect(bobList.deployments[0].name).toBe('bob-api')
    })

    /**
     * Test: Same name can exist in different user stores
     */
    it('allows same name in different user stores', async () => {
      const stub1 = getDeploymentsStub('user-charlie')
      const stub2 = getDeploymentsStub('user-diana')

      await stub1.deployments.create({
        workerId: 'charlie-worker',
        name: 'shared-name',
        code: 'console.log("charlie")',
        url: 'https://charlie.workers.do',
      })

      // Should not throw - different DO instance
      const dianaDeployment = await stub2.deployments.create({
        workerId: 'diana-worker',
        name: 'shared-name',
        code: 'console.log("diana")',
        url: 'https://diana.workers.do',
      })

      expect(dianaDeployment.name).toBe('shared-name')
    })
  })
})
