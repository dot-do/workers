/**
 * @dotdo/do - RPC Layer Tests (RED Phase)
 *
 * Tests for RpcTarget implementation and multi-transport RPC support.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RpcTarget, newWorkersRpcResponse, BatchedRpcExecutor } from '../src/rpc'
import type { RpcRequest, RpcResponse } from '../src/types'

describe('RpcTarget Base Class', () => {
  describe('Method Registration', () => {
    it('should allow registering custom methods', () => {
      const target = new RpcTarget()
      target['registerMethod']('customMethod', async () => 'result')
      expect(target.hasMethod('customMethod')).toBe(true)
    })

    it('should invoke registered methods', async () => {
      const target = new RpcTarget()
      target['registerMethod']('customMethod', async (a: number, b: number) => a + b)
      const result = await target.invoke('customMethod', [1, 2])
      expect(result).toBe(3)
    })
  })

  describe('Security', () => {
    it('should block prototype methods', async () => {
      const target = new RpcTarget()
      expect(target.hasMethod('constructor')).toBe(false)
      expect(target.hasMethod('__proto__')).toBe(false)
      expect(target.hasMethod('hasOwnProperty')).toBe(false)
    })

    it('should throw when invoking blocked methods', async () => {
      const target = new RpcTarget()
      await expect(target.invoke('constructor', [])).rejects.toThrow()
      await expect(target.invoke('__proto__', [])).rejects.toThrow()
    })

    it('should only allow methods in allowedMethods set', () => {
      class TestTarget extends RpcTarget {
        protected override allowedMethods = new Set(['safeMethod'])

        async safeMethod() {
          return 'safe'
        }

        async unsafeMethod() {
          return 'unsafe'
        }
      }

      const target = new TestTarget()
      expect(target.hasMethod('safeMethod')).toBe(true)
      expect(target.hasMethod('unsafeMethod')).toBe(false)
    })
  })
})

describe('newWorkersRpcResponse', () => {
  class TestTarget extends RpcTarget {
    protected override allowedMethods = new Set(['echo', 'add', 'error'])

    async echo(msg: string) {
      return msg
    }

    async add(a: number, b: number) {
      return a + b
    }

    async error() {
      throw new Error('Test error')
    }
  }

  let target: TestTarget

  beforeEach(() => {
    target = new TestTarget()
  })

  describe('Single Requests', () => {
    it('should handle valid RPC request', async () => {
      const request = new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '1',
          method: 'echo',
          params: ['hello'],
        }),
      })

      const response = await newWorkersRpcResponse(target, request)
      expect(response.status).toBe(200)

      const body = await response.json() as RpcResponse
      expect(body.id).toBe('1')
      expect(body.result).toBe('hello')
    })

    it('should return error for unknown method', async () => {
      const request = new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '1',
          method: 'nonexistent',
          params: [],
        }),
      })

      const response = await newWorkersRpcResponse(target, request)
      expect(response.status).toBe(400)

      const body = await response.json() as { error: string }
      expect(body.error).toContain('not found')
    })

    it('should handle method errors', async () => {
      const request = new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '1',
          method: 'error',
          params: [],
        }),
      })

      const response = await newWorkersRpcResponse(target, request)
      const body = await response.json() as { error: string }
      expect(body.error).toBe('Test error')
    })
  })

  describe('Batch Requests', () => {
    it('should handle batch RPC requests', async () => {
      const request = new Request('http://localhost/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { id: '1', method: 'echo', params: ['first'] },
          { id: '2', method: 'add', params: [1, 2] },
          { id: '3', method: 'echo', params: ['third'] },
        ]),
      })

      const response = await newWorkersRpcResponse(target, request)
      expect(response.status).toBe(200)

      const body = await response.json() as { results: RpcResponse[] }
      expect(body.results).toHaveLength(3)
      expect(body.results[0].result).toBe('first')
      expect(body.results[1].result).toBe(3)
      expect(body.results[2].result).toBe('third')
    })

    it('should handle mixed success/failure in batch', async () => {
      const request = new Request('http://localhost/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { id: '1', method: 'echo', params: ['success'] },
          { id: '2', method: 'error', params: [] },
          { id: '3', method: 'add', params: [5, 5] },
        ]),
      })

      const response = await newWorkersRpcResponse(target, request)
      const body = await response.json() as { results: RpcResponse[] }

      expect(body.results[0].result).toBe('success')
      expect(body.results[1].error).toBeDefined()
      expect(body.results[2].result).toBe(10)
    })
  })
})

describe('BatchedRpcExecutor', () => {
  let mockStub: {
    fetch: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockStub = {
      fetch: vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            results: [
              { id: '0', result: 'result0' },
              { id: '1', result: 'result1' },
            ],
          }),
      }),
    }
  })

  it('should batch multiple requests', async () => {
    const executor = new BatchedRpcExecutor(mockStub as any, {
      maxBatchSize: 10,
      flushInterval: 100,
    })

    const promise1 = executor.execute('method1', { a: 1 })
    const promise2 = executor.execute('method2', { b: 2 })

    await executor.flush()

    expect(mockStub.fetch).toHaveBeenCalledTimes(1)
  })

  it('should auto-flush when batch size reached', async () => {
    const executor = new BatchedRpcExecutor(mockStub as any, {
      maxBatchSize: 2,
      flushInterval: 10000, // Long interval to ensure it's the size that triggers
    })

    executor.execute('method1', { a: 1 })
    executor.execute('method2', { b: 2 })

    // Small delay to allow flush to complete
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockStub.fetch).toHaveBeenCalledTimes(1)
  })

  it('should resolve promises with correct results', async () => {
    mockStub.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          results: [
            { id: '0', result: 'first' },
            { id: '1', result: 'second' },
          ],
        }),
    })

    const executor = new BatchedRpcExecutor(mockStub as any)

    const promise1 = executor.execute('method1', {})
    const promise2 = executor.execute('method2', {})

    await executor.flush()

    const [result1, result2] = await Promise.all([promise1, promise2])
    expect(result1).toBe('first')
    expect(result2).toBe('second')
  })

  it('should reject promises on error', async () => {
    mockStub.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          results: [
            { id: '0', error: 'Error message' },
          ],
        }),
    })

    const executor = new BatchedRpcExecutor(mockStub as any)
    const promise = executor.execute('method1', {})

    await executor.flush()

    await expect(promise).rejects.toThrow('Error message')
  })
})
