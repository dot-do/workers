import { describe, it, expect, beforeEach } from 'vitest'
import { DeploymentManager, Deployment } from '../src/rollback'

describe('DeploymentManager', () => {
  let manager: DeploymentManager

  beforeEach(() => {
    manager = new DeploymentManager()
  })

  describe('deployment history tracking', () => {
    it('should record a new deployment', async () => {
      const deployment: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: Date.now(),
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'active',
      }

      await manager.recordDeployment(deployment)
      const history = await manager.getHistory('my-worker')

      expect(history.deployments).toHaveLength(1)
      expect(history.deployments[0]).toEqual(deployment)
    })

    it('should maintain deployment history in chronological order', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const history = await manager.getHistory('my-worker')

      expect(history.deployments).toHaveLength(2)
      expect(history.deployments[0]?.timestamp).toBeLessThan(history.deployments[1]?.timestamp ?? Infinity)
    })

    it('should return empty history for unknown worker', async () => {
      const history = await manager.getHistory('unknown-worker')
      expect(history.deployments).toHaveLength(0)
    })

    it('should track the current active deployment', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const current = await manager.getCurrentDeployment('my-worker')
      expect(current).toBeDefined()
      expect(current?.id).toBe('deploy-002')
      expect(current?.status).toBe('active')
    })
  })

  describe('rollback functionality', () => {
    it('should rollback to previous deployment version', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const result = await manager.rollback('my-worker')

      expect(result.success).toBe(true)
      expect(result.previousDeployment?.id).toBe('deploy-002')
      expect(result.newDeployment?.id).toBe('deploy-001')
    })

    it('should rollback to a specific deployment version', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'superseded',
      }

      const deployment3: Deployment = {
        id: 'deploy-003',
        version: '1.2.0',
        timestamp: 3000,
        workerName: 'my-worker',
        scriptHash: 'ghi789',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)
      await manager.recordDeployment(deployment3)

      const result = await manager.rollbackTo('my-worker', 'deploy-001')

      expect(result.success).toBe(true)
      expect(result.previousDeployment?.id).toBe('deploy-003')
      expect(result.newDeployment?.id).toBe('deploy-001')
    })

    it('should fail rollback when no previous deployment exists', async () => {
      const deployment: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'active',
      }

      await manager.recordDeployment(deployment)

      const result = await manager.rollback('my-worker')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No previous deployment available for rollback')
    })

    it('should fail rollback when target deployment does not exist', async () => {
      const deployment: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'active',
      }

      await manager.recordDeployment(deployment)

      const result = await manager.rollbackTo('my-worker', 'non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Target deployment not found: non-existent')
    })

    it('should fail rollback when worker has no deployments', async () => {
      const result = await manager.rollback('unknown-worker')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No deployments found for worker: unknown-worker')
    })

    it('should update deployment statuses after rollback', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      await manager.rollback('my-worker')

      const history = await manager.getHistory('my-worker')
      const deploy1 = history.deployments.find(d => d.id === 'deploy-001')
      const deploy2 = history.deployments.find(d => d.id === 'deploy-002')

      expect(deploy1?.status).toBe('active')
      expect(deploy2?.status).toBe('rolled-back')
    })
  })

  describe('safe rollback mechanism', () => {
    it('should validate deployment before rollback', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const canRollback = await manager.canRollback('my-worker')
      expect(canRollback).toBe(true)
    })

    it('should not allow rollback to failed deployment', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'failed',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const result = await manager.rollbackTo('my-worker', 'deploy-001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot rollback to failed deployment: deploy-001')
    })

    it('should create a rollback deployment record', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const result = await manager.rollback('my-worker')

      expect(result.rollbackDeploymentId).toBeDefined()

      const history = await manager.getHistory('my-worker')
      const rollbackDeploy = history.deployments.find(
        d => d.id === result.rollbackDeploymentId
      )
      expect(rollbackDeploy).toBeDefined()
      expect(rollbackDeploy?.rolledBackFrom).toBe('deploy-002')
    })
  })

  describe('deployment version management', () => {
    it('should get deployment by version', async () => {
      const deployment: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'active',
      }

      await manager.recordDeployment(deployment)

      const found = await manager.getDeploymentByVersion('my-worker', '1.0.0')
      expect(found).toBeDefined()
      expect(found?.id).toBe('deploy-001')
    })

    it('should get deployment by id', async () => {
      const deployment: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'active',
      }

      await manager.recordDeployment(deployment)

      const found = await manager.getDeploymentById('my-worker', 'deploy-001')
      expect(found).toBeDefined()
      expect(found?.version).toBe('1.0.0')
    })

    it('should list all versions for a worker', async () => {
      const deployment1: Deployment = {
        id: 'deploy-001',
        version: '1.0.0',
        timestamp: 1000,
        workerName: 'my-worker',
        scriptHash: 'abc123',
        status: 'superseded',
      }

      const deployment2: Deployment = {
        id: 'deploy-002',
        version: '1.1.0',
        timestamp: 2000,
        workerName: 'my-worker',
        scriptHash: 'def456',
        status: 'active',
      }

      await manager.recordDeployment(deployment1)
      await manager.recordDeployment(deployment2)

      const versions = await manager.listVersions('my-worker')
      expect(versions).toEqual(['1.0.0', '1.1.0'])
    })

    it('should limit history to configured max entries', async () => {
      const managerWithLimit = new DeploymentManager({ maxHistoryEntries: 3 })

      for (let i = 0; i < 5; i++) {
        await managerWithLimit.recordDeployment({
          id: `deploy-00${i}`,
          version: `1.${i}.0`,
          timestamp: i * 1000,
          workerName: 'my-worker',
          scriptHash: `hash${i}`,
          status: i === 4 ? 'active' : 'superseded',
        })
      }

      const history = await managerWithLimit.getHistory('my-worker')
      expect(history.deployments).toHaveLength(3)
      // Should keep the most recent 3
      expect(history.deployments.map(d => d.id)).toEqual([
        'deploy-002',
        'deploy-003',
        'deploy-004',
      ])
    })
  })
})
