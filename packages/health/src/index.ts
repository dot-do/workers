/**
 * @dotdo/health - Health check utilities for Cloudflare Workers
 *
 * Provides liveness, readiness, and dependency health probes for
 * Kubernetes-style health checks and service monitoring.
 */

/**
 * Health status values
 */
export enum HealthStatus {
  Healthy = 'healthy',
  Unhealthy = 'unhealthy',
  Degraded = 'degraded',
}

/**
 * Liveness probe response - indicates if the process is alive
 */
export interface LivenessProbe {
  status: 'healthy' | 'unhealthy'
  timestamp: number
  uptime: number
}

/**
 * Readiness probe response - indicates if the service can accept traffic
 */
export interface ReadinessProbe {
  status: 'healthy' | 'unhealthy'
  ready: boolean
  timestamp: number
  details?: Record<string, DependencyStatus>
}

/**
 * Individual dependency health status
 */
export interface DependencyStatus {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  latency?: number
}

/**
 * Aggregated health status combining all probes
 */
export interface AggregatedHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: number
  liveness: LivenessProbe
  readiness: ReadinessProbe
  dependencies: Record<string, DependencyStatus>
  version?: string
  service?: string
}

/**
 * Result type for health check operations
 */
export interface HealthCheckResult {
  success: boolean
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  latency?: number
}

/**
 * Dependency check function type
 */
export type DependencyCheckFn = () => Promise<DependencyStatus>

/**
 * Options for registering a dependency
 */
export interface DependencyOptions {
  /** Timeout in milliseconds for the check (default: 5000) */
  timeout?: number
  /** Whether this dependency is critical (affects overall health status) */
  critical?: boolean
}

/**
 * Configuration for HealthChecker
 */
export interface HealthCheckerConfig {
  /** Default timeout for all dependency checks in milliseconds */
  defaultTimeout?: number
}

interface RegisteredDependency {
  checkFn: DependencyCheckFn
  options: DependencyOptions
}

/**
 * HealthChecker - Comprehensive health checking for Cloudflare Workers
 *
 * Provides:
 * - Liveness probe: Is the process alive?
 * - Readiness probe: Can the service accept traffic?
 * - Dependency health checks: Are all dependencies healthy?
 * - Aggregated health status: Overall service health
 */
export class HealthChecker {
  private dependencies: Map<string, RegisteredDependency> = new Map()
  private startTime: number
  private defaultTimeout: number
  private version?: string
  private serviceName?: string

  constructor(config: HealthCheckerConfig = {}) {
    this.startTime = Date.now()
    this.defaultTimeout = config.defaultTimeout ?? 5000
  }

  /**
   * Get the default timeout for dependency checks
   */
  getDefaultTimeout(): number {
    return this.defaultTimeout
  }

  /**
   * Set the service version for health responses
   */
  setVersion(version: string): void {
    this.version = version
  }

  /**
   * Set the service name for health responses
   */
  setServiceName(name: string): void {
    this.serviceName = name
  }

  /**
   * Liveness probe - checks if the process is alive
   *
   * This should always return healthy unless the process is dead.
   * Use for Kubernetes liveness probes.
   */
  async liveness(): Promise<LivenessProbe> {
    return {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * Readiness probe - checks if the service can accept traffic
   *
   * Returns unhealthy if any registered dependency is unhealthy.
   * Use for Kubernetes readiness probes.
   */
  async readiness(): Promise<ReadinessProbe> {
    const timestamp = Date.now()

    if (this.dependencies.size === 0) {
      return {
        status: 'healthy',
        ready: true,
        timestamp,
      }
    }

    // Check all dependencies
    const dependencyResults = await this.checkAllDependencies()

    // Determine if any dependency is unhealthy
    const hasUnhealthy = Object.values(dependencyResults).some(
      (d) => d.status === 'unhealthy'
    )

    const status = hasUnhealthy ? 'unhealthy' : 'healthy'

    return {
      status,
      ready: !hasUnhealthy,
      timestamp,
      details: dependencyResults,
    }
  }

  /**
   * Register a dependency for health checking
   */
  registerDependency(
    name: string,
    checkFn: DependencyCheckFn,
    options: DependencyOptions = {}
  ): void {
    this.dependencies.set(name, {
      checkFn,
      options: {
        timeout: options.timeout ?? this.defaultTimeout,
        critical: options.critical ?? true,
      },
    })
  }

  /**
   * Unregister a dependency
   */
  unregisterDependency(name: string): void {
    this.dependencies.delete(name)
  }

  /**
   * Get list of registered dependency names
   */
  getDependencies(): string[] {
    return Array.from(this.dependencies.keys())
  }

  /**
   * Check a specific dependency's health
   */
  async checkDependency(name: string): Promise<DependencyStatus> {
    const dependency = this.dependencies.get(name)

    if (!dependency) {
      throw new Error(`Dependency not registered: ${name}`)
    }

    const { checkFn, options } = dependency
    const timeout = options.timeout ?? this.defaultTimeout
    const startTime = Date.now()

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<DependencyStatus>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check timeout after ${timeout}ms`))
        }, timeout)
      })

      // Race between check and timeout
      const result = await Promise.race([checkFn(), timeoutPromise])

      // Add latency to result
      return {
        ...result,
        latency: Date.now() - startTime,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'

      return {
        name,
        status: 'unhealthy',
        message: message.includes('timeout')
          ? `Health check timeout after ${timeout}ms`
          : message,
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Check all registered dependencies in parallel
   */
  private async checkAllDependencies(): Promise<Record<string, DependencyStatus>> {
    const results: Record<string, DependencyStatus> = {}
    const names = this.getDependencies()

    if (names.length === 0) {
      return results
    }

    // Run all checks in parallel
    const checks = await Promise.all(
      names.map(async (name) => {
        const result = await this.checkDependency(name)
        return { name, result }
      })
    )

    for (const { name, result } of checks) {
      results[name] = result
    }

    return results
  }

  /**
   * Aggregated health status - comprehensive health check
   *
   * Combines liveness, readiness, and all dependency checks into
   * a single response. Use for detailed health monitoring.
   */
  async health(): Promise<AggregatedHealth> {
    const [liveness, readiness, dependencies] = await Promise.all([
      this.liveness(),
      this.readiness(),
      this.checkAllDependencies(),
    ])

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    // Check for critical failures
    for (const [name, dep] of Object.entries(dependencies)) {
      const registered = this.dependencies.get(name)
      if (dep.status === 'unhealthy') {
        if (registered?.options.critical) {
          status = 'unhealthy'
          break
        } else {
          status = 'degraded'
        }
      } else if (dep.status === 'degraded' && status === 'healthy') {
        status = 'degraded'
      }
    }

    const result: AggregatedHealth = {
      status,
      timestamp: Date.now(),
      liveness,
      readiness,
      dependencies,
    }

    if (this.version) {
      result.version = this.version
    }

    if (this.serviceName) {
      result.service = this.serviceName
    }

    return result
  }

  /**
   * Generate HTTP Response for liveness probe
   */
  async livenessResponse(): Promise<Response> {
    const result = await this.liveness()
    return Response.json(result, {
      status: result.status === 'healthy' ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Generate HTTP Response for readiness probe
   */
  async readinessResponse(): Promise<Response> {
    const result = await this.readiness()
    return Response.json(result, {
      status: result.ready ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Generate HTTP Response for aggregated health
   */
  async healthResponse(): Promise<Response> {
    const result = await this.health()
    const status = result.status === 'unhealthy' ? 503 : 200
    return Response.json(result, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Re-export for backwards compatibility
export type DependencyCheck = DependencyCheckFn
