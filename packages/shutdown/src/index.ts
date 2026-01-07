/**
 * @dotdo/shutdown - Graceful shutdown utilities for Cloudflare Workers
 *
 * Provides in-flight request tracking, cleanup hooks, WebSocket connection
 * draining, and timeout handling for graceful shutdown sequences.
 */

/**
 * Shutdown state values
 */
export enum ShutdownState {
  Running = 'running',
  Draining = 'draining',
  Shutdown = 'shutdown',
}

/**
 * Configuration for GracefulShutdown
 */
export interface ShutdownConfig {
  /** Timeout in milliseconds before force shutdown (default: 30000) */
  timeout?: number
  /** Grace period in milliseconds before closing WebSockets */
  webSocketGracePeriod?: number
  /** WebSocket close code (default: 1001 - Going Away) */
  webSocketCloseCode?: number
  /** WebSocket close message */
  webSocketCloseMessage?: string
}

/**
 * Shutdown event types
 */
export interface ShutdownEvent {
  type: 'shutdown:initiated' | 'shutdown:draining' | 'shutdown:complete' | 'shutdown:timeout'
  timestamp: number
  inFlightCount?: number
  remainingRequests?: number
}

/**
 * Cleanup hook function type
 */
export type CleanupHook = () => Promise<void>

/**
 * Cleanup hook options
 */
export interface CleanupHookOptions {
  /** Priority for execution order (higher = executed first) */
  priority?: number
  /** Timeout for this specific cleanup hook */
  timeout?: number
}

/**
 * Request tracker returned by trackRequest
 */
export interface RequestTracker {
  id: string
  complete: () => void
  completeWithError: (error: Error) => void
}

/**
 * Shutdown result
 */
export interface ShutdownResult {
  success: boolean
  timedOut?: boolean
  duration?: number
  remainingRequests?: number
  requestsDrained?: number
  cleanupsExecuted?: number
  cleanupErrors?: Error[]
  persistenceError?: Error
}

/**
 * State persistence context
 */
export interface PersistenceContext {
  inFlightRequests: string[]
  timestamp: number
}

/**
 * Event listener type
 */
export type ShutdownEventListener = (event: ShutdownEvent) => void

interface RegisteredCleanup {
  name: string
  hook: CleanupHook
  options: Required<CleanupHookOptions>
}

interface TrackedWebSocket {
  id: string
  ws: WebSocket
}

/**
 * GracefulShutdown - Graceful shutdown handling for Cloudflare Workers
 *
 * Provides:
 * - In-flight request tracking
 * - Cleanup hook registration and execution
 * - WebSocket connection draining
 * - Timeout handling for graceful termination
 * - Event emission for shutdown lifecycle
 */
export class GracefulShutdown {
  private state: ShutdownState = ShutdownState.Running
  private config: Required<ShutdownConfig>
  private inFlightRequests: Map<string, boolean> = new Map()
  private cleanups: Map<string, RegisteredCleanup> = new Map()
  private webSockets: Map<string, TrackedWebSocket> = new Map()
  private eventListeners: Map<string, Set<ShutdownEventListener>> = new Map()
  private persistStateHook?: (context: PersistenceContext) => Promise<void>
  private shutdownPromise?: Promise<ShutdownResult>
  private requestIdCounter = 0
  private requestsDrainedCount = 0

  constructor(config: ShutdownConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      webSocketGracePeriod: config.webSocketGracePeriod ?? 0,
      webSocketCloseCode: config.webSocketCloseCode ?? 1001,
      webSocketCloseMessage: config.webSocketCloseMessage ?? 'Server shutting down',
    }
  }

  /**
   * Get current shutdown state
   */
  getState(): ShutdownState {
    return this.state
  }

  /**
   * Get shutdown configuration
   */
  getConfig(): Required<ShutdownConfig> {
    return { ...this.config }
  }

  /**
   * Check if new requests can be accepted
   */
  canAcceptRequest(): boolean {
    return this.state === ShutdownState.Running
  }

  /**
   * Initiate graceful shutdown
   */
  initiateShutdown(): Promise<ShutdownResult> {
    // Return existing promise if shutdown already in progress
    if (this.shutdownPromise) {
      return this.shutdownPromise
    }

    this.shutdownPromise = this.performShutdown()
    return this.shutdownPromise
  }

  private async performShutdown(): Promise<ShutdownResult> {
    const startTime = Date.now()
    this.state = ShutdownState.Draining

    // Emit initiated event
    this.emit({
      type: 'shutdown:initiated',
      timestamp: Date.now(),
    })

    // Emit draining event
    this.emit({
      type: 'shutdown:draining',
      timestamp: Date.now(),
      inFlightCount: this.inFlightRequests.size,
    })

    // Persist state if hook registered
    let persistenceError: Error | undefined
    if (this.persistStateHook) {
      try {
        await this.persistStateHook({
          inFlightRequests: this.getInFlightRequests(),
          timestamp: Date.now(),
        })
      } catch (error) {
        persistenceError = error instanceof Error ? error : new Error(String(error))
      }
    }

    // Wait for in-flight requests with timeout
    const { timedOut, remainingRequests } = await this.drainRequests()

    // Wait WebSocket grace period if configured
    if (this.config.webSocketGracePeriod > 0 && this.webSockets.size > 0) {
      await this.delay(this.config.webSocketGracePeriod)
    }

    // Close WebSocket connections
    this.closeWebSockets()

    // Execute cleanup hooks
    const { cleanupErrors, cleanupsExecuted } = await this.executeCleanups()

    // Mark as shutdown
    this.state = ShutdownState.Shutdown

    // Emit appropriate completion event
    if (timedOut) {
      this.emit({
        type: 'shutdown:timeout',
        timestamp: Date.now(),
        remainingRequests,
      })
    }

    this.emit({
      type: 'shutdown:complete',
      timestamp: Date.now(),
    })

    const result: ShutdownResult = {
      success: !timedOut && cleanupErrors.length === 0,
      timedOut,
      duration: Date.now() - startTime,
      remainingRequests: timedOut ? remainingRequests : 0,
      requestsDrained: this.requestsDrainedCount,
      cleanupsExecuted,
      cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
      persistenceError,
    }

    return result
  }

  private async drainRequests(): Promise<{ timedOut: boolean; remainingRequests: number }> {
    return new Promise((resolve) => {
      // Check if already drained
      if (this.inFlightRequests.size === 0) {
        resolve({ timedOut: false, remainingRequests: 0 })
        return
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        resolve({
          timedOut: true,
          remainingRequests: this.inFlightRequests.size,
        })
      }, this.config.timeout)

      // Poll for request completion
      const checkInterval = setInterval(() => {
        if (this.inFlightRequests.size === 0) {
          clearTimeout(timeoutId)
          clearInterval(checkInterval)
          resolve({ timedOut: false, remainingRequests: 0 })
        }
      }, 10)
    })
  }

  private closeWebSockets(): void {
    for (const { ws } of this.webSockets.values()) {
      try {
        // Only close if connection is open (readyState 1 = OPEN)
        if ((ws as unknown as { readyState: number }).readyState === 1) {
          ws.close(this.config.webSocketCloseCode, this.config.webSocketCloseMessage)
        }
      } catch {
        // Ignore close errors
      }
    }
  }

  private async executeCleanups(): Promise<{ cleanupErrors: Error[]; cleanupsExecuted: number }> {
    const cleanupErrors: Error[] = []
    let cleanupsExecuted = 0

    // Sort by priority (higher first)
    const sortedCleanups = Array.from(this.cleanups.values())
      .sort((a, b) => b.options.priority - a.options.priority)

    for (const cleanup of sortedCleanups) {
      try {
        await this.executeCleanupWithTimeout(cleanup)
        cleanupsExecuted++
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error : new Error(String(error)))
        cleanupsExecuted++
      }
    }

    return { cleanupErrors, cleanupsExecuted }
  }

  private async executeCleanupWithTimeout(cleanup: RegisteredCleanup): Promise<void> {
    const { hook, options } = cleanup

    if (options.timeout === 0) {
      await hook()
      return
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Cleanup '${cleanup.name}' timeout after ${options.timeout}ms`))
      }, options.timeout)
    })

    await Promise.race([hook(), timeoutPromise])
  }

  /**
   * Track an in-flight request
   */
  trackRequest(id?: string): RequestTracker {
    if (!this.canAcceptRequest()) {
      throw new Error('Cannot accept new requests during shutdown')
    }

    const requestId = id ?? `req-${++this.requestIdCounter}`
    this.inFlightRequests.set(requestId, true)

    return {
      id: requestId,
      complete: () => {
        if (this.inFlightRequests.delete(requestId)) {
          this.requestsDrainedCount++
        }
      },
      completeWithError: () => {
        if (this.inFlightRequests.delete(requestId)) {
          this.requestsDrainedCount++
        }
      },
    }
  }

  /**
   * Get count of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size
  }

  /**
   * Get list of in-flight request IDs
   */
  getInFlightRequests(): string[] {
    return Array.from(this.inFlightRequests.keys())
  }

  /**
   * Register a cleanup hook to be executed during shutdown
   */
  registerCleanup(name: string, hook: CleanupHook, options: CleanupHookOptions = {}): void {
    this.cleanups.set(name, {
      name,
      hook,
      options: {
        priority: options.priority ?? 0,
        timeout: options.timeout ?? 5000,
      },
    })
  }

  /**
   * Unregister a cleanup hook
   */
  unregisterCleanup(name: string): void {
    this.cleanups.delete(name)
  }

  /**
   * Get list of registered cleanup hook names
   */
  getRegisteredCleanups(): string[] {
    return Array.from(this.cleanups.keys())
  }

  /**
   * Track a WebSocket connection
   */
  trackWebSocket(id: string, ws: WebSocket): void {
    this.webSockets.set(id, { id, ws })
  }

  /**
   * Untrack a WebSocket connection
   */
  untrackWebSocket(id: string): void {
    this.webSockets.delete(id)
  }

  /**
   * Get count of tracked WebSocket connections
   */
  getWebSocketCount(): number {
    return this.webSockets.size
  }

  /**
   * Register an event listener
   */
  on(event: string, listener: ShutdownEventListener): void {
    let listeners = this.eventListeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(event, listeners)
    }
    listeners.add(listener)
  }

  /**
   * Remove an event listener
   */
  off(event: string, listener: ShutdownEventListener): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private emit(event: ShutdownEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  /**
   * Register a state persistence hook
   */
  onPersistState(hook: (context: PersistenceContext) => Promise<void>): void {
    this.persistStateHook = hook
  }

  /**
   * Wrap a request handler with shutdown-aware tracking
   */
  wrapHandler<T extends (request: Request) => Promise<Response>>(handler: T): T {
    const wrappedHandler = async (request: Request): Promise<Response> => {
      if (!this.canAcceptRequest()) {
        return new Response('Service Unavailable - Shutting Down', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain',
            'Retry-After': '30',
          },
        })
      }

      const tracker = this.trackRequest()
      try {
        return await handler(request)
      } finally {
        tracker.complete()
      }
    }

    return wrappedHandler as T
  }

  /**
   * Reset to running state (for testing)
   */
  async reset(): Promise<void> {
    this.state = ShutdownState.Running
    this.inFlightRequests.clear()
    this.cleanups.clear()
    this.webSockets.clear()
    this.eventListeners.clear()
    this.persistStateHook = undefined
    this.shutdownPromise = undefined
    this.requestIdCounter = 0
    this.requestsDrainedCount = 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
