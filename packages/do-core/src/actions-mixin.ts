/**
 * ActionsMixin - Action/Command handling for Durable Objects
 *
 * This mixin provides action registration, execution, and workflow orchestration
 * for Durable Object agents. It can be composed with other mixins or used directly.
 *
 * ## Features
 * - **Action Registration**: Register typed action handlers by name
 * - **Action Execution**: Execute actions with parameter validation
 * - **Action Listing**: Enumerate available actions with metadata
 * - **Middleware Support**: Pre/post-action hooks for logging, auth, etc.
 * - **Workflow Orchestration**: Run and cancel multi-step workflows
 *
 * ## Usage Pattern
 * ```typescript
 * class MyAgent extends ActionsMixin(Agent) {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *     this.registerAction('greet', {
 *       description: 'Greet a user',
 *       parameters: { name: { type: 'string', required: true } },
 *       handler: async ({ name }) => `Hello, ${name}!`
 *     })
 *   }
 * }
 * ```
 *
 * @module actions-mixin
 */

import type { DOEnv, DOState } from './core.js'
import { DOCore } from './core.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Parameter definition for action schema
 */
export interface ActionParameter {
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** Whether this parameter is required */
  required?: boolean
  /** Human-readable description */
  description?: string
  /** Default value if not provided */
  default?: unknown
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
    /** Execution duration in milliseconds */
    durationMs: number
    /** Timestamp when action started */
    startedAt: number
    /** Timestamp when action completed */
    completedAt: number
  }
}

/**
 * Action handler function type
 */
export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams
) => Promise<TResult>

/**
 * Complete action definition with handler and metadata
 */
export interface ActionDefinition<TParams = unknown, TResult = unknown> {
  /** Human-readable action name */
  name?: string
  /** Action description */
  description?: string
  /** Parameter schema */
  parameters?: Record<string, ActionParameter>
  /** The handler function */
  handler: ActionHandler<TParams, TResult>
  /** Whether this action requires authentication */
  requiresAuth?: boolean
  /** Rate limit configuration (requests per minute) */
  rateLimit?: number
}

/**
 * Public action info returned by listActions()
 */
export interface ActionInfo {
  /** Action name/key */
  name: string
  /** Human-readable description */
  description?: string
  /** Parameter schema */
  parameters?: Record<string, ActionParameter>
  /** Whether this action requires authentication */
  requiresAuth?: boolean
}

/**
 * Middleware function for action execution
 */
export type ActionMiddleware = (
  actionName: string,
  params: unknown,
  next: () => Promise<ActionResult>
) => Promise<ActionResult>

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  /** Step identifier */
  id: string
  /** Action to execute */
  action: string
  /** Parameters for the action */
  params?: unknown
  /** Condition for step execution (evaluated at runtime) */
  condition?: (context: WorkflowContext) => boolean
  /** Steps that must complete before this one */
  dependsOn?: string[]
  /** Error handling strategy */
  onError?: 'fail' | 'continue' | 'retry'
  /** Maximum retries if onError is 'retry' */
  maxRetries?: number
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  /** Workflow identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Workflow steps */
  steps: WorkflowStep[]
  /** Maximum workflow execution time (ms) */
  timeout?: number
  /** Context data available to all steps */
  context?: Record<string, unknown>
}

/**
 * Runtime workflow context
 */
export interface WorkflowContext {
  /** Workflow ID */
  workflowId: string
  /** Results from completed steps keyed by step ID */
  stepResults: Map<string, ActionResult>
  /** Initial context from workflow definition */
  initialContext: Record<string, unknown>
  /** Whether cancellation has been requested */
  cancelled: boolean
  /** Workflow start time */
  startedAt: number
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Workflow ID */
  workflowId: string
  /** Whether the workflow completed successfully */
  success: boolean
  /** Results from each step */
  stepResults: Record<string, ActionResult>
  /** Overall workflow error (if failed) */
  error?: string
  /** Total execution time in milliseconds */
  totalDurationMs: number
  /** Whether workflow was cancelled */
  cancelled: boolean
}

/**
 * Running workflow state
 */
interface RunningWorkflow {
  workflow: Workflow
  context: WorkflowContext
  cancelRequested: boolean
}

// ============================================================================
// ActionsMixin Factory
// ============================================================================

/**
 * Constructor type for mixin base class.
 * Note: TypeScript requires any[] for mixin constructors (TS2545)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * Interface for DOCore-like base classes (ctx/env access not required for mixin)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DOCoreLike {}

/**
 * ActionsMixin factory function
 *
 * Creates a mixin class that adds action handling capabilities to any base class.
 * The base class should extend DOCore or have compatible ctx/env properties.
 *
 * @param Base - The base class to extend
 * @returns A new class with action handling capabilities
 *
 * @example
 * ```typescript
 * // Compose with DOCore
 * class MyDO extends ActionsMixin(DOCore) {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *     this.registerAction('ping', {
 *       handler: async () => 'pong'
 *     })
 *   }
 * }
 *
 * // Compose with Agent
 * class MyAgent extends ActionsMixin(Agent) {
 *   // Has both Agent lifecycle AND action handling
 * }
 * ```
 */
export function ActionsMixin<TBase extends Constructor<DOCoreLike>>(Base: TBase) {
  return class ActionsMixinClass extends Base {
    /** Registered action definitions by name @internal */
    readonly __actions: Map<string, ActionDefinition> = new Map()

    /** Middleware stack (executed in order) @internal */
    readonly __middleware: ActionMiddleware[] = []

    /** Currently running workflows @internal */
    readonly __runningWorkflows: Map<string, RunningWorkflow> = new Map()

    // ============================================
    // Action Registration
    // ============================================

    /**
     * Register an action handler
     *
     * @param name - Unique action name
     * @param definition - Action definition with handler
     *
     * @example
     * ```typescript
     * this.registerAction('greet', {
     *   description: 'Greet a user by name',
     *   parameters: {
     *     name: { type: 'string', required: true, description: 'User name' }
     *   },
     *   handler: async ({ name }) => `Hello, ${name}!`
     * })
     * ```
     */
    registerAction<TParams = unknown, TResult = unknown>(
      name: string,
      definition: ActionDefinition<TParams, TResult>
    ): void {
      this.__actions.set(name, definition as ActionDefinition)
    }

    /**
     * Unregister an action
     *
     * @param name - Action name to remove
     * @returns true if action was removed, false if not found
     */
    unregisterAction(name: string): boolean {
      return this.__actions.delete(name)
    }

    /**
     * Check if an action is registered
     *
     * @param name - Action name to check
     * @returns true if action exists
     */
    hasAction(name: string): boolean {
      return this.__actions.has(name)
    }

    // ============================================
    // Action Execution
    // ============================================

    /**
     * Execute a registered action
     *
     * @param name - Action name to execute
     * @param params - Parameters to pass to the action
     * @returns Action result with success status and data
     *
     * @example
     * ```typescript
     * const result = await this.executeAction('greet', { name: 'World' })
     * if (result.success) {
     *   console.log(result.data) // 'Hello, World!'
     * } else {
     *   console.error(result.error)
     * }
     * ```
     */
    async executeAction<TResult = unknown>(
      name: string,
      params: unknown = {}
    ): Promise<ActionResult<TResult>> {
      const startedAt = Date.now()

      const action = this.__actions.get(name)
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

      // Validate required parameters
      const validationError = this.__validateParams(action.parameters, params)
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'INVALID_PARAMS',
          metadata: {
            durationMs: Date.now() - startedAt,
            startedAt,
            completedAt: Date.now(),
          },
        }
      }

      // Apply default values
      const resolvedParams = this.__resolveParams(action.parameters, params)

      // Create execution function
      const execute = async (): Promise<ActionResult<TResult>> => {
        try {
          const data = await action.handler(resolvedParams)
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

      // Apply middleware chain
      if (this.__middleware.length === 0) {
        return execute()
      }

      // Build middleware chain (reverse order)
      let chain: () => Promise<ActionResult> = execute
      for (let i = this.__middleware.length - 1; i >= 0; i--) {
        const middleware = this.__middleware[i]
        if (middleware) {
          const next = chain
          chain = () => middleware(name, resolvedParams, next)
        }
      }

      return chain() as Promise<ActionResult<TResult>>
    }

    /**
     * Validate parameters against schema
     */
    /** @internal */
    __validateParams(
      schema: Record<string, ActionParameter> | undefined,
      params: unknown
    ): string | null {
      if (!schema) return null

      const paramsObj = (params ?? {}) as Record<string, unknown>

      for (const [key, def] of Object.entries(schema)) {
        if (def.required && !(key in paramsObj)) {
          return `Missing required parameter: ${key}`
        }

        const value = paramsObj[key]
        if (value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value
          if (actualType !== def.type) {
            return `Invalid type for parameter ${key}: expected ${def.type}, got ${actualType}`
          }
        }
      }

      return null
    }

    /**
     * Apply default values to parameters
     */
    /** @internal */
    __resolveParams(
      schema: Record<string, ActionParameter> | undefined,
      params: unknown
    ): unknown {
      if (!schema) return params

      const paramsObj = { ...(params as Record<string, unknown>) }

      for (const [key, def] of Object.entries(schema)) {
        if (paramsObj[key] === undefined && def.default !== undefined) {
          paramsObj[key] = def.default
        }
      }

      return paramsObj
    }

    // ============================================
    // Action Listing
    // ============================================

    /**
     * List all registered actions with their metadata
     *
     * @returns Array of action info objects
     *
     * @example
     * ```typescript
     * const actions = this.listActions()
     * // [{ name: 'greet', description: 'Greet a user', parameters: {...} }]
     * ```
     */
    listActions(): ActionInfo[] {
      const actions: ActionInfo[] = []

      for (const [name, def] of this.__actions.entries()) {
        actions.push({
          name,
          description: def.description,
          parameters: def.parameters,
          requiresAuth: def.requiresAuth,
        })
      }

      return actions
    }

    // ============================================
    // Middleware Support
    // ============================================

    /**
     * Add middleware to the action execution chain
     *
     * Middleware is executed in the order it was added, wrapping the action execution.
     *
     * @param middleware - Middleware function
     *
     * @example
     * ```typescript
     * // Logging middleware
     * this.useMiddleware(async (action, params, next) => {
     *   console.log(`Executing ${action}`)
     *   const result = await next()
     *   console.log(`Completed ${action}: ${result.success}`)
     *   return result
     * })
     * ```
     */
    useMiddleware(middleware: ActionMiddleware): void {
      this.__middleware.push(middleware)
    }

    /**
     * Clear all middleware
     */
    clearMiddleware(): void {
      this.__middleware.length = 0
    }

    // ============================================
    // Workflow Orchestration
    // ============================================

    /**
     * Run a multi-step workflow
     *
     * Workflows execute steps in dependency order, tracking results and
     * supporting cancellation.
     *
     * @param workflow - Workflow definition
     * @returns Workflow result with step outcomes
     *
     * @example
     * ```typescript
     * const result = await this.runWorkflow({
     *   id: 'onboarding',
     *   steps: [
     *     { id: 'create-user', action: 'createUser', params: { name: 'Alice' } },
     *     { id: 'send-email', action: 'sendWelcome', dependsOn: ['create-user'] }
     *   ]
     * })
     * ```
     */
    async runWorkflow(workflow: Workflow): Promise<WorkflowResult> {
      const startedAt = Date.now()

      // Create workflow context
      const context: WorkflowContext = {
        workflowId: workflow.id,
        stepResults: new Map(),
        initialContext: workflow.context ?? {},
        cancelled: false,
        startedAt,
      }

      // Track running workflow
      const running: RunningWorkflow = {
        workflow,
        context,
        cancelRequested: false,
      }
      this.__runningWorkflows.set(workflow.id, running)

      try {
        // Build dependency graph and execute in order
        const completed = new Set<string>()
        const stepResults: Record<string, ActionResult> = {}

        // Keep executing until all steps are done or workflow fails
        while (completed.size < workflow.steps.length) {
          // Check for cancellation
          if (running.cancelRequested) {
            context.cancelled = true
            return {
              workflowId: workflow.id,
              success: false,
              stepResults,
              error: 'Workflow cancelled',
              totalDurationMs: Date.now() - startedAt,
              cancelled: true,
            }
          }

          // Check timeout
          if (workflow.timeout && Date.now() - startedAt > workflow.timeout) {
            return {
              workflowId: workflow.id,
              success: false,
              stepResults,
              error: 'Workflow timeout',
              totalDurationMs: Date.now() - startedAt,
              cancelled: false,
            }
          }

          // Find next executable steps (dependencies satisfied)
          const readySteps = workflow.steps.filter((step) => {
            if (completed.has(step.id)) return false
            if (!step.dependsOn || step.dependsOn.length === 0) return true
            return step.dependsOn.every((dep) => completed.has(dep))
          })

          if (readySteps.length === 0 && completed.size < workflow.steps.length) {
            // Circular dependency or missing step
            return {
              workflowId: workflow.id,
              success: false,
              stepResults,
              error: 'Workflow deadlock: circular dependencies or missing steps',
              totalDurationMs: Date.now() - startedAt,
              cancelled: false,
            }
          }

          // Execute ready steps (could be parallelized in the future)
          for (const step of readySteps) {
            // Check condition
            if (step.condition && !step.condition(context)) {
              // Skip this step
              completed.add(step.id)
              stepResults[step.id] = {
                success: true,
                data: null,
                metadata: {
                  durationMs: 0,
                  startedAt: Date.now(),
                  completedAt: Date.now(),
                },
              }
              continue
            }

            // Execute with retry logic
            let result: ActionResult
            let retries = 0
            const maxRetries = step.onError === 'retry' ? (step.maxRetries ?? 3) : 0

            do {
              result = await this.executeAction(step.action, step.params)

              if (result.success || retries >= maxRetries) break
              retries++
            } while (true)

            context.stepResults.set(step.id, result)
            stepResults[step.id] = result
            completed.add(step.id)

            // Handle step failure
            if (!result.success) {
              if (step.onError === 'fail' || step.onError === undefined) {
                return {
                  workflowId: workflow.id,
                  success: false,
                  stepResults,
                  error: `Step '${step.id}' failed: ${result.error}`,
                  totalDurationMs: Date.now() - startedAt,
                  cancelled: false,
                }
              }
              // onError === 'continue' - keep going
            }
          }
        }

        return {
          workflowId: workflow.id,
          success: true,
          stepResults,
          totalDurationMs: Date.now() - startedAt,
          cancelled: false,
        }
      } finally {
        this.__runningWorkflows.delete(workflow.id)
      }
    }

    /**
     * Cancel a running workflow
     *
     * @param id - Workflow ID to cancel
     * @returns true if workflow was cancelled, false if not found
     *
     * @example
     * ```typescript
     * // Start workflow in background
     * const workflowPromise = this.runWorkflow(myWorkflow)
     *
     * // Cancel it
     * await this.cancelWorkflow(myWorkflow.id)
     * ```
     */
    async cancelWorkflow(id: string): Promise<void> {
      const running = this.__runningWorkflows.get(id)
      if (running) {
        running.cancelRequested = true
      }
    }

    /**
     * Check if a workflow is currently running
     *
     * @param id - Workflow ID to check
     * @returns true if workflow is running
     */
    isWorkflowRunning(id: string): boolean {
      return this.__runningWorkflows.has(id)
    }

    /**
     * Get the number of running workflows
     */
    get runningWorkflowCount(): number {
      return this.__runningWorkflows.size
    }
  }
}

// ============================================================================
// Convenience Class
// ============================================================================

/**
 * ActionsBase - Pre-composed ActionsMixin with DOCore
 *
 * For cases where you don't need custom base class composition,
 * this provides a ready-to-use class with action handling.
 *
 * @example
 * ```typescript
 * class MyDO extends ActionsBase {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *     this.registerAction('hello', {
 *       handler: async () => 'world'
 *     })
 *   }
 * }
 * ```
 */
// Create the base class outside of the generic class to avoid TypeScript issues
const ActionsMixinBase = ActionsMixin(DOCore)

export class ActionsBase<Env extends DOEnv = DOEnv> extends ActionsMixinBase {
  protected readonly env: Env

  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
    this.env = env
  }
}
