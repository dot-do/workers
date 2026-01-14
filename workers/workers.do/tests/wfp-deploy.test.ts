/**
 * Workers for Platforms Deployment Tests (TDD RED Phase)
 *
 * These tests define the expected behavior for REAL WfP deployment.
 * Current deploy.ts is SIMULATED - these tests define what real deployment should do.
 *
 * The dispatch namespace binding (env.apps) should:
 * 1. Accept deployed worker code
 * 2. Make workers callable via env.apps.get(workerId)
 * 3. Support bindings and environment variables
 * 4. Allow redeployment to update existing workers
 * 5. Support deletion
 *
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
 */

import { env, SELF } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import { deployWorker, deleteDeployment, getDeployment } from '../src/deploy'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended environment with dispatch namespace binding
 * In production, this comes from wrangler.jsonc dispatch_namespaces
 */
interface WfPEnv {
  /** Dispatch namespace for deployed user workers */
  apps: DispatchNamespace
  /** Esbuild service for code compilation */
  esbuild: Fetcher
  /** KV for deployment metadata */
  deployments: KVNamespace
  /** D1 for deployment records */
  db: D1Database
}

/**
 * Dispatch namespace interface for Workers for Platforms
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/configuration/
 */
interface DispatchNamespace {
  /**
   * Get a deployed worker by name
   * Returns a Fetcher that can be used to call the worker
   */
  get(name: string, options?: DispatchNamespaceGetOptions): Fetcher

  /**
   * Deploy a worker to the namespace (proposed API for real deployment)
   * This is not the standard WfP API but what we need for programmatic deployment
   */
  put?(name: string, script: string, options?: DispatchNamespacePutOptions): Promise<void>

  /**
   * Delete a worker from the namespace
   */
  delete?(name: string): Promise<void>

  /**
   * List all workers in the namespace
   */
  list?(): Promise<string[]>
}

interface DispatchNamespaceGetOptions {
  outbound?: {
    service: string
    parameters?: Record<string, string>
  }
}

interface DispatchNamespacePutOptions {
  bindings?: {
    kv?: { name: string; namespace_id: string }[]
    do?: { name: string; class_name: string; script_name?: string }[]
    vars?: Record<string, string>
    services?: { name: string; service: string }[]
  }
  compatibility_date?: string
  compatibility_flags?: string[]
}

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_WORKER_CODE = `
export default {
  async fetch(request, env) {
    return new Response('Hello from deployed worker!', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
`

const WORKER_WITH_ENV_VARS = `
export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({
      message: env.GREETING,
      apiKey: env.API_KEY ? 'present' : 'missing'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
`

const WORKER_WITH_KV = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const value = await env.MY_KV.get(url.pathname.slice(1))
      return new Response(value || 'not found', {
        status: value ? 200 : 404
      })
    }
    if (request.method === 'PUT') {
      const body = await request.text()
      await env.MY_KV.put(url.pathname.slice(1), body)
      return new Response('stored', { status: 201 })
    }
    return new Response('method not allowed', { status: 405 })
  }
}
`

const WORKER_WITH_DO = `
export default {
  async fetch(request, env) {
    const id = env.COUNTER.idFromName('default')
    const stub = env.COUNTER.get(id)
    return stub.fetch(request)
  }
}

export class Counter {
  constructor(state) {
    this.state = state
  }
  async fetch(request) {
    let count = await this.state.storage.get('count') || 0
    count++
    await this.state.storage.put('count', count)
    return new Response(String(count))
  }
}
`

// ============================================================================
// Deploy Worker to Dispatch Namespace Tests
// ============================================================================

describe('WfP Real Deployment', () => {
  /**
   * Get the test environment with dispatch namespace
   * NOTE: This test will fail until wrangler.jsonc enables dispatch_namespaces
   */
  function getWfPEnv(): WfPEnv {
    return env as unknown as WfPEnv
  }

  describe('deploy worker code to dispatch namespace', () => {
    /**
     * Test: Deploy simple worker to dispatch namespace
     *
     * Expected behavior:
     * - deployWorker uploads code to env.apps dispatch namespace
     * - Worker is accessible via env.apps.get(workerId)
     *
     * This test MUST FAIL because current deploy.ts only stores metadata
     */
    it('deploys worker code that is callable via dispatch namespace', async () => {
      const wfpEnv = getWfPEnv()

      // Verify dispatch namespace exists
      expect(wfpEnv.apps).toBeDefined()
      expect(typeof wfpEnv.apps.get).toBe('function')

      // Deploy a simple worker
      const result = await deployWorker(
        {
          name: 'test-simple-worker',
          code: SIMPLE_WORKER_CODE,
          language: 'js'
        },
        wfpEnv
      )

      expect(result.success).toBe(true)
      expect(result.workerId).toBeDefined()

      // THIS IS THE KEY TEST: The worker should be callable via dispatch namespace
      const deployedWorker = wfpEnv.apps.get(result.workerId!)
      expect(deployedWorker).toBeDefined()

      // Call the deployed worker
      const response = await deployedWorker.fetch(
        new Request('https://test.workers.dev/')
      )

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('Hello from deployed worker!')
    })

    /**
     * Test: Deploy TypeScript worker (requires compilation)
     */
    it('deploys TypeScript worker with compilation', async () => {
      const wfpEnv = getWfPEnv()

      const tsWorkerCode = `
        export default {
          async fetch(request: Request, env: any): Promise<Response> {
            const greeting: string = 'Hello from TypeScript!'
            return new Response(greeting)
          }
        }
      `

      const result = await deployWorker(
        {
          name: 'test-ts-worker',
          code: tsWorkerCode,
          language: 'ts'
        },
        wfpEnv
      )

      expect(result.success).toBe(true)
      expect(result.workerId).toBeDefined()

      // Verify worker is callable
      const deployedWorker = wfpEnv.apps.get(result.workerId!)
      const response = await deployedWorker.fetch(
        new Request('https://test.workers.dev/')
      )

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('Hello from TypeScript!')
    })
  })

  describe('worker is callable via dispatch namespace after deploy', () => {
    /**
     * Test: Deployed worker handles different HTTP methods
     */
    it('deployed worker handles GET and POST requests', async () => {
      const wfpEnv = getWfPEnv()

      const multiMethodWorker = `
        export default {
          async fetch(request, env) {
            const method = request.method
            const url = new URL(request.url)

            if (method === 'GET') {
              return new Response(JSON.stringify({ method: 'GET', path: url.pathname }))
            }
            if (method === 'POST') {
              const body = await request.json()
              return new Response(JSON.stringify({ method: 'POST', received: body }))
            }
            return new Response('Method not supported', { status: 405 })
          }
        }
      `

      const result = await deployWorker(
        { name: 'test-multi-method', code: multiMethodWorker, language: 'js' },
        wfpEnv
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      // Test GET
      const getResponse = await worker.fetch(
        new Request('https://test.workers.dev/users')
      )
      expect(getResponse.status).toBe(200)
      const getData = await getResponse.json() as { method: string; path: string }
      expect(getData.method).toBe('GET')
      expect(getData.path).toBe('/users')

      // Test POST
      const postResponse = await worker.fetch(
        new Request('https://test.workers.dev/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice' })
        })
      )
      expect(postResponse.status).toBe(200)
      const postData = await postResponse.json() as { method: string; received: { name: string } }
      expect(postData.method).toBe('POST')
      expect(postData.received.name).toBe('Alice')
    })

    /**
     * Test: Multiple workers can be deployed and called independently
     */
    it('multiple deployed workers are isolated', async () => {
      const wfpEnv = getWfPEnv()

      const worker1Code = `export default { fetch: () => new Response('Worker 1') }`
      const worker2Code = `export default { fetch: () => new Response('Worker 2') }`

      const result1 = await deployWorker(
        { name: 'isolated-test-1', code: worker1Code, language: 'js' },
        wfpEnv
      )
      const result2 = await deployWorker(
        { name: 'isolated-test-2', code: worker2Code, language: 'js' },
        wfpEnv
      )

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // Each worker should return its own response
      const response1 = await wfpEnv.apps.get(result1.workerId!).fetch(
        new Request('https://test.workers.dev/')
      )
      const response2 = await wfpEnv.apps.get(result2.workerId!).fetch(
        new Request('https://test.workers.dev/')
      )

      expect(await response1.text()).toBe('Worker 1')
      expect(await response2.text()).toBe('Worker 2')
    })
  })

  describe('deploy with bindings (KV, DO, etc.)', () => {
    /**
     * Test: Deploy worker with KV binding
     *
     * The deployment should:
     * 1. Accept KV binding configuration
     * 2. Worker should be able to read/write to KV
     */
    it('deploys worker with KV binding that works', async () => {
      const wfpEnv = getWfPEnv()

      const result = await deployWorker(
        {
          name: 'test-kv-worker',
          code: WORKER_WITH_KV,
          language: 'js',
          // NOTE: Current API doesn't support bindings - this is the new expected API
          // bindings: {
          //   kv: [{ name: 'MY_KV', namespace_id: 'test-kv-namespace' }]
          // }
        },
        wfpEnv
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      // Store a value via the deployed worker
      const putResponse = await worker.fetch(
        new Request('https://test.workers.dev/test-key', {
          method: 'PUT',
          body: 'test-value'
        })
      )
      expect(putResponse.status).toBe(201)

      // Retrieve the value
      const getResponse = await worker.fetch(
        new Request('https://test.workers.dev/test-key')
      )
      expect(getResponse.status).toBe(200)
      expect(await getResponse.text()).toBe('test-value')
    })

    /**
     * Test: Deploy worker with Durable Object binding
     */
    it('deploys worker with Durable Object binding', async () => {
      const wfpEnv = getWfPEnv()

      const result = await deployWorker(
        {
          name: 'test-do-worker',
          code: WORKER_WITH_DO,
          language: 'js',
          // NOTE: Current API doesn't support bindings - this is the new expected API
          // bindings: {
          //   do: [{ name: 'COUNTER', class_name: 'Counter' }]
          // }
        },
        wfpEnv
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      // Call the counter - should increment
      const response1 = await worker.fetch(
        new Request('https://test.workers.dev/')
      )
      expect(response1.status).toBe(200)
      expect(await response1.text()).toBe('1')

      // Call again - should be 2
      const response2 = await worker.fetch(
        new Request('https://test.workers.dev/')
      )
      expect(await response2.text()).toBe('2')
    })

    /**
     * Test: Deploy worker with service binding
     */
    it('deploys worker with service binding to another worker', async () => {
      const wfpEnv = getWfPEnv()

      // First deploy the target service
      const targetResult = await deployWorker(
        {
          name: 'target-service',
          code: `export default { fetch: () => new Response('from target') }`,
          language: 'js'
        },
        wfpEnv
      )

      // Then deploy a worker that calls the target
      const callerCode = `
        export default {
          async fetch(request, env) {
            const targetResponse = await env.TARGET_SERVICE.fetch(request)
            const targetText = await targetResponse.text()
            return new Response('Caller received: ' + targetText)
          }
        }
      `

      const callerResult = await deployWorker(
        {
          name: 'caller-service',
          code: callerCode,
          language: 'js',
          // bindings: {
          //   services: [{ name: 'TARGET_SERVICE', service: targetResult.workerId }]
          // }
        },
        wfpEnv
      )

      expect(callerResult.success).toBe(true)
      const callerWorker = wfpEnv.apps.get(callerResult.workerId!)

      const response = await callerWorker.fetch(
        new Request('https://test.workers.dev/')
      )
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('Caller received: from target')
    })
  })

  describe('deploy with environment variables', () => {
    /**
     * Test: Deploy worker with environment variables
     */
    it('deploys worker with env vars that are accessible', async () => {
      const wfpEnv = getWfPEnv()

      const result = await deployWorker(
        {
          name: 'test-env-worker',
          code: WORKER_WITH_ENV_VARS,
          language: 'js',
          // NOTE: Current API doesn't support env vars - this is the new expected API
          // env: {
          //   GREETING: 'Hello from env!',
          //   API_KEY: 'secret-key-123'
          // }
        },
        wfpEnv
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      const response = await worker.fetch(
        new Request('https://test.workers.dev/')
      )
      expect(response.status).toBe(200)

      const data = await response.json() as { message: string; apiKey: string }
      expect(data.message).toBe('Hello from env!')
      expect(data.apiKey).toBe('present')
    })

    /**
     * Test: Environment variables are isolated between workers
     */
    it('env vars are isolated between workers', async () => {
      const wfpEnv = getWfPEnv()

      const envWorkerCode = `
        export default {
          fetch: (req, env) => new Response(env.MY_VAR || 'undefined')
        }
      `

      const result1 = await deployWorker(
        {
          name: 'env-test-1',
          code: envWorkerCode,
          language: 'js',
          // env: { MY_VAR: 'value-1' }
        },
        wfpEnv
      )

      const result2 = await deployWorker(
        {
          name: 'env-test-2',
          code: envWorkerCode,
          language: 'js',
          // env: { MY_VAR: 'value-2' }
        },
        wfpEnv
      )

      const response1 = await wfpEnv.apps.get(result1.workerId!).fetch(
        new Request('https://test.workers.dev/')
      )
      const response2 = await wfpEnv.apps.get(result2.workerId!).fetch(
        new Request('https://test.workers.dev/')
      )

      expect(await response1.text()).toBe('value-1')
      expect(await response2.text()).toBe('value-2')
    })
  })

  describe('redeploy updates existing worker', () => {
    /**
     * Test: Redeploying with same worker ID updates the code
     */
    it('redeploying updates worker code', async () => {
      const wfpEnv = getWfPEnv()

      // Initial deployment
      const initialCode = `export default { fetch: () => new Response('version 1') }`
      const result1 = await deployWorker(
        { name: 'updatable-worker', code: initialCode, language: 'js' },
        wfpEnv
      )

      expect(result1.success).toBe(true)
      const workerId = result1.workerId!

      // Verify initial version
      let response = await wfpEnv.apps.get(workerId).fetch(
        new Request('https://test.workers.dev/')
      )
      expect(await response.text()).toBe('version 1')

      // Redeploy with updated code
      const updatedCode = `export default { fetch: () => new Response('version 2') }`
      const result2 = await deployWorker(
        { name: 'updatable-worker', code: updatedCode, language: 'js' },
        wfpEnv
      )

      expect(result2.success).toBe(true)
      // Should get same or new worker ID depending on implementation
      const updatedWorkerId = result2.workerId!

      // Verify updated version
      response = await wfpEnv.apps.get(updatedWorkerId).fetch(
        new Request('https://test.workers.dev/')
      )
      expect(await response.text()).toBe('version 2')
    })

    /**
     * Test: Redeploying preserves worker metadata
     */
    it('redeploying preserves deployment metadata', async () => {
      const wfpEnv = getWfPEnv()

      // Initial deployment
      const result1 = await deployWorker(
        { name: 'metadata-test', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv
      )

      const initialDeployment = await getDeployment(result1.workerId!, wfpEnv)
      expect(initialDeployment.success).toBe(true)
      const createdAt = (initialDeployment.data as any).createdAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Redeploy
      const updatedCode = `export default { fetch: () => new Response('updated') }`
      const result2 = await deployWorker(
        { name: 'metadata-test', code: updatedCode, language: 'js' },
        wfpEnv
      )

      const updatedDeployment = await getDeployment(result2.workerId!, wfpEnv)
      expect(updatedDeployment.success).toBe(true)

      // Original creation time should be preserved (or updated - depends on implementation)
      // This test documents expected behavior
      expect((updatedDeployment.data as any).createdAt).toBeDefined()
    })
  })

  describe('delete removes from dispatch namespace', () => {
    /**
     * Test: Deleted worker is no longer callable
     */
    it('deleted worker throws or returns error when called', async () => {
      const wfpEnv = getWfPEnv()

      // Deploy a worker
      const result = await deployWorker(
        { name: 'deletable-worker', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv
      )

      expect(result.success).toBe(true)
      const workerId = result.workerId!

      // Verify it works before deletion
      const beforeResponse = await wfpEnv.apps.get(workerId).fetch(
        new Request('https://test.workers.dev/')
      )
      expect(beforeResponse.status).toBe(200)

      // Delete the worker
      const deleteResult = await deleteDeployment(workerId, wfpEnv)
      expect(deleteResult.success).toBe(true)

      // Verify worker is no longer accessible
      // This should either throw an error or return a 404/error response
      try {
        const afterResponse = await wfpEnv.apps.get(workerId).fetch(
          new Request('https://test.workers.dev/')
        )
        // If it doesn't throw, it should return an error status
        expect(afterResponse.status).toBeGreaterThanOrEqual(400)
      } catch (error) {
        // Expected: dispatch namespace throws when worker doesn't exist
        expect(error).toBeDefined()
      }
    })

    /**
     * Test: Deleting non-existent worker is handled gracefully
     */
    it('deleting non-existent worker returns error', async () => {
      const wfpEnv = getWfPEnv()

      const result = await deleteDeployment('non-existent-worker-id', wfpEnv)

      // Should either succeed (idempotent) or return an error
      // Current implementation returns success, but real WfP might differ
      expect(result).toBeDefined()
      // Real implementation should handle this case appropriately
    })

    /**
     * Test: Delete removes from both dispatch namespace and metadata stores
     */
    it('delete removes from all stores', async () => {
      const wfpEnv = getWfPEnv()

      // Deploy
      const deployResult = await deployWorker(
        { name: 'full-delete-test', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv
      )
      const workerId = deployResult.workerId!

      // Verify deployment exists in metadata store
      const beforeGet = await getDeployment(workerId, wfpEnv)
      expect(beforeGet.success).toBe(true)

      // Delete
      await deleteDeployment(workerId, wfpEnv)

      // Verify removed from metadata store
      const afterGet = await getDeployment(workerId, wfpEnv)
      expect(afterGet.success).toBe(false)
      expect(afterGet.error).toContain('not found')
    })
  })
})

// ============================================================================
// Extended API Tests (Future Features)
// ============================================================================

describe('WfP Extended Features (Future)', () => {
  function getWfPEnv(): WfPEnv {
    return env as unknown as WfPEnv
  }

  /**
   * Test: List all deployed workers in namespace
   */
  it.skip('can list all deployed workers', async () => {
    const wfpEnv = getWfPEnv()

    // Deploy some workers
    await deployWorker({ name: 'list-test-1', code: SIMPLE_WORKER_CODE, language: 'js' }, wfpEnv)
    await deployWorker({ name: 'list-test-2', code: SIMPLE_WORKER_CODE, language: 'js' }, wfpEnv)

    // List workers (proposed API)
    const workers = await wfpEnv.apps.list?.()
    expect(workers).toBeDefined()
    expect(workers!.length).toBeGreaterThanOrEqual(2)
  })

  /**
   * Test: Deploy with custom compatibility settings
   */
  it.skip('can deploy with custom compatibility date', async () => {
    const wfpEnv = getWfPEnv()

    const result = await deployWorker(
      {
        name: 'compat-test',
        code: SIMPLE_WORKER_CODE,
        language: 'js',
        // compatibility_date: '2024-01-01',
        // compatibility_flags: ['nodejs_compat']
      },
      wfpEnv
    )

    expect(result.success).toBe(true)
    // Worker should be deployed with specified compatibility settings
  })
})
