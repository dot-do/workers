/**
 * Deployment Health Checks for Cloudflare Workers
 *
 * Provides comprehensive health check capabilities for deployment workflows:
 * - Pre-deployment health validation
 * - Post-deployment health verification
 * - Rollback triggers based on health status
 * - Canary deployment health tracking
 */

/**
 * Health check status for a single check
 */
export interface HealthCheckStatus {
  healthy: boolean
  latency: number
  timestamp: Date
  error?: string
}

/**
 * Deployment health status aggregation
 */
export interface DeploymentHealthStatus {
  workerId: string
  deploymentId: string
  healthy: boolean
  consecutiveFailures: number
  consecutiveSuccesses: number
  totalChecks: number
  failedChecks: number
  averageLatency: number
  lastCheck?: HealthCheckStatus
}

/**
 * Pre-deployment check result
 */
export interface PreDeploymentCheckResult {
  canDeploy: boolean
  workerId: string
  timestamp: Date
  reason?: string
  dependencies?: Record<string, { healthy: boolean; latency: number; error?: string }>
  warnings?: string[]
}

/**
 * Post-deployment check result
 */
export interface PostDeploymentCheckResult {
  healthy: boolean
  workerId: string
  deploymentId: string
  timestamp: Date
  shouldRollback: boolean
  latencyDegraded?: boolean
  warnings?: string[]
  checksPerformed: number
  successfulChecks: number
}

/**
 * Canary health status
 */
export interface CanaryHealthStatus {
  canaryId: string
  trafficPercentage: number
  healthy: boolean
  timestamp: Date
  metrics: {
    errorRate: number
    averageLatency: number
    p95Latency: number
  }
}

/**
 * Canary comparison result
 */
export interface CanaryComparisonResult {
  errorRateDelta: number
  latencyDelta: number
  p95LatencyDelta: number
  isRegression: boolean
}

/**
 * Canary promotion evaluation result
 */
export interface CanaryPromotionResult {
  shouldPromote: boolean
  shouldAbort: boolean
  reason?: string
  metrics: {
    samples: number
    errorRate: number
    averageLatency: number
  }
}

/**
 * Traffic progression step
 */
export interface TrafficProgressionStep {
  canProgress: boolean
  currentPercentage: number
  recommendedPercentage: number
  reason?: string
}

/**
 * Rollback trigger definition
 */
export interface RollbackTrigger {
  type: 'consecutive_failures' | 'error_rate' | 'latency_degradation'
  threshold: number
  windowSize?: number
  percentile?: number
}

/**
 * Rollback decision
 */
export interface RollbackDecision {
  shouldRollback: boolean
  reason?: string
  triggeredBy?: RollbackTrigger['type']
  metrics?: {
    consecutiveFailures?: number
    errorRate?: number
    latency?: number
  }
}

/**
 * Baseline metrics for comparison
 */
export interface BaselineMetrics {
  averageLatency: number
  errorRate: number
  p95Latency: number
}

/**
 * Alert event
 */
export interface AlertEvent {
  type: 'health_degradation' | 'rollback_triggered' | 'canary_regression' | 'circuit_breaker_open'
  workerId: string
  deploymentId?: string
  timestamp: Date
  details: Record<string, unknown>
}

/**
 * Configuration for deployment health checker
 */
export interface DeploymentHealthConfig {
  healthEndpoint?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  latencyThreshold?: number
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
}

/**
 * Canary check options
 */
export interface CanaryCheckOptions {
  canaryDeploymentId: string
  trafficPercentage: number
}

/**
 * Post-deployment check options
 */
export interface PostDeploymentCheckOptions {
  retries?: number
  retryDelay?: number
}

/**
 * Pre-deployment check options
 */
export interface PreDeploymentCheckOptions {
  checkDependencies?: boolean
}

/**
 * Traffic progression options
 */
export interface TrafficProgressionOptions {
  canaryDeploymentId: string
  currentTrafficPercentage: number
  targetTrafficPercentage: number
  healthyThreshold: number
}

/**
 * Canary promotion options
 */
export interface CanaryPromotionOptions {
  minHealthySamples: number
  maxErrorRateDelta: number
  maxLatencyDelta: number
}

type HealthCheckFn = (workerId: string) => Promise<HealthCheckStatus>
type DependencyCheckFn = (workerId: string) => Promise<Record<string, { healthy: boolean; latency: number; error?: string }>>
type AlertHandler = (event: AlertEvent) => void

const DEFAULT_CONFIG: Required<DeploymentHealthConfig> = {
  healthEndpoint: '/__health',
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
  latencyThreshold: 1000,
}

/**
 * DeploymentHealthChecker - Comprehensive health checking for deployment workflows
 */
export class DeploymentHealthChecker {
  private config: Required<DeploymentHealthConfig>
  private healthCheckFn?: HealthCheckFn
  private dependencyCheckFn?: DependencyCheckFn
  private criticalDependencies: Set<string> = new Set()
  private rollbackTriggers: RollbackTrigger[] = []
  private healthHistory: Map<string, HealthCheckStatus[]> = new Map()
  private baselineLatencies: Map<string, number> = new Map()
  private baselineMetrics: Map<string, BaselineMetrics> = new Map()
  private alertHandlers: Set<AlertHandler> = new Set()
  private circuitBreakerConfig?: CircuitBreakerConfig
  private circuitBreakerState: Map<string, { failures: number; lastFailure: number; open: boolean }> = new Map()
  private trafficProgressionState: Map<string, { healthyChecks: number }> = new Map()

  constructor(config?: DeploymentHealthConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<DeploymentHealthConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<DeploymentHealthConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    }
  }

  /**
   * Set the health check function
   */
  setHealthCheckFn(fn: HealthCheckFn): void {
    this.healthCheckFn = fn
  }

  /**
   * Set the dependency check function
   */
  setDependencyCheckFn(fn: DependencyCheckFn): void {
    this.dependencyCheckFn = fn
  }

  /**
   * Set critical dependencies
   */
  setCriticalDependencies(dependencies: string[]): void {
    this.criticalDependencies = new Set(dependencies)
  }

  /**
   * Set check timeout
   */
  setCheckTimeout(timeout: number): void {
    this.config.timeout = timeout
  }

  /**
   * Set latency threshold for degradation warnings
   */
  setLatencyThreshold(threshold: number): void {
    this.config.latencyThreshold = threshold
  }

  /**
   * Set baseline latency for a worker
   */
  setBaselineLatency(workerId: string, latency: number): void {
    this.baselineLatencies.set(workerId, latency)
  }

  /**
   * Set baseline metrics for a worker
   */
  setBaselineMetrics(workerId: string, metrics: BaselineMetrics): void {
    this.baselineMetrics.set(workerId, metrics)
  }

  /**
   * Add a rollback trigger
   */
  addRollbackTrigger(trigger: RollbackTrigger): void {
    this.rollbackTriggers.push(trigger)
  }

  /**
   * Register an alert handler
   */
  onAlert(handler: AlertHandler): () => void {
    this.alertHandlers.add(handler)
    return () => {
      this.alertHandlers.delete(handler)
    }
  }

  /**
   * Enable circuit breaker for health checks
   */
  enableCircuitBreaker(config: CircuitBreakerConfig): void {
    this.circuitBreakerConfig = config
  }

  /**
   * Pre-deployment health check
   */
  async preDeploymentCheck(
    workerId: string,
    options?: PreDeploymentCheckOptions
  ): Promise<PreDeploymentCheckResult> {
    const timestamp = new Date()
    const warnings: string[] = []

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(workerId)) {
      return {
        canDeploy: false,
        workerId,
        timestamp,
        reason: 'Pre-deployment check blocked by circuit breaker',
      }
    }

    // Check worker health
    if (this.healthCheckFn) {
      try {
        const healthResult = await this.executeWithTimeout(
          () => this.healthCheckFn!(workerId),
          this.config.timeout
        )

        if (!healthResult.healthy) {
          this.recordCircuitBreakerFailure(workerId)
          return {
            canDeploy: false,
            workerId,
            timestamp,
            reason: healthResult.error || 'Service unavailable',
          }
        }
      } catch (error) {
        this.recordCircuitBreakerFailure(workerId)
        const message = error instanceof Error ? error.message : 'Unknown error'
        const reason = message.includes('timeout') ? 'Pre-deployment check timeout' : message
        return {
          canDeploy: false,
          workerId,
          timestamp,
          reason,
        }
      }
    }

    // Check dependencies if requested
    let dependencies: Record<string, { healthy: boolean; latency: number; error?: string }> | undefined

    if (options?.checkDependencies && this.dependencyCheckFn) {
      try {
        dependencies = await this.dependencyCheckFn(workerId)

        // Check for critical dependency failures
        for (const [name, status] of Object.entries(dependencies)) {
          if (!status.healthy) {
            if (this.criticalDependencies.has(name)) {
              return {
                canDeploy: false,
                workerId,
                timestamp,
                reason: `Critical dependency ${name} is unhealthy: ${status.error || 'Unknown error'}`,
                dependencies,
              }
            } else {
              // Include the dependency name directly for easy matching
              warnings.push(name)
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          canDeploy: false,
          workerId,
          timestamp,
          reason: `Failed to check dependencies: ${message}`,
        }
      }
    }

    return {
      canDeploy: true,
      workerId,
      timestamp,
      dependencies,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Post-deployment health check
   */
  async postDeploymentCheck(
    workerId: string,
    deploymentId: string,
    options?: PostDeploymentCheckOptions
  ): Promise<PostDeploymentCheckResult> {
    const retries = options?.retries ?? this.config.retries
    const retryDelay = options?.retryDelay ?? this.config.retryDelay
    const warnings: string[] = []

    let checksPerformed = 0
    let successfulChecks = 0
    // Note: lastHealthy removed as it was unused
    let latencyDegraded = false

    for (let i = 0; i < retries; i++) {
      checksPerformed++

      if (this.healthCheckFn) {
        try {
          const healthResult = await this.healthCheckFn(workerId)

          if (healthResult.healthy) {
            successfulChecks++

            // Check for latency degradation
            if (healthResult.latency > this.config.latencyThreshold) {
              latencyDegraded = true
              if (!warnings.includes('High latency detected')) {
                warnings.push('High latency detected')
              }
            }

            return {
              healthy: true,
              workerId,
              deploymentId,
              timestamp: new Date(),
              shouldRollback: false,
              latencyDegraded,
              warnings: warnings.length > 0 ? warnings : undefined,
              checksPerformed,
              successfulChecks,
            }
          }

          // Wait before retry
          if (i < retries - 1) {
            await this.sleep(retryDelay)
          }
        } catch {
          if (i < retries - 1) {
            await this.sleep(retryDelay)
          }
        }
      } else {
        // No health check function, assume healthy
        return {
          healthy: true,
          workerId,
          deploymentId,
          timestamp: new Date(),
          shouldRollback: false,
          checksPerformed,
          successfulChecks: 1,
        }
      }
    }

    // All retries exhausted
    return {
      healthy: false,
      workerId,
      deploymentId,
      timestamp: new Date(),
      shouldRollback: true,
      latencyDegraded,
      warnings: warnings.length > 0 ? warnings : undefined,
      checksPerformed,
      successfulChecks,
    }
  }

  /**
   * Record a health check result
   */
  recordHealthCheck(workerId: string, deploymentId: string, status: HealthCheckStatus): void {
    const key = `${workerId}:${deploymentId}`
    const history = this.healthHistory.get(key) ?? []
    history.push(status)

    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift()
    }

    this.healthHistory.set(key, history)

    // Update traffic progression state
    const progressionKey = key
    const progressionState = this.trafficProgressionState.get(progressionKey) ?? { healthyChecks: 0 }
    if (status.healthy) {
      progressionState.healthyChecks++
    } else {
      progressionState.healthyChecks = 0 // Reset on failure
    }
    this.trafficProgressionState.set(progressionKey, progressionState)

    // Emit alert if unhealthy
    if (!status.healthy) {
      this.emitAlert({
        type: 'health_degradation',
        workerId,
        deploymentId,
        timestamp: new Date(),
        details: {
          error: status.error,
          latency: status.latency,
        },
      })
    }
  }

  /**
   * Evaluate whether a rollback should be triggered
   */
  evaluateRollback(workerId: string, deploymentId: string): RollbackDecision {
    const key = `${workerId}:${deploymentId}`
    const history = this.healthHistory.get(key) ?? []

    if (history.length === 0) {
      return { shouldRollback: false }
    }

    for (const trigger of this.rollbackTriggers) {
      const decision = this.evaluateTrigger(trigger, history)
      if (decision.shouldRollback) {
        this.emitAlert({
          type: 'rollback_triggered',
          workerId,
          deploymentId,
          timestamp: new Date(),
          details: {
            triggeredBy: trigger.type,
            ...decision.metrics,
          },
        })
        return decision
      }
    }

    return { shouldRollback: false }
  }

  /**
   * Check canary deployment health
   */
  async checkCanaryHealth(
    workerId: string,
    options: CanaryCheckOptions
  ): Promise<CanaryHealthStatus> {
    let healthy = true
    const metrics = {
      errorRate: 0,
      averageLatency: 0,
      p95Latency: 0,
    }

    if (this.healthCheckFn) {
      try {
        const result = await this.healthCheckFn(workerId)
        healthy = result.healthy
        metrics.averageLatency = result.latency
      } catch {
        healthy = false
      }
    }

    // Calculate metrics from history
    const key = `${workerId}:${options.canaryDeploymentId}`
    const history = this.healthHistory.get(key) ?? []

    if (history.length > 0) {
      const failures = history.filter(h => !h.healthy).length
      metrics.errorRate = failures / history.length

      const latencies = history.map(h => h.latency).sort((a, b) => a - b)
      metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

      const p95Index = Math.floor(latencies.length * 0.95)
      metrics.p95Latency = latencies[p95Index] ?? latencies[latencies.length - 1] ?? 0
    }

    return {
      canaryId: options.canaryDeploymentId,
      trafficPercentage: options.trafficPercentage,
      healthy,
      timestamp: new Date(),
      metrics,
    }
  }

  /**
   * Compare canary metrics to baseline
   */
  compareCanaryToBaseline(workerId: string, canaryId: string): CanaryComparisonResult {
    const baseline = this.baselineMetrics.get(workerId) ?? {
      averageLatency: 0,
      errorRate: 0,
      p95Latency: 0,
    }

    const key = `${workerId}:${canaryId}`
    const history = this.healthHistory.get(key) ?? []

    if (history.length === 0) {
      return {
        errorRateDelta: 0,
        latencyDelta: 0,
        p95LatencyDelta: 0,
        isRegression: false,
      }
    }

    const failures = history.filter(h => !h.healthy).length
    const canaryErrorRate = failures / history.length

    const latencies = history.map(h => h.latency).sort((a, b) => a - b)
    const canaryAvgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

    const p95Index = Math.floor(latencies.length * 0.95)
    const canaryP95Latency = latencies[p95Index] ?? latencies[latencies.length - 1] ?? 0

    const errorRateDelta = canaryErrorRate - baseline.errorRate
    const latencyDelta = canaryAvgLatency - baseline.averageLatency
    const p95LatencyDelta = canaryP95Latency - baseline.p95Latency

    // Consider it a regression if error rate or latency significantly increased
    const isRegression = errorRateDelta > 0.05 || latencyDelta > 50 || p95LatencyDelta > 100

    return {
      errorRateDelta,
      latencyDelta,
      p95LatencyDelta,
      isRegression,
    }
  }

  /**
   * Evaluate whether canary should be promoted
   */
  evaluateCanaryPromotion(
    workerId: string,
    canaryId: string,
    options: CanaryPromotionOptions
  ): CanaryPromotionResult {
    const key = `${workerId}:${canaryId}`
    const history = this.healthHistory.get(key) ?? []

    if (history.length < options.minHealthySamples) {
      return {
        shouldPromote: false,
        shouldAbort: false,
        reason: `Not enough samples (${history.length}/${options.minHealthySamples})`,
        metrics: {
          samples: history.length,
          errorRate: 0,
          averageLatency: 0,
        },
      }
    }

    const comparison = this.compareCanaryToBaseline(workerId, canaryId)

    const failures = history.filter(h => !h.healthy).length
    const errorRate = failures / history.length
    const latencies = history.map(h => h.latency)
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

    const metrics = {
      samples: history.length,
      errorRate,
      averageLatency,
    }

    // Check for significant regression
    if (comparison.errorRateDelta > options.maxErrorRateDelta) {
      return {
        shouldPromote: false,
        shouldAbort: true,
        reason: `Error rate delta ${(comparison.errorRateDelta * 100).toFixed(1)}% exceeds threshold ${(options.maxErrorRateDelta * 100).toFixed(1)}%`,
        metrics,
      }
    }

    if (comparison.latencyDelta > options.maxLatencyDelta) {
      return {
        shouldPromote: false,
        shouldAbort: true,
        reason: `Latency delta ${comparison.latencyDelta.toFixed(0)}ms exceeds threshold ${options.maxLatencyDelta}ms`,
        metrics,
      }
    }

    // All checks passed
    return {
      shouldPromote: true,
      shouldAbort: false,
      metrics,
    }
  }

  /**
   * Calculate traffic progression for canary
   */
  async calculateTrafficProgression(
    workerId: string,
    options: TrafficProgressionOptions
  ): Promise<TrafficProgressionStep> {
    // This sets up the progression state
    const key = `${workerId}:${options.canaryDeploymentId}`
    if (!this.trafficProgressionState.has(key)) {
      this.trafficProgressionState.set(key, { healthyChecks: 0 })
    }

    return {
      canProgress: false, // Will be updated by getNextTrafficStep
      currentPercentage: options.currentTrafficPercentage,
      recommendedPercentage: options.currentTrafficPercentage,
    }
  }

  /**
   * Get next traffic step based on health
   */
  getNextTrafficStep(workerId: string, canaryId: string): TrafficProgressionStep {
    const key = `${workerId}:${canaryId}`
    const history = this.healthHistory.get(key) ?? []
    const progressionState = this.trafficProgressionState.get(key) ?? { healthyChecks: 0 }

    // If latest check was unhealthy, don't progress
    const latestCheck = history[history.length - 1]
    if (latestCheck && !latestCheck.healthy) {
      return {
        canProgress: false,
        currentPercentage: 10, // Assume starting at 10%
        recommendedPercentage: 10,
        reason: 'Latest health check was unhealthy',
      }
    }

    // If we have enough healthy checks, allow progression
    if (progressionState.healthyChecks >= 5) {
      return {
        canProgress: true,
        currentPercentage: 10,
        recommendedPercentage: 25, // Step up to 25%
      }
    }

    return {
      canProgress: false,
      currentPercentage: 10,
      recommendedPercentage: 10,
      reason: `Need ${5 - progressionState.healthyChecks} more healthy checks`,
    }
  }

  /**
   * Get aggregated health status across all tracked workers
   */
  getAggregatedStatus(): {
    totalWorkers: number
    healthyWorkers: number
    unhealthyWorkers: number
    overallHealth: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const workerStatuses = new Map<string, boolean>()

    // Get latest status for each worker
    for (const [key, history] of this.healthHistory.entries()) {
      const workerId = key.split(':')[0]
      const latestCheck = history[history.length - 1]

      if (workerId && latestCheck) {
        // If any deployment for this worker is unhealthy, mark worker as unhealthy
        const currentStatus = workerStatuses.get(workerId)
        if (currentStatus === undefined || !latestCheck.healthy) {
          workerStatuses.set(workerId, latestCheck.healthy)
        }
      }
    }

    const totalWorkers = workerStatuses.size
    const healthyWorkers = Array.from(workerStatuses.values()).filter(h => h).length
    const unhealthyWorkers = totalWorkers - healthyWorkers

    let overallHealth: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyWorkers === 0) {
      overallHealth = 'healthy'
    } else if (unhealthyWorkers === totalWorkers) {
      overallHealth = 'unhealthy'
    } else {
      overallHealth = 'degraded'
    }

    return {
      totalWorkers,
      healthyWorkers,
      unhealthyWorkers,
      overallHealth,
    }
  }

  /**
   * Helper: Evaluate a single rollback trigger
   */
  private evaluateTrigger(trigger: RollbackTrigger, history: HealthCheckStatus[]): RollbackDecision {
    switch (trigger.type) {
      case 'consecutive_failures': {
        let consecutiveFailures = 0
        // Count from the end
        for (let i = history.length - 1; i >= 0; i--) {
          const check = history[i]
          if (check && !check.healthy) {
            consecutiveFailures++
          } else {
            break
          }
        }

        if (consecutiveFailures >= trigger.threshold) {
          return {
            shouldRollback: true,
            reason: `${consecutiveFailures} consecutive failures exceeded threshold of ${trigger.threshold}`,
            triggeredBy: 'consecutive_failures',
            metrics: { consecutiveFailures },
          }
        }
        break
      }

      case 'error_rate': {
        const windowSize = trigger.windowSize ?? history.length
        const window = history.slice(-windowSize)
        const failures = window.filter(h => !h.healthy).length
        const errorRate = failures / window.length

        if (errorRate > trigger.threshold) {
          return {
            shouldRollback: true,
            reason: `error rate ${(errorRate * 100).toFixed(1)}% exceeded threshold of ${(trigger.threshold * 100).toFixed(1)}%`,
            triggeredBy: 'error_rate',
            metrics: { errorRate },
          }
        }
        break
      }

      case 'latency_degradation': {
        const latencies = history.map(h => h.latency).sort((a, b) => a - b)
        const percentile = trigger.percentile ?? 95
        const index = Math.floor(latencies.length * (percentile / 100))
        const latencyValue = latencies[index] ?? latencies[latencies.length - 1] ?? 0

        if (latencyValue > trigger.threshold) {
          return {
            shouldRollback: true,
            reason: `P${percentile} latency ${latencyValue}ms exceeded threshold of ${trigger.threshold}ms`,
            triggeredBy: 'latency_degradation',
            metrics: { latency: latencyValue },
          }
        }
        break
      }
    }

    return { shouldRollback: false }
  }

  /**
   * Helper: Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let isResolved = false

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          reject(new Error(`Operation timeout after ${timeout}ms`))
        }
      }, timeout)

      fn()
        .then(result => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            resolve(result)
          }
        })
        .catch(error => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            reject(error)
          }
        })
    })
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Helper: Check if circuit breaker is open for a worker
   */
  private isCircuitBreakerOpen(workerId: string): boolean {
    if (!this.circuitBreakerConfig) {
      return false
    }

    const state = this.circuitBreakerState.get(workerId)
    if (!state) {
      return false
    }

    if (!state.open) {
      return false
    }

    // Check if reset timeout has elapsed
    const elapsed = Date.now() - state.lastFailure
    if (elapsed >= this.circuitBreakerConfig.resetTimeout) {
      // Half-open state - allow one request
      state.open = false
      state.failures = 0
      return false
    }

    return true
  }

  /**
   * Helper: Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(workerId: string): void {
    if (!this.circuitBreakerConfig) {
      return
    }

    const state = this.circuitBreakerState.get(workerId) ?? {
      failures: 0,
      lastFailure: 0,
      open: false,
    }

    state.failures++
    state.lastFailure = Date.now()

    if (state.failures >= this.circuitBreakerConfig.failureThreshold) {
      state.open = true
      this.emitAlert({
        type: 'circuit_breaker_open',
        workerId,
        timestamp: new Date(),
        details: {
          failures: state.failures,
          threshold: this.circuitBreakerConfig.failureThreshold,
        },
      })
    }

    this.circuitBreakerState.set(workerId, state)
  }

  /**
   * Helper: Emit alert to all handlers
   */
  private emitAlert(event: AlertEvent): void {
    for (const handler of this.alertHandlers) {
      try {
        handler(event)
      } catch {
        // Ignore handler errors
      }
    }
  }
}
