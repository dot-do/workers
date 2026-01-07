/**
 * Agent Inheritance Interface
 *
 * This module provides the Agent base class for building Durable Object agents
 * with structured lifecycle management, message handling, and state management.
 *
 * ## Features
 * - **Lifecycle Hooks**: init, cleanup, onStart, onStop, onError
 * - **Message Handling**: Type-based handler registration and dispatch
 * - **State Management**: Built-in initialization and activity tracking
 * - **Inheritance Support**: Designed for extension via class inheritance
 *
 * ## Usage Pattern
 * ```typescript
 * class MyAgent extends Agent {
 *   async init(): Promise<void> {
 *     // Load state, connect resources
 *     await this.markInitialized()
 *   }
 *
 *   async cleanup(): Promise<void> {
 *     // Persist state, release resources
 *   }
 *
 *   async handleMessage(message: AgentMessage): Promise<unknown> {
 *     const handler = this.getHandler(message.type)
 *     if (handler) return handler(message)
 *     throw new Error(`Unknown message type: ${message.type}`)
 *   }
 * }
 * ```
 *
 * @module agent
 */

// Import from core to avoid circular dependency with index
import { DOCore, type DOState, type DOEnv } from './core'

/**
 * Agent configuration options passed to the constructor.
 *
 * Supports any custom properties needed by your agent implementation.
 *
 * @example
 * ```typescript
 * const config: AgentConfig = {
 *   name: 'MyAgent',
 *   version: '1.0.0',
 *   maxRetries: 3,
 *   timeout: 5000
 * }
 * ```
 */
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string
  /** Version identifier */
  version?: string
  /** Custom configuration properties */
  [key: string]: unknown
}

/**
 * Agent state interface for tracking lifecycle status.
 *
 * Extend this interface to add custom state properties:
 *
 * @example
 * ```typescript
 * interface MyAgentState extends AgentState {
 *   taskCount: number
 *   lastError: string | null
 * }
 *
 * class MyAgent extends Agent<DOEnv, MyAgentState> {
 *   // ...
 * }
 * ```
 */
export interface AgentState {
  /** Whether the agent has been initialized via init() */
  initialized: boolean
  /** Unix timestamp (ms) when start() was called */
  startedAt?: number
  /** Unix timestamp (ms) of last activity via updateActivity() */
  lastActivity?: number
}

/**
 * Message structure for agent communication.
 *
 * Messages are routed to handlers based on their `type` field.
 * Use `correlationId` to track request/response pairs.
 *
 * @example
 * ```typescript
 * const message: AgentMessage = {
 *   id: crypto.randomUUID(),
 *   type: 'process-order',
 *   payload: { orderId: '12345', items: [...] },
 *   timestamp: Date.now(),
 *   correlationId: 'req-abc',
 *   source: 'order-service'
 * }
 * ```
 */
export interface AgentMessage {
  /** Unique message identifier */
  id: string
  /** Message type for routing to registered handlers */
  type: string
  /** Message payload data (type-specific) */
  payload: unknown
  /** Unix timestamp (ms) when message was created */
  timestamp: number
  /** Optional correlation ID for request/response tracking */
  correlationId?: string
  /** Optional source agent ID for multi-agent communication */
  source?: string
}

/**
 * Message handler function type.
 *
 * Handlers receive the full AgentMessage and return a response.
 * The response type is application-specific.
 */
export type MessageHandler = (message: AgentMessage) => Promise<unknown>

/**
 * Base Agent class for building Durable Object agents.
 *
 * Extends DOCore with structured lifecycle management, message handling,
 * and state tracking. Designed for inheritance - subclasses implement
 * the abstract methods `init()`, `cleanup()`, and `handleMessage()`.
 *
 * ## Lifecycle
 * ```
 * constructor() -> start() -> [init() -> onStart()] -> ... -> stop() -> [onStop() -> cleanup()]
 * ```
 *
 * ## Extension Points
 * - `init()`: Load persisted state, initialize resources (required)
 * - `cleanup()`: Persist state, release resources (required)
 * - `handleMessage()`: Process incoming messages (required)
 * - `onStart()`: Post-initialization setup (optional)
 * - `onStop()`: Pre-shutdown tasks (optional)
 * - `onError()`: Error recovery (optional)
 *
 * @typeParam Env - Environment bindings type (extends DOEnv)
 * @typeParam State - Agent state type (extends AgentState)
 *
 * @example
 * ```typescript
 * class MyAgent extends Agent {
 *   private data: Map<string, unknown> = new Map()
 *
 *   async init(): Promise<void> {
 *     const saved = await this.ctx.storage.get('data')
 *     if (saved) this.data = new Map(Object.entries(saved))
 *     await this.markInitialized()
 *   }
 *
 *   async cleanup(): Promise<void> {
 *     await this.ctx.storage.put('data', Object.fromEntries(this.data))
 *   }
 *
 *   async handleMessage(message: AgentMessage): Promise<unknown> {
 *     const handler = this.getHandler(message.type)
 *     if (handler) return handler(message)
 *     throw new Error(`Unknown: ${message.type}`)
 *   }
 * }
 * ```
 */
export class Agent<
  Env extends DOEnv = DOEnv,
  State extends AgentState = AgentState
> extends DOCore<Env> {
  /** Agent configuration passed to constructor */
  protected readonly config?: AgentConfig

  /** Registered message handlers by type */
  private readonly handlers: Map<string, MessageHandler> = new Map()

  /** Internal agent state tracking */
  private _state: State = {
    initialized: false,
    startedAt: undefined,
    lastActivity: undefined,
  } as State

  /**
   * Create a new Agent instance.
   *
   * @param ctx - Durable Object state (id, storage, etc.)
   * @param env - Environment bindings
   * @param config - Optional agent configuration
   */
  constructor(ctx: DOState, env: Env, config?: AgentConfig) {
    super(ctx, env)
    this.config = config
  }

  /**
   * Get the unique agent ID (derived from Durable Object ID).
   */
  get id(): string {
    return this.ctx.id.toString()
  }

  // ============================================
  // Lifecycle Hooks
  // ============================================

  /**
   * Initialize the agent (required override).
   *
   * Called by `start()` when the agent is first created or restored.
   * Subclasses must implement this to:
   * - Load persisted state from storage
   * - Initialize resources and connections
   * - Call `markInitialized()` when complete
   *
   * @throws Error if not implemented (subclass must override)
   *
   * @example
   * ```typescript
   * async init(): Promise<void> {
   *   const data = await this.ctx.storage.get('agent-state')
   *   if (data) this.restoreFrom(data)
   *   await this.markInitialized()
   * }
   * ```
   */
  async init(): Promise<void> {
    throw new Error('Agent.init() not implemented')
  }

  /**
   * Clean up agent resources (required override).
   *
   * Called by `stop()` before agent shutdown.
   * Subclasses must implement this to:
   * - Persist current state to storage
   * - Release resources and close connections
   * - Perform any necessary cleanup
   *
   * @throws Error if not implemented (subclass must override)
   *
   * @example
   * ```typescript
   * async cleanup(): Promise<void> {
   *   await this.ctx.storage.put('agent-state', this.serialize())
   *   this.connections.forEach(conn => conn.close())
   * }
   * ```
   */
  async cleanup(): Promise<void> {
    throw new Error('Agent.cleanup() not implemented')
  }

  /**
   * Hook called after init() completes (optional override).
   *
   * Use for post-initialization setup that depends on init() being complete.
   * Default implementation is a no-op.
   */
  async onStart(): Promise<void> {
    // Default: no-op, subclasses can override
  }

  /**
   * Hook called before cleanup() (optional override).
   *
   * Use for pre-shutdown tasks like flushing buffers or notifying peers.
   * Default implementation is a no-op.
   */
  async onStop(): Promise<void> {
    // Default: no-op, subclasses can override
  }

  /**
   * Error recovery hook (optional override).
   *
   * Called when an error occurs during message handling.
   * Use for logging, metrics, or recovery logic.
   * Default implementation is a no-op.
   *
   * @param _error - The error that occurred
   * @param _context - Context in which error occurred (typically the message)
   */
  async onError(_error: Error, _context: unknown): Promise<void> {
    // Default: no-op, subclasses can override
  }

  /**
   * Start the agent by calling init() then onStart().
   *
   * Records the start timestamp in agent state.
   * Call this to fully initialize an agent before use.
   */
  async start(): Promise<void> {
    await this.init()
    await this.onStart()
    this._state.startedAt = Date.now()
  }

  /**
   * Stop the agent by calling onStop() then cleanup().
   *
   * Call this for graceful shutdown before the agent is destroyed.
   */
  async stop(): Promise<void> {
    await this.onStop()
    await this.cleanup()
  }

  /**
   * Mark the agent as initialized.
   *
   * Call this from your init() implementation after setup is complete.
   * This updates the state.initialized flag to true.
   *
   * @protected
   */
  protected markInitialized(): void {
    this._state.initialized = true
  }

  /**
   * Update the last activity timestamp.
   *
   * Call this when the agent performs significant work.
   * Useful for tracking agent activity and implementing timeouts.
   *
   * @protected
   */
  protected updateActivity(): void {
    this._state.lastActivity = Date.now()
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Get a copy of the current agent state.
   *
   * Returns a shallow copy to prevent external mutation.
   * For custom state, override this method in your subclass.
   *
   * @returns Copy of current agent state
   */
  getState(): State {
    return { ...this._state }
  }

  // ============================================
  // Message Handling Interface
  // ============================================

  /**
   * Handle an incoming message (required override).
   *
   * Subclasses must implement this to:
   * - Route messages to registered handlers by type
   * - Process message payloads
   * - Return appropriate responses
   *
   * @param _message - The incoming message to handle
   * @returns Response data (type depends on message type)
   * @throws Error if not implemented (subclass must override)
   *
   * @example
   * ```typescript
   * async handleMessage(message: AgentMessage): Promise<unknown> {
   *   await this.updateActivity()
   *   const handler = this.getHandler(message.type)
   *   if (handler) {
   *     try {
   *       return await handler(message)
   *     } catch (error) {
   *       await this.onError(error as Error, message)
   *       throw error
   *     }
   *   }
   *   throw new Error(`Unknown message type: ${message.type}`)
   * }
   * ```
   */
  async handleMessage(_message: AgentMessage): Promise<unknown> {
    throw new Error('Agent.handleMessage() not implemented')
  }

  /**
   * Register a handler for a message type.
   *
   * Handlers are stored by type and can be retrieved via `getHandler()`.
   * Registering a handler for an existing type replaces the previous handler.
   *
   * @param type - The message type to handle
   * @param handler - The handler function
   *
   * @example
   * ```typescript
   * this.registerHandler('greet', async (msg) => {
   *   const { name } = msg.payload as { name: string }
   *   return `Hello, ${name}!`
   * })
   * ```
   */
  registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler)
  }

  /**
   * Get the registered handler for a message type.
   *
   * @param type - The message type to look up
   * @returns The handler function, or undefined if not registered
   */
  getHandler(type: string): MessageHandler | undefined {
    return this.handlers.get(type)
  }

  /**
   * Unregister a handler for a message type.
   *
   * @param type - The message type to unregister
   */
  unregisterHandler(type: string): void {
    this.handlers.delete(type)
  }

  /**
   * Check if a handler is registered for a message type.
   *
   * @param type - The message type to check
   * @returns true if a handler is registered
   */
  hasHandler(type: string): boolean {
    return this.handlers.has(type)
  }

  /**
   * Get all registered handler types.
   *
   * @returns Array of registered message types
   */
  getHandlerTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}
