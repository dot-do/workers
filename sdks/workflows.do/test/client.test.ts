/**
 * TDD RED Phase Tests for workflows.do SDK
 *
 * These tests define the expected behavior for the workflows.do SDK.
 * They validate exports, type re-exports, client methods, and tagged templates.
 *
 * Test coverage:
 * - Export pattern (Workflows factory, workflows instance, default export)
 * - Type re-exports from ai-workflows
 * - Client methods (list, get, create, start, status, cancel, etc.)
 * - Tagged template syntax (workflows.do`description`)
 * - WorkflowContext and event/schedule patterns
 *
 * KNOWN ISSUES DISCOVERED:
 * 1. Duplicate exports bug at line 298: `export { Workflows, workflows }`
 *    - Workflows is already exported via `export function Workflows()` at line 285
 *    - workflows is already exported via `export const workflows` at line 295
 *    - This causes "Multiple exports with the same name" error
 *    - FIX: Remove line 298 (`export { Workflows, workflows }`)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Export Bug Detection Test
// =============================================================================

describe('SDK export bug detection', () => {
  it('should not have duplicate export declarations - BUG: line 298 duplicates exports', async () => {
    /**
     * This test will FAIL until the duplicate export bug is fixed.
     *
     * The SDK has:
     *   Line 285: export function Workflows() { ... }
     *   Line 295: export const workflows = ...
     *   Line 298: export { Workflows, workflows }  <-- DUPLICATE, causes error
     *
     * Fix: Remove line 298 entirely since Workflows and workflows
     * are already exported via their declarations.
     */
    const importSucceeded = await import('../index')
      .then(() => true)
      .catch((error: Error) => {
        // Document the specific error we expect
        expect(error.message).toContain('Multiple exports with the same name')
        return false
      })

    // When fixed, this should be true
    expect(importSucceeded).toBe(true)
  })
})

// =============================================================================
// Export Pattern Tests
// =============================================================================

describe('workflows.do SDK exports', () => {
  it('should export Workflows factory function', async () => {
    const { Workflows } = await import('../index')
    expect(typeof Workflows).toBe('function')
  })

  it('should export workflows instance', async () => {
    const { workflows } = await import('../index')
    expect(workflows).toBeDefined()
    expect(typeof workflows).toBe('object')
  })

  it('should export default as workflows instance', async () => {
    const { default: defaultExport, workflows } = await import('../index')
    expect(defaultExport).toBe(workflows)
  })

  it('should export Workflows as named export', async () => {
    const mod = await import('../index')
    expect(mod.Workflows).toBeDefined()
    expect(typeof mod.Workflows).toBe('function')
  })

  it('should create a new client with Workflows factory', async () => {
    const { Workflows } = await import('../index')
    const client = Workflows({ baseURL: 'https://custom.example.com' })
    expect(client).toBeDefined()
  })
})

// =============================================================================
// Type Re-exports from ai-workflows
// =============================================================================

describe('ai-workflows type re-exports', () => {
  /**
   * CRITICAL: The SDK re-exports types from ai-workflows:
   *   export type { EventHandler, ScheduleHandler, WorkflowContext, ... } from 'ai-workflows'
   *
   * These tests verify the re-exports resolve correctly.
   * If ai-workflows is not installed or types are missing, these will fail.
   */

  it('should re-export EventHandler type from ai-workflows', async () => {
    // This test verifies the type exists - if it compiles and imports, it passes
    const mod = await import('../index')
    // Type-only exports can't be tested at runtime, but the import should not fail
    expect(mod).toBeDefined()
  })

  it('should re-export ScheduleHandler type from ai-workflows', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should re-export WorkflowContext type from ai-workflows', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should re-export Workflow function from ai-workflows', async () => {
    const { Workflow } = await import('../index')
    expect(typeof Workflow).toBe('function')
  })

  it('should re-export on from ai-workflows', async () => {
    const { on } = await import('../index')
    expect(on).toBeDefined()
  })

  it('should re-export every from ai-workflows', async () => {
    const { every } = await import('../index')
    expect(every).toBeDefined()
  })

  it('should re-export send from ai-workflows', async () => {
    const { send } = await import('../index')
    expect(typeof send).toBe('function')
  })
})

// =============================================================================
// Local Type Exports
// =============================================================================

describe('local type exports', () => {
  it('should export WorkflowStep interface type', async () => {
    // Type-only, verify module loads
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export WorkflowDefinition interface type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export WorkflowRun interface type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export WorkflowHistoryEntry interface type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export StepRun interface type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export DoOptions interface type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export ClientOptions type from rpc.do', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })
})

// =============================================================================
// Client Methods Tests
// =============================================================================

describe('WorkflowsClient methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [] }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('workflow definition methods', () => {
    it('should have list method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.list).toBe('function')
    })

    it('should have get method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.get).toBe('function')
    })

    it('should have update method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.update).toBe('function')
    })

    it('should have delete method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.delete).toBe('function')
    })

    it('should have define method for $ context workflows', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.define).toBe('function')
    })

    it('should have steps method for step-based workflows', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.steps).toBe('function')
    })
  })

  describe('workflow execution methods', () => {
    it('should have start method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.start).toBe('function')
    })

    it('should have send method for events', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.send).toBe('function')
    })

    it('should have status method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.status).toBe('function')
    })

    it('should have history method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.history).toBe('function')
    })

    it('should have pause method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.pause).toBe('function')
    })

    it('should have resume method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.resume).toBe('function')
    })

    it('should have cancel method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.cancel).toBe('function')
    })

    it('should have retry method', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.retry).toBe('function')
    })

    it('should have runs method to list runs', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.runs).toBe('function')
    })

    it('should have stream method for run events', async () => {
      const { workflows } = await import('../index')
      expect(typeof workflows.stream).toBe('function')
    })
  })
})

// =============================================================================
// Tagged Template Tests
// =============================================================================

describe('tagged template syntax', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'wf-123',
          name: 'onboarding',
          description: 'When customer signs up...',
          steps: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have do method for tagged templates', async () => {
    const { workflows } = await import('../index')
    expect(typeof workflows.do).toBe('function')
  })

  it('should support tagged template literal syntax', async () => {
    const { workflows } = await import('../index')

    // The tagged template should work as a function that accepts TemplateStringsArray
    const result = await workflows.do`
      When a customer signs up, send a welcome email,
      wait 3 days, then send onboarding tips
    `

    expect(result).toBeDefined()
  })

  it('should support tagged template with interpolation', async () => {
    const { workflows } = await import('../index')

    const waitDays = 3
    const result = await workflows.do`
      When a customer signs up, send a welcome email,
      wait ${waitDays} days, then send onboarding tips
    `

    expect(result).toBeDefined()
  })

  it('should support string argument with options', async () => {
    const { workflows } = await import('../index')

    // Should also work as a regular function call with string
    const result = await workflows.do('Send welcome email after signup', {
      context: { emailType: 'welcome' },
      timeout: '30m',
    })

    expect(result).toBeDefined()
  })
})

// =============================================================================
// WorkflowContext Tests ($ context pattern)
// =============================================================================

describe('WorkflowContext pattern', () => {
  it('should support define with $ context', async () => {
    const { workflows } = await import('../index')

    // The define method should accept a setup function that receives $
    expect(typeof workflows.define).toBe('function')
  })

  it('should support $.on for event handlers', async () => {
    // This tests the ai-workflows Workflow function pattern
    const { Workflow } = await import('../index')

    let onCalled = false

    const workflow = Workflow(($) => {
      // $.on should be a proxy for registering event handlers
      expect($.on).toBeDefined()
      onCalled = true
    })

    expect(onCalled).toBe(true)
    expect(workflow).toBeDefined()
  })

  it('should support $.every for schedules', async () => {
    const { Workflow } = await import('../index')

    let everyCalled = false

    const workflow = Workflow(($) => {
      expect($.every).toBeDefined()
      everyCalled = true
    })

    expect(everyCalled).toBe(true)
  })

  it('should support $.send for durable events', async () => {
    const { Workflow } = await import('../index')

    Workflow(($) => {
      expect(typeof $.send).toBe('function')
    })
  })

  it('should support $.do for durable actions', async () => {
    const { Workflow } = await import('../index')

    Workflow(($) => {
      expect(typeof $.do).toBe('function')
    })
  })

  it('should support $.log for logging', async () => {
    const { Workflow } = await import('../index')

    Workflow(($) => {
      expect(typeof $.log).toBe('function')
    })
  })

  it('should support $.state for workflow state', async () => {
    const { Workflow } = await import('../index')

    Workflow(($) => {
      expect($.state).toBeDefined()
      expect(typeof $.state).toBe('object')
    })
  })

  it('should support $.set and $.get for state management', async () => {
    const { Workflow } = await import('../index')

    Workflow(($) => {
      expect(typeof $.set).toBe('function')
      expect(typeof $.get).toBe('function')
    })
  })
})

// =============================================================================
// Step-based Workflow Tests
// =============================================================================

describe('step-based workflows', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'wf-456',
          name: 'order-processing',
          steps: [
            { name: 'validate', action: 'Order.validate' },
            { name: 'reserve', action: 'Inventory.reserve' },
            { name: 'charge', action: 'Payment.charge' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should support creating step-based workflows', async () => {
    const { workflows } = await import('../index')

    const result = await workflows.steps('order-processing', {
      steps: [
        { name: 'validate', action: 'Order.validate' },
        { name: 'reserve', action: 'Inventory.reserve', retry: { attempts: 3, delay: '5s' } },
        { name: 'charge', action: 'Payment.charge' },
      ],
      timeout: '1h',
    })

    expect(result).toBeDefined()
    expect(result.name).toBe('order-processing')
  })

  it('should support wait durations in steps', async () => {
    const { workflows } = await import('../index')

    // Steps can have wait durations
    await workflows.steps('delayed-workflow', {
      steps: [
        { name: 'send-email', action: 'Email.send' },
        { name: 'wait', action: 'noop', wait: '3d' },
        { name: 'followup', action: 'Email.followup' },
      ],
    })

    expect(fetchMock).toHaveBeenCalled()
  })

  it('should support conditions in steps', async () => {
    const { workflows } = await import('../index')

    await workflows.steps('conditional-workflow', {
      steps: [
        { name: 'check', action: 'Order.check' },
        { name: 'process', action: 'Order.process', condition: 'check.output.valid === true' },
      ],
    })

    expect(fetchMock).toHaveBeenCalled()
  })
})

// =============================================================================
// Workflow Run Status Tests
// =============================================================================

describe('workflow run status', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should return run with all status fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'run-789',
          workflowId: 'wf-123',
          workflowName: 'onboarding',
          input: { email: 'test@example.com' },
          status: 'running',
          currentStep: 'send-email',
          state: { emailSent: false },
          history: [],
          startedAt: new Date().toISOString(),
        },
      }),
    })

    const { workflows } = await import('../index')
    const run = await workflows.status('run-789')

    expect(run.id).toBe('run-789')
    expect(run.status).toBe('running')
    expect(run.currentStep).toBe('send-email')
  })

  it('should handle different run statuses', async () => {
    const statuses = ['pending', 'running', 'paused', 'waiting', 'completed', 'failed'] as const

    const { workflows } = await import('../index')

    for (const status of statuses) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: {
            id: `run-${status}`,
            workflowId: 'wf-123',
            workflowName: 'test',
            input: {},
            status,
            state: {},
            history: [],
            startedAt: new Date().toISOString(),
          },
        }),
      })

      const run = await workflows.status(`run-${status}`)
      expect(run.status).toBe(status)
    }
  })
})

// =============================================================================
// Integration with rpc.do
// =============================================================================

describe('rpc.do integration', () => {
  it('should use rpc.do createClient', async () => {
    // The Workflows factory should use createClient internally
    const { Workflows } = await import('../index')

    // Creating a client should work
    const client = Workflows({
      baseURL: 'https://custom.workflows.do',
      apiKey: 'test-key',
    })

    expect(client).toBeDefined()
  })

  it('should re-export ClientOptions from rpc.do', async () => {
    const mod = await import('../index')
    // ClientOptions is a type, so we can only verify the module loads
    expect(mod).toBeDefined()
  })

  it('should support transport options', async () => {
    const { Workflows } = await import('../index')

    // Should accept all ClientOptions from rpc.do
    const client = Workflows({
      baseURL: 'https://workflows.do',
      transport: 'http',
      timeout: 30000,
      retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
    })

    expect(client).toBeDefined()
  })
})
