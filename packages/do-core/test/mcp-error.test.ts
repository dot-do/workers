/**
 * Tests for McpError class
 *
 * These tests verify the typed McpError class for MCP protocol errors.
 */

import { describe, it, expect } from 'vitest'
import {
  McpError,
  McpErrorCode,
  isMcpError,
  isMcpErrorCode,
  getDefaultMessage,
} from '../src/mcp-error.js'

describe('McpError', () => {
  describe('constructor', () => {
    it('should create an error with code and message', () => {
      const error = new McpError(McpErrorCode.MethodNotFound, 'Test method not found')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(McpError)
      expect(error.name).toBe('McpError')
      expect(error.code).toBe(McpErrorCode.MethodNotFound)
      expect(error.message).toBe('Test method not found')
      expect(error.data).toBeUndefined()
    })

    it('should create an error with optional data', () => {
      const data = { details: 'extra info', field: 'name' }
      const error = new McpError(McpErrorCode.InvalidParams, 'Invalid params', data)

      expect(error.code).toBe(McpErrorCode.InvalidParams)
      expect(error.message).toBe('Invalid params')
      expect(error.data).toEqual(data)
    })

    it('should have a stack trace', () => {
      const error = new McpError(McpErrorCode.InternalError, 'Internal error')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('McpError')
    })
  })

  describe('error codes', () => {
    it('should have correct ParseError code (-32700)', () => {
      expect(McpErrorCode.ParseError).toBe(-32700)
    })

    it('should have correct InvalidRequest code (-32600)', () => {
      expect(McpErrorCode.InvalidRequest).toBe(-32600)
    })

    it('should have correct MethodNotFound code (-32601)', () => {
      expect(McpErrorCode.MethodNotFound).toBe(-32601)
    })

    it('should have correct InvalidParams code (-32602)', () => {
      expect(McpErrorCode.InvalidParams).toBe(-32602)
    })

    it('should have correct InternalError code (-32603)', () => {
      expect(McpErrorCode.InternalError).toBe(-32603)
    })

    it('should have correct ServerError code (-32000)', () => {
      expect(McpErrorCode.ServerError).toBe(-32000)
    })
  })

  describe('toJsonRpc()', () => {
    it('should serialize error without data', () => {
      const error = new McpError(McpErrorCode.ParseError, 'Parse error')
      const jsonRpc = error.toJsonRpc()

      expect(jsonRpc).toEqual({
        code: -32700,
        message: 'Parse error',
      })
    })

    it('should serialize error with data', () => {
      const data = { line: 10, column: 5 }
      const error = new McpError(McpErrorCode.ParseError, 'Unexpected token', data)
      const jsonRpc = error.toJsonRpc()

      expect(jsonRpc).toEqual({
        code: -32700,
        message: 'Unexpected token',
        data: { line: 10, column: 5 },
      })
    })

    it('should serialize complex data correctly', () => {
      const complexData = {
        errors: [
          { path: '/a', message: 'Error 1' },
          { path: '/b', message: 'Error 2' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      }
      const error = new McpError(McpErrorCode.InvalidRequest, 'Multiple errors', complexData)
      const jsonRpc = error.toJsonRpc()

      expect(jsonRpc.data).toEqual(complexData)
    })
  })

  describe('static factory methods', () => {
    describe('parseError()', () => {
      it('should create a ParseError with default message', () => {
        const error = McpError.parseError()

        expect(error.code).toBe(McpErrorCode.ParseError)
        expect(error.message).toBe('Parse error')
        expect(error.data).toBeUndefined()
      })

      it('should create a ParseError with custom message', () => {
        const error = McpError.parseError('Invalid JSON syntax')

        expect(error.code).toBe(McpErrorCode.ParseError)
        expect(error.message).toBe('Invalid JSON syntax')
      })

      it('should create a ParseError with data', () => {
        const error = McpError.parseError('Parse error', { position: 42 })

        expect(error.data).toEqual({ position: 42 })
      })
    })

    describe('invalidRequest()', () => {
      it('should create an InvalidRequest error with default message', () => {
        const error = McpError.invalidRequest()

        expect(error.code).toBe(McpErrorCode.InvalidRequest)
        expect(error.message).toBe('Invalid Request')
      })

      it('should create an InvalidRequest error with custom message', () => {
        const error = McpError.invalidRequest('Missing jsonrpc field')

        expect(error.code).toBe(McpErrorCode.InvalidRequest)
        expect(error.message).toBe('Missing jsonrpc field')
      })
    })

    describe('methodNotFound()', () => {
      it('should create a MethodNotFound error without method name', () => {
        const error = McpError.methodNotFound()

        expect(error.code).toBe(McpErrorCode.MethodNotFound)
        expect(error.message).toBe('Method not found')
      })

      it('should create a MethodNotFound error with method name', () => {
        const error = McpError.methodNotFound('tools/list')

        expect(error.code).toBe(McpErrorCode.MethodNotFound)
        expect(error.message).toBe("Method 'tools/list' not found")
      })

      it('should create a MethodNotFound error with data', () => {
        const error = McpError.methodNotFound('foo', { availableMethods: ['bar', 'baz'] })

        expect(error.data).toEqual({ availableMethods: ['bar', 'baz'] })
      })
    })

    describe('invalidParams()', () => {
      it('should create an InvalidParams error with default message', () => {
        const error = McpError.invalidParams()

        expect(error.code).toBe(McpErrorCode.InvalidParams)
        expect(error.message).toBe('Invalid params')
      })

      it('should create an InvalidParams error with custom message', () => {
        const error = McpError.invalidParams('Missing required field: name')

        expect(error.code).toBe(McpErrorCode.InvalidParams)
        expect(error.message).toBe('Missing required field: name')
      })
    })

    describe('internalError()', () => {
      it('should create an InternalError with default message', () => {
        const error = McpError.internalError()

        expect(error.code).toBe(McpErrorCode.InternalError)
        expect(error.message).toBe('Internal error')
      })

      it('should create an InternalError with custom message', () => {
        const error = McpError.internalError('Database connection failed')

        expect(error.code).toBe(McpErrorCode.InternalError)
        expect(error.message).toBe('Database connection failed')
      })
    })

    describe('serverError()', () => {
      it('should create a ServerError with message', () => {
        const error = McpError.serverError('Server overloaded')

        expect(error.code).toBe(McpErrorCode.ServerError)
        expect(error.message).toBe('Server overloaded')
      })

      it('should create a ServerError with data', () => {
        const error = McpError.serverError('Rate limited', { retryAfter: 60 })

        expect(error.code).toBe(McpErrorCode.ServerError)
        expect(error.data).toEqual({ retryAfter: 60 })
      })
    })

    describe('fromError()', () => {
      it('should create McpError from generic Error', () => {
        const originalError = new Error('Something went wrong')
        const mcpError = McpError.fromError(originalError)

        expect(mcpError.code).toBe(McpErrorCode.InternalError)
        expect(mcpError.message).toBe('Something went wrong')
        expect(mcpError.data).toMatchObject({
          originalName: 'Error',
        })
      })

      it('should create McpError with custom code', () => {
        const originalError = new TypeError('Invalid type')
        const mcpError = McpError.fromError(originalError, McpErrorCode.InvalidParams)

        expect(mcpError.code).toBe(McpErrorCode.InvalidParams)
        expect(mcpError.message).toBe('Invalid type')
        expect(mcpError.data).toMatchObject({
          originalName: 'TypeError',
        })
      })

      it('should include stack trace in data', () => {
        const originalError = new Error('Test error')
        const mcpError = McpError.fromError(originalError)

        expect((mcpError.data as Record<string, unknown>).stack).toBeDefined()
      })
    })
  })

  describe('isMcpError() type guard', () => {
    it('should return true for McpError instances', () => {
      const error = new McpError(McpErrorCode.InternalError, 'Test')

      expect(isMcpError(error)).toBe(true)
    })

    it('should return false for generic Error', () => {
      const error = new Error('Test')

      expect(isMcpError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isMcpError({ code: -32700, message: 'Parse error' })).toBe(false)
      expect(isMcpError('error string')).toBe(false)
      expect(isMcpError(null)).toBe(false)
      expect(isMcpError(undefined)).toBe(false)
      expect(isMcpError(42)).toBe(false)
    })

    it('should narrow type correctly', () => {
      const error: unknown = new McpError(McpErrorCode.ParseError, 'Test')

      if (isMcpError(error)) {
        // TypeScript should know error is McpError here
        expect(error.code).toBe(McpErrorCode.ParseError)
        expect(error.toJsonRpc()).toBeDefined()
      }
    })
  })

  describe('isMcpErrorCode() type guard', () => {
    it('should return true for valid MCP error codes', () => {
      expect(isMcpErrorCode(-32700)).toBe(true)
      expect(isMcpErrorCode(-32600)).toBe(true)
      expect(isMcpErrorCode(-32601)).toBe(true)
      expect(isMcpErrorCode(-32602)).toBe(true)
      expect(isMcpErrorCode(-32603)).toBe(true)
      expect(isMcpErrorCode(-32000)).toBe(true)
    })

    it('should return false for invalid error codes', () => {
      expect(isMcpErrorCode(0)).toBe(false)
      expect(isMcpErrorCode(-1)).toBe(false)
      expect(isMcpErrorCode(500)).toBe(false)
      expect(isMcpErrorCode(-32001)).toBe(false)
    })
  })

  describe('getDefaultMessage()', () => {
    it('should return correct default messages', () => {
      expect(getDefaultMessage(McpErrorCode.ParseError)).toBe('Parse error')
      expect(getDefaultMessage(McpErrorCode.InvalidRequest)).toBe('Invalid Request')
      expect(getDefaultMessage(McpErrorCode.MethodNotFound)).toBe('Method not found')
      expect(getDefaultMessage(McpErrorCode.InvalidParams)).toBe('Invalid params')
      expect(getDefaultMessage(McpErrorCode.InternalError)).toBe('Internal error')
      expect(getDefaultMessage(McpErrorCode.ServerError)).toBe('Server error')
    })

    it('should return Unknown error for invalid codes', () => {
      // Cast to bypass TypeScript check for testing purposes
      expect(getDefaultMessage(-99999 as McpErrorCode)).toBe('Unknown error')
    })
  })

  describe('integration scenarios', () => {
    it('should work in try/catch pattern', () => {
      function processRequest(method: string): void {
        if (method === 'unknown') {
          throw McpError.methodNotFound(method)
        }
      }

      expect(() => processRequest('unknown')).toThrow(McpError)

      try {
        processRequest('unknown')
      } catch (error) {
        if (isMcpError(error)) {
          expect(error.code).toBe(McpErrorCode.MethodNotFound)
          expect(error.toJsonRpc()).toEqual({
            code: -32601,
            message: "Method 'unknown' not found",
          })
        }
      }
    })

    it('should create complete JSON-RPC error response', () => {
      const error = McpError.invalidParams('Missing name parameter', {
        required: ['name'],
        received: [],
      })

      const response = {
        jsonrpc: '2.0' as const,
        error: error.toJsonRpc(),
        id: null,
      }

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Missing name parameter',
          data: {
            required: ['name'],
            received: [],
          },
        },
        id: null,
      })
    })
  })
})
