/**
 * RED Tests: deployer.do Rollback Functionality
 *
 * These tests define the contract for the deployer worker's rollback operations.
 * The DeployerDO must support rollback to previous versions and deployment history tracking.
 *
 * Per issue description:
 * - Rollback functionality
 * - Restore previous versions
 * - Track deployment history
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
 * Interface definition for DeployerDO rollback functionality
 */
interface DeployerDORollbackContract {
  // Script operations
  uploadScript(params: { scriptName: string; content: string }): Promise<ScriptInfo>

  // Version operations
  createVersion(params: { scriptName: string; content: string; metadata?: Record<string, unknown> }): Promise<VersionInfo>
  getVersion(scriptName: string, versionId: string): Promise<VersionInfo | null>
  listVersions(scriptName: string): Promise<VersionInfo[]>

  // Deployment operations
  deploy(params: DeployParams): Promise<DeploymentResult>
  getDeployment(deploymentId: string): Promise<DeploymentInfo | null>
  listDeployments(scriptName?: string): Promise<DeploymentInfo[]>

  // Rollback operations
  rollback(params: RollbackParams): Promise<RollbackResult>
  getRollbackHistory(scriptName: string): Promise<RollbackEvent[]>
  canRollback(scriptName: string): Promise<RollbackOptions>
  rollbackToDeployment(deploymentId: string): Promise<RollbackResult>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

interface ScriptInfo {
  name: string
  size: number
  etag: string
  createdAt: string
  modifiedAt: string
}

interface VersionInfo {
  id: string
  scriptName: string
  number: number
  size: number
  createdAt: string
  metadata: Record<string, unknown>
  isActive: boolean
}

interface DeployParams {
  scriptName: string
  versionId: string
  strategy?: 'immediate' | 'gradual'
  percentage?: number
  message?: string
}

interface DeploymentResult {
  deploymentId: string
  versionId: string
  scriptName: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'cancelled' | 'rolled_back'
  strategy: 'immediate' | 'gradual'
  percentage: number
  createdAt: string
}

interface DeploymentInfo {
  id: string
  scriptName: string
  versionId: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'cancelled' | 'rolled_back'
  strategy: 'immediate' | 'gradual'
  percentage: number
  createdAt: string
  completedAt?: string
  rolledBackAt?: string
  rolledBackTo?: string
}

interface RollbackParams {
  scriptName: string
  targetVersionId?: string
  targetVersionNumber?: number
  reason?: string
}

interface RollbackResult {
  success: boolean
  deploymentId: string
  previousVersionId: string
  newVersionId: string
  scriptName: string
  reason?: string
  rolledBackAt: string
}

interface RollbackEvent {
  id: string
  scriptName: string
  fromVersionId: string
  toVersionId: string
  fromDeploymentId: string
  toDeploymentId: string
  reason?: string
  initiatedBy: string
  createdAt: string
}

interface RollbackOptions {
  canRollback: boolean
  availableVersions: Array<{
    versionId: string
    versionNumber: number
    wasActive: boolean
    lastActiveAt?: string
  }>
  currentVersionId: string | null
  previousVersionId: string | null
}

/**
 * Attempt to load DeployerDO - this will fail in RED phase
 */
async function loadDeployerDO(): Promise<new (ctx: MockDOState, env: MockDeployerEnv) => DeployerDORollbackContract> {
  const module = await import('../src/deployer.js')
  return module.DeployerDO
}

describe('DeployerDO Rollback Functionality', () => {
  let ctx: MockDOState
  let env: MockDeployerEnv
  let DeployerDO: new (ctx: MockDOState, env: MockDeployerEnv) => DeployerDORollbackContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv({ cloudflareApi: createMockCloudflareAPI() })
    DeployerDO = await loadDeployerDO()
  })

  describe('rollback() - Rollback to previous version', () => {
    it('should rollback to previous version by default', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'rollback-worker', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'rollback-worker', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'rollback-worker', content: 'v2' })

      await instance.deploy({ scriptName: 'rollback-worker', versionId: v1.id })
      await instance.deploy({ scriptName: 'rollback-worker', versionId: v2.id })

      const result = await instance.rollback({ scriptName: 'rollback-worker' })

      expect(result.success).toBe(true)
      expect(result.previousVersionId).toBe(v2.id)
      expect(result.newVersionId).toBe(v1.id)
      expect(result.scriptName).toBe('rollback-worker')
      expect(result.rolledBackAt).toBeDefined()
    })

    it('should rollback to specific version by ID', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'specific-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'specific-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'specific-rollback', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'specific-rollback', content: 'v3' })

      await instance.deploy({ scriptName: 'specific-rollback', versionId: v1.id })
      await instance.deploy({ scriptName: 'specific-rollback', versionId: v2.id })
      await instance.deploy({ scriptName: 'specific-rollback', versionId: v3.id })

      const result = await instance.rollback({
        scriptName: 'specific-rollback',
        targetVersionId: v1.id,
        reason: 'Rolling back to v1 due to bug in v3',
      })

      expect(result.success).toBe(true)
      expect(result.newVersionId).toBe(v1.id)
      expect(result.reason).toBe('Rolling back to v1 due to bug in v3')
    })

    it('should rollback to specific version by number', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'number-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'number-rollback', content: 'v1' })
      await instance.createVersion({ scriptName: 'number-rollback', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'number-rollback', content: 'v3' })

      await instance.deploy({ scriptName: 'number-rollback', versionId: v3.id })

      const result = await instance.rollback({
        scriptName: 'number-rollback',
        targetVersionNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.newVersionId).toBe(v1.id)
    })

    it('should fail when no previous version exists', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'single-version', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'single-version', content: 'v1' })
      await instance.deploy({ scriptName: 'single-version', versionId: v1.id })

      await expect(instance.rollback({ scriptName: 'single-version' }))
        .rejects.toThrow(/no previous version|cannot rollback/i)
    })

    it('should fail for non-existent target version', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'invalid-target', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'invalid-target', content: 'v1' })
      await instance.deploy({ scriptName: 'invalid-target', versionId: v1.id })

      await expect(instance.rollback({
        scriptName: 'invalid-target',
        targetVersionId: 'non-existent-version',
      })).rejects.toThrow(/version.*not found|invalid target/i)
    })

    it('should fail when no deployment is active', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'no-deploy', content: 'export default {}' })

      await instance.createVersion({ scriptName: 'no-deploy', content: 'v1' })

      await expect(instance.rollback({ scriptName: 'no-deploy' }))
        .rejects.toThrow(/no active deployment|nothing to rollback/i)
    })

    it('should create new deployment pointing to rollback version', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'deploy-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'deploy-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'deploy-rollback', content: 'v2' })

      await instance.deploy({ scriptName: 'deploy-rollback', versionId: v1.id })
      await instance.deploy({ scriptName: 'deploy-rollback', versionId: v2.id })

      const result = await instance.rollback({ scriptName: 'deploy-rollback' })

      const newDeployment = await instance.getDeployment(result.deploymentId)
      expect(newDeployment).not.toBeNull()
      expect(newDeployment!.versionId).toBe(v1.id)
      expect(newDeployment!.status).toBe('active')
    })

    it('should mark previous deployment as rolled back', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'mark-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'mark-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'mark-rollback', content: 'v2' })

      await instance.deploy({ scriptName: 'mark-rollback', versionId: v1.id })
      const d2 = await instance.deploy({ scriptName: 'mark-rollback', versionId: v2.id })

      await instance.rollback({ scriptName: 'mark-rollback' })

      const oldDeployment = await instance.getDeployment(d2.deploymentId)
      expect(oldDeployment!.status).toBe('rolled_back')
      expect(oldDeployment!.rolledBackAt).toBeDefined()
    })
  })

  describe('getRollbackHistory() - Track rollback events', () => {
    it('should return rollback history for a script', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'history-worker', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'history-worker', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'history-worker', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'history-worker', content: 'v3' })

      await instance.deploy({ scriptName: 'history-worker', versionId: v1.id })
      await instance.deploy({ scriptName: 'history-worker', versionId: v2.id })
      await instance.rollback({ scriptName: 'history-worker', reason: 'Bug in v2' })

      await instance.deploy({ scriptName: 'history-worker', versionId: v3.id })
      await instance.rollback({ scriptName: 'history-worker', reason: 'Bug in v3' })

      const history = await instance.getRollbackHistory('history-worker')

      expect(history).toBeInstanceOf(Array)
      expect(history.length).toBe(2)

      expect(history[0]!.fromVersionId).toBeDefined()
      expect(history[0]!.toVersionId).toBeDefined()
      expect(history[0]!.reason).toBeDefined()
      expect(history[0]!.createdAt).toBeDefined()
    })

    it('should return empty array for script with no rollbacks', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'no-rollback-history', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'no-rollback-history', content: 'v1' })
      await instance.deploy({ scriptName: 'no-rollback-history', versionId: v1.id })

      const history = await instance.getRollbackHistory('no-rollback-history')
      expect(history).toEqual([])
    })

    it('should return rollback events in chronological order (newest first)', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'ordered-history', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'ordered-history', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'ordered-history', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'ordered-history', content: 'v3' })

      await instance.deploy({ scriptName: 'ordered-history', versionId: v1.id })
      await instance.deploy({ scriptName: 'ordered-history', versionId: v2.id })
      await instance.rollback({ scriptName: 'ordered-history', reason: 'first rollback' })

      await instance.deploy({ scriptName: 'ordered-history', versionId: v3.id })
      await instance.rollback({ scriptName: 'ordered-history', reason: 'second rollback' })

      const history = await instance.getRollbackHistory('ordered-history')

      expect(history[0]!.reason).toBe('second rollback')
      expect(history[1]!.reason).toBe('first rollback')
    })
  })

  describe('canRollback() - Check rollback availability', () => {
    it('should return available rollback options', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'can-rollback-worker', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'can-rollback-worker', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'can-rollback-worker', content: 'v2' })

      await instance.deploy({ scriptName: 'can-rollback-worker', versionId: v1.id })
      await instance.deploy({ scriptName: 'can-rollback-worker', versionId: v2.id })

      const options = await instance.canRollback('can-rollback-worker')

      expect(options.canRollback).toBe(true)
      expect(options.currentVersionId).toBe(v2.id)
      expect(options.previousVersionId).toBe(v1.id)
      expect(options.availableVersions).toBeInstanceOf(Array)
      expect(options.availableVersions.length).toBeGreaterThan(0)
    })

    it('should indicate rollback is not possible with single version', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'single-version-check', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'single-version-check', content: 'v1' })
      await instance.deploy({ scriptName: 'single-version-check', versionId: v1.id })

      const options = await instance.canRollback('single-version-check')

      expect(options.canRollback).toBe(false)
      expect(options.currentVersionId).toBe(v1.id)
      expect(options.previousVersionId).toBeNull()
    })

    it('should indicate rollback is not possible with no deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'no-deploy-check', content: 'export default {}' })
      await instance.createVersion({ scriptName: 'no-deploy-check', content: 'v1' })

      const options = await instance.canRollback('no-deploy-check')

      expect(options.canRollback).toBe(false)
      expect(options.currentVersionId).toBeNull()
    })

    it('should include version history in available versions', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'version-history', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'version-history', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'version-history', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'version-history', content: 'v3' })

      await instance.deploy({ scriptName: 'version-history', versionId: v1.id })
      await instance.deploy({ scriptName: 'version-history', versionId: v2.id })
      await instance.deploy({ scriptName: 'version-history', versionId: v3.id })

      const options = await instance.canRollback('version-history')

      const versionIds = options.availableVersions.map(v => v.versionId)
      expect(versionIds).toContain(v1.id)
      expect(versionIds).toContain(v2.id)
      // v3 is current, so it shouldn't be in rollback options
      expect(versionIds).not.toContain(v3.id)
    })
  })

  describe('rollbackToDeployment() - Restore specific deployment state', () => {
    it('should rollback to a specific deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'deploy-restore', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'deploy-restore', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'deploy-restore', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'deploy-restore', content: 'v3' })

      const d1 = await instance.deploy({ scriptName: 'deploy-restore', versionId: v1.id })
      await instance.deploy({ scriptName: 'deploy-restore', versionId: v2.id })
      await instance.deploy({ scriptName: 'deploy-restore', versionId: v3.id })

      const result = await instance.rollbackToDeployment(d1.deploymentId)

      expect(result.success).toBe(true)
      expect(result.newVersionId).toBe(v1.id)
    })

    it('should fail for non-existent deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await expect(instance.rollbackToDeployment('non-existent'))
        .rejects.toThrow(/deployment.*not found/i)
    })

    it('should fail when trying to rollback to already active deployment', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'already-active', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'already-active', content: 'v1' })
      const d1 = await instance.deploy({ scriptName: 'already-active', versionId: v1.id })

      await expect(instance.rollbackToDeployment(d1.deploymentId))
        .rejects.toThrow(/already active|cannot rollback to current/i)
    })
  })

  describe('HTTP endpoints for rollback', () => {
    it('should handle POST /api/scripts/:name/rollback', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'http-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'http-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'http-rollback', content: 'v2' })

      await instance.deploy({ scriptName: 'http-rollback', versionId: v1.id })
      await instance.deploy({ scriptName: 'http-rollback', versionId: v2.id })

      const request = new Request('http://deployer.do/api/scripts/http-rollback/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Bug found' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const result = await response.json() as RollbackResult
      expect(result.success).toBe(true)
    })

    it('should handle POST /api/scripts/:name/rollback with target version', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'target-http-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'target-http-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'target-http-rollback', content: 'v2' })
      const v3 = await instance.createVersion({ scriptName: 'target-http-rollback', content: 'v3' })

      await instance.deploy({ scriptName: 'target-http-rollback', versionId: v1.id })
      await instance.deploy({ scriptName: 'target-http-rollback', versionId: v2.id })
      await instance.deploy({ scriptName: 'target-http-rollback', versionId: v3.id })

      const request = new Request('http://deployer.do/api/scripts/target-http-rollback/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersionId: v1.id }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const result = await response.json() as RollbackResult
      expect(result.newVersionId).toBe(v1.id)
    })

    it('should handle GET /api/scripts/:name/rollback-options', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'rollback-options', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'rollback-options', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'rollback-options', content: 'v2' })

      await instance.deploy({ scriptName: 'rollback-options', versionId: v1.id })
      await instance.deploy({ scriptName: 'rollback-options', versionId: v2.id })

      const request = new Request('http://deployer.do/api/scripts/rollback-options/rollback-options', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const options = await response.json() as RollbackOptions
      expect(options.canRollback).toBe(true)
    })

    it('should handle GET /api/scripts/:name/rollback-history', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'http-history', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'http-history', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'http-history', content: 'v2' })

      await instance.deploy({ scriptName: 'http-history', versionId: v1.id })
      await instance.deploy({ scriptName: 'http-history', versionId: v2.id })
      await instance.rollback({ scriptName: 'http-history' })

      const request = new Request('http://deployer.do/api/scripts/http-history/rollback-history', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const history = await response.json() as RollbackEvent[]
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    })

    it('should handle POST /api/deployments/:id/rollback', async () => {
      const instance = new DeployerDO(ctx, env)

      await instance.uploadScript({ scriptName: 'deployment-rollback', content: 'export default {}' })

      const v1 = await instance.createVersion({ scriptName: 'deployment-rollback', content: 'v1' })
      const v2 = await instance.createVersion({ scriptName: 'deployment-rollback', content: 'v2' })

      const d1 = await instance.deploy({ scriptName: 'deployment-rollback', versionId: v1.id })
      await instance.deploy({ scriptName: 'deployment-rollback', versionId: v2.id })

      const request = new Request(`http://deployer.do/api/deployments/${d1.deploymentId}/rollback`, { method: 'POST' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const result = await response.json() as RollbackResult
      expect(result.newVersionId).toBe(v1.id)
    })
  })
})
