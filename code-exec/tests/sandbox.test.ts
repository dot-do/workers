/**
 * Code Sandbox Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeSandbox, validateCode } from '../src/sandbox'
import type { CodeExecEnv } from '../src/types'

describe('CodeSandbox', () => {
  let mockEnv: CodeExecEnv
  let sandbox: CodeSandbox

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
      EXECUTIONS_DB: {} as any,
    }
    sandbox = new CodeSandbox(mockEnv)
  })

  describe('JavaScript Execution', () => {
    it('should execute simple JavaScript code', async () => {
      const code = 'return 1 + 1'
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.result).toBe(2)
      expect(result.executionId).toBeDefined()
      expect(result.metrics.duration).toBeGreaterThan(0)
    })

    it('should execute async JavaScript code', async () => {
      const code = `
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'async result'
      `
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.result).toBe('async result')
    })

    it('should provide context to code', async () => {
      const code = 'return context.name + " " + context.age'
      const context = { name: 'John', age: 30 }
      const result = await sandbox.execute(code, 'javascript', context)

      expect(result.success).toBe(true)
      expect(result.result).toBe('John 30')
    })

    it('should handle errors gracefully', async () => {
      const code = 'throw new Error("Test error")'
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Test error')
    })

    it('should enforce timeout', async () => {
      const code = 'while(true) {}'
      const sandbox = new CodeSandbox(mockEnv, { timeout: 100 })
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })
  })

  describe('Console Capture', () => {
    it('should capture console.log output', async () => {
      const code = `
        console.log('Test message')
        console.info('Info message')
        return 'done'
      `
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(2)
      expect(result.logs[0].level).toBe('log')
      expect(result.logs[0].message).toContain('Test message')
      expect(result.logs[1].level).toBe('info')
    })

    it('should capture console.error output', async () => {
      const code = 'console.error("Error message")'
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].level).toBe('error')
      expect(result.logs[0].message).toContain('Error message')
    })
  })

  describe('Runtime API', () => {
    it('should provide AI API', async () => {
      const code = `
        const result = await ai('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'user', content: 'Hello' }]
        })
        return result.response
      `
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.result).toBe('Mock AI response')
    })

    it('should provide database API', async () => {
      const code = `
        const result = await db({
          select: { from: 'things', where: { ns: 'test' } }
        })
        return result.rows[0].name
      `
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(true)
      expect(result.result).toBe('Test')
    })

    it('should restrict API access based on config', async () => {
      const code = 'const result = await ai("test", {})'
      const sandbox = new CodeSandbox(mockEnv, { allowedAPIs: ['db'] })
      const result = await sandbox.execute(code, 'javascript')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })

  describe('TypeScript Execution', () => {
    it('should execute TypeScript code', async () => {
      const code = `
        const x: number = 42
        return x * 2
      `
      const result = await sandbox.execute(code, 'typescript')

      expect(result.success).toBe(true)
      expect(result.result).toBe(84)
    })

    it('should handle TypeScript types', async () => {
      const code = `
        interface User {
          name: string
          age: number
        }
        const user: User = { name: 'John', age: 30 }
        return user.name
      `
      const result = await sandbox.execute(code, 'typescript')

      expect(result.success).toBe(true)
      expect(result.result).toBe('John')
    })
  })

  describe('Code Validation', () => {
    it('should validate safe code', () => {
      const code = 'return 1 + 1'
      const validation = validateCode(code)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject empty code', () => {
      const validation = validateCode('')

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Code cannot be empty')
    })

    it('should reject code with require()', () => {
      const code = 'const fs = require("fs")'
      const validation = validateCode(code)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('require'))).toBe(true)
    })

    it('should reject code with import', () => {
      const code = 'import fs from "fs"'
      const validation = validateCode(code)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('import'))).toBe(true)
    })

    it('should reject code with eval()', () => {
      const code = 'eval("malicious code")'
      const validation = validateCode(code)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('eval'))).toBe(true)
    })

    it('should reject oversized code', () => {
      const code = 'a'.repeat(200000)
      const validation = validateCode(code)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('maximum size'))).toBe(true)
    })
  })

  describe('Language Support', () => {
    it('should support JavaScript', () => {
      expect(sandbox.isSupportedLanguage('javascript')).toBe(true)
    })

    it('should support TypeScript', () => {
      expect(sandbox.isSupportedLanguage('typescript')).toBe(true)
    })

    it('should support Python', () => {
      expect(sandbox.isSupportedLanguage('python')).toBe(true)
    })

    it('should reject unsupported languages', () => {
      expect(sandbox.isSupportedLanguage('ruby')).toBe(false)
    })

    it('should throw error for Python execution', async () => {
      const code = 'print("Hello")'
      const result = await sandbox.execute(code, 'python')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not yet implemented')
    })
  })

  describe('Execution Metrics', () => {
    it('should track execution duration', async () => {
      const code = 'return 42'
      const result = await sandbox.execute(code, 'javascript')

      expect(result.metrics.duration).toBeGreaterThan(0)
      expect(result.metrics.startTime).toBeLessThan(result.metrics.endTime)
    })

    it('should include duration even on error', async () => {
      const code = 'throw new Error("Test")'
      const result = await sandbox.execute(code, 'javascript')

      expect(result.metrics.duration).toBeGreaterThan(0)
    })
  })
})
