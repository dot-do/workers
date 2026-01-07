/**
 * agent.do - Persistent AI Agents with Memory, Goals, and Learning
 *
 * A Durable Object base class for building AI agents that remember everything,
 * track goals, execute actions, and improve over time.
 *
 * @see https://agent.do
 *
 * @example
 * ```typescript
 * import { Agent } from 'agent.do'
 *
 * export class CustomerSupportAgent extends Agent {
 *   async init(): Promise<void> {
 *     await super.init()
 *
 *     // Register capabilities
 *     this.registerAction('answerQuestion', {
 *       description: 'Answer customer questions using knowledge base',
 *       handler: async ({ question }) => this.answer(question)
 *     })
 *
 *     // Set a goal
 *     await this.setGoal({
 *       description: 'Resolve 95% of tickets without escalation',
 *       metric: 'resolution_rate',
 *       target: 0.95
 *     })
 *   }
 *
 *   private async answer(question: string) {
 *     // Agent remembers past interactions
 *     const context = await this.getRelevantMemories(question)
 *     const response = await this.think(question, context)
 *
 *     // Learn from the interaction
 *     await this.remember({
 *       type: 'interaction',
 *       question,
 *       response,
 *       timestamp: Date.now()
 *     })
 *
 *     return response
 *   }
 * }
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Minimal Durable Object state interface
 */
export interface DOState {
  readonly id: DurableObjectId
  readonly storage: DOStorage
  blockConcurrencyWhile(callback: () => Promise<void>): void
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getWebSockets(tag?: string): WebSocket[]
}

export interface DurableObjectId {
  readonly name?: string
  toString(): string
  equals(other: DurableObjectId): boolean
}

export interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
  getAlarm(): Promise<number | null>
  setAlarm(scheduledTime: number | Date): Promise<void>
  deleteAlarm(): Promise<void>
}

export interface DOEnv {
  [key: string]: unknown
}

/**
 * Memory entry stored in agent's persistent memory
 */
export interface Memory {
  /** Unique memory ID */
  id: string
  /** Memory type for categorization */
  type: string
  /** Memory content (structured data) */
  content: unknown
  /** Importance score (0-1, higher = more important) */
  importance: number
  /** Unix timestamp when memory was created */
  createdAt: number
  /** Unix timestamp when memory was last accessed */
  lastAccessedAt: number
  /** Number of times this memory has been recalled */
  accessCount: number
  /** Optional tags for semantic retrieval */
  tags?: string[]
  /** Optional embedding vector for similarity search */
  embedding?: number[]
  /** Optional source (conversation, action, learning, etc.) */
  source?: string
  /** Optional reference to related memories */
  relatedMemories?: string[]
}

/**
 * Conversation message in agent's history
 */
export interface ConversationMessage {
  /** Unique message ID */
  id: string
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool'
  /** Message content */
  content: string
  /** Unix timestamp */
  timestamp: number
  /** Optional tool call ID */
  toolCallId?: string
  /** Optional tool name if role is 'tool' */
  toolName?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Conversation session grouping messages
 */
export interface Conversation {
  /** Unique conversation ID */
  id: string
  /** Conversation messages */
  messages: ConversationMessage[]
  /** Unix timestamp when conversation started */
  startedAt: number
  /** Unix timestamp of last message */
  lastMessageAt: number
  /** Optional conversation title/summary */
  title?: string
  /** Optional tags */
  tags?: string[]
  /** Whether conversation is active */
  active: boolean
}

/**
 * Action result returned from action execution
 */
export interface ActionResult<T = unknown> {
  /** Whether the action succeeded */
  success: boolean
  /** Result data (if success is true) */
  data?: T
  /** Error message (if success is false) */
  error?: string
  /** Error code for programmatic handling */
  errorCode?: string
  /** Execution metadata */
  metadata?: {
    durationMs: number
    startedAt: number
    completedAt: number
  }
}

/**
 * Action parameter definition
 */
export interface ActionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  description?: string
  default?: unknown
}

/**
 * Action handler function type
 */
export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams
) => Promise<TResult>

/**
 * Complete action definition
 */
export interface ActionDefinition<TParams = unknown, TResult = unknown> {
  name?: string
  description?: string
  parameters?: Record<string, ActionParameter>
  handler: ActionHandler<TParams, TResult>
  requiresAuth?: boolean
  rateLimit?: number
}

/**
 * Action execution record for tracking
 */
export interface ActionExecution {
  /** Unique execution ID */
  id: string
  /** Action name that was executed */
  action: string
  /** Parameters passed to action */
  params: unknown
  /** Action result */
  result: ActionResult
  /** Unix timestamp when execution started */
  startedAt: number
  /** Unix timestamp when execution completed */
  completedAt: number
  /** Optional conversation ID this action was part of */
  conversationId?: string
  /** Optional feedback on the action (for learning) */
  feedback?: {
    rating: number
    comment?: string
  }
}

/**
 * Goal definition for agent planning
 */
export interface Goal {
  /** Unique goal ID */
  id: string
  /** Human-readable goal description */
  description: string
  /** Goal status */
  status: 'active' | 'completed' | 'failed' | 'paused'
  /** Goal priority (1-5, 1 = highest) */
  priority: number
  /** Optional metric to track */
  metric?: string
  /** Optional target value for metric */
  target?: number
  /** Current progress (0-1) */
  progress: number
  /** Unix timestamp when goal was created */
  createdAt: number
  /** Optional deadline timestamp */
  deadline?: number
  /** Optional completion timestamp */
  completedAt?: number
  /** Sub-goals for complex objectives */
  subGoals?: Goal[]
  /** Parent goal ID if this is a sub-goal */
  parentGoalId?: string
  /** Optional notes on progress */
  notes?: string[]
}

/**
 * Learning record for improvement tracking
 */
export interface Learning {
  /** Unique learning ID */
  id: string
  /** What was learned */
  insight: string
  /** Category of learning */
  category: 'behavior' | 'knowledge' | 'skill' | 'preference' | 'error'
  /** Confidence in the learning (0-1) */
  confidence: number
  /** Source of the learning */
  source: {
    type: 'interaction' | 'feedback' | 'reflection' | 'error'
    referenceId?: string
  }
  /** Unix timestamp when learned */
  learnedAt: number
  /** Number of times this learning was applied */
  applicationCount: number
  /** Whether this learning is still valid */
  valid: boolean
}

/**
 * Agent personality/behavior configuration
 */
export interface AgentPersonality {
  /** Agent's name */
  name: string
  /** Agent's role/purpose */
  role: string
  /** Personality traits */
  traits: string[]
  /** Communication style */
  style: 'formal' | 'casual' | 'technical' | 'friendly'
  /** Custom system prompt additions */
  systemPrompt?: string
  /** Behavioral constraints */
  constraints?: string[]
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name?: string
  version?: string
  [key: string]: unknown
}

/**
 * Agent state
 */
export interface AgentDOState {
  /** Whether the agent has been initialized */
  initialized: boolean
  /** Unix timestamp when started */
  startedAt?: number
  /** Unix timestamp of last activity */
  lastActivity?: number
  /** Agent personality configuration */
  personality?: AgentPersonality
  /** Current active conversation ID */
  activeConversationId?: string
  /** Current active goals count */
  activeGoalsCount: number
  /** Total memories count */
  memoriesCount: number
  /** Total learnings count */
  learningsCount: number
  /** Total actions executed */
  actionsExecuted: number
}

/**
 * Options for memory retrieval
 */
export interface MemoryQueryOptions {
  type?: string
  tags?: string[]
  minImportance?: number
  since?: number
  limit?: number
  sortBy?: 'importance' | 'recency' | 'accessCount'
}

/**
 * Options for conversation retrieval
 */
export interface ConversationQueryOptions {
  activeOnly?: boolean
  tags?: string[]
  since?: number
  limit?: number
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string
  action: string
  params?: unknown
  dependsOn?: string[]
  onError?: 'fail' | 'continue' | 'retry'
  maxRetries?: number
}

/**
 * Workflow definition
 */
export interface Workflow {
  id: string
  name?: string
  steps: WorkflowStep[]
  timeout?: number
  context?: Record<string, unknown>
}

// ============================================================================
// Agent Class
// ============================================================================

/**
 * Agent - Persistent AI Agent Durable Object
 *
 * A base class for building AI agents with:
 * - Long-term memory persistence
 * - Conversation history tracking
 * - Action execution logging
 * - Goal tracking and planning
 * - Learning and improvement over time
 *
 * @example
 * ```typescript
 * export class MyAgent extends Agent {
 *   async init() {
 *     await super.init()
 *
 *     // Configure personality
 *     await this.setPersonality({
 *       name: 'Assistant',
 *       role: 'Customer Support Agent',
 *       traits: ['helpful', 'patient', 'knowledgeable'],
 *       style: 'friendly'
 *     })
 *
 *     // Register actions
 *     this.registerAction('lookup', {
 *       description: 'Look up information in knowledge base',
 *       handler: async ({ query }) => this.lookup(query)
 *     })
 *   }
 * }
 * ```
 */
export class Agent<Env extends DOEnv = DOEnv> {
  protected readonly ctx: DOState
  protected readonly env: Env
  protected readonly config?: AgentConfig

  /** Agent state */
  private _state: AgentDOState = {
    initialized: false,
    activeGoalsCount: 0,
    memoriesCount: 0,
    learningsCount: 0,
    actionsExecuted: 0,
  }

  /** Registered actions */
  private readonly _actions: Map<string, ActionDefinition> = new Map()

  constructor(ctx: DOState, env: Env, config?: AgentConfig) {
    this.ctx = ctx
    this.env = env
    this.config = config
  }

  /**
   * Get the unique agent ID
   */
  get id(): string {
    return this.ctx.id.toString()
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  /**
   * Initialize the agent
   *
   * Loads persisted state including memories, goals, and learnings.
   * Subclasses should call super.init() first.
   */
  async init(): Promise<void> {
    // Load persisted state
    const savedState = await this.ctx.storage.get<AgentDOState>('agent:state')
    if (savedState) {
      this._state = { ...this._state, ...savedState }
    }

    // Load counts from storage
    this._state.memoriesCount = await this.countStorageKeys('memory:')
    this._state.activeGoalsCount = await this.countActiveGoals()
    this._state.learningsCount = await this.countStorageKeys('learning:')

    this._state.initialized = true
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    await this.init()
    this._state.startedAt = Date.now()
  }

  /**
   * Stop the agent and persist state
   */
  async stop(): Promise<void> {
    await this.cleanup()
  }

  /**
   * Clean up and persist agent state
   */
  async cleanup(): Promise<void> {
    await this.ctx.storage.put('agent:state', this._state)
  }

  /**
   * Handle HTTP requests
   */
  async fetch(_request: Request): Promise<Response> {
    return new Response('Agent.fetch() not implemented', { status: 501 })
  }

  // ============================================
  // Action System
  // ============================================

  /**
   * Register an action handler
   */
  registerAction<TParams = unknown, TResult = unknown>(
    name: string,
    definition: ActionDefinition<TParams, TResult>
  ): void {
    this._actions.set(name, definition as ActionDefinition)
  }

  /**
   * Unregister an action
   */
  unregisterAction(name: string): boolean {
    return this._actions.delete(name)
  }

  /**
   * Check if an action is registered
   */
  hasAction(name: string): boolean {
    return this._actions.has(name)
  }

  /**
   * List all registered actions
   */
  listActions(): Array<{ name: string; description?: string; parameters?: Record<string, ActionParameter> }> {
    const actions: Array<{ name: string; description?: string; parameters?: Record<string, ActionParameter> }> = []
    for (const [name, def] of this._actions.entries()) {
      actions.push({
        name,
        description: def.description,
        parameters: def.parameters,
      })
    }
    return actions
  }

  /**
   * Execute a registered action
   */
  async executeAction<TResult = unknown>(
    name: string,
    params: unknown = {}
  ): Promise<ActionResult<TResult>> {
    const startedAt = Date.now()

    const action = this._actions.get(name)
    if (!action) {
      return {
        success: false,
        error: `Action not found: ${name}`,
        errorCode: 'ACTION_NOT_FOUND',
        metadata: {
          durationMs: Date.now() - startedAt,
          startedAt,
          completedAt: Date.now(),
        },
      }
    }

    try {
      const data = await action.handler(params)
      const completedAt = Date.now()
      return {
        success: true,
        data: data as TResult,
        metadata: {
          durationMs: completedAt - startedAt,
          startedAt,
          completedAt,
        },
      }
    } catch (error) {
      const completedAt = Date.now()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'EXECUTION_ERROR',
        metadata: {
          durationMs: completedAt - startedAt,
          startedAt,
          completedAt,
        },
      }
    }
  }

  // ============================================
  // Memory System
  // ============================================

  /**
   * Store a memory
   */
  async remember(
    memory: Omit<Memory, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>
  ): Promise<Memory> {
    const now = Date.now()
    const id = crypto.randomUUID()

    const fullMemory: Memory = {
      ...memory,
      id,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    }

    await this.ctx.storage.put(`memory:${id}`, fullMemory)
    this._state.memoriesCount++

    return fullMemory
  }

  /**
   * Recall a specific memory by ID
   */
  async recall(memoryId: string): Promise<Memory | null> {
    const memory = await this.ctx.storage.get<Memory>(`memory:${memoryId}`)
    if (!memory) return null

    // Update access statistics
    memory.lastAccessedAt = Date.now()
    memory.accessCount++
    await this.ctx.storage.put(`memory:${memoryId}`, memory)

    return memory
  }

  /**
   * Query memories based on criteria
   */
  async getMemories(options?: MemoryQueryOptions): Promise<Memory[]> {
    const allMemories = await this.ctx.storage.list<Memory>({ prefix: 'memory:' })
    let memories = Array.from(allMemories.values())

    // Apply filters
    if (options?.type) {
      memories = memories.filter((m) => m.type === options.type)
    }

    if (options?.tags && options.tags.length > 0) {
      memories = memories.filter((m) =>
        m.tags?.some((t) => options.tags!.includes(t))
      )
    }

    if (options?.minImportance !== undefined) {
      memories = memories.filter((m) => m.importance >= options.minImportance!)
    }

    if (options?.since) {
      memories = memories.filter((m) => m.createdAt >= options.since!)
    }

    // Sort
    const sortBy = options?.sortBy ?? 'recency'
    switch (sortBy) {
      case 'importance':
        memories.sort((a, b) => b.importance - a.importance)
        break
      case 'recency':
        memories.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'accessCount':
        memories.sort((a, b) => b.accessCount - a.accessCount)
        break
    }

    // Apply limit
    if (options?.limit) {
      memories = memories.slice(0, options.limit)
    }

    return memories
  }

  /**
   * Get memories relevant to a query
   */
  async getRelevantMemories(
    _query: string,
    limit: number = 10
  ): Promise<Memory[]> {
    return this.getMemories({
      limit,
      sortBy: 'importance',
      minImportance: 0.3,
    })
  }

  /**
   * Forget a memory
   */
  async forget(memoryId: string): Promise<boolean> {
    const deleted = await this.ctx.storage.delete(`memory:${memoryId}`)
    if (deleted) {
      this._state.memoriesCount--
    }
    return deleted
  }

  /**
   * Clear all memories of a specific type
   */
  async clearMemories(type?: string): Promise<number> {
    const allMemories = await this.ctx.storage.list<Memory>({ prefix: 'memory:' })
    const toDelete: string[] = []

    for (const [key, memory] of allMemories) {
      if (!type || memory.type === type) {
        toDelete.push(key)
      }
    }

    if (toDelete.length > 0) {
      await this.ctx.storage.delete(toDelete)
      this._state.memoriesCount -= toDelete.length
    }

    return toDelete.length
  }

  // ============================================
  // Conversation History
  // ============================================

  /**
   * Start a new conversation
   */
  async startConversation(title?: string, tags?: string[]): Promise<Conversation> {
    const now = Date.now()
    const id = crypto.randomUUID()

    const conversation: Conversation = {
      id,
      messages: [],
      startedAt: now,
      lastMessageAt: now,
      title,
      tags,
      active: true,
    }

    await this.ctx.storage.put(`conversation:${id}`, conversation)
    this._state.activeConversationId = id

    return conversation
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<ConversationMessage> {
    const conversation = await this.ctx.storage.get<Conversation>(`conversation:${conversationId}`)
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    const now = Date.now()
    const fullMessage: ConversationMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: now,
    }

    conversation.messages.push(fullMessage)
    conversation.lastMessageAt = now

    await this.ctx.storage.put(`conversation:${conversationId}`, conversation)

    return fullMessage
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.ctx.storage.get<Conversation>(`conversation:${conversationId}`) ?? null
  }

  /**
   * Get the current active conversation
   */
  async getActiveConversation(): Promise<Conversation | null> {
    if (!this._state.activeConversationId) return null
    return this.getConversation(this._state.activeConversationId)
  }

  /**
   * List conversations
   */
  async getConversations(options?: ConversationQueryOptions): Promise<Conversation[]> {
    const allConversations = await this.ctx.storage.list<Conversation>({ prefix: 'conversation:' })
    let conversations = Array.from(allConversations.values())

    if (options?.activeOnly) {
      conversations = conversations.filter((c) => c.active)
    }

    if (options?.tags && options.tags.length > 0) {
      conversations = conversations.filter((c) =>
        c.tags?.some((t) => options.tags!.includes(t))
      )
    }

    if (options?.since) {
      conversations = conversations.filter((c) => c.startedAt >= options.since!)
    }

    // Sort by most recent
    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

    if (options?.limit) {
      conversations = conversations.slice(0, options.limit)
    }

    return conversations
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const conversation = await this.ctx.storage.get<Conversation>(`conversation:${conversationId}`)
    if (conversation) {
      conversation.active = false
      await this.ctx.storage.put(`conversation:${conversationId}`, conversation)

      if (this._state.activeConversationId === conversationId) {
        this._state.activeConversationId = undefined
      }
    }
  }

  // ============================================
  // Action Execution Tracking
  // ============================================

  /**
   * Execute and track an action
   */
  async executeTrackedAction<TResult = unknown>(
    name: string,
    params: unknown = {},
    conversationId?: string
  ): Promise<ActionExecution> {
    const startedAt = Date.now()
    const id = crypto.randomUUID()

    const result = await this.executeAction<TResult>(name, params)

    const completedAt = Date.now()

    const execution: ActionExecution = {
      id,
      action: name,
      params,
      result,
      startedAt,
      completedAt,
      conversationId,
    }

    await this.ctx.storage.put(`execution:${id}`, execution)
    this._state.actionsExecuted++

    return execution
  }

  /**
   * Record feedback on an action execution
   */
  async recordFeedback(
    executionId: string,
    feedback: ActionExecution['feedback']
  ): Promise<void> {
    const execution = await this.ctx.storage.get<ActionExecution>(`execution:${executionId}`)
    if (execution) {
      execution.feedback = feedback
      await this.ctx.storage.put(`execution:${executionId}`, execution)

      // Create a learning from negative feedback
      if (feedback && feedback.rating < 0.5) {
        await this.learn({
          insight: `Action '${execution.action}' received negative feedback: ${feedback.comment || 'No comment'}`,
          category: 'behavior',
          confidence: feedback.rating,
          source: { type: 'feedback', referenceId: executionId },
        })
      }
    }
  }

  /**
   * Get recent action executions
   */
  async getExecutions(options?: {
    action?: string
    conversationId?: string
    since?: number
    limit?: number
  }): Promise<ActionExecution[]> {
    const allExecutions = await this.ctx.storage.list<ActionExecution>({ prefix: 'execution:' })
    let executions = Array.from(allExecutions.values())

    if (options?.action) {
      executions = executions.filter((e) => e.action === options.action)
    }

    if (options?.conversationId) {
      executions = executions.filter((e) => e.conversationId === options.conversationId)
    }

    if (options?.since) {
      executions = executions.filter((e) => e.startedAt >= options.since!)
    }

    // Sort by most recent
    executions.sort((a, b) => b.startedAt - a.startedAt)

    if (options?.limit) {
      executions = executions.slice(0, options.limit)
    }

    return executions
  }

  // ============================================
  // Goal Tracking
  // ============================================

  /**
   * Set a new goal
   */
  async setGoal(
    goal: Omit<Goal, 'id' | 'status' | 'progress' | 'createdAt'>
  ): Promise<Goal> {
    const id = crypto.randomUUID()

    const fullGoal: Goal = {
      ...goal,
      id,
      status: 'active',
      progress: 0,
      createdAt: Date.now(),
    }

    await this.ctx.storage.put(`goal:${id}`, fullGoal)
    this._state.activeGoalsCount++

    return fullGoal
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progress: number, notes?: string): Promise<Goal | null> {
    const goal = await this.ctx.storage.get<Goal>(`goal:${goalId}`)
    if (!goal) return null

    goal.progress = Math.min(1, Math.max(0, progress))

    if (notes) {
      goal.notes = goal.notes || []
      goal.notes.push(`[${new Date().toISOString()}] ${notes}`)
    }

    // Auto-complete if progress reaches 100%
    if (goal.progress >= 1 && goal.status === 'active') {
      goal.status = 'completed'
      goal.completedAt = Date.now()
      this._state.activeGoalsCount--
    }

    await this.ctx.storage.put(`goal:${goalId}`, goal)

    return goal
  }

  /**
   * Get a goal by ID
   */
  async getGoal(goalId: string): Promise<Goal | null> {
    return this.ctx.storage.get<Goal>(`goal:${goalId}`) ?? null
  }

  /**
   * List goals
   */
  async getGoals(options?: {
    status?: Goal['status']
    priority?: number
    limit?: number
  }): Promise<Goal[]> {
    const allGoals = await this.ctx.storage.list<Goal>({ prefix: 'goal:' })
    let goals = Array.from(allGoals.values())

    if (options?.status) {
      goals = goals.filter((g) => g.status === options.status)
    }

    if (options?.priority) {
      goals = goals.filter((g) => g.priority === options.priority)
    }

    // Sort by priority then by creation date
    goals.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return b.createdAt - a.createdAt
    })

    if (options?.limit) {
      goals = goals.slice(0, options.limit)
    }

    return goals
  }

  /**
   * Complete a goal
   */
  async completeGoal(goalId: string): Promise<void> {
    const goal = await this.ctx.storage.get<Goal>(`goal:${goalId}`)
    if (goal && goal.status === 'active') {
      goal.status = 'completed'
      goal.progress = 1
      goal.completedAt = Date.now()
      await this.ctx.storage.put(`goal:${goalId}`, goal)
      this._state.activeGoalsCount--
    }
  }

  /**
   * Fail a goal
   */
  async failGoal(goalId: string, reason?: string): Promise<void> {
    const goal = await this.ctx.storage.get<Goal>(`goal:${goalId}`)
    if (goal && goal.status === 'active') {
      goal.status = 'failed'
      goal.completedAt = Date.now()
      if (reason) {
        goal.notes = goal.notes || []
        goal.notes.push(`[FAILED] ${reason}`)
      }
      await this.ctx.storage.put(`goal:${goalId}`, goal)
      this._state.activeGoalsCount--
    }
  }

  // ============================================
  // Learning System
  // ============================================

  /**
   * Record a learning
   */
  async learn(
    learning: Omit<Learning, 'id' | 'learnedAt' | 'applicationCount' | 'valid'>
  ): Promise<Learning> {
    const id = crypto.randomUUID()

    const fullLearning: Learning = {
      ...learning,
      id,
      learnedAt: Date.now(),
      applicationCount: 0,
      valid: true,
    }

    await this.ctx.storage.put(`learning:${id}`, fullLearning)
    this._state.learningsCount++

    return fullLearning
  }

  /**
   * Get learnings
   */
  async getLearnings(options?: {
    category?: Learning['category']
    minConfidence?: number
    validOnly?: boolean
    limit?: number
  }): Promise<Learning[]> {
    const allLearnings = await this.ctx.storage.list<Learning>({ prefix: 'learning:' })
    let learnings = Array.from(allLearnings.values())

    if (options?.category) {
      learnings = learnings.filter((l) => l.category === options.category)
    }

    if (options?.minConfidence !== undefined) {
      learnings = learnings.filter((l) => l.confidence >= options.minConfidence!)
    }

    if (options?.validOnly !== false) {
      learnings = learnings.filter((l) => l.valid)
    }

    // Sort by confidence then recency
    learnings.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence
      }
      return b.learnedAt - a.learnedAt
    })

    if (options?.limit) {
      learnings = learnings.slice(0, options.limit)
    }

    return learnings
  }

  /**
   * Apply a learning (increment application count)
   */
  async applyLearning(learningId: string): Promise<void> {
    const learning = await this.ctx.storage.get<Learning>(`learning:${learningId}`)
    if (learning) {
      learning.applicationCount++
      await this.ctx.storage.put(`learning:${learningId}`, learning)
    }
  }

  /**
   * Invalidate a learning
   */
  async invalidateLearning(learningId: string): Promise<void> {
    const learning = await this.ctx.storage.get<Learning>(`learning:${learningId}`)
    if (learning) {
      learning.valid = false
      await this.ctx.storage.put(`learning:${learningId}`, learning)
    }
  }

  // ============================================
  // Personality & Configuration
  // ============================================

  /**
   * Set agent personality
   */
  async setPersonality(personality: AgentPersonality): Promise<void> {
    this._state.personality = personality
    await this.ctx.storage.put('agent:state', this._state)
  }

  /**
   * Get agent personality
   */
  getPersonality(): AgentPersonality | undefined {
    return this._state.personality
  }

  // ============================================
  // Thinking & Planning (Override Points)
  // ============================================

  /**
   * Think about a query using context and learnings
   *
   * Override this method to implement your AI reasoning logic.
   */
  async think(_query: string, _context?: Memory[]): Promise<string> {
    throw new Error('Agent.think() must be implemented by subclass')
  }

  /**
   * Plan steps to achieve a goal
   *
   * Override this method to implement planning logic.
   */
  async plan(_goal: Goal): Promise<Workflow> {
    throw new Error('Agent.plan() must be implemented by subclass')
  }

  /**
   * Reflect on past actions and generate learnings
   */
  async reflect(): Promise<Learning[]> {
    const recentExecutions = await this.getExecutions({ limit: 50 })
    const failures = recentExecutions.filter((e) => !e.result.success)

    const learnings: Learning[] = []

    for (const failure of failures.slice(0, 5)) {
      const learning = await this.learn({
        insight: `Action '${failure.action}' failed with error: ${failure.result.error}`,
        category: 'error',
        confidence: 0.7,
        source: { type: 'reflection', referenceId: failure.id },
      })
      learnings.push(learning)
    }

    return learnings
  }

  // ============================================
  // State & Statistics
  // ============================================

  /**
   * Get agent state
   */
  getState(): AgentDOState {
    return { ...this._state }
  }

  /**
   * Get agent statistics summary
   */
  async getStats(): Promise<{
    memories: number
    conversations: number
    activeGoals: number
    completedGoals: number
    learnings: number
    actionsExecuted: number
    uptime: number
  }> {
    const goals = await this.getGoals()
    const conversations = await this.getConversations()

    return {
      memories: this._state.memoriesCount,
      conversations: conversations.length,
      activeGoals: goals.filter((g) => g.status === 'active').length,
      completedGoals: goals.filter((g) => g.status === 'completed').length,
      learnings: this._state.learningsCount,
      actionsExecuted: this._state.actionsExecuted,
      uptime: this._state.startedAt ? Date.now() - this._state.startedAt : 0,
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async countStorageKeys(prefix: string): Promise<number> {
    const items = await this.ctx.storage.list({ prefix })
    return items.size
  }

  private async countActiveGoals(): Promise<number> {
    const goals = await this.ctx.storage.list<Goal>({ prefix: 'goal:' })
    return Array.from(goals.values()).filter((g) => g.status === 'active').length
  }

  /**
   * Update last activity timestamp
   */
  protected updateActivity(): void {
    this._state.lastActivity = Date.now()
  }
}

// ============================================================================
// Exports
// ============================================================================

// Named export
export { Agent }

// Default export
export default Agent

// Legacy alias for backward compatibility
export { Agent as AgentDO }
