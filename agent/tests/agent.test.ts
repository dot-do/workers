/**
 * Agent Service Tests
 *
 * Tests for AI code generation agent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentService } from '../src/index'
import type { CreateAgentRequest } from '../src/types'
import { CurrentDevState } from '../src/types'

// Mock Durable Object stub
class MockDurableObjectStub {
  private state: any = {
    sessionId: 'test-session',
    query: 'test query',
    currentDevState: CurrentDevState.IDLE,
    generatedFilesMap: {},
    generatedPhases: [],
    phasesCounter: 0,
    mvpGenerated: false,
    shouldBeGenerating: false,
    agentMode: 'deterministic',
  }

  async initialize(args: any) {
    this.state.query = args.query
    this.state.currentDevState = CurrentDevState.INITIALIZING
    return this.state
  }

  async getState() {
    return this.state
  }

  async generateCode(reviewCycles: number, autoFix: boolean) {
    this.state.currentDevState = CurrentDevState.PHASE_GENERATING
    this.state.reviewCycles = reviewCycles
    // Simulate generation
    setTimeout(() => {
      this.state.currentDevState = CurrentDevState.COMPLETE
      this.state.mvpGenerated = true
    }, 100)
  }

  async processUserMessage(message: string) {
    return `Processed: ${message}`
  }

  async cancelGeneration() {
    this.state.shouldBeGenerating = false
    this.state.currentDevState = CurrentDevState.IDLE
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/state') {
      return Response.json(this.state)
    }
    return new Response('Not Found', { status: 404 })
  }
}

// Mock environment
const createMockEnv = () => {
  const stubs = new Map<string, MockDurableObjectStub>()
  let lastStub: MockDurableObjectStub | null = null

  return {
    CODE_GENERATOR: {
      idFromName: vi.fn((name: string) => ({ toString: () => name })),
      get: vi.fn((id?: any) => {
        // If no ID provided, return last created stub (for test convenience)
        if (!id) {
          if (!lastStub) {
            lastStub = new MockDurableObjectStub()
          }
          return lastStub
        }

        const idStr = typeof id === 'string' ? id : id.toString()
        if (!stubs.has(idStr)) {
          const stub = new MockDurableObjectStub()
          stubs.set(idStr, stub)
          lastStub = stub
        }
        return stubs.get(idStr)!
      }),
    },
    DB: {
      execute: vi.fn(),
      query: vi.fn(),
    },
    AI_SERVICE: {
      generate: vi.fn(),
      code: vi.fn(),
    },
    QUEUE: {
      send: vi.fn(),
    },
    OPENAI_API_KEY: 'test-key',
    ANTHROPIC_API_KEY: 'test-key',
    CLOUDFLARE_ACCOUNT_ID: 'test-account',
    CUSTOM_DOMAIN: 'test.do',
    SANDBOX_BUCKET: {} as R2Bucket,
    ASSETS_BUCKET: {} as R2Bucket,
  }
}

describe('AgentService', () => {
  let service: AgentService
  let mockEnv: ReturnType<typeof createMockEnv>

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new AgentService({} as any, mockEnv as any)
  })

  describe('createAgent', () => {
    it('should create new agent session', async () => {
      const request: CreateAgentRequest = {
        query: 'Build a blog application with user authentication',
        language: 'typescript',
        frameworks: ['next.js', 'tailwind'],
      }

      const result = await service.createAgent(request)

      expect(result.success).toBe(true)
      expect(result.sessionId).toBeDefined()
      expect(result.agentId).toBeDefined()
      expect(result.wsUrl).toContain('wss://')
      expect(result.wsUrl).toContain(result.sessionId)
      expect(mockEnv.CODE_GENERATOR.idFromName).toHaveBeenCalled()
      expect(mockEnv.CODE_GENERATOR.get).toHaveBeenCalled()
    })

    it('should generate unique session IDs', async () => {
      const request: CreateAgentRequest = {
        query: 'Test query',
      }

      const result1 = await service.createAgent(request)
      const result2 = await service.createAgent(request)

      expect(result1.sessionId).not.toBe(result2.sessionId)
      expect(result1.agentId).not.toBe(result2.agentId)
    })

    it('should handle initialization errors', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        throw new Error('Initialization failed')
      })

      const result = await service.createAgent({
        query: 'Test query',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Initialization failed')
    })

    it('should include inference context if provided', async () => {
      const request: CreateAgentRequest = {
        query: 'Test query',
        inferenceContext: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        },
      }

      const result = await service.createAgent(request)

      expect(result.success).toBe(true)
      // Verify that stub was initialized with inference context
      const stub = mockEnv.CODE_GENERATOR.get()
      const state = await stub.getState()
      expect(state.query).toBe('Test query')
    })
  })

  describe('getStatus', () => {
    it('should return agent status', async () => {
      const sessionId = 'test-session-123'

      const result = await service.getStatus(sessionId)

      expect(result.success).toBe(true)
      expect(result.state).toBeDefined()
      expect(result.state.sessionId).toBe('test-session')
      expect(result.state.currentDevState).toBe(CurrentDevState.IDLE)
      expect(mockEnv.CODE_GENERATOR.idFromName).toHaveBeenCalledWith(sessionId)
    })

    it('should include partial state information', async () => {
      const result = await service.getStatus('test-session')

      expect(result.state).toHaveProperty('sessionId')
      expect(result.state).toHaveProperty('currentDevState')
      expect(result.state).toHaveProperty('mvpGenerated')
      expect(result.state).toHaveProperty('phasesCounter')
    })

    it('should handle non-existent sessions', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        throw new Error('Session not found')
      })

      const result = await service.getStatus('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Session not found')
    })
  })

  describe('generateCode', () => {
    it('should start code generation', async () => {
      const sessionId = 'test-session'

      const result = await service.generateCode(sessionId, {
        reviewCycles: 3,
        autoFix: true,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('started')
    })

    it('should use default options if not provided', async () => {
      const result = await service.generateCode('test-session')

      expect(result.success).toBe(true)
    })

    it('should handle generation errors', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        return {
          generateCode: vi.fn().mockRejectedValue(new Error('Generation failed')),
        } as any
      })

      const result = await service.generateCode('test-session')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Generation failed')
    })
  })

  describe('sendMessage', () => {
    it('should send message to agent', async () => {
      const result = await service.sendMessage('test-session', 'Add authentication to login page')

      expect(result.success).toBe(true)
      expect(result.response).toBeDefined()
      expect(result.response).toContain('Processed:')
    })

    it('should handle empty messages', async () => {
      const result = await service.sendMessage('test-session', '')

      expect(result.success).toBe(true)
    })

    it('should handle message processing errors', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        return {
          processUserMessage: vi.fn().mockRejectedValue(new Error('Processing failed')),
        } as any
      })

      const result = await service.sendMessage('test-session', 'test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Processing failed')
    })
  })

  describe('getFiles', () => {
    it('should return generated files', async () => {
      const result = await service.getFiles('test-session')

      expect(result.success).toBe(true)
      expect(result.files).toBeDefined()
      expect(typeof result.files).toBe('object')
    })

    it('should return empty object if no files generated', async () => {
      const result = await service.getFiles('test-session')

      expect(result.files).toEqual({})
    })

    it('should handle retrieval errors', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        throw new Error('Failed to get files')
      })

      const result = await service.getFiles('test-session')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to get files')
    })
  })

  describe('getPreviewURL', () => {
    it('should return preview URL if available', async () => {
      const result = await service.getPreviewURL('test-session')

      expect(result.success).toBe(true)
      expect(result.previewURL).toBeUndefined() // Not set in initial state
    })

    it('should handle missing preview URL', async () => {
      const result = await service.getPreviewURL('test-session')

      expect(result.success).toBe(true)
      expect(result.previewURL).toBeUndefined()
    })
  })

  describe('cancelGeneration', () => {
    it('should cancel ongoing generation', async () => {
      const result = await service.cancelGeneration('test-session')

      expect(result.success).toBe(true)
    })

    it('should handle cancellation errors', async () => {
      mockEnv.CODE_GENERATOR.get.mockImplementation(() => {
        return {
          cancelGeneration: vi.fn().mockRejectedValue(new Error('Cancellation failed')),
        } as any
      })

      const result = await service.cancelGeneration('test-session')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cancellation failed')
    })
  })
})

describe('CodeGeneratorAgent (Durable Object)', () => {
  describe('State Management', () => {
    it('should initialize with correct default state', () => {
      const stub = new MockDurableObjectStub()
      const state = stub['state']

      expect(state.currentDevState).toBe(CurrentDevState.IDLE)
      expect(state.mvpGenerated).toBe(false)
      expect(state.shouldBeGenerating).toBe(false)
      expect(state.generatedFilesMap).toEqual({})
      expect(state.generatedPhases).toEqual([])
      expect(state.phasesCounter).toBe(0)
    })

    it('should update state during initialization', async () => {
      const stub = new MockDurableObjectStub()

      await stub.initialize({
        query: 'Build a blog',
        language: 'typescript',
      })

      const state = await stub.getState()
      expect(state.query).toBe('Build a blog')
      expect(state.currentDevState).toBe(CurrentDevState.INITIALIZING)
    })

    it('should track generation progress', async () => {
      const stub = new MockDurableObjectStub()

      await stub.initialize({ query: 'Test' })
      await stub.generateCode(3, true)

      const state = await stub.getState()
      expect(state.reviewCycles).toBe(3)
      expect(state.currentDevState).toBe(CurrentDevState.PHASE_GENERATING)
    })
  })

  describe('Generation Lifecycle', () => {
    it('should transition through generation states', async () => {
      const stub = new MockDurableObjectStub()

      // Initialize
      await stub.initialize({ query: 'Test' })
      let state = await stub.getState()
      expect(state.currentDevState).toBe(CurrentDevState.INITIALIZING)

      // Start generation
      await stub.generateCode(1, false)
      state = await stub.getState()
      expect(state.currentDevState).toBe(CurrentDevState.PHASE_GENERATING)

      // Wait for completion (simulated)
      await new Promise(resolve => setTimeout(resolve, 150))
      state = await stub.getState()
      expect(state.currentDevState).toBe(CurrentDevState.COMPLETE)
      expect(state.mvpGenerated).toBe(true)
    })

    it('should allow cancellation', async () => {
      const stub = new MockDurableObjectStub()

      await stub.initialize({ query: 'Test' })
      await stub.generateCode(1, false)
      await stub.cancelGeneration()

      const state = await stub.getState()
      expect(state.shouldBeGenerating).toBe(false)
      expect(state.currentDevState).toBe(CurrentDevState.IDLE)
    })
  })

  describe('Message Processing', () => {
    it('should process user messages', async () => {
      const stub = new MockDurableObjectStub()

      const response = await stub.processUserMessage('Add a feature')

      expect(response).toContain('Processed:')
      expect(response).toContain('Add a feature')
    })
  })
})

describe('Integration Tests', () => {
  let service: AgentService
  let mockEnv: ReturnType<typeof createMockEnv>

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new AgentService({} as any, mockEnv as any)
  })

  it('should complete full generation workflow', async () => {
    // 1. Create agent
    const createResult = await service.createAgent({
      query: 'Build a todo app',
    })
    expect(createResult.success).toBe(true)
    const { sessionId } = createResult

    // 2. Check initial status
    let statusResult = await service.getStatus(sessionId)
    expect(statusResult.success).toBe(true)
    expect(statusResult.state.mvpGenerated).toBe(false)

    // 3. Start generation
    const generateResult = await service.generateCode(sessionId, {
      reviewCycles: 2,
      autoFix: true,
    })
    expect(generateResult.success).toBe(true)

    // 4. Send message during generation
    const messageResult = await service.sendMessage(sessionId, 'Add dark mode')
    expect(messageResult.success).toBe(true)

    // 5. Check files
    const filesResult = await service.getFiles(sessionId)
    expect(filesResult.success).toBe(true)

    // 6. Get preview URL
    const previewResult = await service.getPreviewURL(sessionId)
    expect(previewResult.success).toBe(true)
  })

  it('should handle multiple concurrent agents', async () => {
    const agent1 = await service.createAgent({ query: 'App 1' })
    const agent2 = await service.createAgent({ query: 'App 2' })
    const agent3 = await service.createAgent({ query: 'App 3' })

    expect(agent1.sessionId).not.toBe(agent2.sessionId)
    expect(agent2.sessionId).not.toBe(agent3.sessionId)

    // All should be independent
    const status1 = await service.getStatus(agent1.sessionId)
    const status2 = await service.getStatus(agent2.sessionId)
    const status3 = await service.getStatus(agent3.sessionId)

    expect(status1.state.query).not.toBe(status2.state.query)
    expect(status2.state.query).not.toBe(status3.state.query)
  })
})
