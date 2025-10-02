/**
 * Tests for Claude Code Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeCodeService, type Env } from './index'

// Mock environment
const createMockEnv = (): Env => ({
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
  DB: {
    createThing: vi.fn().mockResolvedValue({ id: 'test-id' })
  }
})

// Mock ExecutionContext
const createMockCtx = (): ExecutionContext => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn()
})

describe('ClaudeCodeService', () => {
  let service: ClaudeCodeService
  let mockEnv: Env
  let mockCtx: ExecutionContext

  beforeEach(() => {
    mockEnv = createMockEnv()
    mockCtx = createMockCtx()
    service = new ClaudeCodeService(mockCtx, mockEnv)

    // Reset mocks
    vi.clearAllMocks()

    // Mock fetch for Anthropic API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'function example() { return true; }' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      })
    })
  })

  describe('generateCode', () => {
    it('should generate code from prompt', async () => {
      const result = await service.generateCode('Write a function that returns true')

      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('generationId')
      expect(result.code).toContain('function')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test-key'
          })
        })
      )
    })

    it('should use custom model', async () => {
      await service.generateCode('test', { model: 'claude-opus-4' })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.model).toBe('claude-opus-4')
    })

    it('should use custom maxTokens', async () => {
      await service.generateCode('test', { maxTokens: 2000 })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.max_tokens).toBe(2000)
    })

    it('should store generation in database', async () => {
      await service.generateCode('test')

      expect(mockEnv.DB.createThing).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'generation',
          type: 'CodeGeneration'
        })
      )
    })

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      })

      await expect(service.generateCode('test')).rejects.toThrow('Anthropic API error')
    })
  })

  describe('analyzeCode', () => {
    it('should analyze code with focus', async () => {
      const result = await service.analyzeCode('const x = 1', 'security issues')

      expect(result).toHaveProperty('analysis')
      expect(result).toHaveProperty('code')
      expect(result.code).toBe('const x = 1')
    })

    it('should include analysis focus in prompt', async () => {
      await service.analyzeCode('code', 'performance')

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.messages[0].content).toContain('performance')
    })
  })

  describe('explainCode', () => {
    it('should explain code functionality', async () => {
      const result = await service.explainCode('function add(a, b) { return a + b; }')

      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })
  })

  describe('refactorCode', () => {
    it('should refactor code based on instructions', async () => {
      const result = await service.refactorCode('var x = 1', 'use const instead of var')

      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('should include instructions in prompt', async () => {
      await service.refactorCode('code', 'extract function')

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.messages[0].content).toContain('extract function')
    })
  })

  describe('fixCode', () => {
    it('should fix code with error', async () => {
      const result = await service.fixCode('function() {}', 'Unexpected token')

      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('should include error in prompt', async () => {
      await service.fixCode('code', 'TypeError: undefined is not a function')

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.messages[0].content).toContain('TypeError')
    })
  })

  describe('reviewCode', () => {
    it('should review code and return structured result', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"issues": ["Use const"], "suggestions": ["Add types"], "rating": 7}' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      })

      const result = await service.reviewCode('const x = 1')

      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('suggestions')
      expect(result).toHaveProperty('rating')
      expect(Array.isArray(result.issues)).toBe(true)
      expect(Array.isArray(result.suggestions)).toBe(true)
      expect(typeof result.rating).toBe('number')
    })

    it('should handle invalid JSON gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'not json' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      })

      const result = await service.reviewCode('code')

      expect(result).toEqual({ issues: ['Failed to parse review'], suggestions: [], rating: 0 })
    })
  })

  describe('mcpToolCall', () => {
    it('should route generate_code tool', async () => {
      const spy = vi.spyOn(service, 'generateCode')
      await service.mcpToolCall('generate_code', { prompt: 'test', options: {} })

      expect(spy).toHaveBeenCalledWith('test', {})
    })

    it('should route analyze_code tool', async () => {
      const spy = vi.spyOn(service, 'analyzeCode')
      await service.mcpToolCall('analyze_code', { code: 'test', analysis: 'perf' })

      expect(spy).toHaveBeenCalledWith('test', 'perf')
    })

    it('should route explain_code tool', async () => {
      const spy = vi.spyOn(service, 'explainCode')
      await service.mcpToolCall('explain_code', { code: 'test' })

      expect(spy).toHaveBeenCalledWith('test')
    })

    it('should route refactor_code tool', async () => {
      const spy = vi.spyOn(service, 'refactorCode')
      await service.mcpToolCall('refactor_code', { code: 'test', instructions: 'improve' })

      expect(spy).toHaveBeenCalledWith('test', 'improve')
    })

    it('should route fix_code tool', async () => {
      const spy = vi.spyOn(service, 'fixCode')
      await service.mcpToolCall('fix_code', { code: 'test', error: 'syntax error' })

      expect(spy).toHaveBeenCalledWith('test', 'syntax error')
    })

    it('should route review_code tool', async () => {
      const spy = vi.spyOn(service, 'reviewCode')
      await service.mcpToolCall('review_code', { code: 'test', focus: 'security' })

      expect(spy).toHaveBeenCalledWith('test', 'security')
    })

    it('should throw on unknown tool', async () => {
      await expect(service.mcpToolCall('unknown_tool', {})).rejects.toThrow('Unknown tool')
    })
  })

  describe('HTTP fetch handler', () => {
    it('should handle /generate POST', async () => {
      const request = new Request('https://claude-code.internal/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test', options: {} })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('code')
      expect(data).toHaveProperty('generationId')
    })

    it('should handle /analyze POST', async () => {
      const request = new Request('https://claude-code.internal/analyze', {
        method: 'POST',
        body: JSON.stringify({ code: 'test', analysis: 'perf' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('analysis')
    })

    it('should handle /explain POST', async () => {
      const request = new Request('https://claude-code.internal/explain', {
        method: 'POST',
        body: JSON.stringify({ code: 'test' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('explanation')
    })

    it('should handle /refactor POST', async () => {
      const request = new Request('https://claude-code.internal/refactor', {
        method: 'POST',
        body: JSON.stringify({ code: 'test', instructions: 'improve' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('code')
    })

    it('should handle /fix POST', async () => {
      const request = new Request('https://claude-code.internal/fix', {
        method: 'POST',
        body: JSON.stringify({ code: 'test', error: 'syntax' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('code')
    })

    it('should handle /review POST', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"issues": [], "suggestions": [], "rating": 8}' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      })

      const request = new Request('https://claude-code.internal/review', {
        method: 'POST',
        body: JSON.stringify({ code: 'test', focus: 'security' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('issues')
      expect(data).toHaveProperty('rating')
    })

    it('should handle /health GET', async () => {
      const request = new Request('https://claude-code.internal/health')
      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.service).toBe('claude-code')
    })

    it('should handle OPTIONS for CORS', async () => {
      const request = new Request('https://claude-code.internal/generate', {
        method: 'OPTIONS'
      })

      const response = await service.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should return 404 for unknown routes', async () => {
      const request = new Request('https://claude-code.internal/unknown')
      const response = await service.fetch(request)

      expect(response.status).toBe(404)
    })

    it('should handle errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const request = new Request('https://claude-code.internal/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' })
      })

      const response = await service.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })
})
