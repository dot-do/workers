/**
 * Code Execution Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import CodeExecService from '../src/index'
import type { CodeExecEnv } from '../src/types'

describe('CodeExecService', () => {
  let service: CodeExecService
  let mockEnv: CodeExecEnv
  let mockCtx: ExecutionContext

  beforeEach(() => {
    mockEnv = {
      AI: {
        run: async (_model: string, _input: any) => {
          return { response: 'Mock AI response' }
        },
      } as any,
      DB: {
        executeQuery: async (_query: any) => {
          return { rows: [{ id: 1, name: 'Test' }], rowCount: 1 }
        },
      } as any,
      EXECUTIONS_DB: {
        prepare: (_sql: string) => ({
          bind: (..._args: any[]) => ({
            run: async () => ({ success: true }),
            first: async () => null,
            all: async () => ({ results: [] }),
          }),
        }),
      } as any,
    }
    mockCtx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as any
    service = new CodeExecService(mockCtx, mockEnv)
  })

  describe('RPC Methods', () => {
    it('should execute code via RPC', async () => {
      const result = await service.executeCode('return 1 + 1', 'javascript')

      expect(result.success).toBe(true)
      expect(result.result).toBe(2)
      expect(result.executionId).toBeDefined()
    })

    it('should validate code via RPC', async () => {
      const validation = await service.validateCode('return 42')

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should get supported languages via RPC', async () => {
      const languages = await service.getSupportedLanguages()

      expect(languages).toContain('javascript')
      expect(languages).toContain('typescript')
      expect(languages).toContain('python')
    })

    it('should check language support via RPC', async () => {
      const isSupported = await service.isSupportedLanguage('javascript')
      const isNotSupported = await service.isSupportedLanguage('ruby')

      expect(isSupported).toBe(true)
      expect(isNotSupported).toBe(false)
    })
  })

  describe('HTTP Endpoints', () => {
    it('should handle POST /execute', async () => {
      const request = new Request('http://localhost/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'return 42', language: 'javascript' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result).toBe(42)
    })

    it('should handle POST /validate', async () => {
      const request = new Request('http://localhost/validate', {
        method: 'POST',
        body: JSON.stringify({ code: 'return 42' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
    })

    it('should handle GET /languages', async () => {
      const request = new Request('http://localhost/languages')
      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.languages).toContain('javascript')
    })

    it('should handle GET /health', async () => {
      const request = new Request('http://localhost/health')
      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.service).toBe('code-exec')
    })

    it('should handle GET /docs', async () => {
      const request = new Request('http://localhost/docs')
      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.runtime).toBeDefined()
      expect(data.runtime.ai).toBeDefined()
      expect(data.runtime.console).toBeDefined()
    })

    it('should handle GET /', async () => {
      const request = new Request('http://localhost/')
      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.service).toBe('code-exec')
      expect(data.endpoints).toBeDefined()
    })

    it('should return 400 for missing code', async () => {
      const request = new Request('http://localhost/execute', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.error).toContain('Code is required')
    })

    it('should handle errors gracefully', async () => {
      const request = new Request('http://localhost/execute', {
        method: 'POST',
        body: JSON.stringify({ code: 'throw new Error("Test error")' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await service.fetch(request)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Test error')
    })
  })

  describe('Execution with Context', () => {
    it('should pass context to executed code', async () => {
      const context = { user: 'John', age: 30 }
      const result = await service.executeCode('return context.user + " " + context.age', 'javascript', context)

      expect(result.success).toBe(true)
      expect(result.result).toBe('John 30')
    })
  })

  describe('Execution with Config', () => {
    it('should respect timeout config', async () => {
      const config = { timeout: 100 }
      const result = await service.executeCode('while(true) {}', 'javascript', {}, config)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should respect allowed APIs config', async () => {
      const config = { allowedAPIs: ['console'] as any }
      const result = await service.executeCode('await ai("test", {})', 'javascript', {}, config)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })
})
