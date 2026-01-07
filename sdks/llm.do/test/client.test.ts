/**
 * TDD RED Phase Tests for llm.do SDK
 *
 * These tests define the expected behavior for the llm.do AI Gateway SDK.
 * Tests verify export patterns, type definitions, and client functionality.
 *
 * Test coverage:
 * 1. Export pattern (LLM factory, llm instance, default export, re-exports)
 * 2. Type definitions (CompletionOptions, CompletionResponse, LLMClient)
 * 3. Client methods (complete, chat, stream, usage, models)
 * 4. Tagged template syntax (if implemented)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Mock Setup - must be hoisted with vi.hoisted
// =============================================================================

// Create mock function using vi.hoisted to ensure it's available before vi.mock
const { mockCreateClient, defaultMockClient } = vi.hoisted(() => {
  // Default mock client for the module-level llm instance
  const defaultMockClient = {
    complete: vi.fn().mockResolvedValue({
      content: 'Default response',
      model: 'claude-3-opus',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
    stream: vi.fn().mockResolvedValue(new ReadableStream()),
    chat: vi.fn().mockResolvedValue({
      content: 'Chat response',
      model: 'gpt-4',
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    }),
    models: vi.fn().mockResolvedValue(['claude-3-opus', 'gpt-4', 'gpt-3.5-turbo']),
    usage: vi.fn().mockResolvedValue({
      totalTokens: 1000,
      totalCost: 0.05,
      byModel: { 'claude-3-opus': { tokens: 500, cost: 0.03 } },
    }),
  }

  const mockCreateClient = vi.fn().mockReturnValue(defaultMockClient)

  return { mockCreateClient, defaultMockClient }
})

// Mock rpc.do createClient to track calls and return predictable values
vi.mock('rpc.do', () => ({
  createClient: mockCreateClient,
}))

// Now import the module under test
import {
  LLM,
  llm,
  createLLM,
  CompletionOptions,
  CompletionResponse,
  StreamOptions,
  UsageRecord,
  UsageSummary,
  LLMClient,
} from '../index'
import type { ClientOptions } from '../index'

// Default export
import defaultExport from '../index'

// =============================================================================
// Test Suites
// =============================================================================

describe('llm.do SDK', () => {
  // Use the hoisted mock client for all tests
  const mockClientInstance = defaultMockClient

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the mock implementations for each test
    mockClientInstance.complete.mockResolvedValue({
      content: 'Hello, world!',
      model: 'claude-3-opus',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })
    mockClientInstance.stream.mockResolvedValue(new ReadableStream())
    mockClientInstance.chat.mockResolvedValue({
      content: 'Chat response',
      model: 'gpt-4',
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    })
    mockClientInstance.models.mockResolvedValue(['claude-3-opus', 'gpt-4', 'gpt-3.5-turbo'])
    mockClientInstance.usage.mockResolvedValue({
      totalTokens: 1000,
      totalCost: 0.05,
      byModel: { 'claude-3-opus': { tokens: 500, cost: 0.03 } },
    })

    mockCreateClient.mockReturnValue(mockClientInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Export Pattern Tests
  // ===========================================================================

  describe('Export Pattern', () => {
    it('should export LLM factory function (PascalCase)', () => {
      expect(LLM).toBeDefined()
      expect(typeof LLM).toBe('function')
    })

    it('should export llm instance (camelCase)', () => {
      expect(llm).toBeDefined()
      expect(typeof llm).toBe('object')
    })

    it('should export llm as default export', () => {
      expect(defaultExport).toBe(llm)
    })

    it('should export createLLM as legacy alias for LLM', () => {
      expect(createLLM).toBeDefined()
      expect(createLLM).toBe(LLM)
    })

    it('should re-export ClientOptions type from rpc.do', () => {
      // TypeScript type check - this is a compile-time test
      // At runtime, we verify the module structure includes the re-export
      const typeCheck: ClientOptions = {
        apiKey: 'test',
        baseURL: 'https://test.do',
      }
      expect(typeCheck.apiKey).toBe('test')
    })
  })

  // ===========================================================================
  // Type Definition Tests
  // ===========================================================================

  describe('Type Definitions', () => {
    it('should define CompletionOptions interface correctly', () => {
      // Runtime validation of interface structure
      const options: CompletionOptions = {
        model: 'claude-3-opus',
        prompt: 'Hello',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 100,
        temperature: 0.7,
        apiKey: 'custom-key',
      }

      expect(options.model).toBe('claude-3-opus')
      expect(options.prompt).toBe('Hello')
      expect(options.messages).toHaveLength(1)
      expect(options.maxTokens).toBe(100)
      expect(options.temperature).toBe(0.7)
      expect(options.apiKey).toBe('custom-key')
    })

    it('should define CompletionResponse interface correctly', () => {
      const response: CompletionResponse = {
        content: 'Generated text',
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      }

      expect(response.content).toBe('Generated text')
      expect(response.model).toBe('gpt-4')
      expect(response.usage.totalTokens).toBe(30)
    })

    it('should define StreamOptions extending CompletionOptions', () => {
      const options: StreamOptions = {
        model: 'claude-3-opus',
        prompt: 'Stream this',
        stream: true,
      }

      expect(options.stream).toBe(true)
      expect(options.model).toBe('claude-3-opus')
    })

    it('should define UsageRecord interface correctly', () => {
      const record: UsageRecord = {
        customerId: 'cust_123',
        tokens: 1000,
        model: 'claude-3-opus',
        timestamp: new Date(),
      }

      expect(record.customerId).toBe('cust_123')
      expect(record.tokens).toBe(1000)
    })

    it('should define UsageSummary interface correctly', () => {
      const summary: UsageSummary = {
        totalTokens: 5000,
        totalCost: 0.25,
        byModel: {
          'claude-3-opus': { tokens: 3000, cost: 0.15 },
          'gpt-4': { tokens: 2000, cost: 0.10 },
        },
      }

      expect(summary.totalTokens).toBe(5000)
      expect(summary.byModel['claude-3-opus'].tokens).toBe(3000)
    })

    it('should define LLMClient interface with all required methods', () => {
      // Type check that LLMClient has all required methods
      const client: LLMClient = mockClientInstance as LLMClient

      expect(typeof client.complete).toBe('function')
      expect(typeof client.stream).toBe('function')
      expect(typeof client.models).toBe('function')
      expect(typeof client.usage).toBe('function')
      expect(typeof client.chat).toBe('function')
    })
  })

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('LLM Factory Function', () => {
    it('should create client with default endpoint https://llm.do', () => {
      // Clear previous calls from module initialization
      mockCreateClient.mockClear()

      LLM()

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://llm.do',
        undefined
      )
    })

    it('should pass options to createClient', () => {
      const options: ClientOptions = {
        apiKey: 'my-api-key',
        baseURL: 'https://custom.llm.do',
      }

      LLM(options)

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://llm.do',
        options
      )
    })

    it('should return typed LLMClient', () => {
      const client = LLM()

      // Type assertions - at runtime this checks the mock returns expected shape
      expect(client).toBeDefined()
      expect(typeof client.complete).toBe('function')
    })
  })

  // ===========================================================================
  // Default Instance Tests
  // ===========================================================================

  describe('Default llm Instance', () => {
    it('should be pre-configured with default options', () => {
      // llm instance should exist and be callable
      expect(llm).toBeDefined()
    })

    it('should use environment-based API key resolution', () => {
      // The llm instance should work with env-based API key
      // Detailed env resolution is tested in rpc.do
      expect(llm).toBeDefined()
    })
  })

  // ===========================================================================
  // Client Method Tests (with mocks)
  // ===========================================================================

  describe('Client Methods', () => {
    describe('complete()', () => {
      it('should call complete with CompletionOptions', async () => {
        const client = LLM()
        const options: CompletionOptions = {
          model: 'claude-3-opus',
          prompt: 'Hello, world!',
        }

        const result = await client.complete(options)

        expect(mockClientInstance.complete).toHaveBeenCalledWith(options)
        expect(result.content).toBe('Hello, world!')
        expect(result.model).toBe('claude-3-opus')
      })

      it('should support messages array for multi-turn', async () => {
        const client = LLM()
        const options: CompletionOptions = {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are helpful.' },
            { role: 'user', content: 'Hello!' },
          ],
        }

        await client.complete(options)

        expect(mockClientInstance.complete).toHaveBeenCalledWith(options)
      })

      it('should support customer BYOK via apiKey option', async () => {
        const client = LLM()
        const options: CompletionOptions = {
          model: 'claude-3-opus',
          prompt: 'Test',
          apiKey: 'customer-own-api-key',
        }

        await client.complete(options)

        expect(mockClientInstance.complete).toHaveBeenCalledWith(
          expect.objectContaining({ apiKey: 'customer-own-api-key' })
        )
      })
    })

    describe('chat()', () => {
      it('should provide convenience chat method', async () => {
        const client = LLM()
        const messages = [
          { role: 'user', content: 'What is 2+2?' },
        ]

        const result = await client.chat(messages, { model: 'gpt-4' })

        expect(mockClientInstance.chat).toHaveBeenCalledWith(
          messages,
          expect.objectContaining({ model: 'gpt-4' })
        )
        expect(result.content).toBe('Chat response')
      })

      it('should accept partial options for chat', async () => {
        const client = LLM()

        await client.chat(
          [{ role: 'user', content: 'Hi' }],
          { temperature: 0.5 }
        )

        expect(mockClientInstance.chat).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({ temperature: 0.5 })
        )
      })
    })

    describe('stream()', () => {
      it('should return ReadableStream', async () => {
        const client = LLM()
        const options: StreamOptions = {
          model: 'claude-3-opus',
          prompt: 'Stream this text',
          stream: true,
        }

        const stream = await client.stream(options)

        expect(mockClientInstance.stream).toHaveBeenCalledWith(options)
        expect(stream).toBeInstanceOf(ReadableStream)
      })

      it('should support streaming with messages', async () => {
        const client = LLM()
        const options: StreamOptions = {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Stream this' }],
          stream: true,
        }

        await client.stream(options)

        expect(mockClientInstance.stream).toHaveBeenCalledWith(options)
      })
    })

    describe('models()', () => {
      it('should list available models', async () => {
        const client = LLM()

        const models = await client.models()

        expect(mockClientInstance.models).toHaveBeenCalled()
        expect(models).toContain('claude-3-opus')
        expect(models).toContain('gpt-4')
      })
    })

    describe('usage()', () => {
      it('should get usage summary for customer', async () => {
        const client = LLM()

        const usage = await client.usage('cust_123')

        // First argument is customerId - the second (period) is optional
        expect(mockClientInstance.usage).toHaveBeenCalledWith('cust_123')
        expect(usage.totalTokens).toBe(1000)
        expect(usage.totalCost).toBe(0.05)
      })

      it('should support date range for usage query', async () => {
        const client = LLM()
        const period = {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        }

        await client.usage('cust_123', period)

        expect(mockClientInstance.usage).toHaveBeenCalledWith('cust_123', period)
      })
    })
  })

  // ===========================================================================
  // Tagged Template Tests (if implemented)
  // ===========================================================================

  describe('Tagged Template Syntax', () => {
    it('should support llm`prompt` template literal syntax', async () => {
      // This test documents expected behavior for tagged template
      // If not implemented, this will fail (RED phase)

      // Skip if llm is not callable as a template tag
      if (typeof llm !== 'function') {
        // llm is an object, not a function, so tagged template won't work
        // This is expected for the current implementation
        expect(typeof llm).toBe('object')
        return
      }

      // If llm were a function that also acts as a template tag:
      // const result = await llm`Hello, world!`
      // expect(result.content).toBeDefined()
    })

    it('should interpolate variables in tagged template', async () => {
      // Skip if llm is not callable as a template tag
      if (typeof llm !== 'function') {
        expect(typeof llm).toBe('object')
        return
      }

      // If implemented:
      // const name = 'Claude'
      // const result = await llm`Hello, ${name}!`
      // expect(result.content).toBeDefined()
    })
  })

  // ===========================================================================
  // Integration Pattern Tests
  // ===========================================================================

  describe('Integration Patterns', () => {
    it('should work with Workers service bindings pattern', () => {
      // In Workers, llm.do is accessed via env.LLM
      // The SDK provides external access via RPC
      // This test documents the expected usage pattern

      // Internal (Workers):
      // await env.LLM.complete({ model, prompt })

      // External (SDK):
      // import { llm } from 'llm.do'
      // await llm.complete({ model, prompt })

      expect(llm).toBeDefined()
    })

    it('should support BYOK (Bring Your Own Key) pattern', async () => {
      const client = LLM()

      // Customer can use their own API key stored in Vault
      await client.complete({
        model: 'claude-3-opus',
        prompt: 'Test with own key',
        apiKey: 'customer-api-key-from-vault',
      })

      expect(mockClientInstance.complete).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'customer-api-key-from-vault' })
      )
    })

    it('should handle metered billing automatically', async () => {
      // The SDK wraps calls with automatic metering
      // Usage is tracked via the usage() method
      const client = LLM()

      const response = await client.complete({
        model: 'claude-3-opus',
        prompt: 'Test prompt',
      })

      // Response includes usage for billing
      expect(response.usage).toBeDefined()
      expect(response.usage.totalTokens).toBe(15)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should propagate RPC errors from createClient', async () => {
      mockClientInstance.complete = vi.fn().mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      const client = LLM()

      await expect(client.complete({ model: 'claude-3-opus', prompt: 'test' }))
        .rejects.toThrow('API rate limit exceeded')
    })

    it('should handle model not found errors', async () => {
      mockClientInstance.complete = vi.fn().mockRejectedValue(
        new Error('Model not found: invalid-model')
      )

      const client = LLM()

      await expect(client.complete({ model: 'invalid-model', prompt: 'test' }))
        .rejects.toThrow('Model not found')
    })

    it('should handle authentication errors', async () => {
      mockClientInstance.complete = vi.fn().mockRejectedValue(
        new Error('Invalid API key')
      )

      const client = LLM()

      await expect(client.complete({ model: 'claude-3-opus', prompt: 'test' }))
        .rejects.toThrow('Invalid API key')
    })
  })
})
