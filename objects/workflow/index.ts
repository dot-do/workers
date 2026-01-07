/**
 * workflow.do - Durable Workflow Orchestration
 *
 * A Durable Object for multi-step workflow execution with:
 * - State persistence across steps
 * - Automatic retry and failure handling
 * - Branching and conditional logic
 * - Full history and replay capability
 * - Event-driven and scheduled triggers
 *
 * Extends dotdo for database and AI capabilities.
 */

import { DO } from 'dotdo'

// ============================================================================
// Types
// ============================================================================

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting'

export interface WorkflowStep {
  /** Unique step identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Action to execute (function name or service call) */
  action: string
  /** Input parameters for the action */
  params?: Record<string, unknown>
  /** Steps that must complete before this one */
  dependsOn?: string[]
  /** Condition expression - step runs only if true */
  condition?: string
  /** Wait duration before executing (e.g., '5m', '1h', '7d') */
  wait?: string
  /** Error handling strategy */
  onError?: 'fail' | 'continue' | 'retry' | 'branch'
  /** Maximum retry attempts */
  maxRetries?: number
  /** Delay between retries (e.g., '30s', '5m') */
  retryDelay?: string
  /** Branch to execute on error */
  errorBranch?: string
  /** Timeout for this step */
  timeout?: string
}

export interface WorkflowDefinition {
  /** Unique workflow identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Description of what this workflow does */
  description?: string
  /** Workflow steps */
  steps: WorkflowStep[]
  /** Default timeout for the entire workflow */
  timeout?: string
  /** Initial context/state */
  context?: Record<string, unknown>
  /** Event triggers ($.on.Noun.event patterns) */
  triggers?: WorkflowTrigger[]
  /** Schedule triggers ($.every patterns) */
  schedules?: WorkflowSchedule[]
  /** Version for optimistic locking */
  version?: number
}

export interface WorkflowTrigger {
  /** Event pattern (e.g., 'Customer.created', 'Order.placed') */
  event: string
  /** Optional filter condition */
  condition?: string
}

export interface WorkflowSchedule {
  /** Cron expression or natural language (e.g., 'every 5 minutes', '0 9 * * MON') */
  schedule: string
  /** Timezone for schedule evaluation */
  timezone?: string
}

export interface StepResult {
  /** Step ID */
  stepId: string
  /** Execution status */
  status: StepStatus
  /** Step output data */
  output?: unknown
  /** Error message if failed */
  error?: string
  /** Error stack trace */
  stack?: string
  /** When the step started */
  startedAt?: number
  /** When the step completed */
  completedAt?: number
  /** Number of retry attempts */
  retries?: number
  /** Duration in milliseconds */
  duration?: number
}

export interface WorkflowExecution {
  /** Unique execution ID */
  id: string
  /** Workflow definition ID */
  workflowId: string
  /** Current status */
  status: WorkflowStatus
  /** Input provided when started */
  input: Record<string, unknown>
  /** Accumulated state/context */
  state: Record<string, unknown>
  /** Final output when completed */
  output?: unknown
  /** Error message if failed */
  error?: string
  /** Index of current step being executed */
  currentStepIndex: number
  /** IDs of completed steps */
  completedSteps: string[]
  /** Results for each step */
  stepResults: Record<string, StepResult>
  /** When execution started */
  startedAt: number
  /** When execution completed */
  completedAt?: number
  /** Resume information for paused workflows */
  resumePoint?: ResumePoint
  /** Execution history for replay */
  history: HistoryEntry[]
  /** Parent execution ID (for sub-workflows) */
  parentExecutionId?: string
  /** Trigger that started this execution */
  triggeredBy?: { type: 'manual' | 'event' | 'schedule'; source?: string }
}

export interface ResumePoint {
  /** Step ID to resume from */
  stepId: string
  /** Step index to resume from */
  stepIndex: number
  /** Current retry count */
  retryCount: number
  /** State at pause time */
  pausedState?: Record<string, unknown>
}

export interface HistoryEntry {
  /** When this entry was created */
  timestamp: number
  /** Type of event */
  type: 'start' | 'step_start' | 'step_complete' | 'step_fail' | 'step_skip' | 'wait' | 'resume' | 'pause' | 'complete' | 'fail' | 'cancel' | 'retry'
  /** Step ID if applicable */
  stepId?: string
  /** Event data */
  data?: unknown
  /** Human-readable message */
  message?: string
}

export interface WorkflowConfig {
  /** Maximum concurrent executions per workflow */
  maxConcurrent?: number
  /** Default retry configuration */
  defaultRetry?: { maxAttempts: number; delay: string }
  /** Default timeout for steps */
  defaultStepTimeout?: string
  /** Default timeout for workflows */
  defaultWorkflowTimeout?: string
  /** How long to keep completed execution history */
  historyRetention?: string
}

// ============================================================================
// Workflow Durable Object
// ============================================================================

export class Workflow extends DO {
  private config: WorkflowConfig = {}

  /**
   * Configure the workflow engine
   */
  configure(config: WorkflowConfig): this {
    this.config = { ...this.config, ...config }
    return this
  }

  // --------------------------------------------------------------------------
  // Workflow Definition Management
  // --------------------------------------------------------------------------

  /**
   * Register a workflow definition
   */
  async register(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
    const existing = await this.getDefinition(definition.id)
    const now = Date.now()

    const stored: StoredWorkflowDefinition = {
      ...definition,
      version: existing ? (existing.version || 0) + 1 : 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    await this.ctx.storage.put(`workflow:${definition.id}`, stored)
    this.addHistory(definition.id, 'workflow_registered', { version: stored.version })

    return stored
  }

  /**
   * Get a workflow definition
   */
  async getDefinition(workflowId: string): Promise<StoredWorkflowDefinition | null> {
    return await this.ctx.storage.get<StoredWorkflowDefinition>(`workflow:${workflowId}`) || null
  }

  /**
   * List all workflow definitions
   */
  async listDefinitions(): Promise<StoredWorkflowDefinition[]> {
    const entries = await this.ctx.storage.list<StoredWorkflowDefinition>({ prefix: 'workflow:' })
    return [...entries.values()]
  }

  /**
   * Delete a workflow definition
   */
  async deleteDefinition(workflowId: string): Promise<boolean> {
    const existing = await this.getDefinition(workflowId)
    if (!existing) return false

    await this.ctx.storage.delete(`workflow:${workflowId}`)
    return true
  }

  // --------------------------------------------------------------------------
  // Workflow Execution
  // --------------------------------------------------------------------------

  /**
   * Start a new workflow execution
   */
  async start(
    workflowId: string,
    input: Record<string, unknown> = {},
    options: { executionId?: string; triggeredBy?: WorkflowExecution['triggeredBy'] } = {}
  ): Promise<WorkflowExecution> {
    const definition = await this.getDefinition(workflowId)
    if (!definition) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const executionId = options.executionId || this.generateId()
    const now = Date.now()

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      input,
      state: { ...definition.context, ...input },
      currentStepIndex: 0,
      completedSteps: [],
      stepResults: {},
      startedAt: now,
      history: [
        {
          timestamp: now,
          type: 'start',
          message: `Workflow started: ${definition.name || workflowId}`,
          data: { input },
        },
      ],
      triggeredBy: options.triggeredBy || { type: 'manual' },
    }

    await this.saveExecution(execution)

    // Schedule immediate execution
    this.ctx.waitUntil(this.runExecution(execution, definition))

    return execution
  }

  /**
   * Execute workflow steps
   */
  private async runExecution(
    execution: WorkflowExecution,
    definition: StoredWorkflowDefinition
  ): Promise<void> {
    execution.status = 'running'
    await this.saveExecution(execution)

    try {
      while (execution.currentStepIndex < definition.steps.length) {
        if (execution.status === 'paused' || execution.status === 'cancelled') {
          return
        }

        const step = definition.steps[execution.currentStepIndex]

        // Check dependencies
        if (step.dependsOn?.length) {
          const unmetDeps = step.dependsOn.filter((depId) => !execution.completedSteps.includes(depId))
          if (unmetDeps.length > 0) {
            // Skip to next step, will come back when deps are met
            execution.currentStepIndex++
            continue
          }
        }

        // Evaluate condition
        if (step.condition && !this.evaluateCondition(step.condition, execution.state)) {
          await this.skipStep(execution, step)
          execution.currentStepIndex++
          continue
        }

        // Handle wait
        if (step.wait) {
          const waitMs = this.parseDuration(step.wait)
          execution.status = 'waiting'
          this.addExecutionHistory(execution, 'wait', step.id, { duration: step.wait })
          await this.saveExecution(execution)

          // Schedule alarm to resume
          await this.ctx.storage.setAlarm(Date.now() + waitMs)
          return
        }

        // Execute step
        const result = await this.executeStep(execution, step, definition)

        if (result.status === 'failed' && step.onError !== 'continue') {
          if (step.onError === 'retry' && (result.retries || 0) < (step.maxRetries || 3)) {
            // Retry with backoff
            const delay = this.parseDuration(step.retryDelay || '30s')
            await this.ctx.storage.setAlarm(Date.now() + delay)
            execution.resumePoint = {
              stepId: step.id,
              stepIndex: execution.currentStepIndex,
              retryCount: (result.retries || 0) + 1,
            }
            await this.saveExecution(execution)
            return
          }

          if (step.onError === 'branch' && step.errorBranch) {
            // Jump to error branch step
            const branchIndex = definition.steps.findIndex((s) => s.id === step.errorBranch)
            if (branchIndex >= 0) {
              execution.currentStepIndex = branchIndex
              continue
            }
          }

          // Fail the workflow
          execution.status = 'failed'
          execution.error = result.error
          execution.completedAt = Date.now()
          this.addExecutionHistory(execution, 'fail', step.id, { error: result.error })
          await this.saveExecution(execution)
          return
        }

        // Store result and advance
        execution.stepResults[step.id] = result
        if (result.status === 'completed') {
          execution.completedSteps.push(step.id)
          if (result.output !== undefined) {
            execution.state = { ...execution.state, [step.id]: result.output }
          }
        }
        execution.currentStepIndex++
        await this.saveExecution(execution)
      }

      // All steps completed
      execution.status = 'completed'
      execution.completedAt = Date.now()
      execution.output = execution.state
      this.addExecutionHistory(execution, 'complete', undefined, { output: execution.output })
      await this.saveExecution(execution)
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.completedAt = Date.now()
      this.addExecutionHistory(execution, 'fail', undefined, { error: execution.error })
      await this.saveExecution(execution)
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    execution: WorkflowExecution,
    step: WorkflowStep,
    _definition: StoredWorkflowDefinition
  ): Promise<StepResult> {
    const startedAt = Date.now()
    const existingResult = execution.stepResults[step.id]
    const retries = existingResult?.retries || 0

    this.addExecutionHistory(execution, 'step_start', step.id, {
      action: step.action,
      params: step.params,
      retryAttempt: retries,
    })

    try {
      // Resolve parameters with state interpolation
      const params = this.resolveParams(step.params || {}, execution.state)

      // Execute the action
      const output = await this.executeAction(step.action, params, execution.state)

      const result: StepResult = {
        stepId: step.id,
        status: 'completed',
        output,
        startedAt,
        completedAt: Date.now(),
        duration: Date.now() - startedAt,
        retries,
      }

      this.addExecutionHistory(execution, 'step_complete', step.id, { output, duration: result.duration })
      return result
    } catch (error) {
      const result: StepResult = {
        stepId: step.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        startedAt,
        completedAt: Date.now(),
        duration: Date.now() - startedAt,
        retries,
      }

      this.addExecutionHistory(execution, 'step_fail', step.id, { error: result.error, retryAttempt: retries })
      return result
    }
  }

  /**
   * Execute an action - override this to provide custom action handlers
   */
  protected async executeAction(
    action: string,
    params: Record<string, unknown>,
    state: Record<string, unknown>
  ): Promise<unknown> {
    // Check if it's a method on this class
    const method = (this as unknown as Record<string, unknown>)[action]
    if (typeof method === 'function') {
      return await method.call(this, params, state)
    }

    // Check for service binding calls (e.g., 'LLM.complete', 'Email.send')
    const [service, method_name] = action.split('.')
    if (service && method_name && this.env && (this.env as Record<string, unknown>)[service]) {
      const binding = (this.env as Record<string, unknown>)[service] as Record<string, unknown>
      if (typeof binding[method_name] === 'function') {
        return await (binding[method_name] as Function)(params)
      }
    }

    throw new Error(`Unknown action: ${action}`)
  }

  /**
   * Skip a step
   */
  private async skipStep(execution: WorkflowExecution, step: WorkflowStep): Promise<void> {
    execution.stepResults[step.id] = {
      stepId: step.id,
      status: 'skipped',
      completedAt: Date.now(),
    }
    this.addExecutionHistory(execution, 'step_skip', step.id, { reason: 'condition not met' })
  }

  // --------------------------------------------------------------------------
  // Execution Control
  // --------------------------------------------------------------------------

  /**
   * Get execution status
   */
  async status(executionId: string): Promise<WorkflowExecution | null> {
    return await this.ctx.storage.get<WorkflowExecution>(`execution:${executionId}`) || null
  }

  /**
   * Pause a running execution
   */
  async pause(executionId: string): Promise<WorkflowExecution> {
    const execution = await this.status(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    if (execution.status !== 'running' && execution.status !== 'waiting') {
      throw new Error(`Cannot pause execution in status: ${execution.status}`)
    }

    execution.status = 'paused'
    execution.resumePoint = {
      stepId: execution.completedSteps[execution.completedSteps.length - 1] || '',
      stepIndex: execution.currentStepIndex,
      retryCount: 0,
      pausedState: execution.state,
    }
    this.addExecutionHistory(execution, 'pause')
    await this.saveExecution(execution)

    return execution
  }

  /**
   * Resume a paused execution
   */
  async resume(executionId: string): Promise<WorkflowExecution> {
    const execution = await this.status(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume execution in status: ${execution.status}`)
    }

    const definition = await this.getDefinition(execution.workflowId)
    if (!definition) throw new Error(`Workflow not found: ${execution.workflowId}`)

    execution.status = 'running'
    if (execution.resumePoint?.pausedState) {
      execution.state = execution.resumePoint.pausedState
    }
    this.addExecutionHistory(execution, 'resume')
    await this.saveExecution(execution)

    // Continue execution
    this.ctx.waitUntil(this.runExecution(execution, definition))

    return execution
  }

  /**
   * Cancel an execution
   */
  async cancel(executionId: string): Promise<WorkflowExecution> {
    const execution = await this.status(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      throw new Error(`Cannot cancel execution in status: ${execution.status}`)
    }

    execution.status = 'cancelled'
    execution.completedAt = Date.now()
    this.addExecutionHistory(execution, 'cancel')
    await this.saveExecution(execution)

    return execution
  }

  /**
   * Retry a failed execution
   */
  async retry(executionId: string): Promise<WorkflowExecution> {
    const execution = await this.status(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    if (execution.status !== 'failed') {
      throw new Error(`Can only retry failed executions, current status: ${execution.status}`)
    }

    const definition = await this.getDefinition(execution.workflowId)
    if (!definition) throw new Error(`Workflow not found: ${execution.workflowId}`)

    // Reset failed step and continue
    execution.status = 'running'
    const failedStepId = Object.keys(execution.stepResults).find(
      (id) => execution.stepResults[id].status === 'failed'
    )
    if (failedStepId) {
      const result = execution.stepResults[failedStepId]
      result.retries = (result.retries || 0) + 1
    }
    this.addExecutionHistory(execution, 'retry')
    await this.saveExecution(execution)

    this.ctx.waitUntil(this.runExecution(execution, definition))

    return execution
  }

  /**
   * Get execution history
   */
  async history(executionId: string): Promise<HistoryEntry[]> {
    const execution = await this.status(executionId)
    return execution?.history || []
  }

  /**
   * List executions with optional filters
   */
  async listExecutions(filters?: {
    workflowId?: string
    status?: WorkflowStatus
    limit?: number
  }): Promise<WorkflowExecution[]> {
    const entries = await this.ctx.storage.list<WorkflowExecution>({ prefix: 'execution:' })
    let executions = [...entries.values()]

    if (filters?.workflowId) {
      executions = executions.filter((e) => e.workflowId === filters.workflowId)
    }
    if (filters?.status) {
      executions = executions.filter((e) => e.status === filters.status)
    }

    // Sort by startedAt descending
    executions.sort((a, b) => b.startedAt - a.startedAt)

    if (filters?.limit) {
      executions = executions.slice(0, filters.limit)
    }

    return executions
  }

  /**
   * Replay an execution (re-run with same input)
   */
  async replay(executionId: string): Promise<WorkflowExecution> {
    const original = await this.status(executionId)
    if (!original) throw new Error(`Execution not found: ${executionId}`)

    return this.start(original.workflowId, original.input, {
      triggeredBy: { type: 'manual', source: `replay:${executionId}` },
    })
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  /**
   * Handle incoming events to trigger workflows
   */
  async handleEvent(event: string, data: unknown): Promise<WorkflowExecution[]> {
    const definitions = await this.listDefinitions()
    const triggered: WorkflowExecution[] = []

    for (const definition of definitions) {
      if (!definition.triggers) continue

      for (const trigger of definition.triggers) {
        if (this.matchesEvent(event, trigger.event)) {
          if (trigger.condition && !this.evaluateCondition(trigger.condition, data as Record<string, unknown>)) {
            continue
          }

          const execution = await this.start(definition.id, data as Record<string, unknown>, {
            triggeredBy: { type: 'event', source: event },
          })
          triggered.push(execution)
        }
      }
    }

    return triggered
  }

  /**
   * Handle Durable Object alarms for scheduled continuations
   */
  async alarm(): Promise<void> {
    // Find executions in waiting state
    const executions = await this.listExecutions({ status: 'waiting' })

    for (const execution of executions) {
      const definition = await this.getDefinition(execution.workflowId)
      if (definition) {
        execution.status = 'running'
        await this.saveExecution(execution)
        this.ctx.waitUntil(this.runExecution(execution, definition))
      }
    }

    // Also handle paused executions with resume points (for retries)
    const paused = await this.listExecutions({ status: 'paused' })
    for (const execution of paused) {
      if (execution.resumePoint && execution.resumePoint.retryCount > 0) {
        await this.resume(execution.id)
      }
    }
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    await this.ctx.storage.put(`execution:${execution.id}`, execution)
  }

  private addHistory(workflowId: string, type: string, data?: unknown): void {
    // Fire and forget history logging
    this.ctx.waitUntil(
      this.ctx.storage.put(`history:${workflowId}:${Date.now()}`, { type, data, timestamp: Date.now() })
    )
  }

  private addExecutionHistory(execution: WorkflowExecution, type: HistoryEntry['type'], stepId?: string, data?: unknown): void {
    execution.history.push({
      timestamp: Date.now(),
      type,
      stepId,
      data,
    })
  }

  private generateId(): string {
    return `wf_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)\s*(ms|s|m|h|d|w)$/)
    if (!match) return 0

    const value = parseInt(match[1], 10)
    const unit = match[2]

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    }

    return value * (multipliers[unit] || 1000)
  }

  private evaluateCondition(condition: string, state: Record<string, unknown>): boolean {
    try {
      // Simple expression evaluation
      // Supports: state.key == value, state.key !== value, state.key, !state.key
      const fn = new Function('state', `with(state) { return ${condition} }`)
      return Boolean(fn(state))
    } catch {
      return false
    }
  }

  private resolveParams(params: Record<string, unknown>, state: Record<string, unknown>): Record<string, unknown> {
    const resolved: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$.')) {
        // Reference to state: $.stepId.output or $.input.key
        const path = value.slice(2).split('.')
        resolved[key] = this.getPath(state, path)
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveParams(value as Record<string, unknown>, state)
      } else {
        resolved[key] = value
      }
    }

    return resolved
  }

  private getPath(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj
    for (const key of path) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[key]
    }
    return current
  }

  private matchesEvent(event: string, pattern: string): boolean {
    // Simple glob matching: Customer.* matches Customer.created, Customer.updated
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\./g, '\\.')}$`)
    return regex.test(event)
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface StoredWorkflowDefinition extends WorkflowDefinition {
  createdAt: number
  updatedAt: number
  version: number
}

// ============================================================================
// Exports
// ============================================================================

export { DO } from 'dotdo'
export default Workflow
