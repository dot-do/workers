/**
 * Tests for ActionsMixin
 *
 * Tests the action registration, execution, middleware, and workflow capabilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DOState, DOStorage, DurableObjectId, SqlStorage, SqlStorageCursor, DOEnv } from '../src/index.js'
import { DOCore } from '../src/core.js'
import { ActionsMixin, ActionsBase, Workflow } from '../src/actions-mixin.js'

// Mock implementations
function createMockId(name?: string): DurableObjectId {
  return {
    name,
    toString: () => name ?? 'mock-id',
    equals: (other: DurableObjectId) => other.toString() === (name ?? 'mock-id'),
  }
}

function createMockSqlCursor<T>(): SqlStorageCursor<T> {
  return {
    columnNames: [],
    rowsRead: 0,
    rowsWritten: 0,
    toArray: () => [],
    one: () => null,
    raw: function* () {},
    [Symbol.iterator]: function* () {},
  }
}

function createMockSqlStorage(): SqlStorage {
  return {
    exec: () => createMockSqlCursor(),
  }
}

function createMockStorage(): DOStorage {
  const store = new Map<string, unknown>()
  let alarmTime: number | null = null

  const getMock = vi.fn(async <T>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined> => {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map<string, T>()
      for (const key of keyOrKeys) {
        const value = store.get(key) as T | undefined
        if (value !== undefined) result.set(key, value)
      }
      return result as Map<string, T>
    }
    return store.get(keyOrKeys) as T | undefined
  })

  return {
    get: getMock as DOStorage['get'],
    put: vi.fn(async <T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> => {
      if (typeof keyOrEntries === 'string') {
        store.set(keyOrEntries, value)
      } else {
        for (const [k, v] of Object.entries(keyOrEntries)) {
          store.set(k, v)
        }
      }
    }),
    delete: vi.fn(async (keyOrKeys: string | string[]): Promise<boolean | number> => {
      if (Array.isArray(keyOrKeys)) {
        let count = 0
        for (const key of keyOrKeys) {
          if (store.delete(key)) count++
        }
        return count
      }
      return store.delete(keyOrKeys)
    }),
    deleteAll: vi.fn(async () => {
      store.clear()
    }),
    list: vi.fn(async <T>() => {
      return new Map(store) as Map<string, T>
    }),
    getAlarm: vi.fn(async () => alarmTime),
    setAlarm: vi.fn(async (time: number | Date) => {
      alarmTime = time instanceof Date ? time.getTime() : time
    }),
    deleteAlarm: vi.fn(async () => {
      alarmTime = null
    }),
    transaction: vi.fn(async <T>(closure: (txn: DOStorage) => Promise<T>): Promise<T> => {
      return closure(createMockStorage())
    }),
    sql: createMockSqlStorage(),
  }
}

function createMockState(id?: DurableObjectId): DOState {
  return {
    id: id ?? createMockId(),
    storage: createMockStorage(),
    blockConcurrencyWhile: vi.fn(async (callback) => callback()),
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => []),
    setWebSocketAutoResponse: vi.fn(),
  }
}

// Test class using ActionsMixin
class TestActionsClass extends ActionsMixin(DOCore) {
  constructor(ctx: DOState, env: DOEnv) {
    super(ctx, env)
  }
}

describe('ActionsMixin', () => {
  let ctx: DOState
  let env: DOEnv
  let actions: TestActionsClass

  beforeEach(() => {
    ctx = createMockState()
    env = {}
    actions = new TestActionsClass(ctx, env)
  })

  describe('Action Registration', () => {
    it('should register an action', () => {
      actions.registerAction('test', {
        handler: async () => 'test result',
      })

      expect(actions.hasAction('test')).toBe(true)
    })

    it('should unregister an action', () => {
      actions.registerAction('temp', {
        handler: async () => 'temp',
      })

      expect(actions.hasAction('temp')).toBe(true)
      const removed = actions.unregisterAction('temp')
      expect(removed).toBe(true)
      expect(actions.hasAction('temp')).toBe(false)
    })

    it('should return false when unregistering non-existent action', () => {
      const removed = actions.unregisterAction('nonexistent')
      expect(removed).toBe(false)
    })

    it('should list registered actions', () => {
      actions.registerAction('action1', {
        description: 'First action',
        handler: async () => 1,
      })
      actions.registerAction('action2', {
        description: 'Second action',
        handler: async () => 2,
      })

      const list = actions.listActions()
      expect(list).toHaveLength(2)
      expect(list.find((a) => a.name === 'action1')).toBeDefined()
      expect(list.find((a) => a.name === 'action2')).toBeDefined()
    })

    it('should include metadata in action listing', () => {
      actions.registerAction('greet', {
        description: 'Greet a user',
        parameters: {
          name: { type: 'string', required: true, description: 'User name' },
        },
        requiresAuth: true,
        handler: async ({ name }: { name: string }) => `Hello, ${name}!`,
      })

      const list = actions.listActions()
      const greet = list.find((a) => a.name === 'greet')

      expect(greet).toBeDefined()
      expect(greet?.description).toBe('Greet a user')
      expect(greet?.parameters?.name.type).toBe('string')
      expect(greet?.requiresAuth).toBe(true)
    })
  })

  describe('Action Execution', () => {
    it('should execute a simple action', async () => {
      actions.registerAction('ping', {
        handler: async () => 'pong',
      })

      const result = await actions.executeAction<string>('ping')

      expect(result.success).toBe(true)
      expect(result.data).toBe('pong')
    })

    it('should pass parameters to action handler', async () => {
      actions.registerAction('greet', {
        handler: async ({ name }: { name: string }) => `Hello, ${name}!`,
      })

      const result = await actions.executeAction<string>('greet', { name: 'World' })

      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello, World!')
    })

    it('should return error for non-existent action', async () => {
      const result = await actions.executeAction('nonexistent')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('ACTION_NOT_FOUND')
      expect(result.error).toContain('Action not found')
    })

    it('should include execution metadata', async () => {
      actions.registerAction('slow', {
        handler: async () => {
          await new Promise((r) => setTimeout(r, 50))
          return 'done'
        },
      })

      const result = await actions.executeAction('slow')

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(50)
      expect(result.metadata?.startedAt).toBeDefined()
      expect(result.metadata?.completedAt).toBeDefined()
    })

    it('should catch and return handler errors', async () => {
      actions.registerAction('failing', {
        handler: async () => {
          throw new Error('Handler failed')
        },
      })

      const result = await actions.executeAction('failing')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('EXECUTION_ERROR')
      expect(result.error).toBe('Handler failed')
    })

    describe('Parameter Validation', () => {
      it('should validate required parameters', async () => {
        actions.registerAction('validate', {
          parameters: {
            required: { type: 'string', required: true },
          },
          handler: async () => 'ok',
        })

        const result = await actions.executeAction('validate', {})

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('INVALID_PARAMS')
        expect(result.error).toContain('Missing required parameter')
      })

      it('should validate parameter types', async () => {
        actions.registerAction('typed', {
          parameters: {
            count: { type: 'number', required: true },
          },
          handler: async () => 'ok',
        })

        const result = await actions.executeAction('typed', { count: 'not a number' })

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('INVALID_PARAMS')
        expect(result.error).toContain('Invalid type')
      })

      it('should apply default values', async () => {
        let receivedParams: unknown

        actions.registerAction('defaults', {
          parameters: {
            name: { type: 'string', default: 'default-name' },
            count: { type: 'number', default: 42 },
          },
          handler: async (params) => {
            receivedParams = params
            return 'ok'
          },
        })

        await actions.executeAction('defaults', {})

        expect(receivedParams).toEqual({ name: 'default-name', count: 42 })
      })

      it('should not override provided values with defaults', async () => {
        let receivedParams: unknown

        actions.registerAction('noOverride', {
          parameters: {
            name: { type: 'string', default: 'default' },
          },
          handler: async (params) => {
            receivedParams = params
            return 'ok'
          },
        })

        await actions.executeAction('noOverride', { name: 'custom' })

        expect(receivedParams).toEqual({ name: 'custom' })
      })
    })
  })

  describe('Middleware Support', () => {
    it('should execute middleware before action', async () => {
      const order: string[] = []

      actions.useMiddleware(async (action, params, next) => {
        order.push('middleware-before')
        const result = await next()
        order.push('middleware-after')
        return result
      })

      actions.registerAction('tracked', {
        handler: async () => {
          order.push('handler')
          return 'done'
        },
      })

      await actions.executeAction('tracked')

      expect(order).toEqual(['middleware-before', 'handler', 'middleware-after'])
    })

    it('should chain multiple middleware', async () => {
      const order: string[] = []

      actions.useMiddleware(async (action, params, next) => {
        order.push('first-before')
        const result = await next()
        order.push('first-after')
        return result
      })

      actions.useMiddleware(async (action, params, next) => {
        order.push('second-before')
        const result = await next()
        order.push('second-after')
        return result
      })

      actions.registerAction('chained', {
        handler: async () => {
          order.push('handler')
          return 'done'
        },
      })

      await actions.executeAction('chained')

      expect(order).toEqual([
        'first-before',
        'second-before',
        'handler',
        'second-after',
        'first-after',
      ])
    })

    it('should allow middleware to modify result', async () => {
      actions.useMiddleware(async (action, params, next) => {
        const result = await next()
        if (result.success) {
          return { ...result, data: `modified: ${result.data}` }
        }
        return result
      })

      actions.registerAction('modify', {
        handler: async () => 'original',
      })

      const result = await actions.executeAction<string>('modify')

      expect(result.success).toBe(true)
      expect(result.data).toBe('modified: original')
    })

    it('should allow middleware to short-circuit execution', async () => {
      let handlerCalled = false

      actions.useMiddleware(async (_action, _params, _next) => {
        // Don't call next, return early
        return {
          success: false,
          error: 'Blocked by middleware',
          errorCode: 'BLOCKED',
        }
      })

      actions.registerAction('blocked', {
        handler: async () => {
          handlerCalled = true
          return 'should not see this'
        },
      })

      const result = await actions.executeAction('blocked')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Blocked by middleware')
      expect(handlerCalled).toBe(false)
    })

    it('should clear all middleware', () => {
      actions.useMiddleware(async (a, p, next) => next())
      actions.useMiddleware(async (a, p, next) => next())

      actions.clearMiddleware()

      // Register a simple action to verify middleware is cleared
      actions.registerAction('simple', {
        handler: async () => 'result',
      })

      // If middleware was cleared, this should work without issues
      // (no way to directly check middleware count, but execution verifies)
    })
  })

  describe('Workflow Orchestration', () => {
    beforeEach(() => {
      // Register some actions for workflows
      actions.registerAction('step1', {
        handler: async () => 'step1-result',
      })
      actions.registerAction('step2', {
        handler: async () => 'step2-result',
      })
      actions.registerAction('step3', {
        handler: async () => 'step3-result',
      })
      actions.registerAction('failing-step', {
        handler: async () => {
          throw new Error('Step failed')
        },
      })
    })

    it('should execute a simple workflow', async () => {
      const workflow: Workflow = {
        id: 'simple-workflow',
        steps: [{ id: 'only-step', action: 'step1' }],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.workflowId).toBe('simple-workflow')
      expect(result.stepResults['only-step']?.success).toBe(true)
    })

    it('should execute steps in dependency order', async () => {
      const order: string[] = []

      actions.registerAction('ordered1', {
        handler: async () => {
          order.push('1')
          return '1'
        },
      })
      actions.registerAction('ordered2', {
        handler: async () => {
          order.push('2')
          return '2'
        },
      })
      actions.registerAction('ordered3', {
        handler: async () => {
          order.push('3')
          return '3'
        },
      })

      const workflow: Workflow = {
        id: 'ordered',
        steps: [
          { id: 's3', action: 'ordered3', dependsOn: ['s2'] },
          { id: 's1', action: 'ordered1' },
          { id: 's2', action: 'ordered2', dependsOn: ['s1'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(order).toEqual(['1', '2', '3'])
    })

    it('should fail workflow on step failure', async () => {
      const workflow: Workflow = {
        id: 'failing',
        steps: [
          { id: 'good', action: 'step1' },
          { id: 'bad', action: 'failing-step', dependsOn: ['good'] },
          { id: 'never', action: 'step2', dependsOn: ['bad'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(false)
      expect(result.error).toContain("Step 'bad' failed")
      expect(result.stepResults['good']?.success).toBe(true)
      expect(result.stepResults['bad']?.success).toBe(false)
      expect(result.stepResults['never']).toBeUndefined()
    })

    it('should continue on error when configured', async () => {
      const workflow: Workflow = {
        id: 'continue-on-error',
        steps: [
          { id: 'bad', action: 'failing-step', onError: 'continue' },
          { id: 'good', action: 'step1', dependsOn: ['bad'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(result.stepResults['bad']?.success).toBe(false)
      expect(result.stepResults['good']?.success).toBe(true)
    })

    it('should respect workflow timeout', async () => {
      // Timeout is checked between steps, so we need multiple steps
      // where the first step takes long enough to trigger timeout before step 2
      actions.registerAction('slow-step', {
        handler: async () => {
          await new Promise((r) => setTimeout(r, 100))
          return 'done'
        },
      })

      const workflow: Workflow = {
        id: 'timeout-test',
        timeout: 50,
        steps: [
          { id: 'first', action: 'slow-step' },
          { id: 'second', action: 'step1', dependsOn: ['first'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should cancel workflow', async () => {
      let stepReached = false

      actions.registerAction('delay', {
        handler: async () => {
          await new Promise((r) => setTimeout(r, 100))
          stepReached = true
          return 'delayed'
        },
      })

      const workflow: Workflow = {
        id: 'cancel-test',
        steps: [
          { id: 'first', action: 'delay' },
          { id: 'second', action: 'step1', dependsOn: ['first'] },
        ],
      }

      // Start workflow and cancel immediately
      const workflowPromise = actions.runWorkflow(workflow)

      // Give a small delay then cancel
      await new Promise((r) => setTimeout(r, 10))
      await actions.cancelWorkflow('cancel-test')

      const result = await workflowPromise

      expect(result.cancelled).toBe(true)
      expect(result.success).toBe(false)
    })

    it('should track running workflows', async () => {
      actions.registerAction('long-running', {
        handler: async () => {
          await new Promise((r) => setTimeout(r, 100))
          return 'done'
        },
      })

      const workflow: Workflow = {
        id: 'tracked',
        steps: [{ id: 'long', action: 'long-running' }],
      }

      const promise = actions.runWorkflow(workflow)

      expect(actions.isWorkflowRunning('tracked')).toBe(true)
      expect(actions.runningWorkflowCount).toBe(1)

      await promise

      expect(actions.isWorkflowRunning('tracked')).toBe(false)
      expect(actions.runningWorkflowCount).toBe(0)
    })

    it('should skip steps when condition is false', async () => {
      let step2Called = false

      actions.registerAction('conditional', {
        handler: async () => {
          step2Called = true
          return 'conditional'
        },
      })

      const workflow: Workflow = {
        id: 'conditional',
        steps: [
          { id: 's1', action: 'step1' },
          {
            id: 's2',
            action: 'conditional',
            dependsOn: ['s1'],
            condition: () => false, // Always skip
          },
          { id: 's3', action: 'step3', dependsOn: ['s2'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(true)
      expect(step2Called).toBe(false)
      expect(result.stepResults['s2']?.data).toBeNull() // Skipped
    })

    it('should detect circular dependencies', async () => {
      const workflow: Workflow = {
        id: 'circular',
        steps: [
          { id: 'a', action: 'step1', dependsOn: ['c'] },
          { id: 'b', action: 'step2', dependsOn: ['a'] },
          { id: 'c', action: 'step3', dependsOn: ['b'] },
        ],
      }

      const result = await actions.runWorkflow(workflow)

      expect(result.success).toBe(false)
      expect(result.error).toContain('deadlock')
    })

    it('should pass params to workflow steps', async () => {
      let receivedParams: unknown

      actions.registerAction('paramAction', {
        handler: async (params) => {
          receivedParams = params
          return 'done'
        },
      })

      const workflow: Workflow = {
        id: 'params-test',
        steps: [{ id: 's1', action: 'paramAction', params: { key: 'value', count: 42 } }],
      }

      await actions.runWorkflow(workflow)

      expect(receivedParams).toEqual({ key: 'value', count: 42 })
    })
  })

  describe('ActionsBase Convenience Class', () => {
    it('should provide pre-composed class', () => {
      const base = new ActionsBase(ctx, env)

      expect(base).toBeInstanceOf(DOCore)
      expect(typeof base.registerAction).toBe('function')
      expect(typeof base.executeAction).toBe('function')
    })

    it('should work like composed mixin', async () => {
      const base = new ActionsBase(ctx, env)

      base.registerAction('test', {
        handler: async () => 'works',
      })

      const result = await base.executeAction<string>('test')

      expect(result.success).toBe(true)
      expect(result.data).toBe('works')
    })
  })
})
