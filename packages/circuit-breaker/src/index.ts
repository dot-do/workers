/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number
  /** Number of successes needed to close the circuit from half-open (default: 2) */
  successThreshold?: number
  /** Timeout for operations in milliseconds (default: 10000) */
  timeout?: number
  /** Time to wait before attempting recovery in milliseconds (default: 60000) */
  resetTimeout?: number
  /** Callback when state changes */
  onStateChange?: (newState: CircuitBreakerState, oldState: CircuitBreakerState) => void
  /** Callback on successful operation */
  onSuccess?: (result: unknown) => void
  /** Callback on failed operation */
  onFailure?: (error: Error) => void
  /** Custom function to determine if an error should count as a failure */
  isFailure?: (error: Error) => boolean
  /** Fallback function to call when circuit is open */
  fallback?: () => Promise<unknown>
}

/**
 * Circuit Breaker Metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  totalRequests: number
  totalSuccesses: number
  totalFailures: number
}

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 10000,
  resetTimeout: 60000,
} as const

/**
 * Custom error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
  constructor(message: string = 'Circuit breaker is OPEN') {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

/**
 * Timeout error for operations that take too long
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Circuit Breaker implementation for resilient service calls
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount = 0
  private successCount = 0
  private totalRequests = 0
  private totalSuccesses = 0
  private totalFailures = 0
  private lastFailureTime: number | null = null

  private readonly options: Required<Pick<CircuitBreakerOptions, 'failureThreshold' | 'successThreshold' | 'timeout' | 'resetTimeout'>>
  private readonly onStateChange?: CircuitBreakerOptions['onStateChange']
  private readonly onSuccess?: CircuitBreakerOptions['onSuccess']
  private readonly onFailure?: CircuitBreakerOptions['onFailure']
  private readonly isFailurePredicate?: CircuitBreakerOptions['isFailure']
  private readonly fallback?: CircuitBreakerOptions['fallback']

  constructor(options?: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options?.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold,
      successThreshold: options?.successThreshold ?? DEFAULT_OPTIONS.successThreshold,
      timeout: options?.timeout ?? DEFAULT_OPTIONS.timeout,
      resetTimeout: options?.resetTimeout ?? DEFAULT_OPTIONS.resetTimeout,
    }
    this.onStateChange = options?.onStateChange
    this.onSuccess = options?.onSuccess
    this.onFailure = options?.onFailure
    this.isFailurePredicate = options?.isFailure
    this.fallback = options?.fallback
  }

  /**
   * Get the current circuit breaker state, automatically transitioning
   * from OPEN to HALF_OPEN if reset timeout has elapsed
   */
  getState(): CircuitBreakerState {
    if (this.state === CircuitBreakerState.OPEN && this.shouldTransitionToHalfOpen()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN)
    }
    return this.state
  }

  /**
   * Get the configured options
   */
  getOptions(): Required<Pick<CircuitBreakerOptions, 'failureThreshold' | 'successThreshold' | 'timeout' | 'resetTimeout'>> {
    return { ...this.options }
  }

  /**
   * Get the current failure count
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Get the current success count (for HALF_OPEN state)
   */
  getSuccessCount(): number {
    return this.successCount
  }

  /**
   * Get complete metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
    }
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++

    // Check current state (this may transition OPEN -> HALF_OPEN)
    const currentState = this.getState()

    // If OPEN, either use fallback or reject
    if (currentState === CircuitBreakerState.OPEN) {
      if (this.fallback) {
        return this.fallback() as Promise<T>
      }
      throw new CircuitBreakerError()
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation)
      this.handleSuccess(result)
      return result
    } catch (error) {
      this.handleFailure(error as Error)
      throw error
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionTo(CircuitBreakerState.CLOSED)
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }

  /**
   * Manually trip the circuit breaker to OPEN state
   */
  trip(): void {
    this.transitionTo(CircuitBreakerState.OPEN)
    this.lastFailureTime = Date.now()
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let isResolved = false

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          reject(new TimeoutError())
        }
      }, this.options.timeout)

      operation()
        .then((result) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            resolve(result)
          }
        })
        .catch((error) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeoutId)
            reject(error)
          }
        })
    })
  }

  /**
   * Handle successful operation
   */
  private handleSuccess<T>(result: T): void {
    this.totalSuccesses++

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED)
        this.failureCount = 0
        this.successCount = 0
        this.lastFailureTime = null
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0
    }

    this.onSuccess?.(result)
  }

  /**
   * Handle failed operation
   */
  private handleFailure(error: Error): void {
    this.totalFailures++

    // Check if this error should count as a failure
    if (this.isFailurePredicate && !this.isFailurePredicate(error)) {
      // Error doesn't count as a circuit breaker failure
      this.onFailure?.(error)
      return
    }

    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN goes back to OPEN
      this.transitionTo(CircuitBreakerState.OPEN)
      this.successCount = 0
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we've reached the failure threshold
      if (this.failureCount >= this.options.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN)
      }
    }

    this.onFailure?.(error)
  }

  /**
   * Check if we should transition from OPEN to HALF_OPEN
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (this.lastFailureTime === null) {
      return false
    }
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      this.onStateChange?.(newState, oldState)
    }
  }
}
