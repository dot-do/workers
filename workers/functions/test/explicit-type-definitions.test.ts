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
/**
 * Update options for typed functions - partial updates supported
 */
export interface UpdateFunctionOptions {
  description?: string
  parameters?: Record<string, unknown>
  // Code function updates
  code?: string
  runtime?: 'v8' | 'wasm'
  // Generative function updates
  prompt?: string
  model?: string
  output?: string | Record<string, unknown>
  // Agentic function updates
  goal?: string
  tools?: string[]
  memory?: boolean
  maxSteps?: number
  // Human function updates
  channel?: 'slack' | 'email' | 'teams' | 'discord' | 'sms'
  assignee?: string
  timeout?: string
  escalation?: string
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
  updateFunction(name: string, updates: UpdateFunctionOptions): Promise<TypedFunctionDefinition>
  deleteFunction(name: string): Promise<boolean>
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

  describe('updateFunction()', () => {
    it('should update code function description', async () => {
      await instance.define.code({
        name: 'updateableCode',
        code: 'export default () => 1',
        description: 'Original description',
      })

      const updated = await instance.updateFunction('updateableCode', {
        description: 'Updated description',
      })

      expect(updated.description).toBe('Updated description')
      expect(updated.type).toBe('code')
    })

    it('should update code function code content', async () => {
      await instance.define.code({
        name: 'codeToUpdate',
        code: 'export default () => 1',
      })

      const updated = await instance.updateFunction('codeToUpdate', {
        code: 'export default () => 2',
      })

      expect((updated.config as CodeFunctionOptions).code).toBe('export default () => 2')
    })

    it('should update generative function prompt', async () => {
      await instance.define.generative({
        name: 'genToUpdate',
        prompt: 'Original prompt',
      })

      const updated = await instance.updateFunction('genToUpdate', {
        prompt: 'Updated prompt template: {{input}}',
      })

      expect((updated.config as GenerativeFunctionOptions).prompt).toBe('Updated prompt template: {{input}}')
    })

    it('should update generative function model', async () => {
      await instance.define.generative({
        name: 'genModelUpdate',
        prompt: 'Some prompt',
        model: '@cf/meta/llama-3.1-8b-instruct',
      })

      const updated = await instance.updateFunction('genModelUpdate', {
        model: '@cf/meta/llama-3.1-70b-instruct',
      })

      expect((updated.config as GenerativeFunctionOptions).model).toBe('@cf/meta/llama-3.1-70b-instruct')
    })

    it('should update agentic function tools', async () => {
      await instance.define.agentic({
        name: 'agentToUpdate',
        goal: 'Do something',
        tools: ['tool1'],
      })

      const updated = await instance.updateFunction('agentToUpdate', {
        tools: ['tool1', 'tool2', 'tool3'],
      })

      expect((updated.config as AgenticFunctionOptions).tools).toEqual(['tool1', 'tool2', 'tool3'])
    })

    it('should update agentic function memory flag', async () => {
      await instance.define.agentic({
        name: 'agentMemoryUpdate',
        goal: 'Track something',
        memory: false,
      })

      const updated = await instance.updateFunction('agentMemoryUpdate', {
        memory: true,
      })

      expect((updated.config as AgenticFunctionOptions).memory).toBe(true)
    })

    it('should update human function assignee', async () => {
      await instance.define.human({
        name: 'humanToUpdate',
        channel: 'slack',
        assignee: '@old-team',
      })

      const updated = await instance.updateFunction('humanToUpdate', {
        assignee: '@new-team',
      })

      expect((updated.config as HumanFunctionOptions).assignee).toBe('@new-team')
    })

    it('should update human function timeout', async () => {
      await instance.define.human({
        name: 'humanTimeoutUpdate',
        channel: 'email',
        assignee: 'user@example.com',
        timeout: '24h',
      })

      const updated = await instance.updateFunction('humanTimeoutUpdate', {
        timeout: '48h',
      })

      expect((updated.config as HumanFunctionOptions).timeout).toBe('48h')
    })

    it('should update human function channel', async () => {
      await instance.define.human({
        name: 'humanChannelUpdate',
        channel: 'slack',
        assignee: '@team',
      })

      const updated = await instance.updateFunction('humanChannelUpdate', {
        channel: 'email',
      })

      expect((updated.config as HumanFunctionOptions).channel).toBe('email')
    })

    it('should persist updates to storage', async () => {
      await instance.define.code({
        name: 'persistUpdateTest',
        code: 'export default () => "old"',
      })

      await instance.updateFunction('persistUpdateTest', {
        code: 'export default () => "new"',
        description: 'Now with description',
      })

      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:persistUpdateTest')
      expect(stored?.description).toBe('Now with description')
    })

    it('should throw error when updating non-existent function', async () => {
      await expect(
        instance.updateFunction('nonExistent', { description: 'update' })
      ).rejects.toThrow(/not found|does not exist/i)
    })

    it('should preserve function type during update', async () => {
      await instance.define.agentic({
        name: 'typePreserveTest',
        goal: 'Original goal',
      })

      const updated = await instance.updateFunction('typePreserveTest', {
        description: 'Added description',
      })

      expect(updated.type).toBe('agentic')
    })

    it('should allow multiple field updates at once', async () => {
      await instance.define.generative({
        name: 'multiUpdate',
        prompt: 'Original',
        model: '@cf/meta/llama-3.1-8b-instruct',
      })

      const updated = await instance.updateFunction('multiUpdate', {
        prompt: 'New prompt',
        model: '@cf/meta/llama-3.1-70b-instruct',
        description: 'New description',
      })

      expect((updated.config as GenerativeFunctionOptions).prompt).toBe('New prompt')
      expect((updated.config as GenerativeFunctionOptions).model).toBe('@cf/meta/llama-3.1-70b-instruct')
      expect(updated.description).toBe('New description')
    })
  })

  describe('deleteFunction()', () => {
    it('should delete a code function', async () => {
      await instance.define.code({
        name: 'codeToDelete',
        code: 'export default () => {}',
      })

      const result = await instance.deleteFunction('codeToDelete')

      expect(result).toBe(true)
      const fn = await instance.getFunction('codeToDelete')
      expect(fn).toBeNull()
    })

    it('should delete a generative function', async () => {
      await instance.define.generative({
        name: 'genToDelete',
        prompt: 'Generate something',
      })

      const result = await instance.deleteFunction('genToDelete')

      expect(result).toBe(true)
      const fn = await instance.getFunction('genToDelete')
      expect(fn).toBeNull()
    })

    it('should delete an agentic function', async () => {
      await instance.define.agentic({
        name: 'agentToDelete',
        goal: 'Do something',
      })

      const result = await instance.deleteFunction('agentToDelete')

      expect(result).toBe(true)
      const fn = await instance.getFunction('agentToDelete')
      expect(fn).toBeNull()
    })

    it('should delete a human function', async () => {
      await instance.define.human({
        name: 'humanToDelete',
        channel: 'slack',
        assignee: '@team',
      })

      const result = await instance.deleteFunction('humanToDelete')

      expect(result).toBe(true)
      const fn = await instance.getFunction('humanToDelete')
      expect(fn).toBeNull()
    })

    it('should remove function from storage', async () => {
      await instance.define.code({
        name: 'storageDeleteTest',
        code: 'export default () => {}',
      })

      await instance.deleteFunction('storageDeleteTest')

      const stored = await ctx.storage.get<TypedFunctionDefinition>('function:storageDeleteTest')
      expect(stored).toBeUndefined()
    })

    it('should return false when deleting non-existent function', async () => {
      const result = await instance.deleteFunction('nonExistent')
      expect(result).toBe(false)
    })

    it('should remove function from listFunctions output', async () => {
      await instance.define.code({ name: 'keep1', code: 'x' })
      await instance.define.code({ name: 'toDelete', code: 'y' })
      await instance.define.code({ name: 'keep2', code: 'z' })

      await instance.deleteFunction('toDelete')

      const functions = await instance.listFunctions()
      const names = functions.map(f => f.name)

      expect(names).toContain('keep1')
      expect(names).toContain('keep2')
      expect(names).not.toContain('toDelete')
    })

    it('should allow re-creating function after deletion', async () => {
      await instance.define.code({
        name: 'recreateTest',
        code: 'export default () => 1',
      })

      await instance.deleteFunction('recreateTest')

      // Should be able to create again with same name
      const newDef = await instance.define.code({
        name: 'recreateTest',
        code: 'export default () => 2',
      })

      expect(newDef.name).toBe('recreateTest')
    })

    it('should handle empty name gracefully', async () => {
      await expect(
        instance.deleteFunction('')
      ).rejects.toThrow(/name.*required|invalid.*name/i)
    })
  })
})
