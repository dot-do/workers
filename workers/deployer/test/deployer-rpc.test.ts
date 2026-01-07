/**
 * RED Tests: deployer.do Deployment RPC Interface
 *
 * These tests define the contract for the deployer worker's RPC interface.
 * The DeployerDO must implement deployment management for Cloudflare Workers.
 *
 * Per ARCHITECTURE.md:
 * - workers/deployer handles deployment management
 * - Integrates with Cloudflare Workers API
 * - Extends slim DO core
 * - Provides RPC interface via @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because DeployerDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hg7p).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockCloudflareAPI,
  type MockDOState,
  type MockDeployerEnv,
} from './helpers.js'

/**
 * Interface definition for DeployerDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface DeployerDOContract {
  // Deployment operations
  deploy(params: DeployParams): Promise<DeploymentResult>
  getDeployment(deploymentId: string): Promise<DeploymentInfo | null>
  listDeployments(scriptName?: string): Promise<DeploymentInfo[]>
  cancelDeployment(deploymentId: string): Promise<boolean>

  // Script operations
  uploadScript(params: UploadScriptParams): Promise<ScriptInfo>
  getScript(scriptName: string): Promise<ScriptInfo | null>
  deleteScript(scriptName: string): Promise<boolean>
  listScripts(): Promise<ScriptInfo[]>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

export interface DeployParams {
  scriptName: string
  versionId: string
  strategy?: 'immediate' | 'gradual'
  percentage?: number
  message?: string
  tag?: string
}

export interface UploadScriptParams {
  scriptName: string
  content: string | ArrayBuffer
  metadata?: {
    main_module?: string
    compatibility_date?: string
    compatibility_flags?: string[]
    bindings?: unknown[]
    migrations?: unknown
  }
}

export interface DeploymentResult {
  deploymentId: string
  versionId: string
  scriptName: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'cancelled'
  strategy: 'immediate' | 'gradual'
  percentage: number
  createdAt: string
  message?: string
}

export interface DeploymentInfo {
  id: string
  scriptName: string
  versionId: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'cancelled'
  strategy: 'immediate' | 'gradual'
  percentage: number
  createdAt: string
  completedAt?: string
  message?: string
  author?: string
}

export interface ScriptInfo {
  name: string
  size: number
  etag: string
  createdAt: string
  modifiedAt: string
  usageModel: 'standard' | 'unbound'
  handlers: string[]
}

/**
 * Attempt to load DeployerDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadDeployerDO(): Promise<new (ctx: MockDOState, env: MockDeployerEnv) => DeployerDOContract> {
  // This dynamic import will fail because src/deployer.js doesn't exist yet
  const module = await import('../src/deployer.js')
  return module.DeployerDO
}

describe('DeployerDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockDeployerEnv
  let DeployerDO: new (ctx: MockDOState, env: MockDeployerEnv) => DeployerDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv({ cloudflareApi: createMockCloudflareAPI() })
    // This will throw in RED phase because the module doesn't exist
    DeployerDO = await loadDeployerDO()
  })

  describe('deploy() - Deployment operations', () => {
    it('should deploy a script version', async () => {
      const instance = new DeployerDO(ctx, env)

      // First upload a script to have something to deploy
      await instance.uploadScript({
        scriptName: 'test-worker',
        content: 'export default { fetch() { return new Response("Hello") } }',
      })

      const result = await instance.deploy({
        scriptName: 'test-worker',
        versionId: 'version-123',
        strategy: 'immediate',
        message: 'Initial deployment',
      })

      expect(result).toHaveProperty('deploymentId')
      expect(result.scriptName).toBe('test-worker')
      expect(result.versionId).toBe('version-123')
      expect(result.status).toBe('active')
      expect(result.strategy).toBe('immediate')
      expect(result.percentage).toBe(100)
    })

    it('should support gradual rollout deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({
        scriptName: 'gradual-worker',
        content: 'export default { fetch() { return new Response("Hello") } }',
      })

      const result = await instance.deploy({
        scriptName: 'gradual-worker',
        versionId: 'version-456',
        strategy: 'gradual',
        percentage: 25,
        message: 'Gradual rollout at 25%',
      })

      expect(result.strategy).toBe('gradual')
      expect(result.percentage).toBe(25)
      expect(result.status).toMatch(/pending|deploying|active/)
    })

    it('should fail for non-existent script', async () => {
      const instance = new DeployerDO(ctx, env)

      await expect(instance.deploy({
        scriptName: 'non-existent-worker',
        versionId: 'version-123',
      })).rejects.toThrow(/not found|does not exist/i)
    })

    it('should fail for non-existent version', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({
        scriptName: 'test-worker',
        content: 'export default {}',
      })

      await expect(instance.deploy({
        scriptName: 'test-worker',
        versionId: 'non-existent-version',
      })).rejects.toThrow(/version.*not found|invalid version/i)
    })

    it('should include deployment message and tag', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({
        scriptName: 'tagged-worker',
        content: 'export default {}',
      })

      const result = await instance.deploy({
        scriptName: 'tagged-worker',
        versionId: 'version-789',
        message: 'Release v1.2.3',
        tag: 'v1.2.3',
      })

      expect(result.message).toBe('Release v1.2.3')
    })
  })

  describe('getDeployment() - Retrieve deployment info', () => {
    it('should return deployment by ID', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({
        scriptName: 'test-worker',
        content: 'export default {}',
      })

      const deployed = await instance.deploy({
        scriptName: 'test-worker',
        versionId: 'version-123',
      })

      const result = await instance.getDeployment(deployed.deploymentId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(deployed.deploymentId)
      expect(result!.scriptName).toBe('test-worker')
    })

    it('should return null for non-existent deployment', async () => {
      const instance = new DeployerDO(ctx, env)
      const result = await instance.getDeployment('non-existent-deployment')
      expect(result).toBeNull()
    })
  })

  describe('listDeployments() - List deployments', () => {
    it('should list all deployments', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })
      await instance.uploadScript({ scriptName: 'worker-2', content: 'export default {}' })

      await instance.deploy({ scriptName: 'worker-1', versionId: 'v1' })
      await instance.deploy({ scriptName: 'worker-2', versionId: 'v2' })

      const deployments = await instance.listDeployments()
      expect(deployments).toBeInstanceOf(Array)
      expect(deployments.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter deployments by script name', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })
      await instance.uploadScript({ scriptName: 'worker-2', content: 'export default {}' })

      await instance.deploy({ scriptName: 'worker-1', versionId: 'v1' })
      await instance.deploy({ scriptName: 'worker-2', versionId: 'v2' })

      const deployments = await instance.listDeployments('worker-1')
      expect(deployments.every(d => d.scriptName === 'worker-1')).toBe(true)
    })

    it('should return empty array when no deployments exist', async () => {
      const instance = new DeployerDO(ctx, env)
      const deployments = await instance.listDeployments()
      expect(deployments).toEqual([])
    })

    it('should return deployments sorted by creation time (newest first)', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })

      await instance.deploy({ scriptName: 'worker-1', versionId: 'v1', message: 'first' })
      await instance.deploy({ scriptName: 'worker-1', versionId: 'v2', message: 'second' })

      const deployments = await instance.listDeployments('worker-1')

      for (let i = 1; i < deployments.length; i++) {
        const prev = new Date(deployments[i - 1]!.createdAt)
        const curr = new Date(deployments[i]!.createdAt)
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime())
      }
    })
  })

  describe('cancelDeployment() - Cancel in-progress deployment', () => {
    it('should cancel a pending deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })

      const deployed = await instance.deploy({
        scriptName: 'worker-1',
        versionId: 'v1',
        strategy: 'gradual',
        percentage: 10,
      })

      const result = await instance.cancelDeployment(deployed.deploymentId)
      expect(result).toBe(true)

      const cancelled = await instance.getDeployment(deployed.deploymentId)
      expect(cancelled?.status).toBe('cancelled')
    })

    it('should return false for non-existent deployment', async () => {
      const instance = new DeployerDO(ctx, env)
      const result = await instance.cancelDeployment('non-existent')
      expect(result).toBe(false)
    })

    it('should not cancel already completed deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })

      const deployed = await instance.deploy({
        scriptName: 'worker-1',
        versionId: 'v1',
        strategy: 'immediate',
      })

      // Immediate deployments complete instantly
      await expect(instance.cancelDeployment(deployed.deploymentId))
        .rejects.toThrow(/already.*completed|cannot cancel/i)
    })
  })

  describe('Script operations', () => {
    describe('uploadScript()', () => {
      it('should upload a new script', async () => {
        const instance = new DeployerDO(ctx, env)

        const result = await instance.uploadScript({
          scriptName: 'new-worker',
          content: 'export default { fetch() { return new Response("Hello") } }',
        })

        expect(result.name).toBe('new-worker')
        expect(result.size).toBeGreaterThan(0)
        expect(result.etag).toBeDefined()
        expect(result.createdAt).toBeDefined()
      })

      it('should accept metadata for modules format', async () => {
        const instance = new DeployerDO(ctx, env)

        const result = await instance.uploadScript({
          scriptName: 'modules-worker',
          content: 'export default { fetch() { return new Response("Hello") } }',
          metadata: {
            main_module: 'index.js',
            compatibility_date: '2024-01-01',
            compatibility_flags: ['nodejs_compat'],
          },
        })

        expect(result.name).toBe('modules-worker')
      })

      it('should accept ArrayBuffer content', async () => {
        const instance = new DeployerDO(ctx, env)

        const content = new TextEncoder().encode('export default {}')
        const result = await instance.uploadScript({
          scriptName: 'binary-worker',
          content: content.buffer as ArrayBuffer,
        })

        expect(result.name).toBe('binary-worker')
      })

      it('should update existing script', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({
          scriptName: 'update-worker',
          content: 'version 1',
        })

        const updated = await instance.uploadScript({
          scriptName: 'update-worker',
          content: 'version 2',
        })

        expect(updated.name).toBe('update-worker')
        expect(new Date(updated.modifiedAt).getTime()).toBeGreaterThan(0)
      })
    })

    describe('getScript()', () => {
      it('should return script info by name', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({
          scriptName: 'test-worker',
          content: 'export default {}',
        })

        const script = await instance.getScript('test-worker')
        expect(script).not.toBeNull()
        expect(script!.name).toBe('test-worker')
        expect(script!.handlers).toContain('fetch')
      })

      it('should return null for non-existent script', async () => {
        const instance = new DeployerDO(ctx, env)
        const script = await instance.getScript('non-existent')
        expect(script).toBeNull()
      })
    })

    describe('deleteScript()', () => {
      it('should delete an existing script', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({
          scriptName: 'delete-worker',
          content: 'export default {}',
        })

        const result = await instance.deleteScript('delete-worker')
        expect(result).toBe(true)

        const deleted = await instance.getScript('delete-worker')
        expect(deleted).toBeNull()
      })

      it('should return false for non-existent script', async () => {
        const instance = new DeployerDO(ctx, env)
        const result = await instance.deleteScript('non-existent')
        expect(result).toBe(false)
      })
    })

    describe('listScripts()', () => {
      it('should list all scripts', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({ scriptName: 'worker-1', content: 'export default {}' })
        await instance.uploadScript({ scriptName: 'worker-2', content: 'export default {}' })

        const scripts = await instance.listScripts()
        expect(scripts).toBeInstanceOf(Array)
        expect(scripts.length).toBeGreaterThanOrEqual(2)

        const names = scripts.map(s => s.name)
        expect(names).toContain('worker-1')
        expect(names).toContain('worker-2')
      })

      it('should return empty array when no scripts exist', async () => {
        const instance = new DeployerDO(ctx, env)
        const scripts = await instance.listScripts()
        expect(scripts).toEqual([])
      })
    })
  })

  describe('RPC interface', () => {
    describe('hasMethod()', () => {
      it('should return true for deployment methods', async () => {
        const instance = new DeployerDO(ctx, env)
        expect(instance.hasMethod('deploy')).toBe(true)
        expect(instance.hasMethod('getDeployment')).toBe(true)
        expect(instance.hasMethod('listDeployments')).toBe(true)
        expect(instance.hasMethod('cancelDeployment')).toBe(true)
      })

      it('should return true for script methods', async () => {
        const instance = new DeployerDO(ctx, env)
        expect(instance.hasMethod('uploadScript')).toBe(true)
        expect(instance.hasMethod('getScript')).toBe(true)
        expect(instance.hasMethod('deleteScript')).toBe(true)
        expect(instance.hasMethod('listScripts')).toBe(true)
      })

      it('should return false for non-existent methods', async () => {
        const instance = new DeployerDO(ctx, env)
        expect(instance.hasMethod('nonexistent')).toBe(false)
        expect(instance.hasMethod('eval')).toBe(false)
      })
    })

    describe('invoke()', () => {
      it('should invoke deploy method with params', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({
          scriptName: 'rpc-worker',
          content: 'export default {}',
        })

        const result = await instance.invoke('deploy', [{
          scriptName: 'rpc-worker',
          versionId: 'v1',
        }]) as DeploymentResult

        expect(result).toHaveProperty('deploymentId')
        expect(result.scriptName).toBe('rpc-worker')
      })

      it('should throw error for disallowed method', async () => {
        const instance = new DeployerDO(ctx, env)
        await expect(instance.invoke('dangerous', [])).rejects.toThrow(/Method not allowed|not found/i)
      })
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('RPC endpoint', () => {
      it('should handle POST /rpc with deploy call', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({
          scriptName: 'http-worker',
          content: 'export default {}',
        })

        const request = new Request('http://deployer.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'deploy',
            params: [{ scriptName: 'http-worker', versionId: 'v1' }],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const result = await response.json() as { result: DeploymentResult }
        expect(result).toHaveProperty('result')
        expect(result.result).toHaveProperty('deploymentId')
      })

      it('should return error for invalid method', async () => {
        const instance = new DeployerDO(ctx, env)

        const request = new Request('http://deployer.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'invalid', params: [] }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const result = await response.json() as { error: string }
        expect(result).toHaveProperty('error')
      })
    })

    describe('REST API endpoints', () => {
      it('should handle GET /api/scripts', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({ scriptName: 'rest-worker', content: 'export default {}' })

        const request = new Request('http://deployer.do/api/scripts', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const scripts = await response.json() as ScriptInfo[]
        expect(Array.isArray(scripts)).toBe(true)
      })

      it('should handle GET /api/scripts/:name', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({ scriptName: 'single-worker', content: 'export default {}' })

        const request = new Request('http://deployer.do/api/scripts/single-worker', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const script = await response.json() as ScriptInfo
        expect(script.name).toBe('single-worker')
      })

      it('should handle POST /api/scripts', async () => {
        const instance = new DeployerDO(ctx, env)

        const request = new Request('http://deployer.do/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptName: 'posted-worker',
            content: 'export default {}',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(201)

        const script = await response.json() as ScriptInfo
        expect(script.name).toBe('posted-worker')
      })

      it('should handle POST /api/deployments', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({ scriptName: 'deploy-worker', content: 'export default {}' })

        const request = new Request('http://deployer.do/api/deployments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptName: 'deploy-worker',
            versionId: 'v1',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(201)

        const deployment = await response.json() as DeploymentResult
        expect(deployment.scriptName).toBe('deploy-worker')
      })

      it('should handle GET /api/deployments', async () => {
        const instance = new DeployerDO(ctx, env)

        const request = new Request('http://deployer.do/api/deployments', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const deployments = await response.json() as DeploymentInfo[]
        expect(Array.isArray(deployments)).toBe(true)
      })

      it('should handle GET /api/deployments/:id', async () => {
        const instance = new DeployerDO(ctx, env)

        await instance.uploadScript({ scriptName: 'get-deploy-worker', content: 'export default {}' })
        const deployed = await instance.deploy({ scriptName: 'get-deploy-worker', versionId: 'v1' })

        const request = new Request(`http://deployer.do/api/deployments/${deployed.deploymentId}`, { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const deployment = await response.json() as DeploymentInfo
        expect(deployment.id).toBe(deployed.deploymentId)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new DeployerDO(ctx, env)

        const request = new Request('http://deployer.do/', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = await response.json() as Record<string, unknown>
        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
      })

      it('should include available endpoints in discovery', async () => {
        const instance = new DeployerDO(ctx, env)

        const request = new Request('http://deployer.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = await response.json() as { links: Record<string, string> }

        expect(data.links).toHaveProperty('scripts')
        expect(data.links).toHaveProperty('deployments')
      })
    })
  })
})
