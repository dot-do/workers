/**
 * RED Tests: Explicit Type Definition Methods
 *
 * Tests for define.code(), define.generative(), define.agentic(), define.human() methods.
 * These allow precise control over function type instead of relying on auto-classification.
 *
 * Per README.md:
 * - define.code() - Pure computation, data transformation
 * - define.generative() - AI text/object generation, single-step
 * - define.agentic() - Multi-step AI with tools and memory
 * - define.human() - Requires human approval/input
 *
 * RED PHASE: These tests MUST FAIL because the define.* methods are not implemented yet.
 * The implementation will be done in the GREEN phase (workers-k33ey).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFunctionsEnv } from './helpers.js'
import { FunctionsDO, type FunctionDefinition } from '../src/functions.js'

// ============================================================================
// Type Definitions for Explicit Function Types
// ============================================================================

export type FunctionType = 'code' | 'generative' | 'agentic' | 'human'

export interface CodeFunctionOptions {
  name: string
  description?: string
  code: string
  runtime?: 'v8' | 'wasm'
  parameters?: Record<string, unknown>
}

export interface GenerativeFunctionOptions {
  name: string
  description?: string
  prompt: string
  model?: string
  output?: string | Record<string, unknown>
  parameters?: Record<string, unknown>
}

export interface AgenticFunctionOptions {
  name: string
  description?: string
  goal: string
  tools?: string[]
  memory?: boolean
  maxSteps?: number
  parameters?: Record<string, unknown>
}

export interface HumanFunctionOptions {
  name: string
  description?: string
  channel: 'slack' | 'email' | 'teams' | 'discord' | 'sms'
  assignee: string
  timeout?: string
  escalation?: string
  parameters?: Record<string, unknown>
}

export interface TypedFunctionDefinition extends FunctionDefinition {
  type: FunctionType
  config: CodeFunctionOptions | GenerativeFunctionOptions | AgenticFunctionOptions | HumanFunctionOptions
}

/**
 * Extended FunctionsDO interface with define.* methods
 */
export interface FunctionsDOWithExplicitDefine {
  define: {
    code(options: CodeFunctionOptions): Promise<TypedFunctionDefinition>
    generative(options: GenerativeFunctionOptions): Promise<TypedFunctionDefinition>
    agentic(options: AgenticFunctionOptions): Promise<TypedFunctionDefinition>
    human(options: HumanFunctionOptions): Promise<TypedFunctionDefinition>
  }
  listFunctions(): Promise<FunctionDefinition[]>
  getFunction(name: string): Promise<TypedFunctionDefinition | null>
}

describe('Explicit Type Definition Methods', () => {
  let ctx: MockDOState
  let env: MockFunctionsEnv
  let instance: FunctionsDO & FunctionsDOWithExplicitDefine

  beforeEach(() => {
    ctx = createMockState()
    env = createMockEnv()
    instance = new FunctionsDO(ctx, env) as FunctionsDO & FunctionsDOWithExplicitDefine
  })

  describe('define.code()', () => {
    it('should define a code function with explicit type', async () => {
      const definition = await instance.define.code({
        name: 'calculateTax',
        code: 'export default ({ income, rate }) => income * rate',
      })

      expect(definition).toBeDefined()
      expect(definition.name).toBe('calculateTax')
      expect(definition.type).toBe('code')
    })

    it('should store the code function with correct type in registry', async () => {
      await instance.define.code({
        name: 'processArray',
        code: 'export default (arr) => arr.map(x => x * 2)',
      })

      const functions = await instance.listFunctions()
      const fn = functions.find(f => f.name === 'processArray') as TypedFunctionDefinition | undefined

      expect(fn).toBeDefined()
      expect(fn?.type).toBe('code')
    })

    it('should support runtime option for code functions', async () => {
      const definition = await instance.define.code({
        name: 'wasmFunction',
        code: 'export default (x) => x',
        runtime: 'wasm',
      })

      expect(definition.config).toHaveProperty('runtime', 'wasm')
    })

    it('should support description and parameters', async () => {
      const definition = await instance.define.code({
        name: 'add',
        description: 'Adds two numbers',
        code: 'export default ({ a, b }) => a + b',
        parameters: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
      })

      expect(definition.description).toBe('Adds two numbers')
      expect(definition.parameters).toHaveProperty('properties')
    })

    it('should reject code function without name', async () => {
      await expect(
        instance.define.code({
          name: '',
          code: 'export default () => {}',
        })
      ).rejects.toThrow(/name.*required|invalid.*name/i)
    })

    it('should reject code function without code', async () => {
      await expect(
        instance.define.code({
          name: 'emptyCode',
          code: '',
        })
      ).rejects.toThrow(/code.*required|invalid.*code/i)
    })

    it('should reject duplicate function names', async () => {
      await instance.define.code({
        name: 'duplicateFunc',
        code: 'export default () => 1',
      })

      await expect(
        instance.define.code({
          name: 'duplicateFunc',
          code: 'export default () => 2',
        })
      ).rejects.toThrow(/exists|duplicate/i)
    })
  })

  describe('define.generative()', () => {
    it('should define a generative function with explicit type', async () => {
      const definition = await instance.define.generative({
        name: 'writeEmail',
        prompt: 'Write a professional email about: {{subject}}',
      })

      expect(definition).toBeDefined()
      expect(definition.name).toBe('writeEmail')
      expect(definition.type).toBe('generative')
    })

    it('should store the generative function with correct type', async () => {
      await instance.define.generative({
        name: 'generateBio',
        prompt: 'Write a professional bio for {{name}}',
      })

      const fn = await instance.getFunction('generateBio')
      expect(fn).toBeDefined()
      expect(fn?.type).toBe('generative')
    })

    it('should support model option for generative functions', async () => {
      const definition = await instance.define.generative({
        name: 'generateWithModel',
        prompt: 'Generate something',
        model: '@cf/meta/llama-3.1-70b-instruct',
      })

      expect((definition.config as GenerativeFunctionOptions).model).toBe('@cf/meta/llama-3.1-70b-instruct')
    })

    it('should support output schema for structured generation', async () => {
      const definition = await instance.define.generative({
        name: 'generateStructured',
        prompt: 'Generate a person profile',
        output: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      })

      expect((definition.config as GenerativeFunctionOptions).output).toHaveProperty('properties')
    })

    it('should reject generative function without prompt', async () => {
      await expect(
        instance.define.generative({
          name: 'noPrompt',
          prompt: '',
        })
      ).rejects.toThrow(/prompt.*required|invalid.*prompt/i)
    })
  })

  describe('define.agentic()', () => {
    it('should define an agentic function with explicit type', async () => {
      const definition = await instance.define.agentic({
        name: 'researchTopic',
        goal: 'Create a comprehensive research report',
      })

      expect(definition).toBeDefined()
      expect(definition.name).toBe('researchTopic')
      expect(definition.type).toBe('agentic')
    })

    it('should store the agentic function with correct type', async () => {
      await instance.define.agentic({
        name: 'planTrip',
        goal: 'Create a complete travel itinerary',
        tools: ['flights', 'hotels', 'maps'],
      })

      const fn = await instance.getFunction('planTrip')
      expect(fn).toBeDefined()
      expect(fn?.type).toBe('agentic')
    })

    it('should support tools array for agentic functions', async () => {
      const definition = await instance.define.agentic({
        name: 'researchWithTools',
        goal: 'Research a topic',
        tools: ['web-search', 'summarize', 'cite'],
      })

      expect((definition.config as AgenticFunctionOptions).tools).toEqual(['web-search', 'summarize', 'cite'])
    })

    it('should support memory option for persistent context', async () => {
      const definition = await instance.define.agentic({
        name: 'agentWithMemory',
        goal: 'Track ongoing project',
        memory: true,
      })

      expect((definition.config as AgenticFunctionOptions).memory).toBe(true)
    })

    it('should support maxSteps option to limit execution', async () => {
      const definition = await instance.define.agentic({
        name: 'limitedAgent',
        goal: 'Quick task',
        maxSteps: 5,
      })

      expect((definition.config as AgenticFunctionOptions).maxSteps).toBe(5)
    })

    it('should reject agentic function without goal', async () => {
      await expect(
        instance.define.agentic({
          name: 'noGoal',
          goal: '',
        })
      ).rejects.toThrow(/goal.*required|invalid.*goal/i)
    })
  })

  describe('define.human()', () => {
    it('should define a human function with explicit type', async () => {
      const definition = await instance.define.human({
        name: 'approveRefund',
        channel: 'slack',
        assignee: '@finance-team',
      })

      expect(definition).toBeDefined()
      expect(definition.name).toBe('approveRefund')
      expect(definition.type).toBe('human')
    })

    it('should store the human function with correct type', async () => {
      await instance.define.human({
        name: 'reviewContract',
        channel: 'email',
        assignee: 'legal@company.com',
      })

      const fn = await instance.getFunction('reviewContract')
      expect(fn).toBeDefined()
      expect(fn?.type).toBe('human')
    })

    it('should support various channel types', async () => {
      const channels: Array<'slack' | 'email' | 'teams' | 'discord' | 'sms'> = ['slack', 'email', 'teams', 'discord', 'sms']

      for (const channel of channels) {
        const definition = await instance.define.human({
          name: `humanFunc_${channel}`,
          channel,
          assignee: 'test@example.com',
        })

        expect((definition.config as HumanFunctionOptions).channel).toBe(channel)
      }
    })

    it('should support timeout option for human functions', async () => {
      const definition = await instance.define.human({
        name: 'timedApproval',
        channel: 'slack',
        assignee: '@approvers',
        timeout: '24h',
      })

      expect((definition.config as HumanFunctionOptions).timeout).toBe('24h')
    })

    it('should support escalation option for human functions', async () => {
      const definition = await instance.define.human({
        name: 'escalatedApproval',
        channel: 'email',
        assignee: 'manager@company.com',
        timeout: '4h',
        escalation: 'ceo@company.com',
      })

      expect((definition.config as HumanFunctionOptions).escalation).toBe('ceo@company.com')
    })

    it('should reject human function without channel', async () => {
      await expect(
        instance.define.human({
          name: 'noChannel',
          channel: '' as 'slack',
          assignee: 'someone',
        })
      ).rejects.toThrow(/channel.*required|invalid.*channel/i)
    })

    it('should reject human function without assignee', async () => {
      await expect(
        instance.define.human({
          name: 'noAssignee',
          channel: 'slack',
          assignee: '',
        })
      ).rejects.toThrow(/assignee.*required|invalid.*assignee/i)
    })
  })

  describe('getFunction()', () => {
    it('should retrieve function by name with type information', async () => {
      await instance.define.code({
        name: 'testFunc',
        code: 'export default () => {}',
      })

      const fn = await instance.getFunction('testFunc')
      expect(fn).toBeDefined()
      expect(fn?.name).toBe('testFunc')
      expect(fn?.type).toBe('code')
    })

    it('should return null for non-existent function', async () => {
      const fn = await instance.getFunction('nonexistent')
      expect(fn).toBeNull()
    })
  })

  describe('Integration: listFunctions() with explicit types', () => {
    it('should list all functions with their explicit types', async () => {
      await instance.define.code({
        name: 'codeFunc',
        code: 'export default () => 1',
      })
      await instance.define.generative({
        name: 'genFunc',
        prompt: 'Generate something',
      })
      await instance.define.agentic({
        name: 'agentFunc',
        goal: 'Do something complex',
      })
      await instance.define.human({
        name: 'humanFunc',
        channel: 'slack',
        assignee: '@team',
      })

      const functions = await instance.listFunctions() as TypedFunctionDefinition[]

      expect(functions).toHaveLength(4)

      const codeFunc = functions.find(f => f.name === 'codeFunc')
      const genFunc = functions.find(f => f.name === 'genFunc')
      const agentFunc = functions.find(f => f.name === 'agentFunc')
      const humanFunc = functions.find(f => f.name === 'humanFunc')

      expect(codeFunc?.type).toBe('code')
      expect(genFunc?.type).toBe('generative')
      expect(agentFunc?.type).toBe('agentic')
      expect(humanFunc?.type).toBe('human')
    })

    it('should filter functions by type', async () => {
      await instance.define.code({ name: 'code1', code: 'x' })
      await instance.define.code({ name: 'code2', code: 'y' })
      await instance.define.generative({ name: 'gen1', prompt: 'a' })

      // Assuming listFunctions will be enhanced to accept type filter
      const allFunctions = await instance.listFunctions() as TypedFunctionDefinition[]
      const codeFunctions = allFunctions.filter(f => f.type === 'code')

      expect(codeFunctions).toHaveLength(2)
      codeFunctions.forEach(f => expect(f.type).toBe('code'))
    })
  })

  describe('Storage persistence', () => {
    it('should persist code function to storage', async () => {
      await instance.define.code({
        name: 'persistedCode',
        code: 'export default () => "persisted"',
        description: 'A persisted function',
      })

      // Verify stored in DO storage
      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:persistedCode')
      expect(stored).toBeDefined()
      expect(stored?.type).toBe('code')
      expect(stored?.name).toBe('persistedCode')
    })

    it('should persist generative function to storage', async () => {
      await instance.define.generative({
        name: 'persistedGen',
        prompt: 'Generate something persistent',
      })

      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:persistedGen')
      expect(stored).toBeDefined()
      expect(stored?.type).toBe('generative')
    })

    it('should persist agentic function to storage', async () => {
      await instance.define.agentic({
        name: 'persistedAgent',
        goal: 'Persist across restarts',
        tools: ['memory'],
        memory: true,
      })

      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:persistedAgent')
      expect(stored).toBeDefined()
      expect(stored?.type).toBe('agentic')
      expect((stored?.config as AgenticFunctionOptions).memory).toBe(true)
    })

    it('should persist human function to storage', async () => {
      await instance.define.human({
        name: 'persistedHuman',
        channel: 'email',
        assignee: 'human@example.com',
        timeout: '48h',
      })

      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:persistedHuman')
      expect(stored).toBeDefined()
      expect(stored?.type).toBe('human')
      expect((stored?.config as HumanFunctionOptions).timeout).toBe('48h')
    })
  })
})
