/**
 * Circuit Breaker States
 */
export var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (CircuitBreakerState = {}));
/**
 * Default options
 */
const DEFAULT_OPTIONS = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 60000,
};
/**
 * Custom error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
    constructor(message = 'Circuit breaker is OPEN') {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}
/**
 * Timeout error for operations that take too long
 */
export class TimeoutError extends Error {
    constructor(message = 'Operation timed out') {
        super(message);
        this.name = 'TimeoutError';
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
    state = CircuitBreakerState.CLOSED;
    failureCount = 0;
    successCount = 0;
    totalRequests = 0;
    totalSuccesses = 0;
    totalFailures = 0;
    lastFailureTime = null;
    options;
    onStateChange;
    onSuccess;
    onFailure;
    isFailurePredicate;
    fallback;
    constructor(options) {
        this.options = {
            failureThreshold: options?.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold,
            successThreshold: options?.successThreshold ?? DEFAULT_OPTIONS.successThreshold,
            timeout: options?.timeout ?? DEFAULT_OPTIONS.timeout,
            resetTimeout: options?.resetTimeout ?? DEFAULT_OPTIONS.resetTimeout,
        };
        this.onStateChange = options?.onStateChange;
        this.onSuccess = options?.onSuccess;
        this.onFailure = options?.onFailure;
        this.isFailurePredicate = options?.isFailure;
        this.fallback = options?.fallback;
    }
    /**
     * Get the current circuit breaker state, automatically transitioning
     * from OPEN to HALF_OPEN if reset timeout has elapsed
     */
    getState() {
        if (this.state === CircuitBreakerState.OPEN && this.shouldTransitionToHalfOpen()) {
            this.transitionTo(CircuitBreakerState.HALF_OPEN);
        }
        return this.state;
    }
    /**
     * Get the configured options
     */
    getOptions() {
        return { ...this.options };
    }
    /**
     * Get the current failure count
     */
    getFailureCount() {
        return this.failureCount;
    }
    /**
     * Get the current success count (for HALF_OPEN state)
     */
    getSuccessCount() {
        return this.successCount;
    }
    /**
     * Get complete metrics
     */
    getMetrics() {
        return {
            state: this.getState(),
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            totalSuccesses: this.totalSuccesses,
            totalFailures: this.totalFailures,
        };
    }
    /**
     * Execute an operation through the circuit breaker
     */
    async execute(operation) {
        this.totalRequests++;
        // Check current state (this may transition OPEN -> HALF_OPEN)
        const currentState = this.getState();
        // If OPEN, either use fallback or reject
        if (currentState === CircuitBreakerState.OPEN) {
            if (this.fallback) {
                return this.fallback();
            }
            throw new CircuitBreakerError();
        }
        try {
            // Execute with timeout
            const result = await this.executeWithTimeout(operation);
            this.handleSuccess(result);
            return result;
        }
        catch (error) {
            this.handleFailure(error);
            throw error;
        }
    }
    /**
     * Manually reset the circuit breaker to CLOSED state
     */
    reset() {
        this.transitionTo(CircuitBreakerState.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
    }
    /**
     * Manually trip the circuit breaker to OPEN state
     */
    trip() {
        this.transitionTo(CircuitBreakerState.OPEN);
        this.lastFailureTime = Date.now();
    }
    /**
     * Execute operation with timeout
     */
    async executeWithTimeout(operation) {
        return new Promise((resolve, reject) => {
            let isResolved = false;
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    reject(new TimeoutError());
                }
            }, this.options.timeout);
            operation()
                .then((result) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            })
                .catch((error) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
        });
    }
    /**
     * Handle successful operation
     */
    handleSuccess(result) {
        this.totalSuccesses++;
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.transitionTo(CircuitBreakerState.CLOSED);
                this.failureCount = 0;
                this.successCount = 0;
                this.lastFailureTime = null;
            }
        }
        else if (this.state === CircuitBreakerState.CLOSED) {
            // Reset failure count on success in CLOSED state
            this.failureCount = 0;
        }
        this.onSuccess?.(result);
    }
    /**
     * Handle failed operation
     */
    handleFailure(error) {
        this.totalFailures++;
        // Check if this error should count as a failure
        if (this.isFailurePredicate && !this.isFailurePredicate(error)) {
            // Error doesn't count as a circuit breaker failure
            this.onFailure?.(error);
            return;
        }
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            // Any failure in HALF_OPEN goes back to OPEN
            this.transitionTo(CircuitBreakerState.OPEN);
            this.successCount = 0;
        }
        else if (this.state === CircuitBreakerState.CLOSED) {
            // Check if we've reached the failure threshold
            if (this.failureCount >= this.options.failureThreshold) {
                this.transitionTo(CircuitBreakerState.OPEN);
            }
        }
        this.onFailure?.(error);
    }
    /**
     * Check if we should transition from OPEN to HALF_OPEN
     */
    shouldTransitionToHalfOpen() {
        if (this.lastFailureTime === null) {
            return false;
        }
        return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
    }
    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.onStateChange?.(newState, oldState);
        }
    }
}
