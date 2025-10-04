/**
 * Deploy Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeployService } from '../src/index'
import type { Env, DeploymentRequest, RollbackRequest, ListDeploymentsRequest } from '../src/types'

// Mock environment
const createMockEnv = (): Env => ({
  AUTH_SERVICE: {
    validateApiKey: vi.fn(),
    checkPermission: vi.fn(),
  },
  DB_SERVICE: {
    upsert: vi.fn(),
    list: vi.fn(),
  },
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-token',
  PRODUCTION_NAMESPACE: 'dotdo-production',
  STAGING_NAMESPACE: 'dotdo-staging',
  DEV_NAMESPACE: 'dotdo-development',
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DeployService - RPC Interface', () => {
  let service: DeployService
  let env: Env
  let mockCtx: any

  beforeEach(() => {
    env = createMockEnv()
    mockCtx = { waitUntil: vi.fn() }
    service = new DeployService(mockCtx, env)

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('deploy()', () => {
    it('should deploy a service to production', async () => {
      const request: DeploymentRequest = {
        service: 'gateway',
        environment: 'production',
        script: btoa('export default { fetch() { return new Response("ok") } }'),
        metadata: {
          commit: 'abc123',
          branch: 'main',
          author: 'ci@do',
          version: 'v1.0.0',
        },
      }

      // Mock Cloudflare API success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            id: 'worker-id',
            etag: 'etag',
            created_on: '2025-10-03T00:00:00Z',
            modified_on: '2025-10-03T00:00:00Z',
          },
        }),
      })

      // Mock DB insert
      vi.mocked(env.DB_SERVICE.upsert).mockResolvedValueOnce(undefined)

      const result = await service.deploy(request)

      expect(result.success).toBe(true)
      expect(result.deployment).toBeDefined()
      expect(result.deployment?.service).toBe('gateway')
      expect(result.deployment?.environment).toBe('production')
      expect(result.deployment?.namespace).toBe('dotdo-production')
      expect(result.deployment?.status).toBe('deployed')
      expect(result.deployment?.url).toBe('https://gateway.do')
      expect(result.deployment?.version).toBe('v1.0.0')

      // Verify Cloudflare API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workers/dispatch/namespaces/dotdo-production/scripts/gateway'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
          body: expect.any(FormData),
        })
      )

      // Verify deployment was logged
      expect(env.DB_SERVICE.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'deployments',
          data: expect.objectContaining({
            service: 'gateway',
            environment: 'production',
            status: 'deployed',
          }),
        })
      )
    })

    it('should deploy to staging environment', async () => {
      const request: DeploymentRequest = {
        service: 'db',
        environment: 'staging',
        script: btoa('export default {}'),
        metadata: {
          commit: 'def456',
          branch: 'develop',
          author: 'dev@do',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: {} }),
      })

      vi.mocked(env.DB_SERVICE.upsert).mockResolvedValueOnce(undefined)

      const result = await service.deploy(request)

      expect(result.success).toBe(true)
      expect(result.deployment?.environment).toBe('staging')
      expect(result.deployment?.namespace).toBe('dotdo-staging')
      expect(result.deployment?.url).toBe('https://db.staging.do')
    })

    it('should handle Cloudflare API errors', async () => {
      const request: DeploymentRequest = {
        service: 'gateway',
        environment: 'production',
        script: btoa('export default {}'),
        metadata: {
          commit: 'abc123',
          branch: 'main',
          author: 'ci@do',
        },
      }

      // Mock Cloudflare API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      })

      const result = await service.deploy(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Deployment failed')
    })

    it('should handle invalid schema', async () => {
      const invalidRequest = {
        service: 'invalid-service',
        environment: 'production',
        script: btoa('code'),
        metadata: {
          commit: 'abc',
          branch: 'main',
          author: 'test',
        },
      }

      const result = await service.deploy(invalidRequest as any)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should continue deployment even if logging fails', async () => {
      const request: DeploymentRequest = {
        service: 'gateway',
        environment: 'production',
        script: btoa('export default {}'),
        metadata: {
          commit: 'abc123',
          branch: 'main',
          author: 'ci@do',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: {} }),
      })

      // Mock DB insert failure
      vi.mocked(env.DB_SERVICE.upsert).mockRejectedValueOnce(new Error('DB error'))

      const result = await service.deploy(request)

      // Deployment should still succeed even if logging fails
      expect(result.success).toBe(true)
      expect(result.deployment).toBeDefined()
    })
  })

  describe('rollback()', () => {
    it('should rollback to previous deployment', async () => {
      const request: RollbackRequest = {
        service: 'gateway',
        environment: 'production',
      }

      // Mock fetching previous deployment
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: [
          {
            id: 'deploy_current',
            data: {
              service: 'gateway',
              environment: 'production',
              namespace: 'dotdo-production',
              status: 'deployed',
              timestamp: '2025-10-03T12:00:00Z',
              url: 'https://gateway.do',
              version: 'v1.0.1',
              commit: 'def456',
              branch: 'main',
              author: 'ci@do',
            },
          },
          {
            id: 'deploy_previous',
            data: {
              service: 'gateway',
              environment: 'production',
              namespace: 'dotdo-production',
              status: 'deployed',
              timestamp: '2025-10-03T11:00:00Z',
              url: 'https://gateway.do',
              version: 'v1.0.0',
              commit: 'abc123',
              branch: 'main',
              author: 'ci@do',
            },
          },
        ],
      })

      // Mock marking as rolled back
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: [
          {
            id: 'deploy_current',
            data: {
              service: 'gateway',
              environment: 'production',
              status: 'deployed',
            },
          },
        ],
      })

      vi.mocked(env.DB_SERVICE.upsert).mockResolvedValueOnce(undefined)

      const result = await service.rollback(request)

      expect(result.success).toBe(true)
      expect(result.deployment).toBeDefined()
      expect(result.deployment?.id).toBe('deploy_previous')
      expect(result.deployment?.version).toBe('v1.0.0')
    })

    it('should fail if no previous deployment exists', async () => {
      const request: RollbackRequest = {
        service: 'gateway',
        environment: 'production',
      }

      // Mock no previous deployment
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: [
          {
            id: 'deploy_current',
            data: {},
          },
        ],
      })

      const result = await service.rollback(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No previous deployment found')
    })
  })

  describe('listDeployments()', () => {
    it('should list all deployments', async () => {
      const deployments = [
        {
          id: 'deploy_1',
          data: {
            service: 'gateway',
            environment: 'production',
            namespace: 'dotdo-production',
            status: 'deployed',
            timestamp: '2025-10-03T12:00:00Z',
            url: 'https://gateway.do',
            version: 'v1.0.0',
            commit: 'abc123',
            branch: 'main',
            author: 'ci@do',
          },
        },
        {
          id: 'deploy_2',
          data: {
            service: 'db',
            environment: 'staging',
            namespace: 'dotdo-staging',
            status: 'deployed',
            timestamp: '2025-10-03T11:00:00Z',
            url: 'https://db.staging.do',
            version: 'v1.0.0',
            commit: 'def456',
            branch: 'develop',
            author: 'dev@do',
          },
        },
      ]

      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: deployments,
      })

      const result = await service.listDeployments({})

      expect(result.deployments).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.deployments[0].service).toBe('gateway')
      expect(result.deployments[1].service).toBe('db')
    })

    it('should filter by service', async () => {
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: [
          {
            id: 'deploy_1',
            data: {
              service: 'gateway',
              environment: 'production',
              namespace: 'dotdo-production',
              status: 'deployed',
              timestamp: '2025-10-03T12:00:00Z',
              url: 'https://gateway.do',
              version: 'v1.0.0',
              commit: 'abc123',
              branch: 'main',
              author: 'ci@do',
            },
          },
        ],
      })

      const result = await service.listDeployments({ service: 'gateway' })

      expect(result.deployments).toHaveLength(1)
      expect(result.deployments[0].service).toBe('gateway')
    })

    it('should filter by environment', async () => {
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: [
          {
            id: 'deploy_1',
            data: {
              service: 'gateway',
              environment: 'staging',
              namespace: 'dotdo-staging',
              status: 'deployed',
              timestamp: '2025-10-03T12:00:00Z',
              url: 'https://gateway.staging.do',
              version: 'v1.0.0',
              commit: 'abc123',
              branch: 'develop',
              author: 'dev@do',
            },
          },
        ],
      })

      const result = await service.listDeployments({ environment: 'staging' })

      expect(result.deployments).toHaveLength(1)
      expect(result.deployments[0].environment).toBe('staging')
    })

    it('should respect limit parameter', async () => {
      vi.mocked(env.DB_SERVICE.list).mockResolvedValueOnce({
        data: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `deploy_${i}`,
            data: {
              service: 'gateway',
              environment: 'production',
              namespace: 'dotdo-production',
              status: 'deployed',
              timestamp: '2025-10-03T12:00:00Z',
              url: 'https://gateway.do',
              version: `v1.0.${i}`,
              commit: `commit${i}`,
              branch: 'main',
              author: 'ci@do',
            },
          })),
      })

      const result = await service.listDeployments({ limit: 10 })

      expect(result.deployments).toHaveLength(10)
      expect(result.total).toBe(10)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(env.DB_SERVICE.list).mockRejectedValueOnce(new Error('DB error'))

      const result = await service.listDeployments({})

      expect(result.deployments).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})
