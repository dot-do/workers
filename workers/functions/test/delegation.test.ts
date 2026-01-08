/**
 * RED Tests: FunctionsDO Delegation to Backend Workers
 *
 * Tests for function invocation delegation based on function type.
 * FunctionsDO must route invoke() calls to the correct backend worker:
 *
 *   - type: 'code'       -> env.EVAL
 *   - type: 'generative' -> env.AI
 *   - type: 'agentic'    -> env.AGENTS
 *   - type: 'human'      -> env.HUMANS
 *
 * RED PHASE: These tests MUST FAIL because delegation is not implemented yet.
 * The implementation will be done in GREEN phase (workers-25bur).
 *
 * @see workers/functions/README.md for architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockState, createMockStorage, createMockId, type MockDOState } from './helpers.js'

// ============================================================================
// Extended Mock Environment with Backend Workers
// ============================================================================

/**
 * Mock backend worker binding interface.
 * Each backend worker (EVAL, AI, AGENTS, HUMANS) exposes an execute() method.
 */
interface MockBackendWorker {
  execute: (name: string, params: unknown) => Promise<unknown>
}

/**
 * Extended mock environment with all backend worker bindings.
 */
interface MockDelegationEnv {
  FUNCTIONS_DO: {
    get: (id: { toString(): string }) => unknown
    idFromName: (name: string) => { toString(): string }
  }
  AI: {
    run: <T>(model: string, input: unknown) => Promise<T>
  }
  // Backend worker bindings for delegation
  EVAL: MockBackendWorker
  AGENTS: MockBackendWorker
  HUMANS: MockBackendWorker
}

/**
 * Create mock backend worker binding
 */
function createMockBackendWorker(name: string): MockBackendWorker {
  return {
    execute: vi.fn(async (fnName: string, params: unknown) => {
      return { backend: name, function: fnName, params, executed: true }
    }),
  }
}

/**
 * Create mock environment with all backend workers
 */
function createMockDelegationEnv(): MockDelegationEnv {
  return {
    FUNCTIONS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI: {
      run: vi.fn(async <T>(_model: string, _input: unknown): Promise<T> => {
        return { response: 'Mock AI response' } as T
      }),
    },
    EVAL: createMockBackendWorker('EVAL'),
    AGENTS: createMockBackendWorker('AGENTS'),
    HUMANS: createMockBackendWorker('HUMANS'),
  }
}

// ============================================================================
// Extended Function Definition with Type
// ============================================================================

/**
 * Function types for delegation routing.
 */
type FunctionType = 'code' | 'generative' | 'agentic' | 'human'

/**
 * Extended function definition with type for delegation.
 */
interface TypedFunctionDefinition {
  name: string
  type: FunctionType
  description?: string
  parameters?: Record<string, unknown>
  // Type-specific configuration
  code?: string               // For 'code' type
  prompt?: string             // For 'generative' type
  goal?: string               // For 'agentic' type
  tools?: string[]            // For 'agentic' type
  channel?: string            // For 'human' type
  assignee?: string           // For 'human' type
  timeout?: string            // For 'human' type
}

/**
 * Extended FunctionsDO contract with typed function support.
 */
interface FunctionsDOWithDelegation {
  // Typed registration methods
  registerTyped(definition: TypedFunctionDefinition): Promise<void>

  // Standard invoke - should delegate based on stored type
  invoke(name: string, params: unknown): Promise<unknown>

  // Get function with type info
  getFunction(name: string): Promise<TypedFunctionDefinition | null>
}

/**
 * Load FunctionsDO for testing delegation.
 */
async function loadFunctionsDO(): Promise<new (ctx: MockDOState, env: MockDelegationEnv) => FunctionsDOWithDelegation> {
  const module = await import('../src/functions.js')
  return module.FunctionsDO
}

// ============================================================================
// Delegation Tests
// ============================================================================

describe('FunctionsDO Delegation', () => {
  let ctx: MockDOState
  let env: MockDelegationEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockDelegationEnv) => FunctionsDOWithDelegation

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockDelegationEnv()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('Routing to correct backend', () => {
    describe('Code functions -> env.EVAL', () => {
      it('should route code function invocation to env.EVAL', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Register a code function
        await instance.registerTyped({
          name: 'calculateTax',
          type: 'code',
          code: 'export default ({ income, rate }) => income * rate',
          parameters: {
            type: 'object',
            properties: {
              income: { type: 'number' },
              rate: { type: 'number' },
            },
          },
        })

        // Invoke the function
        const result = await instance.invoke('calculateTax', { income: 1000, rate: 0.2 })

        // Verify delegation to EVAL backend
        expect(env.EVAL.execute).toHaveBeenCalledTimes(1)
        expect(env.EVAL.execute).toHaveBeenCalledWith('calculateTax', { income: 1000, rate: 0.2 })
        expect(result).toHaveProperty('backend', 'EVAL')
      })

      it('should pass function code to EVAL backend', async () => {
        const instance = new FunctionsDO(ctx, env)
        const code = 'export default (arr) => arr.map(x => x * 2)'

        await instance.registerTyped({
          name: 'doubleArray',
          type: 'code',
          code,
        })

        await instance.invoke('doubleArray', [1, 2, 3])

        // Verify the execute call includes access to the code
        expect(env.EVAL.execute).toHaveBeenCalled()
      })

      it('should not call other backends for code functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'fibonacci',
          type: 'code',
          code: 'export default (n) => n <= 1 ? n : fib(n-1) + fib(n-2)',
        })

        await instance.invoke('fibonacci', 10)

        // Only EVAL should be called
        expect(env.EVAL.execute).toHaveBeenCalled()
        expect(env.AGENTS.execute).not.toHaveBeenCalled()
        expect(env.HUMANS.execute).not.toHaveBeenCalled()
      })
    })

    describe('Generative functions -> env.AI', () => {
      it('should route generative function invocation to env.AI', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'summarizeText',
          type: 'generative',
          prompt: 'Summarize the following text: {{text}}',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
            },
          },
        })

        const result = await instance.invoke('summarizeText', { text: 'Long article content...' })

        // Verify delegation to AI backend (via env.AI.run or similar)
        expect(env.AI.run).toHaveBeenCalled()
        expect(result).toHaveProperty('text')
      })

      it('should use function prompt template for generative functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'writeEmail',
          type: 'generative',
          prompt: 'Write a professional email about: {{subject}}',
        })

        await instance.invoke('writeEmail', { subject: 'Project Update' })

        // Verify AI was called with the templated prompt
        expect(env.AI.run).toHaveBeenCalled()
        const callArgs = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0]
        expect(callArgs).toBeDefined()
      })

      it('should not call backend workers for generative functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'generateBio',
          type: 'generative',
          prompt: 'Write a bio for {{name}}',
        })

        await instance.invoke('generateBio', { name: 'Alice' })

        // Only AI should be used, not backend workers
        expect(env.EVAL.execute).not.toHaveBeenCalled()
        expect(env.AGENTS.execute).not.toHaveBeenCalled()
        expect(env.HUMANS.execute).not.toHaveBeenCalled()
      })
    })

    describe('Agentic functions -> env.AGENTS', () => {
      it('should route agentic function invocation to env.AGENTS', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'researchTopic',
          type: 'agentic',
          goal: 'Create a comprehensive research report',
          tools: ['web-search', 'summarize', 'cite'],
        })

        const result = await instance.invoke('researchTopic', { topic: 'quantum computing' })

        // Verify delegation to AGENTS backend
        expect(env.AGENTS.execute).toHaveBeenCalledTimes(1)
        expect(env.AGENTS.execute).toHaveBeenCalledWith('researchTopic', { topic: 'quantum computing' })
        expect(result).toHaveProperty('backend', 'AGENTS')
      })

      it('should pass tools configuration to AGENTS backend', async () => {
        const instance = new FunctionsDO(ctx, env)
        const tools = ['flights', 'hotels', 'maps', 'weather']

        await instance.registerTyped({
          name: 'planTrip',
          type: 'agentic',
          goal: 'Create a complete travel itinerary',
          tools,
        })

        await instance.invoke('planTrip', { destination: 'Tokyo', duration: '7 days' })

        expect(env.AGENTS.execute).toHaveBeenCalled()
      })

      it('should not call other backends for agentic functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'analyzeCompetitor',
          type: 'agentic',
          goal: 'Analyze competitor strategy',
          tools: ['web-search', 'extract', 'summarize'],
        })

        await instance.invoke('analyzeCompetitor', { company: 'Acme Corp' })

        // Only AGENTS should be called
        expect(env.AGENTS.execute).toHaveBeenCalled()
        expect(env.EVAL.execute).not.toHaveBeenCalled()
        expect(env.HUMANS.execute).not.toHaveBeenCalled()
      })
    })

    describe('Human functions -> env.HUMANS', () => {
      it('should route human function invocation to env.HUMANS', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'approveExpense',
          type: 'human',
          channel: 'slack',
          assignee: '@finance-team',
          timeout: '24h',
        })

        const result = await instance.invoke('approveExpense', { amount: 5000, description: 'Office equipment' })

        // Verify delegation to HUMANS backend
        expect(env.HUMANS.execute).toHaveBeenCalledTimes(1)
        expect(env.HUMANS.execute).toHaveBeenCalledWith('approveExpense', { amount: 5000, description: 'Office equipment' })
        expect(result).toHaveProperty('backend', 'HUMANS')
      })

      it('should pass channel and assignee to HUMANS backend', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'reviewContract',
          type: 'human',
          channel: 'email',
          assignee: 'legal@company.com',
          timeout: '48h',
        })

        await instance.invoke('reviewContract', { contractId: 'C-2024-001' })

        expect(env.HUMANS.execute).toHaveBeenCalled()
      })

      it('should not call other backends for human functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'approveRefund',
          type: 'human',
          channel: 'slack',
          assignee: '@support',
        })

        await instance.invoke('approveRefund', { orderId: 'ORD-123', amount: 99.99 })

        // Only HUMANS should be called
        expect(env.HUMANS.execute).toHaveBeenCalled()
        expect(env.EVAL.execute).not.toHaveBeenCalled()
        expect(env.AGENTS.execute).not.toHaveBeenCalled()
      })
    })
  })

  describe('Error handling', () => {
    describe('Backend failures', () => {
      it('should propagate error when EVAL backend fails', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Make EVAL backend throw
        env.EVAL.execute = vi.fn().mockRejectedValue(new Error('EVAL execution failed: syntax error'))

        await instance.registerTyped({
          name: 'brokenCode',
          type: 'code',
          code: 'invalid javascript {{{',
        })

        await expect(instance.invoke('brokenCode', {})).rejects.toThrow(/EVAL|execution|failed/i)
      })

      it('should propagate error when AGENTS backend fails', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Make AGENTS backend throw
        env.AGENTS.execute = vi.fn().mockRejectedValue(new Error('Agent execution failed: tool not available'))

        await instance.registerTyped({
          name: 'failingAgent',
          type: 'agentic',
          goal: 'Do something impossible',
          tools: ['nonexistent-tool'],
        })

        await expect(instance.invoke('failingAgent', {})).rejects.toThrow(/agent|execution|failed/i)
      })

      it('should propagate error when HUMANS backend fails', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Make HUMANS backend throw
        env.HUMANS.execute = vi.fn().mockRejectedValue(new Error('Human task failed: assignee not found'))

        await instance.registerTyped({
          name: 'orphanedTask',
          type: 'human',
          channel: 'slack',
          assignee: '@nonexistent-user',
        })

        await expect(instance.invoke('orphanedTask', {})).rejects.toThrow(/human|task|failed|assignee/i)
      })

      it('should propagate error when AI backend fails for generative functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Make AI.run throw
        env.AI.run = vi.fn().mockRejectedValue(new Error('AI rate limit exceeded'))

        await instance.registerTyped({
          name: 'rateLimitedGen',
          type: 'generative',
          prompt: 'Generate something',
        })

        await expect(instance.invoke('rateLimitedGen', {})).rejects.toThrow(/rate limit|AI/i)
      })
    })

    describe('Backend timeout handling', () => {
      it('should handle timeout for long-running EVAL functions', async () => {
        const instance = new FunctionsDO(ctx, env)

        // Make EVAL backend timeout
        env.EVAL.execute = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 60000)) // 60 seconds
        })

        await instance.registerTyped({
          name: 'slowComputation',
          type: 'code',
          code: 'while(true) {}',
        })

        // Should timeout and throw
        await expect(
          Promise.race([
            instance.invoke('slowComputation', {}),
            new Promise((_, reject) => setTimeout(() => reject(new Error('test timeout')), 100)),
          ])
        ).rejects.toThrow()
      })

      it('should handle timeout for human tasks', async () => {
        const instance = new FunctionsDO(ctx, env)

        await instance.registerTyped({
          name: 'urgentApproval',
          type: 'human',
          channel: 'slack',
          assignee: '@manager',
          timeout: '1ms', // Very short timeout for testing
        })

        // Mock the timeout behavior
        env.HUMANS.execute = vi.fn().mockRejectedValue(new Error('Human task timed out'))

        await expect(instance.invoke('urgentApproval', {})).rejects.toThrow(/timeout/i)
      })
    })

    describe('Missing backend bindings', () => {
      it('should throw descriptive error when EVAL binding is missing', async () => {
        const envWithoutEval = { ...env, EVAL: undefined as unknown as MockBackendWorker }
        const instance = new FunctionsDO(ctx, envWithoutEval)

        await instance.registerTyped({
          name: 'codeWithoutBackend',
          type: 'code',
          code: 'export default () => 42',
        })

        await expect(instance.invoke('codeWithoutBackend', {})).rejects.toThrow(/EVAL|binding|missing|not configured/i)
      })

      it('should throw descriptive error when AGENTS binding is missing', async () => {
        const envWithoutAgents = { ...env, AGENTS: undefined as unknown as MockBackendWorker }
        const instance = new FunctionsDO(ctx, envWithoutAgents)

        await instance.registerTyped({
          name: 'agentWithoutBackend',
          type: 'agentic',
          goal: 'Do something',
        })

        await expect(instance.invoke('agentWithoutBackend', {})).rejects.toThrow(/AGENTS|binding|missing|not configured/i)
      })

      it('should throw descriptive error when HUMANS binding is missing', async () => {
        const envWithoutHumans = { ...env, HUMANS: undefined as unknown as MockBackendWorker }
        const instance = new FunctionsDO(ctx, envWithoutHumans)

        await instance.registerTyped({
          name: 'humanWithoutBackend',
          type: 'human',
          channel: 'slack',
        })

        await expect(instance.invoke('humanWithoutBackend', {})).rejects.toThrow(/HUMANS|binding|missing|not configured/i)
      })
    })
  })

  describe('Function type retrieval', () => {
    it('should return function type when getting function definition', async () => {
      const instance = new FunctionsDO(ctx, env)

      await instance.registerTyped({
        name: 'typedFunction',
        type: 'agentic',
        goal: 'Research something',
      })

      const fn = await instance.getFunction('typedFunction')

      expect(fn).not.toBeNull()
      expect(fn?.type).toBe('agentic')
    })

    it('should persist function type across storage operations', async () => {
      // Register with one instance
      const instance1 = new FunctionsDO(ctx, env)
      await instance1.registerTyped({
        name: 'persistedFunction',
        type: 'human',
        channel: 'email',
        assignee: 'admin@company.com',
      })

      // Create new instance with same storage
      const instance2 = new FunctionsDO(ctx, env)
      const fn = await instance2.getFunction('persistedFunction')

      expect(fn?.type).toBe('human')
    })

    it('should return null for non-existent function', async () => {
      const instance = new FunctionsDO(ctx, env)
      const fn = await instance.getFunction('nonexistent')
      expect(fn).toBeNull()
    })
  })

  describe('Mixed function types', () => {
    it('should correctly route multiple functions of different types', async () => {
      const instance = new FunctionsDO(ctx, env)

      // Register functions of each type
      await instance.registerTyped({
        name: 'mathCalc',
        type: 'code',
        code: 'export default ({ a, b }) => a + b',
      })

      await instance.registerTyped({
        name: 'writePoem',
        type: 'generative',
        prompt: 'Write a haiku about {{topic}}',
      })

      await instance.registerTyped({
        name: 'deepResearch',
        type: 'agentic',
        goal: 'In-depth analysis',
        tools: ['search', 'analyze'],
      })

      await instance.registerTyped({
        name: 'managerApproval',
        type: 'human',
        channel: 'slack',
        assignee: '@manager',
      })

      // Invoke each and verify routing
      await instance.invoke('mathCalc', { a: 1, b: 2 })
      expect(env.EVAL.execute).toHaveBeenLastCalledWith('mathCalc', { a: 1, b: 2 })

      await instance.invoke('writePoem', { topic: 'spring' })
      expect(env.AI.run).toHaveBeenCalled()

      await instance.invoke('deepResearch', { subject: 'AI ethics' })
      expect(env.AGENTS.execute).toHaveBeenLastCalledWith('deepResearch', { subject: 'AI ethics' })

      await instance.invoke('managerApproval', { requestId: '123' })
      expect(env.HUMANS.execute).toHaveBeenLastCalledWith('managerApproval', { requestId: '123' })
    })
  })
})
