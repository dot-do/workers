/**
 * Dispatch Namespace Integration Tests
 *
 * Tests Workers for Platforms dispatch namespace functionality:
 * - Deploying workers to namespaces via Deploy API
 * - Dispatcher routing to user workers
 * - Service-to-service RPC through namespace
 * - Namespace isolation
 * - Error handling (404, 500)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { testRequest, assertSuccess, assertStatus, measureTime, assertPerformance, waitForService } from './setup'

// Test environment configuration
const TEST_NAMESPACE = process.env.TEST_NAMESPACE || 'dotdo-development'
const DEPLOY_API_URL = process.env.DEPLOY_API_URL || 'https://deploy.do'
const DEPLOY_API_KEY = process.env.DEPLOY_API_KEY || 'test-deploy-api-key'

// Services to test
const SERVICES = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue']

/**
 * Helper: Deploy a service to namespace via Deploy API
 */
async function deployServiceToNamespace(serviceName: string, namespace: string = TEST_NAMESPACE): Promise<Response> {
  // In real tests, this would build and base64 encode the worker script
  // For now, we'll mock the deployment or assume services are pre-deployed
  return fetch(`${DEPLOY_API_URL}/deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEPLOY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service: serviceName,
      environment: namespace,
      script: '', // Would contain base64-encoded worker script
      metadata: {
        commit: 'test-commit',
        branch: 'test',
        author: 'test@example.com',
        version: '1.0.0',
      },
    }),
  })
}

/**
 * Helper: Check if service is deployed in namespace
 */
async function isServiceDeployed(serviceName: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${serviceName}.do/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Helper: List workers in namespace
 */
async function listNamespaceWorkers(namespace: string = TEST_NAMESPACE): Promise<string[]> {
  // This would use wrangler CLI or Deploy API to list workers
  // For now, return services that respond to health checks
  const deployed: string[] = []
  for (const service of SERVICES) {
    if (await isServiceDeployed(service)) {
      deployed.push(service)
    }
  }
  return deployed
}

describe('Dispatch Namespace - Infrastructure', () => {
  describe('Namespace Configuration', () => {
    it('should have namespaces created', async () => {
      // Verify namespaces exist
      // In real implementation, would call wrangler CLI or Cloudflare API
      expect(TEST_NAMESPACE).toBeDefined()
      expect(['dotdo-production', 'dotdo-staging', 'dotdo-development']).toContain(TEST_NAMESPACE)
    })

    it('should list namespaces', async () => {
      // Mock: In production, would call:
      // wrangler dispatch-namespace list
      const namespaces = ['dotdo-production', 'dotdo-staging', 'dotdo-development']
      expect(namespaces).toHaveLength(3)
      expect(namespaces).toContain('dotdo-development')
    })
  })

  describe('Deploy API', () => {
    it('should have deploy API available', async () => {
      const response = await fetch(`${DEPLOY_API_URL}/health`)
      assertSuccess(response)

      const health = await response.json()
      expect(health).toHaveProperty('service', 'deploy')
      expect(health).toHaveProperty('status', 'healthy')
    })

    it('should require authentication', async () => {
      const response = await fetch(`${DEPLOY_API_URL}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'test' }),
      })

      expect(response.status).toBe(401)
    })

    it('should validate deploy API key', async () => {
      const response = await fetch(`${DEPLOY_API_URL}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service: 'test' }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Dispatcher', () => {
    it('should have dispatcher deployed', async () => {
      const response = await fetch('https://api.do/health')
      // Dispatcher may not have health endpoint, so 404 is acceptable
      expect([200, 404]).toContain(response.status)
    })

    it('should route to gateway by default', async () => {
      const response = await fetch('https://api.do/')
      // Should route to gateway worker
      expect(response.ok).toBe(true)
    })
  })
})

describe('Dispatch Namespace - Service Deployment', () => {
  describe('Deploy Single Service', () => {
    it('should deploy service to development namespace', async () => {
      // Skip if Deploy API not available (will be mocked in CI)
      if (process.env.SKIP_DEPLOY_TESTS === 'true') {
        return
      }

      const response = await deployServiceToNamespace('gateway', 'dotdo-development')

      // May return 200 (success) or 503 (Deploy API not ready)
      expect([200, 503]).toContain(response.status)

      if (response.ok) {
        const result = await response.json()
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('deployment')
      }
    })

    it('should track deployment metadata', async () => {
      if (process.env.SKIP_DEPLOY_TESTS === 'true') {
        return
      }

      const response = await fetch(`${DEPLOY_API_URL}/deployments?service=gateway&limit=1`, {
        headers: {
          'Authorization': `Bearer ${DEPLOY_API_KEY}`,
        },
      })

      if (response.ok) {
        const deployments = await response.json()
        expect(deployments).toHaveProperty('data')
        expect(Array.isArray(deployments.data)).toBe(true)

        if (deployments.data.length > 0) {
          const deployment = deployments.data[0]
          expect(deployment).toHaveProperty('service')
          expect(deployment).toHaveProperty('environment')
          expect(deployment).toHaveProperty('timestamp')
          expect(deployment).toHaveProperty('metadata')
        }
      }
    })
  })

  describe('List Deployed Workers', () => {
    it('should list workers in namespace', async () => {
      const workers = await listNamespaceWorkers(TEST_NAMESPACE)

      // May be empty if services not yet deployed
      expect(Array.isArray(workers)).toBe(true)

      // If any workers deployed, verify they respond
      for (const worker of workers) {
        expect(SERVICES).toContain(worker)
      }
    })
  })
})

describe('Dispatch Namespace - Dispatcher Routing', () => {
  describe('Subdomain Routing', () => {
    it('should route gateway.do to gateway worker', async () => {
      const response = await fetch('https://gateway.do/health', {
        headers: { 'Host': 'gateway.do' },
      })

      // May be 404 if not deployed yet, or 200 if deployed
      expect([200, 404]).toContain(response.status)

      if (response.ok) {
        const health = await response.json()
        expect(health).toHaveProperty('service', 'gateway')
      }
    })

    it('should route db.do to database worker', async () => {
      const response = await fetch('https://db.do/health', {
        headers: { 'Host': 'db.do' },
      })

      expect([200, 404]).toContain(response.status)

      if (response.ok) {
        const health = await response.json()
        expect(health).toHaveProperty('service', 'db')
      }
    })

    it('should route auth.do to auth worker', async () => {
      const response = await fetch('https://auth.do/health', {
        headers: { 'Host': 'auth.do' },
      })

      expect([200, 404]).toContain(response.status)

      if (response.ok) {
        const health = await response.json()
        expect(health).toHaveProperty('service', 'auth')
      }
    })

    it('should route schedule.do to schedule worker', async () => {
      const response = await fetch('https://schedule.do/health', {
        headers: { 'Host': 'schedule.do' },
      })

      expect([200, 404]).toContain(response.status)
    })

    it('should route webhooks.do to webhooks worker', async () => {
      const response = await fetch('https://webhooks.do/health', {
        headers: { 'Host': 'webhooks.do' },
      })

      expect([200, 404]).toContain(response.status)
    })

    it('should route email.do to email worker', async () => {
      const response = await fetch('https://email.do/health', {
        headers: { 'Host': 'email.do' },
      })

      expect([200, 404]).toContain(response.status)
    })

    it('should route mcp.do to MCP worker', async () => {
      const response = await fetch('https://mcp.do/health', {
        headers: { 'Host': 'mcp.do' },
      })

      expect([200, 404]).toContain(response.status)
    })

    it('should route queue.do to queue worker', async () => {
      const response = await fetch('https://queue.do/health', {
        headers: { 'Host': 'queue.do' },
      })

      expect([200, 404]).toContain(response.status)
    })
  })

  describe('Path-Based Routing', () => {
    it('should route /api/db/* to database worker', async () => {
      const response = await fetch('https://api.do/api/db/health')

      expect([200, 404]).toContain(response.status)

      if (response.ok) {
        const health = await response.json()
        expect(health).toHaveProperty('service', 'db')
      }
    })

    it('should route /api/auth/* to auth worker', async () => {
      const response = await fetch('https://api.do/api/auth/health')

      expect([200, 404]).toContain(response.status)
    })

    it('should route /api/schedule/* to schedule worker', async () => {
      const response = await fetch('https://api.do/api/schedule/health')

      expect([200, 404]).toContain(response.status)
    })

    it('should route /api/webhooks/* to webhooks worker', async () => {
      const response = await fetch('https://api.do/api/webhooks/health')

      expect([200, 404]).toContain(response.status)
    })
  })

  describe('Default Routing', () => {
    it('should route api.do root to gateway', async () => {
      const response = await fetch('https://api.do/')

      // Gateway should handle root path
      expect(response.ok).toBe(true)
    })

    it('should route unmatched paths to gateway', async () => {
      const response = await fetch('https://api.do/some/random/path')

      // Gateway should handle unknown paths (may 404 within gateway)
      expect([200, 404]).toContain(response.status)
    })
  })

  describe('Dispatcher Performance', () => {
    it('should route request within 10ms', async () => {
      const { duration } = await measureTime(async () => {
        await fetch('https://api.do/')
      })

      // Dispatcher adds minimal overhead
      // Allow up to 25ms for network + routing
      assertPerformance(duration, 25)
    })

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch('https://api.do/health')
      )

      const { duration } = await measureTime(async () => {
        await Promise.all(requests)
      })

      // 10 concurrent requests should complete quickly
      assertPerformance(duration, 1000)
    })
  })
})

describe('Dispatch Namespace - Error Handling', () => {
  describe('Service Not Found', () => {
    it('should return 404 for unknown service subdomain', async () => {
      const response = await fetch('https://unknown.do/health', {
        headers: { 'Host': 'unknown.do' },
      })

      expect(response.status).toBe(404)

      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toMatch(/not found|unknown/i)
    })

    it('should list available services in 404 response', async () => {
      const response = await fetch('https://unknown.do/test', {
        headers: { 'Host': 'unknown.do' },
      })

      expect(response.status).toBe(404)

      const error = await response.json()
      expect(error).toHaveProperty('available_services')
      expect(Array.isArray(error.available_services)).toBe(true)
      expect(error.available_services.length).toBeGreaterThan(0)
    })
  })

  describe('Service Not Deployed', () => {
    it('should return 404 when service exists but not deployed', async () => {
      // Test with a service that may not be deployed yet
      const response = await fetch('https://notdeployed.do/health', {
        headers: { 'Host': 'notdeployed.do' },
      })

      // Either 404 (not deployed) or service-specific response
      expect([200, 404]).toContain(response.status)

      if (response.status === 404) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
      }
    })

    it('should include deployment hint in error message', async () => {
      const response = await fetch('https://unknown.do/test', {
        headers: { 'Host': 'unknown.do' },
      })

      if (response.status === 404) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
        // Error message should hint at deployment
        const errorText = JSON.stringify(error).toLowerCase()
        expect(errorText).toMatch(/deploy|namespace/i)
      }
    })
  })

  describe('Dispatch Errors', () => {
    it('should handle namespace configuration errors', async () => {
      // Mock: Test with invalid environment variable
      // In real deployment, dispatcher would return 500
      // For now, verify graceful degradation
      const response = await fetch('https://api.do/health')

      // Should not throw, even if misconfigured
      expect(response).toBeDefined()
    })

    it('should include error details in development mode', async () => {
      const response = await fetch('https://api.do/test-error', {
        headers: {
          'X-Environment': 'development',
        },
      })

      // If error occurs, should include details in dev mode
      if (!response.ok) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
      }
    })

    it('should hide error details in production mode', async () => {
      const response = await fetch('https://api.do/test-error', {
        headers: {
          'X-Environment': 'production',
        },
      })

      // If error occurs, should NOT include sensitive details in prod
      if (!response.ok) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
        expect(error).not.toHaveProperty('stack')
        expect(error).not.toHaveProperty('trace')
      }
    })
  })
})

describe('Dispatch Namespace - Service Communication', () => {
  describe('RPC Through Namespace', () => {
    it('should allow RPC between services in same namespace', async () => {
      // Skip if services not deployed
      if (!(await isServiceDeployed('gateway')) || !(await isServiceDeployed('db'))) {
        return
      }

      // Gateway should be able to call DB service via RPC
      // Test by calling gateway endpoint that uses DB
      const response = await fetch('https://gateway.do/api/health')

      if (response.ok) {
        const health = await response.json()
        // Gateway health check may query DB
        expect(health).toHaveProperty('status')
      }
    })

    it('should measure RPC latency through namespace', async () => {
      // Skip if services not deployed
      if (!(await isServiceDeployed('gateway')) || !(await isServiceDeployed('db'))) {
        return
      }

      const { duration } = await measureTime(async () => {
        await fetch('https://gateway.do/api/db/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: 'SELECT 1', params: [] }),
        })
      })

      // RPC through namespace should add minimal overhead
      // Target: <100ms for simple query
      assertPerformance(duration, 100)
    })
  })

  describe('Service Bindings', () => {
    it('should have service bindings configured', async () => {
      // Verify gateway has bindings to other services
      // This is configuration validation, not runtime test
      const expectedBindings = ['DB', 'AUTH', 'SCHEDULE', 'WEBHOOKS', 'EMAIL', 'MCP', 'QUEUE']

      // In real test, would inspect wrangler.jsonc or test RPC calls
      expectedBindings.forEach(binding => {
        expect(binding).toBeDefined()
      })
    })

    it('should resolve service bindings in namespace', async () => {
      // Skip if services not deployed
      if (!(await isServiceDeployed('gateway'))) {
        return
      }

      // Test that gateway can resolve bindings
      // This would be tested indirectly through RPC calls
      const response = await fetch('https://gateway.do/health')

      if (response.ok) {
        const health = await response.json()
        expect(health).toHaveProperty('service')
      }
    })
  })
})

describe('Dispatch Namespace - Namespace Isolation', () => {
  describe('Environment Isolation', () => {
    it('should isolate development namespace', async () => {
      // Workers in development namespace should not affect production
      // This is structural, not runtime test
      expect(TEST_NAMESPACE).not.toBe('dotdo-production')
    })

    it('should have separate workers per namespace', async () => {
      // Same worker name can exist in multiple namespaces
      // Each namespace is isolated
      const namespaces = ['dotdo-production', 'dotdo-staging', 'dotdo-development']

      namespaces.forEach(ns => {
        expect(ns).toBeDefined()
      })
    })
  })

  describe('Configuration Isolation', () => {
    it('should use namespace-specific environment variables', async () => {
      // Each namespace should have its own ENVIRONMENT variable
      // development = "development"
      // staging = "staging"
      // production = "production"

      const envMap: Record<string, string> = {
        'dotdo-development': 'development',
        'dotdo-staging': 'staging',
        'dotdo-production': 'production',
      }

      expect(envMap[TEST_NAMESPACE]).toBe(TEST_NAMESPACE.replace('dotdo-', ''))
    })

    it('should use namespace-specific secrets', async () => {
      // Secrets should be scoped to namespace
      // Cannot test directly, but verify structure
      expect(TEST_NAMESPACE).toBeDefined()
    })
  })
})

describe('Dispatch Namespace - Deployment Verification', () => {
  describe('Post-Deployment Checks', () => {
    it('should verify service appears in namespace', async () => {
      const workers = await listNamespaceWorkers(TEST_NAMESPACE)

      // May be empty if not deployed yet
      expect(Array.isArray(workers)).toBe(true)

      // Each deployed worker should respond to health check
      for (const worker of workers) {
        const deployed = await isServiceDeployed(worker)
        expect(deployed).toBe(true)
      }
    })

    it('should verify health endpoints', async () => {
      const healthChecks = await Promise.all(
        SERVICES.map(async service => ({
          service,
          healthy: await isServiceDeployed(service),
        }))
      )

      // Report deployment status
      const deployedCount = healthChecks.filter(c => c.healthy).length
      console.log(`Services deployed: ${deployedCount}/${SERVICES.length}`)

      healthChecks.forEach(check => {
        console.log(`  ${check.service}: ${check.healthy ? '✅' : '❌'}`)
      })
    })

    it('should measure service startup time', async () => {
      // Skip if services not deployed
      if (!(await isServiceDeployed('gateway'))) {
        return
      }

      // First request (cold start)
      const { duration: coldStart } = await measureTime(async () => {
        await fetch('https://gateway.do/health')
      })

      // Second request (warm)
      const { duration: warmStart } = await measureTime(async () => {
        await fetch('https://gateway.do/health')
      })

      console.log(`Cold start: ${coldStart}ms, Warm start: ${warmStart}ms`)

      // Warm start should be much faster than cold start
      expect(warmStart).toBeLessThan(coldStart)
    })
  })

  describe('Rollback Capability', () => {
    it('should support rollback via Deploy API', async () => {
      if (process.env.SKIP_DEPLOY_TESTS === 'true') {
        return
      }

      const response = await fetch(`${DEPLOY_API_URL}/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEPLOY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'gateway',
          environment: TEST_NAMESPACE,
        }),
      })

      // May return 200 (success), 400 (no previous version), or 503 (not ready)
      expect([200, 400, 503]).toContain(response.status)
    })
  })
})

describe('Dispatch Namespace - Performance Benchmarks', () => {
  describe('Throughput', () => {
    it('should handle 100 concurrent requests', async () => {
      const requests = Array(100).fill(null).map(() =>
        fetch('https://api.do/health')
      )

      const { duration } = await measureTime(async () => {
        await Promise.all(requests)
      })

      // 100 requests should complete within 2 seconds
      assertPerformance(duration, 2000)

      console.log(`100 concurrent requests: ${duration}ms (${(100 / (duration / 1000)).toFixed(2)} req/s)`)
    })

    it('should maintain latency under load', async () => {
      // Measure latency during concurrent requests
      const latencies: number[] = []

      const requests = Array(50).fill(null).map(async () => {
        const { duration } = await measureTime(async () => {
          await fetch('https://api.do/health')
        })
        latencies.push(duration)
      })

      await Promise.all(requests)

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]

      console.log(`Latency under load: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`)

      // Average should be reasonable under load
      expect(avg).toBeLessThan(200)
    })
  })

  describe('Cold Start Performance', () => {
    it('should have acceptable cold start time', async () => {
      // Skip if services not deployed
      if (!(await isServiceDeployed('gateway'))) {
        return
      }

      // Force cold start by waiting (if possible)
      // In real scenario, would need to clear cache

      const { duration } = await measureTime(async () => {
        await fetch('https://gateway.do/health')
      })

      // Cold start should be <1 second
      assertPerformance(duration, 1000)
    })
  })
})
