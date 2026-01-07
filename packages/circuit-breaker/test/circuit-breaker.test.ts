import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CircuitBreaker, CircuitBreakerState, CircuitBreakerOptions, CircuitBreakerError } from '../src/index'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      breaker = new CircuitBreaker()
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should accept custom options', () => {
      const options: CircuitBreakerOptions = {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
        resetTimeout: 30000,
      }
      breaker = new CircuitBreaker(options)
      expect(breaker.getOptions()).toEqual(options)
    })

    it('should use default options when not provided', () => {
      breaker = new CircuitBreaker()
      const options = breaker.getOptions()
      expect(options.failureThreshold).toBe(5)
      expect(options.successThreshold).toBe(2)
      expect(options.timeout).toBe(10000)
      expect(options.resetTimeout).toBe(60000)
    })
  })

  describe('CLOSED state behavior', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })
    })

    it('should execute successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalled()
    })

    it('should pass through operation errors without opening circuit on first failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('operation failed'))
      await expect(breaker.execute(operation)).rejects.toThrow('operation failed')
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should transition to OPEN after reaching failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('operation failed'))

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow('operation failed')
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should reset failure count on successful operation', async () => {
      const failingOp = vi.fn().mockRejectedValue(new Error('failed'))
      const successOp = vi.fn().mockResolvedValue('success')

      // Fail twice
      await expect(breaker.execute(failingOp)).rejects.toThrow()
      await expect(breaker.execute(failingOp)).rejects.toThrow()
      expect(breaker.getFailureCount()).toBe(2)

      // Succeed once - should reset counter
      await breaker.execute(successOp)
      expect(breaker.getFailureCount()).toBe(0)

      // Fail twice more - should not open (reset happened)
      await expect(breaker.execute(failingOp)).rejects.toThrow()
      await expect(breaker.execute(failingOp)).rejects.toThrow()
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('OPEN state behavior', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })
    })

    it('should reject operations immediately when OPEN', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'))

      // Trigger OPEN state
      await expect(breaker.execute(operation)).rejects.toThrow()
      await expect(breaker.execute(operation)).rejects.toThrow()
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // Subsequent calls should be rejected immediately
      const newOp = vi.fn().mockResolvedValue('success')
      await expect(breaker.execute(newOp)).rejects.toThrow(CircuitBreakerError)
      expect(newOp).not.toHaveBeenCalled()
    })

    it('should throw CircuitBreakerError with correct message when OPEN', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'))

      await expect(breaker.execute(operation)).rejects.toThrow()
      await expect(breaker.execute(operation)).rejects.toThrow()

      const newOp = vi.fn().mockResolvedValue('success')
      await expect(breaker.execute(newOp)).rejects.toThrow('Circuit breaker is OPEN')
    })

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'))

      await expect(breaker.execute(operation)).rejects.toThrow()
      await expect(breaker.execute(operation)).rejects.toThrow()
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // Advance time past reset timeout
      vi.advanceTimersByTime(5001)

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })
  })

  describe('HALF_OPEN state behavior', () => {
    beforeEach(async () => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })

      // Transition to OPEN
      const operation = vi.fn().mockRejectedValue(new Error('failed'))
      await expect(breaker.execute(operation)).rejects.toThrow()
      await expect(breaker.execute(operation)).rejects.toThrow()

      // Transition to HALF_OPEN
      vi.advanceTimersByTime(5001)
    })

    it('should allow limited operations in HALF_OPEN state', async () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      const operation = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalled()
    })

    it('should transition to CLOSED after reaching success threshold', async () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      const operation = vi.fn().mockResolvedValue('success')

      // Succeed twice (successThreshold = 2)
      await breaker.execute(operation)
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      await breaker.execute(operation)
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('should transition back to OPEN on any failure in HALF_OPEN state', async () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      const operation = vi.fn().mockRejectedValue(new Error('failed again'))
      await expect(breaker.execute(operation)).rejects.toThrow('failed again')

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('should reset success count when transitioning back to OPEN', async () => {
      const successOp = vi.fn().mockResolvedValue('success')
      const failOp = vi.fn().mockRejectedValue(new Error('failed'))

      // One success
      await breaker.execute(successOp)
      expect(breaker.getSuccessCount()).toBe(1)

      // Then a failure - should go to OPEN and reset
      await expect(breaker.execute(failOp)).rejects.toThrow()
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
      expect(breaker.getSuccessCount()).toBe(0)
    })
  })

  describe('timeout handling', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })
    })

    it('should timeout slow operations', async () => {
      const slowOperation = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('slow result'), 2000))
      )

      const executePromise = breaker.execute(slowOperation)
      vi.advanceTimersByTime(1001)

      await expect(executePromise).rejects.toThrow('Operation timed out')
    })

    it('should count timeout as a failure', async () => {
      const slowOperation = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('slow'), 2000))
      )

      const executePromise = breaker.execute(slowOperation)
      vi.advanceTimersByTime(1001)

      try {
        await executePromise
      } catch {
        // Expected timeout
      }

      expect(breaker.getFailureCount()).toBe(1)
    })

    it('should complete successfully if operation finishes before timeout', async () => {
      const fastOperation = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('fast result'), 500))
      )

      const executePromise = breaker.execute(fastOperation)
      vi.advanceTimersByTime(501)

      const result = await executePromise
      expect(result).toBe('fast result')
    })
  })

  describe('metrics and statistics', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })
    })

    it('should track failure count', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failed'))

      expect(breaker.getFailureCount()).toBe(0)

      await expect(breaker.execute(failOp)).rejects.toThrow()
      expect(breaker.getFailureCount()).toBe(1)

      await expect(breaker.execute(failOp)).rejects.toThrow()
      expect(breaker.getFailureCount()).toBe(2)
    })

    it('should track success count in HALF_OPEN state', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failed'))
      const successOp = vi.fn().mockResolvedValue('success')

      // Transition to OPEN then HALF_OPEN
      for (let i = 0; i < 5; i++) {
        await expect(breaker.execute(failOp)).rejects.toThrow()
      }
      vi.advanceTimersByTime(5001)

      expect(breaker.getSuccessCount()).toBe(0)
      await breaker.execute(successOp)
      expect(breaker.getSuccessCount()).toBe(1)
    })

    it('should provide complete metrics', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failed'))
      const successOp = vi.fn().mockResolvedValue('success')

      await breaker.execute(successOp)
      await expect(breaker.execute(failOp)).rejects.toThrow()

      const metrics = breaker.getMetrics()
      expect(metrics).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 1,
        successCount: 0,
        totalRequests: 2,
        totalSuccesses: 1,
        totalFailures: 1,
      })
    })
  })

  describe('manual control', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
      })
    })

    it('should allow manual reset to CLOSED state', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failed'))

      // Trigger OPEN
      for (let i = 0; i < 5; i++) {
        await expect(breaker.execute(failOp)).rejects.toThrow()
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      breaker.reset()
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(breaker.getFailureCount()).toBe(0)
    })

    it('should allow manual trip to OPEN state', async () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)

      breaker.trip()
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })
  })

  describe('event callbacks', () => {
    it('should call onStateChange when state changes', async () => {
      const onStateChange = vi.fn()
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        onStateChange,
      })

      const failOp = vi.fn().mockRejectedValue(new Error('failed'))

      // CLOSED -> OPEN
      await expect(breaker.execute(failOp)).rejects.toThrow()
      await expect(breaker.execute(failOp)).rejects.toThrow()

      expect(onStateChange).toHaveBeenCalledWith(
        CircuitBreakerState.OPEN,
        CircuitBreakerState.CLOSED
      )
    })

    it('should call onSuccess for successful operations', async () => {
      const onSuccess = vi.fn()
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        onSuccess,
      })

      const successOp = vi.fn().mockResolvedValue('success')
      await breaker.execute(successOp)

      expect(onSuccess).toHaveBeenCalledWith('success')
    })

    it('should call onFailure for failed operations', async () => {
      const onFailure = vi.fn()
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        onFailure,
      })

      const error = new Error('operation failed')
      const failOp = vi.fn().mockRejectedValue(error)

      await expect(breaker.execute(failOp)).rejects.toThrow()

      expect(onFailure).toHaveBeenCalledWith(error)
    })
  })

  describe('custom failure predicate', () => {
    it('should use custom predicate to determine failures', async () => {
      // Only count 5xx errors as failures
      const isFailure = (error: Error) => error.message.startsWith('5')

      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        isFailure,
      })

      const op4xx = vi.fn().mockRejectedValue(new Error('404 Not Found'))
      const op5xx = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'))

      // 4xx errors should not count as failures
      await expect(breaker.execute(op4xx)).rejects.toThrow('404 Not Found')
      expect(breaker.getFailureCount()).toBe(0)

      // 5xx errors should count
      await expect(breaker.execute(op5xx)).rejects.toThrow('500 Internal Server Error')
      expect(breaker.getFailureCount()).toBe(1)
    })
  })

  describe('fallback function', () => {
    it('should call fallback when circuit is OPEN', async () => {
      const fallback = vi.fn().mockResolvedValue('fallback result')
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        fallback,
      })

      const failOp = vi.fn().mockRejectedValue(new Error('failed'))

      // Trigger OPEN
      await expect(breaker.execute(failOp)).rejects.toThrow()
      await expect(breaker.execute(failOp)).rejects.toThrow()

      const successOp = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(successOp)

      expect(result).toBe('fallback result')
      expect(fallback).toHaveBeenCalled()
      expect(successOp).not.toHaveBeenCalled()
    })

    it('should pass original arguments to fallback', async () => {
      const fallback = vi.fn().mockResolvedValue('fallback')
      breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        fallback,
      })

      const failOp = vi.fn().mockRejectedValue(new Error('failed'))
      await expect(breaker.execute(failOp)).rejects.toThrow()

      const operation = vi.fn().mockResolvedValue('success')
      await breaker.execute(operation)

      expect(fallback).toHaveBeenCalled()
    })
  })
})
