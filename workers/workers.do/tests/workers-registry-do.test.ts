/**
 * WorkersRegistryDO Tests
 *
 * Comprehensive tests for the WorkersRegistryDO Durable Object.
 * Tests both capnweb RPC protocol and REST API endpoints.
 *
 * Uses real miniflare DO instance - NO MOCKS.
 *
 * Run with: npx vitest run tests/workers-registry-do.test.ts
 *
 * @module tests/workers-registry-do.test
 */

import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// Type Definitions
// ============================================================================

interface TestEnv {
  WORKERS_REGISTRY: DurableObjectNamespace
}

interface Worker {
  $id: string
  name: string
  url: string
  createdAt: string
  deployedAt?: string
  accessedAt?: string
  linkedFolders?: string[]
}

interface RpcResponse<T = any> {
  result?: T
  error?: { code: number; message: string }
  id?: string | number
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Get a fresh DO stub for testing
 * Each test uses a unique namespace for isolation
 */
function getStub(namespace: string): DurableObjectStub {
  const testEnv = env as TestEnv
  const id = testEnv.WORKERS_REGISTRY.idFromName(namespace)
  return testEnv.WORKERS_REGISTRY.get(id)
}

/**
 * Send RPC request to DO
 */
async function rpc<T = any>(
  stub: DurableObjectStub,
  method: string,
  params: any[] = [],
  id: string | number = 1
): Promise<RpcResponse<T>> {
  const response = await stub.fetch('https://test.workers.do/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params, id })
  })
  return response.json() as Promise<RpcResponse<T>>
}

/**
 * Send batch RPC request to DO
 */
async function rpcBatch(
  stub: DurableObjectStub,
  requests: Array<{ method: string; params?: any[]; id?: string | number }>
): Promise<RpcResponse[]> {
  const response = await stub.fetch('https://test.workers.do/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests)
  })
  return response.json() as Promise<RpcResponse[]>
}

/**
 * Send REST request to DO
 */
async function rest(
  stub: DurableObjectStub,
  path: string,
  options?: RequestInit
): Promise<Response> {
  return stub.fetch(`https://test.workers.do${path}`, options)
}

/**
 * Create a sample worker object
 */
function createWorkerData(id: string, overrides: Partial<Worker> = {}): Omit<Worker, 'createdAt'> {
  return {
    $id: id,
    name: `Worker ${id}`,
    url: `https://${id}.workers.dev`,
    ...overrides
  }
}

// ============================================================================
// RPC Tests
// ============================================================================

describe('WorkersRegistryDO RPC', () => {
  describe('workers.list', () => {
    it('returns empty array when no workers registered', async () => {
      const stub = getStub('list-empty-test')
      const response = await rpc<Worker[]>(stub, 'workers.list')

      expect(response.error).toBeUndefined()
      expect(response.result).toEqual([])
      expect(response.id).toBe(1)
    })

    it('returns workers sorted by accessed (default)', async () => {
      const stub = getStub('list-sorted-test')

      // Register workers with different access times
      // We need to register them with explicit delays to ensure ordering
      await rpc(stub, 'workers.register', [createWorkerData('worker-a')])

      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.register', [createWorkerData('worker-b')])

      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.register', [createWorkerData('worker-c')])

      const response = await rpc<Worker[]>(stub, 'workers.list')

      expect(response.error).toBeUndefined()
      expect(response.result).toHaveLength(3)

      // Should be sorted by accessed (most recent first)
      expect(response.result![0].$id).toBe('worker-c')
      expect(response.result![2].$id).toBe('worker-a')
    })

    it('returns workers sorted by created when specified', async () => {
      const stub = getStub('list-by-created-test')

      await rpc(stub, 'workers.register', [createWorkerData('first')])
      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.register', [createWorkerData('second')])
      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.register', [createWorkerData('third')])

      const response = await rpc<Worker[]>(stub, 'workers.list', [{ sortBy: 'created' }])

      expect(response.error).toBeUndefined()
      expect(response.result).toHaveLength(3)
      expect(response.result![0].$id).toBe('third')
      expect(response.result![2].$id).toBe('first')
    })

    it('respects limit parameter', async () => {
      const stub = getStub('list-limit-test')

      // Register 5 workers
      for (let i = 0; i < 5; i++) {
        await rpc(stub, 'workers.register', [createWorkerData(`worker-${i}`)])
      }

      const response = await rpc<Worker[]>(stub, 'workers.list', [{ limit: 2 }])

      expect(response.error).toBeUndefined()
      expect(response.result).toHaveLength(2)
    })

    it('defaults to limit of 20', async () => {
      const stub = getStub('list-default-limit-test')

      // Register 25 workers
      for (let i = 0; i < 25; i++) {
        await rpc(stub, 'workers.register', [createWorkerData(`worker-${i}`)])
      }

      const response = await rpc<Worker[]>(stub, 'workers.list')

      expect(response.error).toBeUndefined()
      expect(response.result).toHaveLength(20)
    })

    it('handles sortBy=deployed with fallback to createdAt', async () => {
      const stub = getStub('list-deployed-test')

      await rpc(stub, 'workers.register', [createWorkerData('not-deployed')])
      await rpc(stub, 'workers.register', [createWorkerData('deployed')])

      // Update deployed timestamp for one worker
      await rpc(stub, 'workers.updateDeployed', ['deployed'])

      const response = await rpc<Worker[]>(stub, 'workers.list', [{ sortBy: 'deployed' }])

      expect(response.error).toBeUndefined()
      expect(response.result).toHaveLength(2)
      // Deployed worker should be first (more recent deployedAt)
      expect(response.result![0].$id).toBe('deployed')
    })
  })

  describe('workers.get', () => {
    it('returns worker by ID', async () => {
      const stub = getStub('get-test')
      const workerData = createWorkerData('my-worker', { name: 'My Custom Worker' })

      await rpc(stub, 'workers.register', [workerData])
      const response = await rpc<Worker>(stub, 'workers.get', ['my-worker'])

      expect(response.error).toBeUndefined()
      expect(response.result).toBeDefined()
      expect(response.result!.$id).toBe('my-worker')
      expect(response.result!.name).toBe('My Custom Worker')
      expect(response.result!.url).toBe('https://my-worker.workers.dev')
      expect(response.result!.createdAt).toBeDefined()
    })

    it('returns null for non-existent worker', async () => {
      const stub = getStub('get-missing-test')
      const response = await rpc<Worker | null>(stub, 'workers.get', ['non-existent'])

      expect(response.error).toBeUndefined()
      expect(response.result).toBeNull()
    })

    it('preserves RPC id in response', async () => {
      const stub = getStub('get-id-test')
      const response = await rpc<Worker | null>(stub, 'workers.get', ['any'], 'custom-id-123')

      expect(response.id).toBe('custom-id-123')
    })
  })

  describe('workers.register', () => {
    it('creates new worker with timestamps', async () => {
      const stub = getStub('register-test')
      const workerData = createWorkerData('new-worker')

      const response = await rpc<Worker>(stub, 'workers.register', [workerData])

      expect(response.error).toBeUndefined()
      expect(response.result).toBeDefined()
      expect(response.result!.$id).toBe('new-worker')
      expect(response.result!.createdAt).toBeDefined()
      expect(response.result!.accessedAt).toBeDefined()

      // Verify it's persisted
      const getResponse = await rpc<Worker>(stub, 'workers.get', ['new-worker'])
      expect(getResponse.result!.$id).toBe('new-worker')
    })

    it('sets createdAt and accessedAt to same time on registration', async () => {
      const stub = getStub('register-timestamps-test')
      const workerData = createWorkerData('timestamp-worker')

      const response = await rpc<Worker>(stub, 'workers.register', [workerData])

      expect(response.result!.createdAt).toBe(response.result!.accessedAt)
    })

    it('overwrites existing worker with same ID', async () => {
      const stub = getStub('register-overwrite-test')

      await rpc(stub, 'workers.register', [createWorkerData('same-id', { name: 'Original' })])
      await rpc(stub, 'workers.register', [createWorkerData('same-id', { name: 'Updated' })])

      const response = await rpc<Worker>(stub, 'workers.get', ['same-id'])
      expect(response.result!.name).toBe('Updated')
    })

    it('stores all worker properties', async () => {
      const stub = getStub('register-all-props-test')
      const workerData = {
        $id: 'full-worker',
        name: 'Full Worker',
        url: 'https://full.workers.dev',
        deployedAt: '2024-01-01T00:00:00.000Z',
        linkedFolders: ['/path/to/folder']
      }

      const response = await rpc<Worker>(stub, 'workers.register', [workerData])

      expect(response.result!.deployedAt).toBe('2024-01-01T00:00:00.000Z')
      expect(response.result!.linkedFolders).toEqual(['/path/to/folder'])
    })
  })

  describe('workers.link', () => {
    it('associates folder with worker', async () => {
      const stub = getStub('link-test')

      await rpc(stub, 'workers.register', [createWorkerData('link-worker')])
      const linkResponse = await rpc<boolean>(stub, 'workers.link', ['link-worker', { folder: '/my/project' }])

      expect(linkResponse.error).toBeUndefined()
      expect(linkResponse.result).toBe(true)

      const getResponse = await rpc<Worker>(stub, 'workers.get', ['link-worker'])
      expect(getResponse.result!.linkedFolders).toContain('/my/project')
    })

    it('returns false for non-existent worker', async () => {
      const stub = getStub('link-missing-test')
      const response = await rpc<boolean>(stub, 'workers.link', ['ghost-worker', { folder: '/path' }])

      expect(response.error).toBeUndefined()
      expect(response.result).toBe(false)
    })

    it('does not duplicate folders', async () => {
      const stub = getStub('link-dedup-test')

      await rpc(stub, 'workers.register', [createWorkerData('dedup-worker')])
      await rpc(stub, 'workers.link', ['dedup-worker', { folder: '/same/folder' }])
      await rpc(stub, 'workers.link', ['dedup-worker', { folder: '/same/folder' }])
      await rpc(stub, 'workers.link', ['dedup-worker', { folder: '/same/folder' }])

      const response = await rpc<Worker>(stub, 'workers.get', ['dedup-worker'])
      expect(response.result!.linkedFolders).toEqual(['/same/folder'])
    })

    it('updates accessedAt when linking', async () => {
      const stub = getStub('link-timestamp-test')

      await rpc(stub, 'workers.register', [createWorkerData('ts-worker')])
      const beforeLink = await rpc<Worker>(stub, 'workers.get', ['ts-worker'])
      const beforeAccessed = beforeLink.result!.accessedAt

      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.link', ['ts-worker', { folder: '/new/folder' }])

      const afterLink = await rpc<Worker>(stub, 'workers.get', ['ts-worker'])
      const afterAccessed = afterLink.result!.accessedAt

      expect(new Date(afterAccessed!).getTime()).toBeGreaterThan(new Date(beforeAccessed!).getTime())
    })

    it('can link multiple folders', async () => {
      const stub = getStub('link-multiple-test')

      await rpc(stub, 'workers.register', [createWorkerData('multi-worker')])
      await rpc(stub, 'workers.link', ['multi-worker', { folder: '/folder1' }])
      await rpc(stub, 'workers.link', ['multi-worker', { folder: '/folder2' }])
      await rpc(stub, 'workers.link', ['multi-worker', { folder: '/folder3' }])

      const response = await rpc<Worker>(stub, 'workers.get', ['multi-worker'])
      expect(response.result!.linkedFolders).toHaveLength(3)
      expect(response.result!.linkedFolders).toContain('/folder1')
      expect(response.result!.linkedFolders).toContain('/folder2')
      expect(response.result!.linkedFolders).toContain('/folder3')
    })
  })

  describe('batch requests', () => {
    it('processes multiple RPC calls in batch', async () => {
      const stub = getStub('batch-test')

      // First register some workers
      await rpc(stub, 'workers.register', [createWorkerData('batch-1')])
      await rpc(stub, 'workers.register', [createWorkerData('batch-2')])

      const responses = await rpcBatch(stub, [
        { method: 'workers.get', params: ['batch-1'], id: 1 },
        { method: 'workers.get', params: ['batch-2'], id: 2 },
        { method: 'workers.list', params: [{ limit: 10 }], id: 3 }
      ])

      expect(responses).toHaveLength(3)
      expect(responses[0].id).toBe(1)
      expect(responses[0].result!.$id).toBe('batch-1')
      expect(responses[1].id).toBe(2)
      expect(responses[1].result!.$id).toBe('batch-2')
      expect(responses[2].id).toBe(3)
      expect(responses[2].result).toHaveLength(2)
    })

    it('handles mixed success and errors in batch', async () => {
      const stub = getStub('batch-mixed-test')

      await rpc(stub, 'workers.register', [createWorkerData('exists')])

      const responses = await rpcBatch(stub, [
        { method: 'workers.get', params: ['exists'], id: 1 },
        { method: 'unknown.method', params: [], id: 2 },
        { method: 'workers.get', params: ['not-exists'], id: 3 }
      ])

      expect(responses).toHaveLength(3)
      expect(responses[0].result!.$id).toBe('exists')
      expect(responses[1].error).toBeDefined()
      expect(responses[2].result).toBeNull()
    })

    it('preserves order of responses', async () => {
      const stub = getStub('batch-order-test')

      const responses = await rpcBatch(stub, [
        { method: 'workers.list', id: 'a' },
        { method: 'workers.list', id: 'b' },
        { method: 'workers.list', id: 'c' }
      ])

      expect(responses[0].id).toBe('a')
      expect(responses[1].id).toBe('b')
      expect(responses[2].id).toBe('c')
    })
  })

  describe('workers.updateAccessed', () => {
    it('updates accessed timestamp', async () => {
      const stub = getStub('update-accessed-test')

      await rpc(stub, 'workers.register', [createWorkerData('access-worker')])
      const before = await rpc<Worker>(stub, 'workers.get', ['access-worker'])

      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.updateAccessed', ['access-worker'])

      const after = await rpc<Worker>(stub, 'workers.get', ['access-worker'])

      expect(new Date(after.result!.accessedAt!).getTime())
        .toBeGreaterThan(new Date(before.result!.accessedAt!).getTime())
    })

    it('does nothing for non-existent worker', async () => {
      const stub = getStub('update-accessed-missing-test')

      // Should not throw
      const response = await rpc(stub, 'workers.updateAccessed', ['ghost'])
      expect(response.error).toBeUndefined()
    })
  })

  describe('workers.updateDeployed', () => {
    it('updates deployed timestamp', async () => {
      const stub = getStub('update-deployed-test')

      await rpc(stub, 'workers.register', [createWorkerData('deploy-worker')])

      const before = await rpc<Worker>(stub, 'workers.get', ['deploy-worker'])
      expect(before.result!.deployedAt).toBeUndefined()

      await rpc(stub, 'workers.updateDeployed', ['deploy-worker'])

      const after = await rpc<Worker>(stub, 'workers.get', ['deploy-worker'])
      expect(after.result!.deployedAt).toBeDefined()
    })

    it('also updates accessedAt', async () => {
      const stub = getStub('deploy-updates-accessed-test')

      await rpc(stub, 'workers.register', [createWorkerData('deploy-access-worker')])
      const before = await rpc<Worker>(stub, 'workers.get', ['deploy-access-worker'])

      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.updateDeployed', ['deploy-access-worker'])

      const after = await rpc<Worker>(stub, 'workers.get', ['deploy-access-worker'])

      expect(new Date(after.result!.accessedAt!).getTime())
        .toBeGreaterThan(new Date(before.result!.accessedAt!).getTime())
    })
  })

  describe('error handling', () => {
    it('returns error for unknown service', async () => {
      const stub = getStub('error-unknown-service-test')
      const response = await rpc(stub, 'unknown.list', [], 42)

      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32601)
      expect(response.error!.message).toContain('Unknown service')
      expect(response.id).toBe(42)
    })

    it('returns error for unknown method', async () => {
      const stub = getStub('error-unknown-method-test')
      const response = await rpc(stub, 'workers.unknownMethod', [])

      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32603)
      expect(response.error!.message).toContain('Unknown method')
    })

    it('returns parse error for invalid JSON', async () => {
      const stub = getStub('error-parse-test')

      const response = await stub.fetch('https://test.workers.do/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {'
      })

      expect(response.status).toBe(400)
      const data = await response.json() as RpcResponse
      expect(data.error).toBeDefined()
      expect(data.error!.code).toBe(-32700)
      expect(data.error!.message).toContain('Parse error')
    })

    it('handles missing method gracefully', async () => {
      const stub = getStub('error-no-method-test')

      const response = await stub.fetch('https://test.workers.do/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: [], id: 1 })
      })

      const data = await response.json() as RpcResponse
      expect(data.error).toBeDefined()
    })

    it('handles malformed method string', async () => {
      const stub = getStub('error-malformed-method-test')

      // Method without dot separator
      const response = await rpc(stub, 'noservicename', [])
      expect(response.error).toBeDefined()
    })
  })
})

// ============================================================================
// REST API Tests
// ============================================================================

describe('WorkersRegistryDO REST API', () => {
  describe('GET /workers', () => {
    it('returns empty list when no workers', async () => {
      const stub = getStub('rest-list-empty-test')
      const response = await rest(stub, '/workers')

      expect(response.ok).toBe(true)
      const data = await response.json() as Worker[]
      expect(data).toEqual([])
    })

    it('returns list of workers', async () => {
      const stub = getStub('rest-list-test')

      await rpc(stub, 'workers.register', [createWorkerData('rest-1')])
      await rpc(stub, 'workers.register', [createWorkerData('rest-2')])

      const response = await rest(stub, '/workers')

      expect(response.ok).toBe(true)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      const data = await response.json() as Worker[]
      expect(data).toHaveLength(2)
    })

    it('supports sortBy query parameter', async () => {
      const stub = getStub('rest-list-sort-test')

      await rpc(stub, 'workers.register', [createWorkerData('a')])
      await new Promise(resolve => setTimeout(resolve, 10))
      await rpc(stub, 'workers.register', [createWorkerData('b')])

      const response = await rest(stub, '/workers?sortBy=created')

      const data = await response.json() as Worker[]
      expect(data[0].$id).toBe('b')
    })

    it('supports limit query parameter', async () => {
      const stub = getStub('rest-list-limit-test')

      for (let i = 0; i < 5; i++) {
        await rpc(stub, 'workers.register', [createWorkerData(`w-${i}`)])
      }

      const response = await rest(stub, '/workers?limit=2')

      const data = await response.json() as Worker[]
      expect(data).toHaveLength(2)
    })

    it('also works on /list endpoint', async () => {
      const stub = getStub('rest-list-alias-test')

      await rpc(stub, 'workers.register', [createWorkerData('alias-worker')])

      const response = await rest(stub, '/list')

      expect(response.ok).toBe(true)
      const data = await response.json() as Worker[]
      expect(data).toHaveLength(1)
    })
  })

  describe('GET /workers/:id', () => {
    it('returns single worker', async () => {
      const stub = getStub('rest-get-test')

      await rpc(stub, 'workers.register', [createWorkerData('my-api', { name: 'My API' })])

      const response = await rest(stub, '/workers/my-api')

      expect(response.ok).toBe(true)
      const data = await response.json() as Worker
      expect(data.$id).toBe('my-api')
      expect(data.name).toBe('My API')
    })

    it('returns 404 for non-existent worker', async () => {
      const stub = getStub('rest-get-missing-test')

      const response = await rest(stub, '/workers/does-not-exist')

      expect(response.status).toBe(404)
      const data = await response.json() as { error: string }
      expect(data.error).toBe('not_found')
    })

    it('also works on /get/:id endpoint', async () => {
      const stub = getStub('rest-get-alias-test')

      await rpc(stub, 'workers.register', [createWorkerData('alias-id')])

      const response = await rest(stub, '/get/alias-id')

      expect(response.ok).toBe(true)
      const data = await response.json() as Worker
      expect(data.$id).toBe('alias-id')
    })
  })

  describe('unknown endpoints', () => {
    it('returns 404 for unknown path', async () => {
      const stub = getStub('rest-404-test')

      const response = await rest(stub, '/unknown/path')

      expect(response.status).toBe(404)
      const data = await response.json() as { error: string; path: string }
      expect(data.error).toBe('not_found')
      expect(data.path).toBe('/unknown/path')
    })

    it('returns 404 for unsupported methods', async () => {
      const stub = getStub('rest-method-404-test')

      // DELETE is not supported
      const response = await rest(stub, '/workers/some-id', {
        method: 'DELETE'
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toBeDefined()
    })
  })
})

// ============================================================================
// Edge Cases and Stress Tests
// ============================================================================

describe('WorkersRegistryDO edge cases', () => {
  it('handles worker with special characters in ID', async () => {
    const stub = getStub('special-chars-test')

    const workerData = createWorkerData('my-worker_v2.0', { name: 'Special Worker' })
    await rpc(stub, 'workers.register', [workerData])

    const response = await rpc<Worker>(stub, 'workers.get', ['my-worker_v2.0'])
    expect(response.result!.$id).toBe('my-worker_v2.0')
  })

  it('handles empty worker name', async () => {
    const stub = getStub('empty-name-test')

    const workerData = {
      $id: 'empty-name-worker',
      name: '',
      url: 'https://empty.workers.dev'
    }

    const response = await rpc<Worker>(stub, 'workers.register', [workerData])
    expect(response.result!.name).toBe('')
  })

  it('handles very long worker names', async () => {
    const stub = getStub('long-name-test')

    const longName = 'a'.repeat(1000)
    const workerData = {
      $id: 'long-name-worker',
      name: longName,
      url: 'https://long.workers.dev'
    }

    const response = await rpc<Worker>(stub, 'workers.register', [workerData])
    expect(response.result!.name).toBe(longName)
  })

  it('handles concurrent registrations', async () => {
    const stub = getStub('concurrent-test')

    const registrations = Array.from({ length: 10 }, (_, i) =>
      rpc(stub, 'workers.register', [createWorkerData(`concurrent-${i}`)])
    )

    await Promise.all(registrations)

    const response = await rpc<Worker[]>(stub, 'workers.list', [{ limit: 100 }])
    expect(response.result).toHaveLength(10)
  })

  it('handles unicode in worker data', async () => {
    const stub = getStub('unicode-test')

    const workerData = {
      $id: 'unicode-worker',
      name: 'Worker \u{1F680} Rocket',
      url: 'https://\u4F60\u597D.workers.dev'
    }

    await rpc(stub, 'workers.register', [workerData])

    const response = await rpc<Worker>(stub, 'workers.get', ['unicode-worker'])
    expect(response.result!.name).toBe('Worker \u{1F680} Rocket')
  })

  it('handles list with zero limit', async () => {
    const stub = getStub('zero-limit-test')

    await rpc(stub, 'workers.register', [createWorkerData('zero-worker')])

    const response = await rpc<Worker[]>(stub, 'workers.list', [{ limit: 0 }])
    expect(response.result).toEqual([])
  })

  it('handles negative limit as zero', async () => {
    const stub = getStub('negative-limit-test')

    await rpc(stub, 'workers.register', [createWorkerData('neg-worker')])

    const response = await rpc<Worker[]>(stub, 'workers.list', [{ limit: -5 }])
    // Negative slice returns empty array
    expect(response.result).toEqual([])
  })

  it('maintains isolation between namespaces', async () => {
    const stub1 = getStub('isolation-user-1')
    const stub2 = getStub('isolation-user-2')

    await rpc(stub1, 'workers.register', [createWorkerData('user1-worker')])
    await rpc(stub2, 'workers.register', [createWorkerData('user2-worker')])

    const list1 = await rpc<Worker[]>(stub1, 'workers.list')
    const list2 = await rpc<Worker[]>(stub2, 'workers.list')

    expect(list1.result).toHaveLength(1)
    expect(list1.result![0].$id).toBe('user1-worker')

    expect(list2.result).toHaveLength(1)
    expect(list2.result![0].$id).toBe('user2-worker')
  })
})
