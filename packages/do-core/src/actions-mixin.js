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
import { DOCore } from './core.js';
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
export function ActionsMixin(Base) {
    return class ActionsMixinClass extends Base {
        /** Registered action definitions by name @internal */
        __actions = new Map();
        /** Middleware stack (executed in order) @internal */
        __middleware = [];
        /** Currently running workflows @internal */
        __runningWorkflows = new Map();
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
        registerAction(name, definition) {
            this.__actions.set(name, definition);
        }
        /**
         * Unregister an action
         *
         * @param name - Action name to remove
         * @returns true if action was removed, false if not found
         */
        unregisterAction(name) {
            return this.__actions.delete(name);
        }
        /**
         * Check if an action is registered
         *
         * @param name - Action name to check
         * @returns true if action exists
         */
        hasAction(name) {
            return this.__actions.has(name);
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
        async executeAction(name, params = {}) {
            const startedAt = Date.now();
            const action = this.__actions.get(name);
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
                };
            }
            // Validate required parameters
            const validationError = this.__validateParams(action.parameters, params);
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
                };
            }
            // Apply default values
            const resolvedParams = this.__resolveParams(action.parameters, params);
            // Create execution function
            const execute = async () => {
                try {
                    const data = await action.handler(resolvedParams);
                    const completedAt = Date.now();
                    return {
                        success: true,
                        data: data,
                        metadata: {
                            durationMs: completedAt - startedAt,
                            startedAt,
                            completedAt,
                        },
                    };
                }
                catch (error) {
                    const completedAt = Date.now();
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        errorCode: 'EXECUTION_ERROR',
                        metadata: {
                            durationMs: completedAt - startedAt,
                            startedAt,
                            completedAt,
                        },
                    };
                }
            };
            // Apply middleware chain
            if (this.__middleware.length === 0) {
                return execute();
            }
            // Build middleware chain (reverse order)
            let chain = execute;
            for (let i = this.__middleware.length - 1; i >= 0; i--) {
                const middleware = this.__middleware[i];
                if (middleware) {
                    const next = chain;
                    chain = () => middleware(name, resolvedParams, next);
                }
            }
            return chain();
        }
        /**
         * Validate parameters against schema
         */
        /** @internal */
        __validateParams(schema, params) {
            if (!schema)
                return null;
            const paramsObj = (params ?? {});
            for (const [key, def] of Object.entries(schema)) {
                if (def.required && !(key in paramsObj)) {
                    return `Missing required parameter: ${key}`;
                }
                const value = paramsObj[key];
                if (value !== undefined) {
                    const actualType = Array.isArray(value) ? 'array' : typeof value;
                    if (actualType !== def.type) {
                        return `Invalid type for parameter ${key}: expected ${def.type}, got ${actualType}`;
                    }
                }
            }
            return null;
        }
        /**
         * Apply default values to parameters
         */
        /** @internal */
        __resolveParams(schema, params) {
            if (!schema)
                return params;
            const paramsObj = { ...params };
            for (const [key, def] of Object.entries(schema)) {
                if (paramsObj[key] === undefined && def.default !== undefined) {
                    paramsObj[key] = def.default;
                }
            }
            return paramsObj;
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
        listActions() {
            const actions = [];
            for (const [name, def] of this.__actions.entries()) {
                actions.push({
                    name,
                    description: def.description,
                    parameters: def.parameters,
                    requiresAuth: def.requiresAuth,
                });
            }
            return actions;
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
        useMiddleware(middleware) {
            this.__middleware.push(middleware);
        }
        /**
         * Clear all middleware
         */
        clearMiddleware() {
            this.__middleware.length = 0;
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
        async runWorkflow(workflow) {
            const startedAt = Date.now();
            // Create workflow context
            const context = {
                workflowId: workflow.id,
                stepResults: new Map(),
                initialContext: workflow.context ?? {},
                cancelled: false,
                startedAt,
            };
            // Track running workflow
            const running = {
                workflow,
                context,
                cancelRequested: false,
            };
            this.__runningWorkflows.set(workflow.id, running);
            try {
                // Build dependency graph and execute in order
                const completed = new Set();
                const stepResults = {};
                // Keep executing until all steps are done or workflow fails
                while (completed.size < workflow.steps.length) {
                    // Check for cancellation
                    if (running.cancelRequested) {
                        context.cancelled = true;
                        return {
                            workflowId: workflow.id,
                            success: false,
                            stepResults,
                            error: 'Workflow cancelled',
                            totalDurationMs: Date.now() - startedAt,
                            cancelled: true,
                        };
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
                        };
                    }
                    // Find next executable steps (dependencies satisfied)
                    const readySteps = workflow.steps.filter((step) => {
                        if (completed.has(step.id))
                            return false;
                        if (!step.dependsOn || step.dependsOn.length === 0)
                            return true;
                        return step.dependsOn.every((dep) => completed.has(dep));
                    });
                    if (readySteps.length === 0 && completed.size < workflow.steps.length) {
                        // Circular dependency or missing step
                        return {
                            workflowId: workflow.id,
                            success: false,
                            stepResults,
                            error: 'Workflow deadlock: circular dependencies or missing steps',
                            totalDurationMs: Date.now() - startedAt,
                            cancelled: false,
                        };
                    }
                    // Execute ready steps (could be parallelized in the future)
                    for (const step of readySteps) {
                        // Check condition
                        if (step.condition && !step.condition(context)) {
                            // Skip this step
                            completed.add(step.id);
                            stepResults[step.id] = {
                                success: true,
                                data: null,
                                metadata: {
                                    durationMs: 0,
                                    startedAt: Date.now(),
                                    completedAt: Date.now(),
                                },
                            };
                            continue;
                        }
                        // Execute with retry logic
                        let result;
                        let retries = 0;
                        const maxRetries = step.onError === 'retry' ? (step.maxRetries ?? 3) : 0;
                        do {
                            result = await this.executeAction(step.action, step.params);
                            if (result.success || retries >= maxRetries)
                                break;
                            retries++;
                        } while (true);
                        context.stepResults.set(step.id, result);
                        stepResults[step.id] = result;
                        completed.add(step.id);
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
                                };
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
                };
            }
            finally {
                this.__runningWorkflows.delete(workflow.id);
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
        async cancelWorkflow(id) {
            const running = this.__runningWorkflows.get(id);
            if (running) {
                running.cancelRequested = true;
            }
        }
        /**
         * Check if a workflow is currently running
         *
         * @param id - Workflow ID to check
         * @returns true if workflow is running
         */
        isWorkflowRunning(id) {
            return this.__runningWorkflows.has(id);
        }
        /**
         * Get the number of running workflows
         */
        get runningWorkflowCount() {
            return this.__runningWorkflows.size;
        }
    };
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
const ActionsMixinBase = ActionsMixin(DOCore);
export class ActionsBase extends ActionsMixinBase {
    env;
    constructor(ctx, env) {
        super(ctx, env);
        this.env = env;
    }
}
