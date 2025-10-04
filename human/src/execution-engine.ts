/**
 * Execution Engine - Durable Objects for Human Function State Management
 *
 * Manages async human function execution with:
 * - State persistence across Worker restarts
 * - Timeout handling with Workers Alarms
 * - Retry logic with exponential backoff
 * - Full audit trail
 * - Real-time WebSocket updates
 */

import { DurableObject } from 'cloudflare:workers'
import type {
  HumanFunction,
  ExecutionContext as TypesExecutionContext,
  ExecutionStatus,
  ExecutionRecord,
  HumanChannel,
} from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Internal execution state stored in Durable Objects Storage
 */
interface ExecutionState {
  // Identity
  executionId: string
  functionName: string

  // Function definition
  functionDef: HumanFunction<any, any>

  // Input/output
  input: any
  output?: any
  error?: {
    message: string
    stack?: string
  }

  // State
  status: ExecutionStatus

  // Assignment
  channel: HumanChannel
  assignedTo?: string
  assignedAt?: string
  respondedBy?: string
  respondedAt?: string

  // Timing
  createdAt: string
  startedAt?: string
  completedAt?: string
  timeoutAt: string

  // Retry tracking
  attempts: number
  maxRetries: number
  nextRetryAt?: string
  retryBackoff: 'linear' | 'exponential'
  retryDelayMs: number

  // Audit trail
  history: AuditEvent[]

  // WebSocket connections for real-time updates
  connections: Set<WebSocket>

  // Metadata
  metadata?: Record<string, any>
  correlationId?: string
}

/**
 * Audit event entry
 */
interface AuditEvent {
  timestamp: string
  type: 'created' | 'assigned' | 'started' | 'responded' | 'completed' | 'timeout' | 'retry' | 'escalated' | 'failed' | 'cancelled'
  actor?: string // User ID or 'system'
  data?: Record<string, any>
  message?: string
}

/**
 * Alarm state
 */
interface AlarmState {
  type: 'timeout' | 'retry'
  executionId: string
  scheduledFor: string
}

// ============================================================================
// Durable Object Class
// ============================================================================

/**
 * HumanFunctionExecution Durable Object
 *
 * Manages the lifecycle of a single human function execution.
 * Each execution gets its own Durable Object instance for:
 * - Isolated state management
 * - Automatic persistence
 * - Built-in concurrency control
 * - Alarm scheduling
 */
export class HumanFunctionExecution extends DurableObject {
  private state: ExecutionState | null = null
  private storage: DurableObjectStorage

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
    this.storage = ctx.storage
  }

  // ==========================================================================
  // Public Methods (RPC Interface)
  // ==========================================================================

  /**
   * Execute - Start a new human function execution
   *
   * @param functionDef - Function definition
   * @param input - Input data
   * @param context - Execution context (channel, assignee, metadata, etc.)
   * @returns Execution ID
   */
  async execute(
    functionDef: HumanFunction<any, any>,
    input: any,
    context: {
      channel?: HumanChannel
      assignee?: string
      timeout?: number
      metadata?: Record<string, any>
      correlationId?: string
    }
  ): Promise<string> {
    // Generate execution ID
    const executionId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Determine timeout
    const timeoutMs = context.timeout || functionDef.routing.timeout || 86400000 // Default 24 hours
    const timeoutAt = new Date(Date.now() + timeoutMs).toISOString()

    // Determine channel
    const channel = context.channel || functionDef.routing.channels[0]

    // Validate input
    try {
      functionDef.schema.input.parse(input)
    } catch (error) {
      throw new Error(`Invalid input: ${error}`)
    }

    // Initialize state
    this.state = {
      executionId,
      functionName: functionDef.name,
      functionDef,
      input,
      status: 'pending',
      channel,
      assignedTo: context.assignee,
      assignedAt: context.assignee ? now : undefined,
      createdAt: now,
      timeoutAt,
      attempts: 0,
      maxRetries: functionDef.routing.priority ? 3 : 1, // Higher priority gets more retries
      retryBackoff: 'exponential',
      retryDelayMs: 1000, // 1 second base delay
      history: [
        {
          timestamp: now,
          type: 'created',
          actor: 'system',
          message: 'Execution created',
          data: {
            functionName: functionDef.name,
            channel,
            timeoutAt,
          },
        },
      ],
      connections: new Set<WebSocket>(),
      metadata: context.metadata,
      correlationId: context.correlationId,
    }

    // Persist state
    await this.persistState()

    // Schedule timeout alarm
    await this.scheduleAlarm('timeout', timeoutAt)

    // Route to channels
    await this.routeToChannels()

    // Add assignment event if assigned
    if (context.assignee) {
      await this.addEvent({
        type: 'assigned',
        actor: 'system',
        message: `Assigned to ${context.assignee}`,
        data: { assignedTo: context.assignee },
      })
    }

    // Broadcast creation event
    this.broadcastUpdate({
      type: 'execution_created',
      executionId,
      data: {
        functionName: functionDef.name,
        status: 'pending',
        timeoutAt,
      },
    })

    return executionId
  }

  /**
   * Respond - Record human response
   *
   * @param output - Output data from human
   * @param respondedBy - User ID of responder
   * @returns Success status
   */
  async respond(output: any, respondedBy?: string): Promise<boolean> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    // Check if already completed
    if (this.state.status === 'completed' || this.state.status === 'cancelled') {
      return false
    }

    const now = new Date().toISOString()

    // Validate output
    try {
      this.state.functionDef.schema.output.parse(output)
    } catch (error) {
      throw new Error(`Invalid output: ${error}`)
    }

    // Update state
    this.state.output = output
    this.state.status = 'completed'
    this.state.respondedBy = respondedBy || 'anonymous'
    this.state.respondedAt = now
    this.state.completedAt = now

    // Add event
    await this.addEvent({
      type: 'responded',
      actor: respondedBy || 'anonymous',
      message: 'Response received',
      data: { output },
    })

    await this.addEvent({
      type: 'completed',
      actor: respondedBy || 'anonymous',
      message: 'Execution completed successfully',
      data: {
        duration: new Date(now).getTime() - new Date(this.state.createdAt).getTime(),
      },
    })

    // Cancel alarm
    await this.ctx.storage.deleteAlarm()

    // Persist state
    await this.persistState()

    // Call onComplete hook if defined
    if (this.state.functionDef.onComplete) {
      try {
        await this.state.functionDef.onComplete({
          executionId: this.state.executionId,
          output,
          completedAt: new Date(now),
          duration: new Date(now).getTime() - new Date(this.state.createdAt).getTime(),
          assignee: this.state.respondedBy,
          metadata: this.state.metadata,
        })
      } catch (error) {
        console.error('onComplete hook failed:', error)
      }
    }

    // Broadcast completion
    this.broadcastUpdate({
      type: 'execution_completed',
      executionId: this.state.executionId,
      data: {
        output,
        completedAt: now,
      },
    })

    return true
  }

  /**
   * Timeout - Handle execution timeout
   *
   * Called by Workers Alarms API when timeout is reached
   */
  async timeout(): Promise<void> {
    await this.loadState()

    if (!this.state) {
      console.error('Timeout called but no state found')
      return
    }

    // Check if already completed
    if (this.state.status === 'completed' || this.state.status === 'cancelled') {
      return
    }

    const now = new Date().toISOString()

    // Update state
    this.state.status = 'timeout'
    this.state.completedAt = now

    // Add event
    await this.addEvent({
      type: 'timeout',
      actor: 'system',
      message: 'Execution timed out',
      data: {
        attempts: this.state.attempts,
        timeoutAt: this.state.timeoutAt,
      },
    })

    // Execute timeout handler if defined
    let fallbackOutput: any = null
    if (this.state.functionDef.onTimeout) {
      try {
        fallbackOutput = await this.state.functionDef.onTimeout({
          executionId: this.state.executionId,
          functionName: this.state.functionName,
          input: this.state.input,
          startedAt: new Date(this.state.createdAt),
          channel: this.state.channel,
          assignee: this.state.assignedTo,
          metadata: this.state.metadata,
        } as TypesExecutionContext)

        this.state.output = fallbackOutput
        this.state.status = 'completed'

        await this.addEvent({
          type: 'completed',
          actor: 'system',
          message: 'Completed with fallback value from onTimeout',
          data: { fallbackOutput },
        })
      } catch (error) {
        console.error('onTimeout handler failed:', error)
        this.state.error = {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }
      }
    }

    // Persist state
    await this.persistState()

    // Broadcast timeout
    this.broadcastUpdate({
      type: 'execution_timeout',
      executionId: this.state.executionId,
      data: {
        timeoutAt: now,
        fallbackOutput,
      },
    })
  }

  /**
   * Escalate - Escalate to backup assignee
   *
   * @param reason - Reason for escalation
   * @param escalateTo - Backup assignee (optional, uses functionDef.routing.assignees)
   * @returns Success status
   */
  async escalate(reason: string, escalateTo?: string): Promise<boolean> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    // Check if already completed
    if (this.state.status === 'completed' || this.state.status === 'cancelled') {
      return false
    }

    const now = new Date().toISOString()

    // Determine escalation target
    const assignees = this.state.functionDef.routing.assignees
    const backupAssignee =
      escalateTo ||
      (Array.isArray(assignees) && assignees.length > 1 ? assignees[1] : undefined)

    if (!backupAssignee) {
      throw new Error('No backup assignee available for escalation')
    }

    // Update state
    this.state.assignedTo = backupAssignee
    this.state.assignedAt = now
    this.state.attempts++

    // Add event
    await this.addEvent({
      type: 'escalated',
      actor: 'system',
      message: `Escalated to ${backupAssignee}`,
      data: {
        reason,
        escalatedTo: backupAssignee,
        attempts: this.state.attempts,
      },
    })

    // Persist state
    await this.persistState()

    // Call onEscalate hook if defined
    if (this.state.functionDef.onEscalate) {
      try {
        await this.state.functionDef.onEscalate(
          {
            executionId: this.state.executionId,
            functionName: this.state.functionName,
            input: this.state.input,
            startedAt: new Date(this.state.createdAt),
            channel: this.state.channel,
            assignee: this.state.assignedTo,
            metadata: this.state.metadata,
          } as TypesExecutionContext,
          reason
        )
      } catch (error) {
        console.error('onEscalate hook failed:', error)
      }
    }

    // Re-route to new assignee
    await this.routeToChannels()

    return true
  }

  /**
   * Retry - Retry failed execution
   *
   * @returns Success status
   */
  async retry(): Promise<boolean> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    // Check if can retry
    if (this.state.attempts >= this.state.maxRetries) {
      return false
    }

    // Check if already completed
    if (this.state.status === 'completed' || this.state.status === 'cancelled') {
      return false
    }

    const now = new Date().toISOString()

    // Calculate retry delay
    const delay = this.calculateRetryDelay()
    const retryAt = new Date(Date.now() + delay).toISOString()

    // Update state
    this.state.attempts++
    this.state.nextRetryAt = retryAt
    this.state.status = 'pending'

    // Add event
    await this.addEvent({
      type: 'retry',
      actor: 'system',
      message: `Retrying execution (attempt ${this.state.attempts}/${this.state.maxRetries})`,
      data: {
        attempts: this.state.attempts,
        retryAt,
        delay,
      },
    })

    // Persist state
    await this.persistState()

    // Schedule retry alarm
    await this.scheduleAlarm('retry', retryAt)

    return true
  }

  /**
   * Cancel - Cancel pending execution
   *
   * @param reason - Reason for cancellation
   * @returns Success status
   */
  async cancel(reason: string): Promise<boolean> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    // Check if already completed
    if (this.state.status === 'completed' || this.state.status === 'cancelled') {
      return false
    }

    const now = new Date().toISOString()

    // Update state
    this.state.status = 'cancelled'
    this.state.completedAt = now

    // Add event
    await this.addEvent({
      type: 'cancelled',
      actor: 'system',
      message: reason,
      data: { reason },
    })

    // Cancel alarm
    await this.ctx.storage.deleteAlarm()

    // Persist state
    await this.persistState()

    // Call onCancel hook if defined
    if (this.state.functionDef.onCancel) {
      try {
        await this.state.functionDef.onCancel({
          executionId: this.state.executionId,
          functionName: this.state.functionName,
          input: this.state.input,
          startedAt: new Date(this.state.createdAt),
          channel: this.state.channel,
          assignee: this.state.assignedTo,
          metadata: this.state.metadata,
        } as TypesExecutionContext)
      } catch (error) {
        console.error('onCancel hook failed:', error)
      }
    }

    return true
  }

  /**
   * GetStatus - Get current execution status
   *
   * @returns Execution record
   */
  async getStatus(): Promise<ExecutionRecord> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    return {
      executionId: this.state.executionId,
      functionName: this.state.functionName,
      status: this.state.status,
      input: this.state.input,
      output: this.state.output,
      channel: this.state.channel,
      assignee: this.state.assignedTo,
      createdAt: new Date(this.state.createdAt),
      startedAt: this.state.startedAt ? new Date(this.state.startedAt) : undefined,
      completedAt: this.state.completedAt ? new Date(this.state.completedAt) : undefined,
      error: this.state.error,
      metadata: this.state.metadata,
      correlationId: this.state.correlationId,
    }
  }

  /**
   * GetHistory - Get full audit trail
   *
   * @returns Array of audit events
   */
  async getHistory(): Promise<AuditEvent[]> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    return this.state.history
  }

  /**
   * ConnectWebSocket - Add WebSocket connection for real-time updates
   *
   * @param ws - WebSocket connection
   */
  async connectWebSocket(ws: WebSocket): Promise<void> {
    await this.loadState()

    if (!this.state) {
      throw new Error('Execution not found')
    }

    this.state.connections.add(ws)

    // Send current state
    ws.send(
      JSON.stringify({
        type: 'execution_status',
        executionId: this.state.executionId,
        data: await this.getStatus(),
        timestamp: new Date().toISOString(),
      })
    )

    // Handle disconnect
    ws.addEventListener('close', () => {
      this.state?.connections.delete(ws)
    })
  }

  // ==========================================================================
  // Workers Alarms API
  // ==========================================================================

  /**
   * alarm - Called by Workers when scheduled alarm triggers
   */
  async alarm() {
    await this.loadState()

    if (!this.state) {
      console.error('Alarm triggered but no state found')
      return
    }

    // Check alarm type
    const now = new Date()
    const timeoutDate = new Date(this.state.timeoutAt)

    if (now >= timeoutDate) {
      // Timeout alarm
      await this.timeout()
    } else if (this.state.nextRetryAt) {
      const retryDate = new Date(this.state.nextRetryAt)
      if (now >= retryDate) {
        // Retry alarm - route to channels again
        this.state.nextRetryAt = undefined
        await this.persistState()
        await this.routeToChannels()
      }
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Load state from Durable Objects Storage
   */
  private async loadState(): Promise<void> {
    if (this.state) return

    const stored = await this.storage.get<ExecutionState>('state')
    if (stored) {
      this.state = stored
      // Restore connections as empty Set (WebSockets can't be persisted)
      this.state.connections = new Set<WebSocket>()
    }
  }

  /**
   * Persist state to Durable Objects Storage
   */
  private async persistState(): Promise<void> {
    if (!this.state) return

    // Create serializable copy (exclude WebSockets)
    const { connections, ...serializable } = this.state

    await this.storage.put('state', serializable)
  }

  /**
   * Add event to audit trail
   */
  private async addEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    if (!this.state) return

    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    this.state.history.push(auditEvent)
    await this.persistState()
  }

  /**
   * Schedule alarm using Workers Alarms API
   */
  private async scheduleAlarm(type: 'timeout' | 'retry', scheduledFor: string): Promise<void> {
    const alarmTime = new Date(scheduledFor).getTime()
    await this.ctx.storage.setAlarm(alarmTime)

    // Store alarm metadata
    const alarmState: AlarmState = {
      type,
      executionId: this.state!.executionId,
      scheduledFor,
    }
    await this.storage.put('alarm', alarmState)
  }

  /**
   * Calculate retry delay with backoff
   */
  private calculateRetryDelay(): number {
    if (!this.state) return 1000

    const baseDelay = this.state.retryDelayMs

    if (this.state.retryBackoff === 'exponential') {
      // Exponential backoff: delay * 2^attempts
      return baseDelay * Math.pow(2, this.state.attempts)
    } else {
      // Linear backoff: delay * (attempts + 1)
      return baseDelay * (this.state.attempts + 1)
    }
  }

  /**
   * Route execution to configured channels
   */
  private async routeToChannels(): Promise<void> {
    if (!this.state) return

    // In production, send to actual channels
    // For now, log routing
    console.log('Routing execution to channels:', {
      executionId: this.state.executionId,
      functionName: this.state.functionName,
      channels: this.state.functionDef.routing.channels,
      assignee: this.state.assignedTo,
    })

    // TODO: Integrate with email, Slack, webhooks, etc.
    // - Send email notification
    // - Post to Slack channel
    // - Call webhook
    // - Update UI task queue
  }

  /**
   * Broadcast update to all connected WebSockets
   */
  private broadcastUpdate(message: any): void {
    if (!this.state) return

    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    })

    for (const ws of this.state.connections) {
      try {
        ws.send(payload)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        this.state.connections.delete(ws)
      }
    }
  }
}
