/**
 * @dotdo/rpc-client/transport - Transport Layer Abstractions
 *
 * Provides transport implementations for RPC communication:
 * - HTTPTransport: REST-based JSON-RPC over HTTP/HTTPS
 * - WebSocketTransport: Real-time JSON-RPC over WebSocket
 *
 * Both transports implement the same interface for consistency.
 *
 * @packageDocumentation
 */

import type { RPCRequest, RPCResponse, RPCErrorData } from './index.js'
import { RPCError, ClientError } from './index.js'

// =============================================================================
// Transport Types
// =============================================================================

/**
 * Transport state
 */
export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Transport change event
 */
export interface TransportChangeEvent {
  from: TransportState
  to: TransportState
  reason: string
}

/**
 * Transport configuration options
 */
export interface TransportOptions {
  /** Request timeout in ms */
  timeout?: number
  /** Retry configuration */
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
  /** Headers to include in requests */
  headers?: Record<string, string>
  /** Event handler for state changes */
  onStateChange?: (event: TransportChangeEvent) => void
}

/**
 * Transport interface - common API for all transport types
 */
export interface Transport {
  /** Current transport state */
  readonly state: TransportState

  /** Send an RPC request and get response */
  send<T = unknown>(request: RPCRequest): Promise<T>

  /** Connect the transport (for persistent connections) */
  connect?(): Promise<void>

  /** Disconnect the transport */
  disconnect(): Promise<void>

  /** Subscribe to state changes */
  onStateChange(handler: (event: TransportChangeEvent) => void): void
}

// =============================================================================
// HTTP Transport
// =============================================================================

/**
 * HTTP/REST transport for JSON-RPC
 *
 * Uses standard HTTP POST requests with JSON-RPC 2.0 format.
 * Includes retry logic with exponential backoff.
 *
 * @example
 * ```typescript
 * const transport = new HTTPTransport('https://api.example.do', {
 *   timeout: 30000,
 *   retry: { attempts: 3, backoff: 'exponential' },
 *   headers: { 'Authorization': 'Bearer token' }
 * })
 *
 * const result = await transport.send({
 *   method: 'hello',
 *   params: ['world']
 * })
 * ```
 */
export class HTTPTransport implements Transport {
  private readonly url: string
  private readonly options: Required<TransportOptions>
  private _state: TransportState = 'connected' // HTTP is stateless, always "connected"
  private readonly stateHandlers: Array<(event: TransportChangeEvent) => void> = []

  constructor(url: string, options: TransportOptions = {}) {
    this.url = url
    this.options = {
      timeout: options.timeout ?? 30000,
      retry: {
        attempts: options.retry?.attempts ?? 3,
        delay: options.retry?.delay ?? 1000,
        backoff: options.retry?.backoff ?? 'exponential',
      },
      headers: options.headers ?? {},
      onStateChange: options.onStateChange ?? (() => {}),
    }

    if (options.onStateChange) {
      this.stateHandlers.push(options.onStateChange)
    }
  }

  get state(): TransportState {
    return this._state
  }

  private emitStateChange(from: TransportState, to: TransportState, reason: string): void {
    this._state = to
    const event: TransportChangeEvent = { from, to, reason }
    for (const handler of this.stateHandlers) {
      try {
        handler(event)
      } catch {
        // Ignore handler errors
      }
    }
  }

  async send<T = unknown>(request: RPCRequest): Promise<T> {
    const { timeout, retry, headers } = this.options
    const { attempts, delay, backoff } = retry

    let lastError: Error | undefined

    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            ...request,
            id: request.id ?? this.generateId(),
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new ClientError(response.status, response.statusText)
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: RPCResponse<T> = await response.json()

        if (data.error) {
          throw new RPCError(data.error.code, data.error.message, data.error.data)
        }

        return data.result as T
      } catch (error) {
        // Don't retry client errors
        if (error instanceof ClientError) {
          throw error
        }
        lastError = error as Error
      }

      // Wait before retrying
      if (i < attempts - 1) {
        const waitTime = backoff === 'exponential' ? delay * Math.pow(2, i) : delay
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }

    throw lastError
  }

  async disconnect(): Promise<void> {
    // HTTP is stateless, nothing to disconnect
  }

  onStateChange(handler: (event: TransportChangeEvent) => void): void {
    this.stateHandlers.push(handler)
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
}

// =============================================================================
// WebSocket Transport
// =============================================================================

/**
 * WebSocket transport for real-time JSON-RPC
 *
 * Maintains a persistent WebSocket connection for low-latency RPC.
 * Supports automatic reconnection with configurable backoff.
 *
 * @example
 * ```typescript
 * const transport = new WebSocketTransport('wss://api.example.do/ws', {
 *   timeout: 30000,
 *   headers: { 'Authorization': 'Bearer token' }
 * })
 *
 * await transport.connect()
 *
 * const result = await transport.send({
 *   method: 'subscribe',
 *   params: ['events']
 * })
 * ```
 */
export class WebSocketTransport implements Transport {
  private readonly url: string
  private readonly options: Required<TransportOptions>
  private _state: TransportState = 'disconnected'
  private ws: WebSocket | null = null
  private readonly stateHandlers: Array<(event: TransportChangeEvent) => void> = []
  private readonly pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts: number
  private readonly reconnectDelay: number
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    url: string,
    options: TransportOptions & {
      maxReconnectAttempts?: number
      reconnectDelay?: number
    } = {}
  ) {
    this.url = url
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 3
    this.reconnectDelay = options.reconnectDelay ?? 1000
    this.options = {
      timeout: options.timeout ?? 30000,
      retry: {
        attempts: options.retry?.attempts ?? 1, // WS doesn't retry individual requests
        delay: options.retry?.delay ?? 1000,
        backoff: options.retry?.backoff ?? 'exponential',
      },
      headers: options.headers ?? {},
      onStateChange: options.onStateChange ?? (() => {}),
    }

    if (options.onStateChange) {
      this.stateHandlers.push(options.onStateChange)
    }
  }

  get state(): TransportState {
    return this._state
  }

  private emitStateChange(from: TransportState, to: TransportState, reason: string): void {
    this._state = to
    const event: TransportChangeEvent = { from, to, reason }
    for (const handler of this.stateHandlers) {
      try {
        handler(event)
      } catch {
        // Ignore handler errors
      }
    }
  }

  async connect(): Promise<void> {
    if (this._state === 'connected') {
      return
    }

    if (this._state === 'connecting') {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkState = () => {
          if (this._state === 'connected') {
            resolve()
          } else if (this._state === 'error' || this._state === 'disconnected') {
            reject(new Error('Connection failed'))
          } else {
            setTimeout(checkState, 100)
          }
        }
        checkState()
      })
    }

    return new Promise((resolve, reject) => {
      const prevState = this._state
      this.emitStateChange(prevState, 'connecting', 'Initiating connection')

      this.ws = new WebSocket(this.url)

      const connectionTimeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close()
        }
        this.emitStateChange('connecting', 'error', 'Connection timeout')
        reject(new Error('WebSocket connection timeout'))
      }, this.options.timeout)

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout)
        this.reconnectAttempts = 0
        this.emitStateChange('connecting', 'connected', 'Connection established')
        resolve()
      }

      this.ws.onerror = () => {
        clearTimeout(connectionTimeout)
        this.emitStateChange('connecting', 'error', 'Connection error')
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onclose = () => {
        const wasConnected = this._state === 'connected'
        this.emitStateChange(this._state, 'disconnected', 'Connection closed')

        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timeout)
          pending.reject(new Error('Connection closed'))
          this.pendingRequests.delete(id)
        }

        // Attempt reconnection if was previously connected
        if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string)
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failed, will try again if attempts remaining
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      })
    }, delay)
  }

  private handleMessage(data: string): void {
    try {
      const response: RPCResponse = JSON.parse(data)
      const pending = this.pendingRequests.get(response.id!)

      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(response.id!)

        if (response.error) {
          pending.reject(new RPCError(response.error.code, response.error.message, response.error.data))
        } else {
          pending.resolve(response.result)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  async send<T = unknown>(request: RPCRequest): Promise<T> {
    if (this._state !== 'connected' || !this.ws) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      const id = request.id ?? this.generateId()

      const requestTimeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, this.options.timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: requestTimeout,
      })

      this.ws!.send(
        JSON.stringify({
          jsonrpc: '2.0',
          ...request,
          id,
        })
      )
    })
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      // Cancel all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Connection closed'))
        this.pendingRequests.delete(id)
      }

      this.ws.close()
      this.ws = null
    }

    this.emitStateChange(this._state, 'disconnected', 'Disconnected by user')
  }

  onStateChange(handler: (event: TransportChangeEvent) => void): void {
    this.stateHandlers.push(handler)
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
}

// =============================================================================
// Transport Factory
// =============================================================================

/**
 * Create a transport based on URL scheme
 *
 * @param url - Endpoint URL
 * @param options - Transport options
 * @returns Appropriate transport instance
 */
export function createTransport(url: string, options?: TransportOptions): Transport {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return new WebSocketTransport(url, options)
  }
  return new HTTPTransport(url, options)
}
