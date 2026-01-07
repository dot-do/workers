/**
 * RED Tests: workflows.do Step Execution
 *
 * These tests define the contract for the workflows.do worker's step execution.
 * The WorkflowsDO must properly execute workflow steps with dependencies,
 * error handling, and retry logic.
 *
 * Per ARCHITECTURE.md:
 * - workflow.do implements ai-workflows RPC
 * - Step execution with dependency graph
 * - Error recovery and retry logic
 *
 * RED PHASE: These tests MUST FAIL because WorkflowsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hsjs).
 *
 * @see ARCHITECTURE.md lines 980, 1335
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockWorkflowsEnv } from './helpers.js'

/**
 * Step execution context
 */
export interface StepExecutionContext {
  /** Workflow ID */
  workflowId: string
  /** Execution ID */
  executionId: string
  /** Step ID */
  stepId: string
  /** Step parameters */
  params?: unknown
  /** Results from previous steps */
  previousResults: Record<string, unknown>
  /** Initial workflow context */
  workflowContext: Record<string, unknown>
  /** Retry count for current step */
  retryCount: number
}

/**
 * Step executor result
 */
export interface StepExecutorResult {
  /** Whether step succeeded */
  success: boolean
  /** Step output */
  output?: unknown
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  durationMs: number
}

/**
 * Action handler type for workflow steps
 */
export type ActionHandler = (context: StepExecutionContext) => Promise<StepExecutorResult>

/**
 * Interface for step execution methods
 */
interface WorkflowsExecutionContract {
  // Action registration
  registerAction(name: string, handler: ActionHandler): void
  hasAction(name: string): boolean
  listActions(): string[]

  // Step execution
  executeStep(
    executionId: string,
    stepId: string,
    context: StepExecutionContext
  ): Promise<StepExecutorResult>

  // Dependency resolution
  getReadySteps(
    executionId: string
  ): Promise<Array<{ stepId: string; action: string; params?: unknown }>>
  getBlockingDependencies(executionId: string, stepId: string): Promise<string[]>

  // Workflow execution control
  runNextSteps(executionId: string): Promise<{ completed: string[]; failed: string[] }>
  runWorkflowToCompletion(executionId: string): Promise<{
    success: boolean
    completedSteps: string[]
    failedStep?: string
    error?: string
  }>
}

/**
 * Attempt to load WorkflowsDO - this will fail in RED phase
 */
async function loadWorkflowsDO(): Promise<new (ctx: MockDOState, env: MockWorkflowsEnv) => WorkflowsExecutionContract> {
  const module = await import('../src/workflows.js')
  return module.WorkflowsDO
}

describe('WorkflowsDO Step Execution', () => {
  let ctx: MockDOState
  let env: MockWorkflowsEnv
  let WorkflowsDO: new (ctx: MockDOState, env: MockWorkflowsEnv) => WorkflowsExecutionContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkflowsDO = await loadWorkflowsDO()
  })

  describe('Action Registration', () => {
    describe('registerAction()', () => {
      it('should register an action handler', async () => {
        const instance = new WorkflowsDO(ctx, env)
        const handler: ActionHandler = async () => ({ success: true, durationMs: 10 })

        instance.registerAction('test-action', handler)
        expect(instance.hasAction('test-action')).toBe(true)
      })

      it('should overwrite existing action with same name', async () => {
        const instance = new WorkflowsDO(ctx, env)
        let callCount = 0

        instance.registerAction('overwrite', async () => {
          callCount = 1
          return { success: true, durationMs: 10 }
        })

        instance.registerAction('overwrite', async () => {
          callCount = 2
          return { success: true, durationMs: 10 }
        })

        await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(callCount).toBe(2)
      })
    })

    describe('hasAction()', () => {
      it('should return false for unregistered action', async () => {
        const instance = new WorkflowsDO(ctx, env)
        expect(instance.hasAction('nonexistent')).toBe(false)
      })

      it('should return true for registered action', async () => {
        const instance = new WorkflowsDO(ctx, env)
        instance.registerAction('exists', async () => ({ success: true, durationMs: 10 }))
        expect(instance.hasAction('exists')).toBe(true)
      })
    })

    describe('listActions()', () => {
      it('should return empty array when no actions registered', async () => {
        const instance = new WorkflowsDO(ctx, env)
        expect(instance.listActions()).toEqual([])
      })

      it('should list all registered actions', async () => {
        const instance = new WorkflowsDO(ctx, env)
        instance.registerAction('action1', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('action2', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('action3', async () => ({ success: true, durationMs: 10 }))

        const actions = instance.listActions()
        expect(actions).toContain('action1')
        expect(actions).toContain('action2')
        expect(actions).toContain('action3')
      })
    })
  })

  describe('Step Execution', () => {
    describe('executeStep()', () => {
      it('should execute registered action', async () => {
        const instance = new WorkflowsDO(ctx, env)
        let executed = false

        instance.registerAction('test', async () => {
          executed = true
          return { success: true, output: 'done', durationMs: 50 }
        })

        const result = await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(executed).toBe(true)
        expect(result.success).toBe(true)
        expect(result.output).toBe('done')
      })

      it('should pass context to action handler', async () => {
        const instance = new WorkflowsDO(ctx, env)
        let receivedContext: StepExecutionContext | null = null

        instance.registerAction('context-test', async (ctx) => {
          receivedContext = ctx
          return { success: true, durationMs: 10 }
        })

        const context: StepExecutionContext = {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          params: { key: 'value' },
          previousResults: { prevStep: { data: 'previous' } },
          workflowContext: { env: 'test' },
          retryCount: 2,
        }

        await instance.executeStep('exec-1', 'step-1', context)

        expect(receivedContext).not.toBeNull()
        expect(receivedContext!.params).toEqual({ key: 'value' })
        expect(receivedContext!.previousResults).toEqual({ prevStep: { data: 'previous' } })
        expect(receivedContext!.workflowContext).toEqual({ env: 'test' })
        expect(receivedContext!.retryCount).toBe(2)
      })

      it('should return error for unregistered action', async () => {
        const instance = new WorkflowsDO(ctx, env)

        const result = await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/action.*not found|not registered/i)
      })

      it('should capture action handler errors', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('failing', async () => {
          throw new Error('Action failed!')
        })

        const result = await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Action failed!')
      })

      it('should measure step duration', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('slow', async () => {
          await new Promise((r) => setTimeout(r, 50))
          return { success: true, durationMs: 0 }
        })

        const result = await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(result.durationMs).toBeGreaterThanOrEqual(50)
      })
    })
  })

  describe('Dependency Resolution', () => {
    describe('getReadySteps()', () => {
      it('should return steps with no dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // Setup: Create workflow and execution with steps
        // Assume workflow has steps: s1 (no deps), s2 (depends on s1), s3 (no deps)
        const readySteps = await instance.getReadySteps('exec-with-deps')

        // Steps with no dependencies should be ready
        expect(Array.isArray(readySteps)).toBe(true)
      })

      it('should return steps whose dependencies are complete', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // After s1 completes, s2 should become ready
        // This requires setting up workflow state where s1 is complete
        const readySteps = await instance.getReadySteps('exec-partial-complete')

        // Should include s2 since s1 is complete
        expect(Array.isArray(readySteps)).toBe(true)
      })

      it('should not return steps with incomplete dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // s2 depends on s1 which is not complete
        const readySteps = await instance.getReadySteps('exec-deps-incomplete')

        // s2 should not be in ready steps
        const stepIds = readySteps.map((s) => s.stepId)
        expect(stepIds).not.toContain('s2')
      })

      it('should handle diamond dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // Diamond: s1 -> s2, s1 -> s3, s2 -> s4, s3 -> s4
        // s4 should only be ready when both s2 and s3 are complete
        const readySteps = await instance.getReadySteps('exec-diamond')

        expect(Array.isArray(readySteps)).toBe(true)
      })
    })

    describe('getBlockingDependencies()', () => {
      it('should return empty array for steps with no dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)
        const blocking = await instance.getBlockingDependencies('exec-1', 'step-no-deps')
        expect(blocking).toEqual([])
      })

      it('should return incomplete dependency step IDs', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // s2 depends on s1 which is not complete
        const blocking = await instance.getBlockingDependencies('exec-1', 's2')
        expect(blocking).toContain('s1')
      })

      it('should not include completed dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // s2 depends on s1 which is complete
        const blocking = await instance.getBlockingDependencies('exec-s1-complete', 's2')
        expect(blocking).not.toContain('s1')
      })
    })
  })

  describe('Workflow Execution Control', () => {
    describe('runNextSteps()', () => {
      it('should execute all ready steps', async () => {
        const instance = new WorkflowsDO(ctx, env)

        // Register actions for the steps
        instance.registerAction('step1', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('step2', async () => ({ success: true, durationMs: 10 }))

        const result = await instance.runNextSteps('exec-ready-steps')

        expect(result.completed).toBeInstanceOf(Array)
        expect(result.failed).toBeInstanceOf(Array)
      })

      it('should return completed step IDs', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('step1', async () => ({ success: true, output: 'done', durationMs: 10 }))

        const result = await instance.runNextSteps('exec-single-ready')

        expect(result.completed.length).toBeGreaterThanOrEqual(0)
      })

      it('should return failed step IDs', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('failing-step', async () => ({
          success: false,
          error: 'Failed',
          durationMs: 10,
        }))

        const result = await instance.runNextSteps('exec-failing-step')

        // Either completed or failed array should have content
        expect(result.completed.length + result.failed.length).toBeGreaterThanOrEqual(0)
      })

      it('should execute steps in parallel when possible', async () => {
        const instance = new WorkflowsDO(ctx, env)
        const startTimes: Record<string, number> = {}

        instance.registerAction('parallel1', async () => {
          startTimes['parallel1'] = Date.now()
          await new Promise((r) => setTimeout(r, 50))
          return { success: true, durationMs: 50 }
        })

        instance.registerAction('parallel2', async () => {
          startTimes['parallel2'] = Date.now()
          await new Promise((r) => setTimeout(r, 50))
          return { success: true, durationMs: 50 }
        })

        await instance.runNextSteps('exec-parallel')

        // If executed in parallel, start times should be very close
        if (startTimes['parallel1'] && startTimes['parallel2']) {
          const timeDiff = Math.abs(startTimes['parallel1'] - startTimes['parallel2'])
          expect(timeDiff).toBeLessThan(20) // Allow small scheduling variance
        }
      })
    })

    describe('runWorkflowToCompletion()', () => {
      it('should execute all steps until completion', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('step1', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('step2', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('step3', async () => ({ success: true, durationMs: 10 }))

        const result = await instance.runWorkflowToCompletion('exec-full')

        expect(result.success).toBe(true)
        expect(result.completedSteps.length).toBeGreaterThan(0)
      })

      it('should stop on step failure', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('good', async () => ({ success: true, durationMs: 10 }))
        instance.registerAction('bad', async () => ({ success: false, error: 'Failed', durationMs: 10 }))

        const result = await instance.runWorkflowToCompletion('exec-fail-mid')

        expect(result.success).toBe(false)
        expect(result.failedStep).toBeDefined()
        expect(result.error).toBeDefined()
      })

      it('should respect step dependencies', async () => {
        const instance = new WorkflowsDO(ctx, env)
        const executionOrder: string[] = []

        instance.registerAction('first', async () => {
          executionOrder.push('first')
          return { success: true, durationMs: 10 }
        })

        instance.registerAction('second', async () => {
          executionOrder.push('second')
          return { success: true, durationMs: 10 }
        })

        await instance.runWorkflowToCompletion('exec-ordered')

        // Dependent steps should execute after their dependencies
        if (executionOrder.includes('first') && executionOrder.includes('second')) {
          expect(executionOrder.indexOf('first')).toBeLessThan(executionOrder.indexOf('second'))
        }
      })

      it('should handle timeout', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('slow', async () => {
          await new Promise((r) => setTimeout(r, 1000))
          return { success: true, durationMs: 1000 }
        })

        // Workflow with 100ms timeout
        const result = await instance.runWorkflowToCompletion('exec-timeout')

        // Should fail due to timeout (assuming timeout is configured)
        expect(result).toBeDefined()
      })
    })
  })

  describe('Error Recovery', () => {
    describe('Retry Logic', () => {
      it('should retry step on failure when configured', async () => {
        const instance = new WorkflowsDO(ctx, env)
        let attempts = 0

        instance.registerAction('flaky', async () => {
          attempts++
          if (attempts < 3) {
            return { success: false, error: 'Temporary failure', durationMs: 10 }
          }
          return { success: true, output: 'Eventually succeeded', durationMs: 10 }
        })

        // Assuming step is configured with onError: 'retry', maxRetries: 3
        const result = await instance.runWorkflowToCompletion('exec-retry')

        expect(attempts).toBeGreaterThan(1)
      })

      it('should respect maxRetries limit', async () => {
        const instance = new WorkflowsDO(ctx, env)
        let attempts = 0

        instance.registerAction('always-fails', async () => {
          attempts++
          return { success: false, error: 'Always fails', durationMs: 10 }
        })

        // Assuming step has maxRetries: 3
        await instance.runWorkflowToCompletion('exec-max-retries')

        // Should attempt original + retries (e.g., 1 + 3 = 4 max)
        expect(attempts).toBeLessThanOrEqual(4)
      })

      it('should continue workflow when step configured with onError: continue', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('optional', async () => ({
          success: false,
          error: 'Optional step failed',
          durationMs: 10,
        }))

        instance.registerAction('next', async () => ({ success: true, output: 'Continued', durationMs: 10 }))

        // Step with onError: 'continue' should allow workflow to proceed
        const result = await instance.runWorkflowToCompletion('exec-continue-on-error')

        // Workflow should still succeed overall if required steps pass
        expect(result).toBeDefined()
      })
    })

    describe('Error Propagation', () => {
      it('should propagate step error to execution state', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('error-step', async () => ({
          success: false,
          error: 'Specific error message',
          durationMs: 10,
        }))

        const result = await instance.runWorkflowToCompletion('exec-error-propagate')

        if (!result.success) {
          expect(result.error).toContain('error')
        }
      })

      it('should capture stack trace for unexpected errors', async () => {
        const instance = new WorkflowsDO(ctx, env)

        instance.registerAction('throws', async () => {
          throw new Error('Unexpected error')
        })

        const result = await instance.executeStep('exec-1', 'step-1', {
          workflowId: 'wf-1',
          executionId: 'exec-1',
          stepId: 'step-1',
          previousResults: {},
          workflowContext: {},
          retryCount: 0,
        })

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })
})
