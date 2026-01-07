import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  HealthChecker,
  HealthStatus,
  LivenessProbe,
  ReadinessProbe,
  DependencyCheck,
  AggregatedHealth,
  HealthCheckResult,
  DependencyStatus,
} from '../src/index'

describe('HealthChecker', () => {
  let healthChecker: HealthChecker

  beforeEach(() => {
    healthChecker = new HealthChecker()
  })

  describe('Liveness Probe', () => {
    it('should return healthy status when process is alive', async () => {
      const result = await healthChecker.liveness()

      expect(result.status).toBe('healthy')
      expect(result.timestamp).toBeDefined()
      expect(typeof result.timestamp).toBe('number')
    })

    it('should include uptime in liveness response', async () => {
      const result = await healthChecker.liveness()

      expect(result.uptime).toBeDefined()
      expect(typeof result.uptime).toBe('number')
      expect(result.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should have correct LivenessProbe structure', async () => {
      const result: LivenessProbe = await healthChecker.liveness()

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('uptime')
    })
  })

  describe('Readiness Probe', () => {
    it('should return healthy status when all dependencies are ready', async () => {
      const result = await healthChecker.readiness()

      expect(result.status).toBe('healthy')
      expect(result.ready).toBe(true)
    })

    it('should return unhealthy status when dependencies are not ready', async () => {
      // Register a dependency that is not ready
      healthChecker.registerDependency('database', async () => ({
        name: 'database',
        status: 'unhealthy',
        message: 'Connection refused',
      }))

      const result = await healthChecker.readiness()

      expect(result.status).toBe('unhealthy')
      expect(result.ready).toBe(false)
    })

    it('should include details about failed dependencies', async () => {
      healthChecker.registerDependency('cache', async () => ({
        name: 'cache',
        status: 'unhealthy',
        message: 'Redis not available',
      }))

      const result = await healthChecker.readiness()

      expect(result.details).toBeDefined()
      expect(result.details).toHaveProperty('cache')
      expect(result.details?.cache?.status).toBe('unhealthy')
    })

    it('should have correct ReadinessProbe structure', async () => {
      const result: ReadinessProbe = await healthChecker.readiness()

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('ready')
      expect(result).toHaveProperty('timestamp')
    })
  })

  describe('Dependency Health Checks', () => {
    it('should allow registering custom dependency checks', () => {
      const checkFn = vi.fn()
      healthChecker.registerDependency('custom-service', checkFn)

      expect(healthChecker.getDependencies()).toContain('custom-service')
    })

    it('should execute registered dependency check', async () => {
      const checkFn = vi.fn().mockResolvedValue({
        name: 'api',
        status: 'healthy',
        latency: 50,
      })

      healthChecker.registerDependency('api', checkFn)
      const result = await healthChecker.checkDependency('api')

      expect(checkFn).toHaveBeenCalled()
      expect(result.name).toBe('api')
      expect(result.status).toBe('healthy')
    })

    it('should handle dependency check timeout', async () => {
      const slowCheck = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      )

      healthChecker.registerDependency('slow-service', slowCheck, { timeout: 100 })
      const result = await healthChecker.checkDependency('slow-service')

      expect(result.status).toBe('unhealthy')
      expect(result.message).toContain('timeout')
    })

    it('should handle dependency check errors gracefully', async () => {
      const failingCheck = vi.fn().mockRejectedValue(new Error('Connection failed'))

      healthChecker.registerDependency('failing-service', failingCheck)
      const result = await healthChecker.checkDependency('failing-service')

      expect(result.status).toBe('unhealthy')
      expect(result.message).toContain('Connection failed')
    })

    it('should allow unregistering dependencies', () => {
      healthChecker.registerDependency('temp-service', vi.fn())
      expect(healthChecker.getDependencies()).toContain('temp-service')

      healthChecker.unregisterDependency('temp-service')
      expect(healthChecker.getDependencies()).not.toContain('temp-service')
    })

    it('should return degraded status for partial failures', async () => {
      healthChecker.registerDependency('service-a', async () => ({
        name: 'service-a',
        status: 'healthy',
      }))
      healthChecker.registerDependency('service-b', async () => ({
        name: 'service-b',
        status: 'degraded',
        message: 'High latency',
      }))

      const result = await healthChecker.checkDependency('service-b')
      expect(result.status).toBe('degraded')
    })

    it('should include latency in dependency check results', async () => {
      healthChecker.registerDependency('fast-service', async () => ({
        name: 'fast-service',
        status: 'healthy',
      }))

      const result = await healthChecker.checkDependency('fast-service')
      expect(result.latency).toBeDefined()
      expect(typeof result.latency).toBe('number')
    })

    it('should throw error when checking unregistered dependency', async () => {
      await expect(healthChecker.checkDependency('nonexistent'))
        .rejects.toThrow('Dependency not registered: nonexistent')
    })
  })

  describe('Aggregated Health Status', () => {
    it('should return comprehensive health status', async () => {
      const result = await healthChecker.health()

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('liveness')
      expect(result).toHaveProperty('readiness')
      expect(result).toHaveProperty('dependencies')
    })

    it('should aggregate all dependency statuses', async () => {
      healthChecker.registerDependency('db', async () => ({
        name: 'db',
        status: 'healthy',
      }))
      healthChecker.registerDependency('cache', async () => ({
        name: 'cache',
        status: 'healthy',
      }))

      const result = await healthChecker.health()

      expect(result.dependencies).toHaveProperty('db')
      expect(result.dependencies).toHaveProperty('cache')
      expect(result.status).toBe('healthy')
    })

    it('should return unhealthy when any critical dependency fails', async () => {
      healthChecker.registerDependency('db', async () => ({
        name: 'db',
        status: 'unhealthy',
        message: 'Database connection failed',
      }), { critical: true })

      const result = await healthChecker.health()

      expect(result.status).toBe('unhealthy')
    })

    it('should return degraded when non-critical dependency fails', async () => {
      healthChecker.registerDependency('analytics', async () => ({
        name: 'analytics',
        status: 'unhealthy',
        message: 'Analytics service unavailable',
      }), { critical: false })

      const result = await healthChecker.health()

      expect(result.status).toBe('degraded')
    })

    it('should include version information', async () => {
      healthChecker.setVersion('1.0.0')
      const result = await healthChecker.health()

      expect(result.version).toBe('1.0.0')
    })

    it('should include service name', async () => {
      healthChecker.setServiceName('my-worker')
      const result = await healthChecker.health()

      expect(result.service).toBe('my-worker')
    })

    it('should run all dependency checks in parallel', async () => {
      const startTimes: number[] = []
      const endTimes: number[] = []

      const createSlowCheck = (delay: number) => async () => {
        startTimes.push(Date.now())
        await new Promise((resolve) => setTimeout(resolve, delay))
        endTimes.push(Date.now())
        return { name: `check-${delay}`, status: 'healthy' as const }
      }

      healthChecker.registerDependency('check-50', createSlowCheck(50))
      healthChecker.registerDependency('check-100', createSlowCheck(100))

      const start = Date.now()
      await healthChecker.health()
      const duration = Date.now() - start

      // If running in parallel, total time should be close to longest check (~100ms)
      // If sequential, would be ~150ms
      expect(duration).toBeLessThan(140)
    })
  })

  describe('HTTP Response Helpers', () => {
    it('should generate correct HTTP response for liveness', async () => {
      const response = await healthChecker.livenessResponse()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('healthy')
    })

    it('should generate correct HTTP response for readiness', async () => {
      const response = await healthChecker.readinessResponse()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.ready).toBe(true)
    })

    it('should return 503 when service is not ready', async () => {
      healthChecker.registerDependency('db', async () => ({
        name: 'db',
        status: 'unhealthy',
      }))

      const response = await healthChecker.readinessResponse()

      expect(response.status).toBe(503)
    })

    it('should generate correct HTTP response for aggregated health', async () => {
      const response = await healthChecker.healthResponse()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('liveness')
      expect(body).toHaveProperty('readiness')
    })

    it('should return 503 for unhealthy aggregated status', async () => {
      healthChecker.registerDependency('critical-db', async () => ({
        name: 'critical-db',
        status: 'unhealthy',
      }), { critical: true })

      const response = await healthChecker.healthResponse()

      expect(response.status).toBe(503)
    })

    it('should return 200 for degraded status', async () => {
      healthChecker.registerDependency('non-critical', async () => ({
        name: 'non-critical',
        status: 'unhealthy',
      }), { critical: false })

      const response = await healthChecker.healthResponse()

      expect(response.status).toBe(200)
    })
  })

  describe('Configuration', () => {
    it('should allow setting default timeout for all checks', () => {
      const checker = new HealthChecker({ defaultTimeout: 5000 })
      expect(checker.getDefaultTimeout()).toBe(5000)
    })

    it('should allow overriding timeout per dependency', async () => {
      const slowCheck = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      )

      healthChecker.registerDependency('slow', slowCheck, { timeout: 50 })
      const result = await healthChecker.checkDependency('slow')

      expect(result.status).toBe('unhealthy')
      expect(result.message).toContain('timeout')
    })
  })
})

describe('HealthStatus enum', () => {
  it('should have correct status values', () => {
    expect(HealthStatus.Healthy).toBe('healthy')
    expect(HealthStatus.Unhealthy).toBe('unhealthy')
    expect(HealthStatus.Degraded).toBe('degraded')
  })
})

describe('Type exports', () => {
  it('should export all required types', () => {
    // This test verifies type exports compile correctly
    const _liveness: LivenessProbe = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: 1000,
    }

    const _readiness: ReadinessProbe = {
      status: 'healthy',
      ready: true,
      timestamp: Date.now(),
    }

    const _dependency: DependencyStatus = {
      name: 'test',
      status: 'healthy',
    }

    const _aggregated: AggregatedHealth = {
      status: 'healthy',
      timestamp: Date.now(),
      liveness: _liveness,
      readiness: _readiness,
      dependencies: { test: _dependency },
    }

    expect(_liveness).toBeDefined()
    expect(_readiness).toBeDefined()
    expect(_dependency).toBeDefined()
    expect(_aggregated).toBeDefined()
  })
})
