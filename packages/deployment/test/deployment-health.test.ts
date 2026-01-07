import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DeploymentHealthChecker,
  DeploymentHealthConfig,
  RollbackTrigger,
} from '../src/deployment-health'

describe('DeploymentHealthChecker', () => {
  let healthChecker: DeploymentHealthChecker

  beforeEach(() => {
    healthChecker = new DeploymentHealthChecker()
  })

  describe('Pre-deployment Health Validation', () => {
    it('should validate worker health before deployment', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.preDeploymentCheck('my-worker')

      expect(result.canDeploy).toBe(true)
      expect(result.workerId).toBe('my-worker')
      expect(result.timestamp).toBeDefined()
    })

    it('should prevent deployment when pre-check fails', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
        error: 'Service unavailable',
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.preDeploymentCheck('my-worker')

      expect(result.canDeploy).toBe(false)
      expect(result.reason).toContain('unavailable')
    })

    it('should validate dependencies before deployment', async () => {
      const mockDependencyCheck = vi.fn().mockResolvedValue({
        'database': { healthy: true, latency: 10 },
        'cache': { healthy: true, latency: 5 },
      })

      healthChecker.setDependencyCheckFn(mockDependencyCheck)

      const result = await healthChecker.preDeploymentCheck('my-worker', {
        checkDependencies: true,
      })

      expect(result.canDeploy).toBe(true)
      expect(result.dependencies).toBeDefined()
    })

    it('should prevent deployment when critical dependency is unhealthy', async () => {
      const mockDependencyCheck = vi.fn().mockResolvedValue({
        'database': { healthy: false, latency: 0, error: 'Connection refused' },
        'cache': { healthy: true, latency: 5 },
      })

      healthChecker.setDependencyCheckFn(mockDependencyCheck)
      healthChecker.setCriticalDependencies(['database'])

      const result = await healthChecker.preDeploymentCheck('my-worker', {
        checkDependencies: true,
      })

      expect(result.canDeploy).toBe(false)
      expect(result.reason).toContain('database')
    })

    it('should allow deployment when non-critical dependency fails', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      const mockDependencyCheck = vi.fn().mockResolvedValue({
        'database': { healthy: true, latency: 10 },
        'analytics': { healthy: false, latency: 0, error: 'Timeout' },
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)
      healthChecker.setDependencyCheckFn(mockDependencyCheck)
      healthChecker.setCriticalDependencies(['database'])

      const result = await healthChecker.preDeploymentCheck('my-worker', {
        checkDependencies: true,
      })

      expect(result.canDeploy).toBe(true)
      expect(result.warnings).toContain('analytics')
    })

    it('should timeout pre-deployment checks', async () => {
      const slowCheck = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      )

      healthChecker.setHealthCheckFn(slowCheck)
      healthChecker.setCheckTimeout(100)

      const result = await healthChecker.preDeploymentCheck('my-worker')

      expect(result.canDeploy).toBe(false)
      expect(result.reason).toContain('timeout')
    })
  })

  describe('Post-deployment Health Verification', () => {
    it('should verify worker health after deployment', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 30,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.postDeploymentCheck('my-worker', 'deploy-001')

      expect(result.healthy).toBe(true)
      expect(result.workerId).toBe('my-worker')
      expect(result.deploymentId).toBe('deploy-001')
    })

    it('should detect unhealthy deployment', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
        error: 'Internal server error',
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.postDeploymentCheck('my-worker', 'deploy-001')

      expect(result.healthy).toBe(false)
      expect(result.shouldRollback).toBe(true)
    })

    it('should perform multiple health checks with configurable retries', async () => {
      let callCount = 0
      const mockHealthCheck = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          return { healthy: false, latency: 1000, timestamp: new Date() }
        }
        return { healthy: true, latency: 50, timestamp: new Date() }
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.postDeploymentCheck('my-worker', 'deploy-001', {
        retries: 5,
        retryDelay: 10,
      })

      expect(result.healthy).toBe(true)
      expect(mockHealthCheck).toHaveBeenCalledTimes(3)
    })

    it('should trigger rollback after exhausting retries', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.postDeploymentCheck('my-worker', 'deploy-001', {
        retries: 3,
        retryDelay: 10,
      })

      expect(result.healthy).toBe(false)
      expect(result.shouldRollback).toBe(true)
      expect(mockHealthCheck).toHaveBeenCalledTimes(3)
    })

    it('should track latency degradation after deployment', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 500, // High latency
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)
      healthChecker.setLatencyThreshold(100)

      const result = await healthChecker.postDeploymentCheck('my-worker', 'deploy-001')

      expect(result.healthy).toBe(true)
      expect(result.latencyDegraded).toBe(true)
      expect(result.warnings).toContain('High latency detected')
    })
  })

  describe('Rollback Triggers', () => {
    it('should trigger rollback on consecutive failures', async () => {
      const trigger: RollbackTrigger = {
        type: 'consecutive_failures',
        threshold: 3,
      }

      healthChecker.addRollbackTrigger(trigger)

      // Simulate consecutive failures
      for (let i = 0; i < 3; i++) {
        healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
          healthy: false,
          latency: 1000,
          timestamp: new Date(),
        })
      }

      const decision = healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(decision.shouldRollback).toBe(true)
      expect(decision.reason).toContain('consecutive failures')
    })

    it('should trigger rollback on error rate threshold', async () => {
      const trigger: RollbackTrigger = {
        type: 'error_rate',
        threshold: 0.5, // 50% error rate
        windowSize: 10,
      }

      healthChecker.addRollbackTrigger(trigger)

      // Simulate 6 failures out of 10 (60% error rate)
      for (let i = 0; i < 10; i++) {
        healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
          healthy: i >= 6, // First 6 are failures
          latency: 100,
          timestamp: new Date(),
        })
      }

      const decision = healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(decision.shouldRollback).toBe(true)
      expect(decision.reason).toContain('error rate')
    })

    it('should trigger rollback on latency degradation', async () => {
      const trigger: RollbackTrigger = {
        type: 'latency_degradation',
        threshold: 200, // 200ms threshold
        percentile: 95,
      }

      healthChecker.addRollbackTrigger(trigger)

      // Record baseline latency
      healthChecker.setBaselineLatency('my-worker', 50)

      // Simulate high latency checks
      for (let i = 0; i < 10; i++) {
        healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
          healthy: true,
          latency: 300 + i * 10, // All above threshold
          timestamp: new Date(),
        })
      }

      const decision = healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(decision.shouldRollback).toBe(true)
      expect(decision.reason).toContain('latency')
    })

    it('should not trigger rollback when within thresholds', async () => {
      const trigger: RollbackTrigger = {
        type: 'consecutive_failures',
        threshold: 5,
      }

      healthChecker.addRollbackTrigger(trigger)

      // Simulate 2 failures (below threshold)
      for (let i = 0; i < 2; i++) {
        healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
          healthy: false,
          latency: 1000,
          timestamp: new Date(),
        })
      }
      // Then a success (resets counter)
      healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      const decision = healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(decision.shouldRollback).toBe(false)
    })

    it('should support multiple rollback triggers', async () => {
      healthChecker.addRollbackTrigger({
        type: 'consecutive_failures',
        threshold: 10,
      })
      healthChecker.addRollbackTrigger({
        type: 'error_rate',
        threshold: 0.3,
        windowSize: 5,
      })

      // Only 3 consecutive failures (below consecutive threshold)
      // But 3/5 = 60% error rate (above error rate threshold)
      for (let i = 0; i < 5; i++) {
        healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
          healthy: i >= 3, // First 3 are failures
          latency: 100,
          timestamp: new Date(),
        })
      }

      const decision = healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(decision.shouldRollback).toBe(true)
      expect(decision.triggeredBy).toBe('error_rate')
    })
  })

  describe('Canary Deployment Health Tracking', () => {
    it('should track canary deployment health separately', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      const result = await healthChecker.checkCanaryHealth('my-worker', {
        canaryDeploymentId: 'canary-001',
        trafficPercentage: 10,
      })

      expect(result.canaryId).toBe('canary-001')
      expect(result.trafficPercentage).toBe(10)
      expect(result.healthy).toBe(true)
    })

    it('should compare canary health with baseline', async () => {
      // Set up baseline health metrics
      healthChecker.setBaselineMetrics('my-worker', {
        averageLatency: 50,
        errorRate: 0.01,
        p95Latency: 100,
      })

      // Record canary health checks with worse metrics
      for (let i = 0; i < 10; i++) {
        healthChecker.recordHealthCheck('my-worker', 'canary-001', {
          healthy: i < 8, // 20% error rate
          latency: 150, // Higher than baseline
          timestamp: new Date(),
        })
      }

      const comparison = healthChecker.compareCanaryToBaseline('my-worker', 'canary-001')

      expect(comparison.errorRateDelta).toBeGreaterThan(0)
      expect(comparison.latencyDelta).toBeGreaterThan(0)
      expect(comparison.isRegression).toBe(true)
    })

    it('should recommend promotion when canary is healthy', async () => {
      healthChecker.setBaselineMetrics('my-worker', {
        averageLatency: 50,
        errorRate: 0.05,
        p95Latency: 100,
      })

      // Record canary health checks with similar or better metrics
      for (let i = 0; i < 10; i++) {
        healthChecker.recordHealthCheck('my-worker', 'canary-001', {
          healthy: true,
          latency: 45, // Better than baseline
          timestamp: new Date(),
        })
      }

      const result = healthChecker.evaluateCanaryPromotion('my-worker', 'canary-001', {
        minHealthySamples: 10,
        maxErrorRateDelta: 0.01,
        maxLatencyDelta: 20,
      })

      expect(result.shouldPromote).toBe(true)
    })

    it('should recommend abort when canary shows regression', async () => {
      healthChecker.setBaselineMetrics('my-worker', {
        averageLatency: 50,
        errorRate: 0.01,
        p95Latency: 100,
      })

      // Record canary health checks with worse metrics
      for (let i = 0; i < 10; i++) {
        healthChecker.recordHealthCheck('my-worker', 'canary-001', {
          healthy: i < 7, // 30% error rate (significant regression)
          latency: 200, // Much higher latency
          timestamp: new Date(),
        })
      }

      const result = healthChecker.evaluateCanaryPromotion('my-worker', 'canary-001', {
        minHealthySamples: 5,
        maxErrorRateDelta: 0.05,
        maxLatencyDelta: 50,
      })

      expect(result.shouldPromote).toBe(false)
      expect(result.shouldAbort).toBe(true)
      expect(result.reason).toBeDefined()
    })

    it('should support progressive traffic increase based on health', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      // Initialize traffic progression (setup internal state)
      await healthChecker.calculateTrafficProgression('my-worker', {
        canaryDeploymentId: 'canary-001',
        currentTrafficPercentage: 10,
        targetTrafficPercentage: 100,
        healthyThreshold: 5,
      })

      // Should record enough healthy checks
      for (let i = 0; i < 5; i++) {
        healthChecker.recordHealthCheck('my-worker', 'canary-001', {
          healthy: true,
          latency: 50,
          timestamp: new Date(),
        })
      }

      const nextStep = healthChecker.getNextTrafficStep('my-worker', 'canary-001')

      expect(nextStep.canProgress).toBe(true)
      expect(nextStep.recommendedPercentage).toBeGreaterThan(10)
    })

    it('should halt traffic progression when health degrades', async () => {
      healthChecker.recordHealthCheck('my-worker', 'canary-001', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })

      const nextStep = healthChecker.getNextTrafficStep('my-worker', 'canary-001')

      expect(nextStep.canProgress).toBe(false)
      expect(nextStep.reason).toContain('unhealthy')
    })
  })

  describe('Health Check Configuration', () => {
    it('should support configurable health endpoints', () => {
      const config: DeploymentHealthConfig = {
        healthEndpoint: '/__custom-health',
        timeout: 3000,
        retries: 5,
      }

      const checker = new DeploymentHealthChecker(config)

      expect(checker.getConfig().healthEndpoint).toBe('/__custom-health')
      expect(checker.getConfig().timeout).toBe(3000)
    })

    it('should use default configuration when not provided', () => {
      const checker = new DeploymentHealthChecker()
      const config = checker.getConfig()

      expect(config.healthEndpoint).toBe('/__health')
      expect(config.timeout).toBe(5000)
      expect(config.retries).toBe(3)
    })

    it('should allow updating configuration at runtime', () => {
      healthChecker.updateConfig({
        timeout: 10000,
      })

      expect(healthChecker.getConfig().timeout).toBe(10000)
    })
  })

  describe('Alerting Integration', () => {
    it('should emit alerts when health degrades', async () => {
      const alertHandler = vi.fn()
      healthChecker.onAlert(alertHandler)

      healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
        error: 'Service unavailable',
      })

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'health_degradation',
          workerId: 'my-worker',
          deploymentId: 'deploy-001',
        })
      )
    })

    it('should emit alert when rollback is triggered', () => {
      const alertHandler = vi.fn()
      healthChecker.onAlert(alertHandler)

      healthChecker.addRollbackTrigger({
        type: 'consecutive_failures',
        threshold: 1,
      })

      healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })

      healthChecker.evaluateRollback('my-worker', 'deploy-001')

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rollback_triggered',
          workerId: 'my-worker',
        })
      )
    })

    it('should support multiple alert handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      healthChecker.onAlert(handler1)
      healthChecker.onAlert(handler2)

      healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should allow removing alert handlers', () => {
      const handler = vi.fn()
      const unsubscribe = healthChecker.onAlert(handler)

      unsubscribe()

      healthChecker.recordHealthCheck('my-worker', 'deploy-001', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should integrate with circuit breaker for health checks', async () => {
      let callCount = 0
      const flakyHealthCheck = vi.fn().mockImplementation(async () => {
        callCount++
        // Fail on first 3 calls (callCount 1, 2, 3)
        if (callCount <= 3) {
          throw new Error('Connection refused')
        }
        return { healthy: true, latency: 50, timestamp: new Date() }
      })

      healthChecker.setHealthCheckFn(flakyHealthCheck)
      healthChecker.enableCircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 100,
      })

      // First 3 calls fail, circuit opens on third failure
      for (let i = 0; i < 3; i++) {
        await healthChecker.preDeploymentCheck('my-worker')
      }

      // Circuit should be open, subsequent calls should fail fast
      const result = await healthChecker.preDeploymentCheck('my-worker')
      expect(result.canDeploy).toBe(false)
      expect(result.reason).toContain('circuit breaker')
    })
  })

  describe('Health Status Aggregation', () => {
    it('should aggregate health status across multiple workers', async () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })

      healthChecker.setHealthCheckFn(mockHealthCheck)

      healthChecker.recordHealthCheck('worker-1', 'deploy-001', {
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })
      healthChecker.recordHealthCheck('worker-2', 'deploy-002', {
        healthy: false,
        latency: 5000,
        timestamp: new Date(),
      })
      healthChecker.recordHealthCheck('worker-3', 'deploy-003', {
        healthy: true,
        latency: 60,
        timestamp: new Date(),
      })

      const status = healthChecker.getAggregatedStatus()

      expect(status.totalWorkers).toBe(3)
      expect(status.healthyWorkers).toBe(2)
      expect(status.unhealthyWorkers).toBe(1)
      expect(status.overallHealth).toBe('degraded')
    })

    it('should return healthy when all workers are healthy', () => {
      healthChecker.recordHealthCheck('worker-1', 'deploy-001', {
        healthy: true,
        latency: 50,
        timestamp: new Date(),
      })
      healthChecker.recordHealthCheck('worker-2', 'deploy-002', {
        healthy: true,
        latency: 60,
        timestamp: new Date(),
      })

      const status = healthChecker.getAggregatedStatus()

      expect(status.overallHealth).toBe('healthy')
    })
  })
})
