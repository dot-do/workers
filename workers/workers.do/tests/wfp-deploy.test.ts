/**
 * Workers for Platforms Deployment Tests
 *
 * These tests verify WfP deployment behavior using a simulated dispatch namespace.
 * The simulated namespace allows local testing without requiring real WfP infrastructure.
 *
 * In production, the Cloudflare API is used for real WfP deployment.
 *
 * The dispatch namespace should:
 * 1. Accept deployed worker code
 * 2. Make workers callable via apps.get(workerId)
 * 3. Support bindings and environment variables
 * 4. Allow redeployment to update existing workers
 * 5. Support deletion
 *
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { deployWorker, deleteDeployment, getDeployment, type ExtendedDeployRequest } from '../src/deploy'
import {
  SimulatedDispatchNamespace,
  SimulatedKV,
  createSimulatedDispatchNamespace,
} from '../src/wfp-simulator'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Test environment with simulated dispatch namespace
 */
interface WfPEnv {
  /** Simulated dispatch namespace for deployed user workers */
  apps: SimulatedDispatchNamespace
  /** KV for deployment metadata */
  deployments: SimulatedKV
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

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Create a fresh test environment with simulated WfP
 */
function createTestEnv(): WfPEnv {
  return {
    apps: createSimulatedDispatchNamespace(),
    deployments: new SimulatedKV(),
  }
}

// ============================================================================
// Deploy Worker to Dispatch Namespace Tests
// ============================================================================

describe('WfP Real Deployment', () => {
  let wfpEnv: WfPEnv

  beforeEach(() => {
    wfpEnv = createTestEnv()
  })

  describe('deploy worker code to dispatch namespace', () => {
    /**
     * Test: Deploy simple worker to dispatch namespace
     *
     * Expected behavior:
     * - deployWorker uploads code to apps dispatch namespace
     * - Worker is accessible via apps.get(workerId)
     */
    it('deploys worker code that is callable via dispatch namespace', async () => {
      // Verify dispatch namespace exists
      expect(wfpEnv.apps).toBeDefined()
      expect(typeof wfpEnv.apps.get).toBe('function')

      // Deploy a simple worker
      const result = await deployWorker(
        {
          name: 'test-simple-worker',
          code: SIMPLE_WORKER_CODE,
          language: 'js',
        },
        wfpEnv as any
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
          language: 'ts',
        },
        wfpEnv as any
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
        wfpEnv as any
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      // Test GET
      const getResponse = await worker.fetch(
        new Request('https://test.workers.dev/users')
      )
      expect(getResponse.status).toBe(200)
      const getData = (await getResponse.json()) as { method: string; path: string }
      expect(getData.method).toBe('GET')
      expect(getData.path).toBe('/users')

      // Test POST
      const postResponse = await worker.fetch(
        new Request('https://test.workers.dev/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Alice' }),
        })
      )
      expect(postResponse.status).toBe(200)
      const postData = (await postResponse.json()) as {
        method: string
        received: { name: string }
      }
      expect(postData.method).toBe('POST')
      expect(postData.received.name).toBe('Alice')
    })

    /**
     * Test: Multiple workers can be deployed and called independently
     */
    it('multiple deployed workers are isolated', async () => {
      const worker1Code = `export default { fetch: () => new Response('Worker 1') }`
      const worker2Code = `export default { fetch: () => new Response('Worker 2') }`

      const result1 = await deployWorker(
        { name: 'isolated-test-1', code: worker1Code, language: 'js' },
        wfpEnv as any
      )
      const result2 = await deployWorker(
        { name: 'isolated-test-2', code: worker2Code, language: 'js' },
        wfpEnv as any
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
     * Note: Full KV binding simulation is a future enhancement.
     * This test documents the expected behavior.
     */
    it.skip('deploys worker with KV binding that works', async () => {
      const result = await deployWorker(
        {
          name: 'test-kv-worker',
          code: WORKER_WITH_KV,
          language: 'js',
        },
        wfpEnv as any
      )

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      // Store a value via the deployed worker
      const putResponse = await worker.fetch(
        new Request('https://test.workers.dev/test-key', {
          method: 'PUT',
          body: 'test-value',
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
     *
     * Note: DO bindings require real WfP infrastructure.
     * This test documents the expected behavior.
     */
    it.skip('deploys worker with Durable Object binding', async () => {
      // DO bindings require real WfP infrastructure
      // This test would require:
      // 1. A DO class exported from a worker
      // 2. WfP namespace configured with DO binding
      expect(true).toBe(true) // Placeholder
    })

    /**
     * Test: Deploy worker with service binding
     *
     * Note: Service bindings require real WfP infrastructure.
     * This test documents the expected behavior.
     */
    it.skip('deploys worker with service binding to another worker', async () => {
      // Service bindings require real WfP infrastructure
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('deploy with environment variables', () => {
    /**
     * Test: Deploy worker with environment variables
     */
    it('deploys worker with env vars that are accessible', async () => {
      const request: ExtendedDeployRequest = {
        name: 'test-env-worker',
        code: WORKER_WITH_ENV_VARS,
        language: 'js',
        env: {
          GREETING: 'Hello from env!',
          API_KEY: 'secret-key-123',
        },
      }

      const result = await deployWorker(request, wfpEnv as any)

      expect(result.success).toBe(true)
      const worker = wfpEnv.apps.get(result.workerId!)

      const response = await worker.fetch(
        new Request('https://test.workers.dev/')
      )
      expect(response.status).toBe(200)

      const data = (await response.json()) as { message: string; apiKey: string }
      expect(data.message).toBe('Hello from env!')
      expect(data.apiKey).toBe('present')
    })

    /**
     * Test: Environment variables are isolated between workers
     */
    it('env vars are isolated between workers', async () => {
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
          env: { MY_VAR: 'value-1' },
        } as ExtendedDeployRequest,
        wfpEnv as any
      )

      const result2 = await deployWorker(
        {
          name: 'env-test-2',
          code: envWorkerCode,
          language: 'js',
          env: { MY_VAR: 'value-2' },
        } as ExtendedDeployRequest,
        wfpEnv as any
      )

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

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
      // Initial deployment
      const initialCode = `export default { fetch: () => new Response('version 1') }`
      const result1 = await deployWorker(
        { name: 'updatable-worker', code: initialCode, language: 'js' },
        wfpEnv as any
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
        wfpEnv as any
      )

      expect(result2.success).toBe(true)
      // Same name should give same worker ID
      expect(result2.workerId).toBe(workerId)

      // Verify updated version
      response = await wfpEnv.apps.get(workerId).fetch(
        new Request('https://test.workers.dev/')
      )
      expect(await response.text()).toBe('version 2')
    })

    /**
     * Test: Redeploying preserves worker metadata
     */
    it('redeploying preserves deployment metadata', async () => {
      // Initial deployment
      const result1 = await deployWorker(
        { name: 'metadata-test', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv as any
      )

      const initialDeployment = await getDeployment(result1.workerId!, wfpEnv as any)
      expect(initialDeployment.success).toBe(true)
      const createdAt = (initialDeployment.data as any).createdAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Redeploy
      const updatedCode = `export default { fetch: () => new Response('updated') }`
      const result2 = await deployWorker(
        { name: 'metadata-test', code: updatedCode, language: 'js' },
        wfpEnv as any
      )

      const updatedDeployment = await getDeployment(result2.workerId!, wfpEnv as any)
      expect(updatedDeployment.success).toBe(true)

      // Original creation time should be preserved
      expect((updatedDeployment.data as any).createdAt).toBe(createdAt)
    })
  })

  describe('delete removes from dispatch namespace', () => {
    /**
     * Test: Deleted worker is no longer callable
     */
    it('deleted worker throws or returns error when called', async () => {
      // Deploy a worker
      const result = await deployWorker(
        { name: 'deletable-worker', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv as any
      )

      expect(result.success).toBe(true)
      const workerId = result.workerId!

      // Verify it works before deletion
      const beforeResponse = await wfpEnv.apps.get(workerId).fetch(
        new Request('https://test.workers.dev/')
      )
      expect(beforeResponse.status).toBe(200)

      // Delete the worker
      const deleteResult = await deleteDeployment(workerId, wfpEnv as any)
      expect(deleteResult.success).toBe(true)

      // Verify worker is no longer accessible
      const afterResponse = await wfpEnv.apps.get(workerId).fetch(
        new Request('https://test.workers.dev/')
      )
      // Simulated namespace returns 404 for deleted workers
      expect(afterResponse.status).toBe(404)
    })

    /**
     * Test: Deleting non-existent worker is handled gracefully
     */
    it('deleting non-existent worker returns success (idempotent)', async () => {
      const result = await deleteDeployment('non-existent-worker-id', wfpEnv as any)

      // Deletion is idempotent - returns success even if worker doesn't exist
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    /**
     * Test: Delete removes from both dispatch namespace and metadata stores
     */
    it('delete removes from all stores', async () => {
      // Deploy
      const deployResult = await deployWorker(
        { name: 'full-delete-test', code: SIMPLE_WORKER_CODE, language: 'js' },
        wfpEnv as any
      )
      const workerId = deployResult.workerId!

      // Verify deployment exists in metadata store
      const beforeGet = await getDeployment(workerId, wfpEnv as any)
      expect(beforeGet.success).toBe(true)

      // Delete
      await deleteDeployment(workerId, wfpEnv as any)

      // Verify removed from metadata store
      const afterGet = await getDeployment(workerId, wfpEnv as any)
      expect(afterGet.success).toBe(false)
      expect(afterGet.error).toContain('not found')
    })
  })
})

// ============================================================================
// Extended API Tests (Future Features)
// ============================================================================

describe('WfP Extended Features (Future)', () => {
  let wfpEnv: WfPEnv

  beforeEach(() => {
    wfpEnv = createTestEnv()
  })

  /**
   * Test: List all deployed workers in namespace
   */
  it('can list all deployed workers', async () => {
    // Deploy some workers
    await deployWorker(
      { name: 'list-test-1', code: SIMPLE_WORKER_CODE, language: 'js' },
      wfpEnv as any
    )
    await deployWorker(
      { name: 'list-test-2', code: SIMPLE_WORKER_CODE, language: 'js' },
      wfpEnv as any
    )

    // List workers (simulated API)
    const workers = wfpEnv.apps.list()
    expect(workers).toBeDefined()
    expect(workers.length).toBeGreaterThanOrEqual(2)
    expect(workers).toContain('list-test-1')
    expect(workers).toContain('list-test-2')
  })

  /**
   * Test: Deploy with custom compatibility settings
   */
  it('can deploy with custom compatibility date', async () => {
    const request: ExtendedDeployRequest = {
      name: 'compat-test',
      code: SIMPLE_WORKER_CODE,
      language: 'js',
      compatibility_date: '2024-01-01',
      compatibility_flags: ['nodejs_compat'],
    }

    const result = await deployWorker(request, wfpEnv as any)

    expect(result.success).toBe(true)
    // Worker should be deployed with specified compatibility settings
    // In production, this would be validated by the Cloudflare API
  })
})
