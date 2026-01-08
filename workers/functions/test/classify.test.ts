/**
 * Tests: FunctionsDO Auto-Classification
 *
 * Tests for automatic function type classification using AI.
 * FunctionsDO.classifyFunction() uses env.AI to analyze function name and args
 * and return one of: code, generative, agentic, human.
 *
 * @see docs/plans/2026-01-08-ai-functions-architecture.md for classification logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockState, createMockId, type MockDOState } from './helpers.js'

// ============================================================================
// Mock Environment for Classification Tests
// ============================================================================

/**
 * Mock AI binding with classification support
 */
interface MockAIBinding {
  run: <T>(model: string, input: unknown) => Promise<T>
  generate: (prompt: string, options?: unknown) => Promise<{ text: string }>
}

/**
 * Mock environment with AI.generate support
 */
interface MockClassifyEnv {
  FUNCTIONS_DO: {
    get: (id: { toString(): string }) => unknown
    idFromName: (name: string) => { toString(): string }
  }
  AI: MockAIBinding
}

/**
 * Function types for classification
 */
type FunctionType = 'code' | 'generative' | 'agentic' | 'human'

/**
 * FunctionsDO contract for classification tests
 */
interface FunctionsDOWithClassify {
  classifyFunction(name: string, args: unknown): Promise<FunctionType>
}

/**
 * Create mock environment with AI classification support
 */
function createMockClassifyEnv(classificationResult?: FunctionType): MockClassifyEnv {
  return {
    FUNCTIONS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI: {
      run: vi.fn(async <T>(_model: string, _input: unknown): Promise<T> => {
        return { response: classificationResult ?? 'code' } as T
      }),
      generate: vi.fn(async (_prompt: string, _options?: unknown): Promise<{ text: string }> => {
        return { text: classificationResult ?? 'code' }
      }),
    },
  }
}

/**
 * Load FunctionsDO for testing classification
 */
async function loadFunctionsDO(): Promise<new (ctx: MockDOState, env: MockClassifyEnv) => FunctionsDOWithClassify> {
  const module = await import('../src/functions.js')
  return module.FunctionsDO
}

// ============================================================================
// Classification Tests
// ============================================================================

describe('FunctionsDO.classifyFunction', () => {
  let ctx: MockDOState
  let env: MockClassifyEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockClassifyEnv) => FunctionsDOWithClassify

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockClassifyEnv()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('Basic classification', () => {
    it('should exist as a method on FunctionsDO', async () => {
      const instance = new FunctionsDO(ctx, env)
      expect(typeof instance.classifyFunction).toBe('function')
    })

    it('should return a valid function type', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('fibonacci', { n: 10 })

      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should use env.AI for classification', async () => {
      const instance = new FunctionsDO(ctx, env)

      await instance.classifyFunction('summarize', { text: 'Hello world' })

      // Should call AI.run or similar
      expect(env.AI.run).toHaveBeenCalled()
    })
  })

  describe('Code function classification', () => {
    it('should classify pure computation functions as "code"', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('fibonacci', { n: 10 })
      expect(result).toBe('code')
    })

    it('should classify data transformation functions as "code"', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('parseCSV', { data: 'a,b,c\n1,2,3' })
      expect(result).toBe('code')
    })

    it('should classify calculation functions as "code"', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('calculateTax', { income: 50000, rate: 0.3 })
      expect(result).toBe('code')
    })
  })

  describe('Generative function classification', () => {
    it('should classify text generation functions as "generative"', async () => {
      env = createMockClassifyEnv('generative')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('writePoem', { topic: 'spring' })
      expect(result).toBe('generative')
    })

    it('should classify summarization functions as "generative"', async () => {
      env = createMockClassifyEnv('generative')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('summarize', { text: 'Long article...' })
      expect(result).toBe('generative')
    })

    it('should classify content creation functions as "generative"', async () => {
      env = createMockClassifyEnv('generative')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('generateProductDescription', { product: 'Widget' })
      expect(result).toBe('generative')
    })
  })

  describe('Agentic function classification', () => {
    it('should classify multi-step research functions as "agentic"', async () => {
      env = createMockClassifyEnv('agentic')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('researchCompetitor', { company: 'Acme' })
      expect(result).toBe('agentic')
    })

    it('should classify functions requiring web access as "agentic"', async () => {
      env = createMockClassifyEnv('agentic')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('scrapeWebsite', { url: 'https://example.com' })
      expect(result).toBe('agentic')
    })

    it('should classify complex planning functions as "agentic"', async () => {
      env = createMockClassifyEnv('agentic')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('planTrip', { destination: 'Tokyo', duration: '7 days' })
      expect(result).toBe('agentic')
    })
  })

  describe('Human function classification', () => {
    it('should classify approval functions as "human"', async () => {
      env = createMockClassifyEnv('human')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('approveBudget', { amount: 50000, department: 'eng' })
      expect(result).toBe('human')
    })

    it('should classify review functions as "human"', async () => {
      env = createMockClassifyEnv('human')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('reviewContract', { contractId: 'C-2024-001' })
      expect(result).toBe('human')
    })

    it('should classify decision functions as "human"', async () => {
      env = createMockClassifyEnv('human')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('makeHiringDecision', { candidateId: '123' })
      expect(result).toBe('human')
    })
  })

  describe('AI prompt construction', () => {
    it('should include function name in AI prompt', async () => {
      const instance = new FunctionsDO(ctx, env)

      await instance.classifyFunction('myFunction', {})

      const calls = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const input = calls[0][1] as { prompt?: string }
      expect(input.prompt).toContain('myFunction')
    })

    it('should include args in AI prompt', async () => {
      const instance = new FunctionsDO(ctx, env)

      await instance.classifyFunction('testFn', { key: 'value', num: 42 })

      const calls = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const input = calls[0][1] as { prompt?: string }
      expect(input.prompt).toContain('key')
      expect(input.prompt).toContain('value')
    })

    it('should include classification instructions in prompt', async () => {
      const instance = new FunctionsDO(ctx, env)

      await instance.classifyFunction('someFn', {})

      const calls = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const input = calls[0][1] as { prompt?: string }
      // Prompt should mention the possible types
      expect(input.prompt).toMatch(/code|generative|agentic|human/i)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty args', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('noArgs', {})
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle null args', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('nullArgs', null)
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle undefined args', async () => {
      env = createMockClassifyEnv('code')
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('undefinedArgs', undefined)
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle complex nested args', async () => {
      env = createMockClassifyEnv('generative')
      const instance = new FunctionsDO(ctx, env)

      const complexArgs = {
        user: { name: 'Alice', email: 'alice@example.com' },
        preferences: { theme: 'dark', notifications: true },
        history: [{ action: 'login', timestamp: 123456 }],
      }

      const result = await instance.classifyFunction('processUser', complexArgs)
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })
  })

  describe('Error handling', () => {
    it('should handle AI failures gracefully', async () => {
      env.AI.run = vi.fn().mockRejectedValue(new Error('AI service unavailable'))
      const instance = new FunctionsDO(ctx, env)

      await expect(instance.classifyFunction('failingClassify', {})).rejects.toThrow()
    })

    it('should validate empty function name', async () => {
      const instance = new FunctionsDO(ctx, env)

      await expect(instance.classifyFunction('', {})).rejects.toThrow(/name|empty|required/i)
    })

    it('should handle invalid AI response', async () => {
      // AI returns something that's not a valid type
      env.AI.run = vi.fn(async () => ({ response: 'invalid_type' }))
      const instance = new FunctionsDO(ctx, env)

      // Should either throw or default to a valid type
      const result = await instance.classifyFunction('ambiguous', {})
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })
  })

  describe('Response parsing', () => {
    it('should trim whitespace from AI response', async () => {
      env.AI.run = vi.fn(async () => ({ response: '  code  \n' }))
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('trimTest', {})
      expect(result).toBe('code')
    })

    it('should handle lowercase responses', async () => {
      env.AI.run = vi.fn(async () => ({ response: 'GENERATIVE' }))
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('caseTest', {})
      expect(result).toBe('generative')
    })

    it('should extract type from verbose AI response', async () => {
      // AI might respond with more than just the type
      env.AI.run = vi.fn(async () => ({ response: 'I think this is a generative function because...' }))
      const instance = new FunctionsDO(ctx, env)

      const result = await instance.classifyFunction('verboseTest', {})
      expect(result).toBe('generative')
    })
  })
})

// ============================================================================
// RED PHASE: Tests That Should FAIL Until AI Classification is Implemented
// ============================================================================
//
// These tests verify semantic classification without pre-mocking the result.
// They use a "neutral" AI mock that doesn't know the expected answer,
// testing that the classification logic actually works correctly.
//
// Current status: FAILING
// These tests will pass once the classifyFunction uses real AI or heuristics
// to actually analyze the function name and args.

/**
 * Create a "realistic" AI mock that analyzes the prompt and returns a classification.
 * This simulates what a real AI would do - it doesn't know the expected answer.
 *
 * For now, this returns a DEFAULT response, causing tests to fail.
 * In GREEN phase, we'll either:
 * 1. Implement real AI classification
 * 2. Add heuristics that analyze function name patterns
 */
function createSemanticAIMock(): MockClassifyEnv {
  return {
    FUNCTIONS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI: {
      run: vi.fn(async <T>(_model: string, input: unknown): Promise<T> => {
        // This mock simulates an AI that doesn't understand classification yet
        // It always returns 'code' as a default, causing semantic tests to fail
        const inputObj = input as { prompt?: string }
        const prompt = inputObj.prompt ?? ''

        // For now, return a default that will cause most semantic tests to fail
        // This is intentional for RED phase
        return { response: 'code' } as T
      }),
      generate: vi.fn(async (_prompt: string, _options?: unknown): Promise<{ text: string }> => {
        return { text: 'code' }
      }),
    },
  }
}

describe('FunctionsDO.classifyFunction - Semantic Classification (RED PHASE)', () => {
  let ctx: MockDOState
  let env: MockClassifyEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockClassifyEnv) => FunctionsDOWithClassify

  beforeEach(async () => {
    ctx = createMockState()
    // Use semantic AI mock that doesn't pre-know the answers
    env = createSemanticAIMock()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('Code function detection (without mocking result)', () => {
    it('classifyFunction("fibonacci", { n: 10 }) should return "code"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('fibonacci', { n: 10 })
      expect(result).toBe('code')
    })

    it('classifyFunction("calculateTax", { income: 50000 }) should return "code"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('calculateTax', { income: 50000 })
      expect(result).toBe('code')
    })

    it('classifyFunction("sortArray", { arr: [3, 1, 2] }) should return "code"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('sortArray', { arr: [3, 1, 2] })
      expect(result).toBe('code')
    })

    it('classifyFunction("parseJSON", { json: "{}" }) should return "code"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('parseJSON', { json: '{}' })
      expect(result).toBe('code')
    })
  })

  describe('Generative function detection (without mocking result)', () => {
    it('classifyFunction("summarize", { text: "..." }) should return "generative"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('summarize', { text: 'This is a long article about AI...' })
      // This SHOULD FAIL because the mock returns 'code' by default
      expect(result).toBe('generative')
    })

    it('classifyFunction("writeEmail", { subject: "hello" }) should return "generative"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('writeEmail', { subject: 'hello', recipient: 'alice@example.com' })
      // This SHOULD FAIL because the mock returns 'code' by default
      expect(result).toBe('generative')
    })

    it('classifyFunction("generateCaption", { image: "..." }) should return "generative"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('generateCaption', { image: 'photo.jpg' })
      // This SHOULD FAIL
      expect(result).toBe('generative')
    })

    it('classifyFunction("translateText", { text: "hello", targetLang: "es" }) should return "generative"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('translateText', { text: 'hello', targetLang: 'es' })
      // This SHOULD FAIL
      expect(result).toBe('generative')
    })
  })

  describe('Agentic function detection (without mocking result)', () => {
    it('classifyFunction("researchCompetitor", { name: "Acme" }) should return "agentic"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('researchCompetitor', { name: 'Acme' })
      // This SHOULD FAIL because the mock returns 'code' by default
      expect(result).toBe('agentic')
    })

    it('classifyFunction("planTrip", { destination: "Paris" }) should return "agentic"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('planTrip', { destination: 'Paris', days: 7 })
      // This SHOULD FAIL
      expect(result).toBe('agentic')
    })

    it('classifyFunction("bookFlight", { from: "NYC", to: "LAX" }) should return "agentic"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('bookFlight', { from: 'NYC', to: 'LAX', date: '2026-03-15' })
      // This SHOULD FAIL
      expect(result).toBe('agentic')
    })

    it('classifyFunction("analyzeMarket", { industry: "tech" }) should return "agentic"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('analyzeMarket', { industry: 'tech', region: 'US' })
      // This SHOULD FAIL
      expect(result).toBe('agentic')
    })
  })

  describe('Human function detection (without mocking result)', () => {
    it('classifyFunction("approveExpense", { amount: 5000 }) should return "human"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('approveExpense', { amount: 5000, submitter: 'alice' })
      // This SHOULD FAIL because the mock returns 'code' by default
      expect(result).toBe('human')
    })

    it('classifyFunction("reviewContract", { doc: "..." }) should return "human"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('reviewContract', { doc: 'contract.pdf', value: 100000 })
      // This SHOULD FAIL
      expect(result).toBe('human')
    })

    it('classifyFunction("signDocument", { docId: "123" }) should return "human"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('signDocument', { docId: '123', signatory: 'CEO' })
      // This SHOULD FAIL
      expect(result).toBe('human')
    })

    it('classifyFunction("makeHiringDecision", { candidate: "..." }) should return "human"', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('makeHiringDecision', { candidate: 'Bob Smith', role: 'Engineer' })
      // This SHOULD FAIL
      expect(result).toBe('human')
    })
  })

  describe('Ambiguous function classification', () => {
    it('should classify "processData" - ambiguous between code and generative', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('processData', { data: [1, 2, 3] })
      // Ambiguous - could be code (data transformation) or generative (AI processing)
      // Should default to one consistently
      expect(['code', 'generative']).toContain(result)
    })

    it('should classify "analyzeText" - ambiguous between code and generative', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('analyzeText', { text: 'Hello world' })
      // Could be code (regex/parsing) or generative (NLP)
      expect(['code', 'generative']).toContain(result)
    })

    it('should classify "sendNotification" - ambiguous between code and human', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('sendNotification', { message: 'Alert!' })
      // Could be automated (code) or require human intervention
      expect(['code', 'human']).toContain(result)
    })

    it('should classify "updateRecord" - ambiguous between code and agentic', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('updateRecord', { id: '123', data: {} })
      // Could be simple DB update (code) or complex workflow (agentic)
      expect(['code', 'agentic']).toContain(result)
    })
  })

  describe('Edge case: Empty and invalid inputs', () => {
    it('should handle function with no clear semantic meaning', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('xyz123', {})
      // No semantic hints - should return a valid default
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle very long function names', async () => {
      const instance = new FunctionsDO(ctx, env)
      const longName = 'processAndValidateAndTransformAndSaveUserData'
      const result = await instance.classifyFunction(longName, { userId: '123' })
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle function names with special patterns', async () => {
      const instance = new FunctionsDO(ctx, env)
      const result = await instance.classifyFunction('_privateHelper', { x: 1 })
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })

    it('should handle args with circular reference structure', async () => {
      const instance = new FunctionsDO(ctx, env)
      // Note: We can't actually create circular refs in JSON.stringify,
      // but we can test with deeply nested structures
      const deepArgs = {
        level1: {
          level2: {
            level3: {
              level4: { value: 'deep' }
            }
          }
        }
      }
      const result = await instance.classifyFunction('deepProcess', deepArgs)
      expect(['code', 'generative', 'agentic', 'human']).toContain(result)
    })
  })
})
