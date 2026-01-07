/**
 * Error Boundary Implementation
 *
 * Provides error isolation and graceful degradation for DO operations.
 * Implements the contract defined in error-boundary.test.ts
 *
 * Features:
 * - Named boundaries for debugging and metrics
 * - Configurable fallback behavior
 * - Error isolation to prevent cascading failures
 * - Error context preservation for debugging
 * - Retry mechanism for transient failures
 * - Metrics tracking
 *
 * @see workers-kupw.8 - GREEN: Implement error boundary pattern
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Error context for debugging
 */
export interface ErrorContext {
  /** The boundary name where error occurred */
  boundaryName: string
  /** Timestamp when error occurred */
  timestamp: number
  /** Request that caused the error (if applicable) */
  request?: Request
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Stack trace */
  stack?: string
  /** Operation being performed */
  operation?: string
}

/**
 * Error boundary configuration options
 */
export interface ErrorBoundaryOptions {
  /** Human-readable name for the boundary (debugging/metrics) */
  name: string
  /** Fallback function to execute when an error occurs */
  fallback: (error: Error, context?: ErrorContext) => Response | Promise<Response>
  /** Optional error handler for logging/metrics */
  onError?: (error: Error, context?: ErrorContext) => void | Promise<void>
  /** Whether to rethrow the error after handling */
  rethrow?: boolean
  /** Maximum retries before falling back */
  maxRetries?: number
  /** Retry delay in ms */
  retryDelay?: number
}

/**
 * Error boundary metrics
 */
export interface ErrorBoundaryMetrics {
  /** Total number of errors caught */
  errorCount: number
  /** Number of fallback invocations */
  fallbackCount: number
  /** Number of successful recoveries */
  recoveryCount: number
  /** Last error timestamp */
  lastErrorAt?: number
  /** Error rate (errors per minute) */
  errorRate: number
}

/**
 * Error boundary interface
 */
export interface IErrorBoundary {
  /** The boundary name */
  readonly name: string
  /** Wrap an async operation with error handling */
  wrap<T>(fn: () => Promise<T>, context?: Partial<ErrorContext>): Promise<T>
  /** Get metrics for this boundary */
  getMetrics(): ErrorBoundaryMetrics
  /** Reset metrics */
  resetMetrics(): void
  /** Check if boundary is in error state */
  isInErrorState(): boolean
  /** Clear error state */
  clearErrorState(): void
}

// ============================================================================
// ErrorBoundary Implementation
// ============================================================================

/**
 * ErrorBoundary class for error isolation and graceful degradation.
 *
 * Provides:
 * - Error catching and fallback execution
 * - Retry mechanism for transient failures
 * - Metrics tracking
 * - Error state management
 */
export class ErrorBoundary implements IErrorBoundary {
  readonly name: string
  private options: ErrorBoundaryOptions
  private metrics: ErrorBoundaryMetrics
  private inErrorState: boolean = false
  private errorTimestamps: number[] = []

  constructor(options: ErrorBoundaryOptions) {
    this.name = options.name
    this.options = options
    this.metrics = {
      errorCount: 0,
      fallbackCount: 0,
      recoveryCount: 0,
      lastErrorAt: undefined,
      errorRate: 0,
    }
  }

  /**
   * Wrap an async operation with error handling.
   *
   * @param fn - The async function to execute
   * @param context - Optional error context
   * @returns The result of fn, or the fallback response on error
   */
  async wrap<T>(fn: () => Promise<T>, partialContext?: Partial<ErrorContext>): Promise<T> {
    const maxRetries = this.options.maxRetries ?? 0
    const retryDelay = this.options.retryDelay ?? 0
    let lastError: Error | null = null
    let attempts = 0

    // Try initial + maxRetries attempts
    for (let i = 0; i <= maxRetries; i++) {
      attempts++

      // Wait before retry (not before first attempt)
      if (i > 0 && retryDelay > 0) {
        await this.delay(retryDelay)
      }

      try {
        const result = await fn()
        // If we succeeded after failures, count as recovery
        if (lastError !== null) {
          this.metrics.recoveryCount++
        }
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Record the error for rate calculation
        const now = Date.now()
        this.errorTimestamps.push(now)
        // Keep only errors from last minute
        this.errorTimestamps = this.errorTimestamps.filter(t => now - t < 60000)
      }
    }

    // All retries exhausted - handle the error
    const error = lastError!
    const context = this.buildContext(error, partialContext)

    // Update metrics
    this.metrics.errorCount++
    this.metrics.fallbackCount++
    this.metrics.lastErrorAt = context.timestamp
    this.metrics.errorRate = this.errorTimestamps.length
    this.inErrorState = true

    // Call onError handler if provided
    if (this.options.onError) {
      await this.options.onError(error, context)
    }

    // Execute fallback
    const fallbackResult = await this.options.fallback(error, context)

    // Rethrow if configured
    if (this.options.rethrow) {
      throw error
    }

    return fallbackResult as T
  }

  /**
   * Get metrics for this boundary.
   */
  getMetrics(): ErrorBoundaryMetrics {
    // Update error rate calculation
    const now = Date.now()
    this.errorTimestamps = this.errorTimestamps.filter(t => now - t < 60000)
    this.metrics.errorRate = this.errorTimestamps.length

    return { ...this.metrics }
  }

  /**
   * Reset all metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      errorCount: 0,
      fallbackCount: 0,
      recoveryCount: 0,
      lastErrorAt: undefined,
      errorRate: 0,
    }
    this.errorTimestamps = []
  }

  /**
   * Check if boundary is in error state.
   */
  isInErrorState(): boolean {
    return this.inErrorState
  }

  /**
   * Clear error state.
   */
  clearErrorState(): void {
    this.inErrorState = false
  }

  /**
   * Build the full error context from partial context and error.
   */
  private buildContext(error: Error, partial?: Partial<ErrorContext>): ErrorContext {
    return {
      boundaryName: this.name,
      timestamp: Date.now(),
      stack: error.stack,
      ...partial,
    }
  }

  /**
   * Delay helper for retry mechanism.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function for creating error boundaries.
 *
 * @param options - Error boundary configuration
 * @returns A new ErrorBoundary instance
 * @throws Error if name is empty or fallback is not provided
 */
export function createErrorBoundary(options: ErrorBoundaryOptions): IErrorBoundary {
  // Validate required options
  if (!options.name || options.name.trim() === '') {
    throw new Error('ErrorBoundary name is required')
  }

  if (!options.fallback || typeof options.fallback !== 'function') {
    throw new Error('ErrorBoundary fallback function is required')
  }

  return new ErrorBoundary(options)
}
