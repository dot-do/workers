/**
 * Fn Service Tests
 *
 * Tests for intelligent function classification and routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FnService } from '../src/index'
import type { ExecuteFunctionRequest, FunctionType } from '../src/types'

// Mock environment
const createMockEnv = () => {
  return {
    AI_SERVICE: {
      generate: vi.fn(),
      code: vi.fn(),
      executeCode: vi.fn(),
    },
    AGENT_SERVICE: {
      createAgent: vi.fn(),
      generateCode: vi.fn(),
      getStatus: vi.fn(),
    },
    DB: {
      execute: vi.fn(),
      query: vi.fn(),
    },
    QUEUE_SERVICE: {
      send: vi.fn(),
    },
    FUNCTION_QUEUE: {
      send: vi.fn(),
    },
    OPENAI_API_KEY: 'test-key',
    ANTHROPIC_API_KEY: 'test-key',
    DEFAULT_MODEL: 'gpt-4o-mini',
  }
}

describe('FnService', () => {
  let service: FnService
  let mockEnv: ReturnType<typeof createMockEnv>

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new FnService({} as any, mockEnv as any)
  })

  describe('Classification', () => {
    it('should classify simple array operations as code', async () => {
      // Mock AI classification response
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({
          type: 'code',
          confidence: 0.95,
          reasoning: 'Simple array sorting can be implemented as pure TypeScript code',
        }),
      })

      // Mock code generation
      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return [1,2,3,4,5] }',
      })

      // Mock code execution
      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: [1, 2, 3, 4, 5],
      })

      const result = await service.executeFunction({
        description: 'Sort an array of numbers in ascending order',
        args: { numbers: [3, 1, 4, 1, 5] },
      })

      expect(result.success).toBe(true)
      expect(result.type).toBe('code')
      expect(result.classification?.confidence).toBeGreaterThan(0.9)
      expect(result.result).toEqual([1, 2, 3, 4, 5])
    })

    it('should classify data generation as object', async () => {
      // Mock AI classification response
      mockEnv.AI_SERVICE.generate.mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'object',
          confidence: 0.92,
          reasoning: 'Generating structured data in JSON format',
        }),
      })

      // Mock object generation
      mockEnv.AI_SERVICE.generate.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'John Doe',
          age: 30,
          profession: 'software engineer',
          email: 'john@example.com',
        }),
      })

      const result = await service.executeFunction({
        description: 'Generate a user profile with realistic data',
        args: { age: 30, profession: 'software engineer' },
      })

      expect(result.success).toBe(true)
      expect(result.type).toBe('object')
      expect(result.result).toHaveProperty('name')
      expect(result.result).toHaveProperty('email')
    })

    it('should classify complex tasks as agentic', async () => {
      // Mock AI classification response
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({
          type: 'agentic',
          confidence: 0.98,
          reasoning: 'Multi-step process requiring code generation and reasoning',
        }),
      })

      // Mock agent creation
      mockEnv.AGENT_SERVICE.createAgent.mockResolvedValue({
        success: true,
        agentId: 'agent-123',
        sessionId: 'session-456',
        wsUrl: 'wss://agent.do/agents/session-456/ws',
      })

      // Mock code generation
      mockEnv.AGENT_SERVICE.generateCode.mockResolvedValue({
        success: true,
      })

      // Mock status check
      mockEnv.AGENT_SERVICE.getStatus.mockResolvedValue({
        success: true,
        state: {
          currentDevState: 'COMPLETE',
          mvpGenerated: true,
        },
        previewURL: 'https://preview.do/session-456',
      })

      const result = await service.executeFunction({
        description: 'Create a complete blog application with user authentication',
        context: 'Use Next.js and Tailwind CSS',
      })

      expect(result.success).toBe(true)
      expect(result.type).toBe('agentic')
      expect(result.result).toHaveProperty('agentId')
      expect(result.result).toHaveProperty('sessionId')
      expect(result.result).toHaveProperty('previewURL')
    })

    it('should classify manual tasks as human', async () => {
      // Mock AI classification response
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({
          type: 'human',
          confidence: 0.96,
          reasoning: 'Requires human judgment for security review',
        }),
      })

      // Mock database insertion
      mockEnv.DB.execute.mockResolvedValue({ success: true })

      const result = await service.executeFunction({
        description: 'Review code for security vulnerabilities',
        args: {
          assignee: 'security-team@example.com',
          priority: 'high',
        },
      })

      expect(result.success).toBe(true)
      expect(result.type).toBe('human')
      expect(result.result).toHaveProperty('taskId')
      expect(result.result.status).toBe('pending')
      expect(mockEnv.DB.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('INSERT INTO human_tasks'),
        })
      )
    })
  })

  describe('Execution Modes', () => {
    it('should execute synchronously by default', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Simple function' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return 42 }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: 42,
      })

      const result = await service.executeFunction({
        description: 'Calculate meaning of life',
      })

      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
      expect(result.jobId).toBeUndefined()
      expect(mockEnv.FUNCTION_QUEUE.send).not.toHaveBeenCalled()
    })

    it('should queue for async execution when requested', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Simple function' }),
      })

      mockEnv.FUNCTION_QUEUE.send.mockResolvedValue(undefined)

      const result = await service.executeFunction({
        description: 'Calculate factorial of 100',
        options: { mode: 'async' },
      })

      expect(result.success).toBe(true)
      expect(result.jobId).toBeDefined()
      expect(result.result).toBeUndefined()
      expect(mockEnv.FUNCTION_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.any(String),
          request: expect.objectContaining({
            description: 'Calculate factorial of 100',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      mockEnv.AI_SERVICE.generate.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.executeFunction({
        description: 'Do something',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('AI service unavailable')
    })

    it('should handle invalid classification responses', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: 'invalid json',
      })

      const result = await service.executeFunction({
        description: 'Do something',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle execution failures for code functions', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Code function' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { throw new Error("Runtime error") }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: false,
        error: { message: 'Runtime error' },
      })

      const result = await service.executeFunction({
        description: 'Buggy function',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Context and Arguments', () => {
    it('should include context in function description', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Code function' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return "result" }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: 'result',
      })

      await service.executeFunction({
        description: 'Process data',
        context: 'Using TypeScript with strict mode',
      })

      // Check that classification was called with combined description
      expect(mockEnv.AI_SERVICE.generate).toHaveBeenCalledWith(
        expect.stringContaining('Using TypeScript with strict mode'),
        expect.any(Object)
      )
      expect(mockEnv.AI_SERVICE.generate).toHaveBeenCalledWith(
        expect.stringContaining('Process data'),
        expect.any(Object)
      )
    })

    it('should include arguments in function description', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Code function' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return "result" }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: 'result',
      })

      await service.executeFunction({
        description: 'Sort data',
        args: { numbers: [3, 1, 4], order: 'ascending' },
      })

      // Check that classification was called with arguments included
      expect(mockEnv.AI_SERVICE.generate).toHaveBeenCalledWith(
        expect.stringContaining('Arguments:'),
        expect.any(Object)
      )
      expect(mockEnv.AI_SERVICE.generate).toHaveBeenCalledWith(
        expect.stringContaining('numbers'),
        expect.any(Object)
      )
    })
  })

  describe('Performance', () => {
    it('should complete classification within reasonable time', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Fast' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return 1 }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: 1,
      })

      const startTime = Date.now()
      const result = await service.executeFunction({
        description: 'Quick test',
      })
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.executionTime).toBeDefined()
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })
  })
})

describe('Function Type Routing', () => {
  let service: FnService
  let mockEnv: ReturnType<typeof createMockEnv>

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new FnService({} as any, mockEnv as any)
  })

  describe('Code Function Routing', () => {
    it('should route to AI_SERVICE.code and executeCode', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'code', confidence: 0.95, reasoning: 'Code' }),
      })

      mockEnv.AI_SERVICE.code.mockResolvedValue({
        code: 'export default async function() { return [1,2,3] }',
      })

      mockEnv.AI_SERVICE.executeCode.mockResolvedValue({
        success: true,
        result: [1, 2, 3],
      })

      await service.executeFunction({
        description: 'Return array',
      })

      expect(mockEnv.AI_SERVICE.code).toHaveBeenCalled()
      expect(mockEnv.AI_SERVICE.executeCode).toHaveBeenCalled()
      expect(mockEnv.AGENT_SERVICE.createAgent).not.toHaveBeenCalled()
      expect(mockEnv.DB.execute).not.toHaveBeenCalled()
    })
  })

  describe('Object Function Routing', () => {
    it('should route to AI_SERVICE.generate with JSON format', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValueOnce({
        text: JSON.stringify({ type: 'object', confidence: 0.95, reasoning: 'Object' }),
      })

      mockEnv.AI_SERVICE.generate.mockResolvedValueOnce({
        text: JSON.stringify({ key: 'value' }),
      })

      await service.executeFunction({
        description: 'Generate config',
      })

      expect(mockEnv.AI_SERVICE.generate).toHaveBeenCalledTimes(2)
      // Second call should include responseFormat: 'json'
      expect(mockEnv.AI_SERVICE.generate).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: 'json',
        })
      )
      expect(mockEnv.AGENT_SERVICE.createAgent).not.toHaveBeenCalled()
    })
  })

  describe('Agentic Function Routing', () => {
    it('should route to AGENT_SERVICE.createAgent and generateCode', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'agentic', confidence: 0.95, reasoning: 'Agentic' }),
      })

      mockEnv.AGENT_SERVICE.createAgent.mockResolvedValue({
        success: true,
        agentId: 'agent-123',
        sessionId: 'session-456',
      })

      mockEnv.AGENT_SERVICE.generateCode.mockResolvedValue({
        success: true,
      })

      mockEnv.AGENT_SERVICE.getStatus.mockResolvedValue({
        success: true,
        state: {},
        previewURL: 'https://preview.do',
      })

      await service.executeFunction({
        description: 'Build app',
      })

      expect(mockEnv.AGENT_SERVICE.createAgent).toHaveBeenCalled()
      expect(mockEnv.AGENT_SERVICE.generateCode).toHaveBeenCalled()
      expect(mockEnv.AGENT_SERVICE.getStatus).toHaveBeenCalled()
      expect(mockEnv.AI_SERVICE.code).not.toHaveBeenCalled()
      expect(mockEnv.DB.execute).not.toHaveBeenCalled()
    })
  })

  describe('Human Function Routing', () => {
    it('should route to DB.execute for task creation', async () => {
      mockEnv.AI_SERVICE.generate.mockResolvedValue({
        text: JSON.stringify({ type: 'human', confidence: 0.95, reasoning: 'Human' }),
      })

      mockEnv.DB.execute.mockResolvedValue({ success: true })

      await service.executeFunction({
        description: 'Manual review',
      })

      expect(mockEnv.DB.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('INSERT INTO human_tasks'),
        })
      )
      expect(mockEnv.AI_SERVICE.code).not.toHaveBeenCalled()
      expect(mockEnv.AGENT_SERVICE.createAgent).not.toHaveBeenCalled()
    })
  })
})
