/**
 * @dotdo/db/rpc - RPC Layer
 *
 * Implements RpcTarget pattern with capnweb-style HTTP/WS support.
 */

import type { RpcRequest, RpcResponse } from '../types'

/**
 * Base class for RPC targets
 */
export class RpcTarget {
  protected allowedMethods = new Set<string>()

  /**
   * Check if a method is allowed
   */
  hasMethod(name: string): boolean {
    return this.allowedMethods.has(name)
  }

  /**
   * Invoke a method by name
   */
  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.allowedMethods.has(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    const fn = (this as unknown as Record<string, unknown>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }

    return (fn as (...args: unknown[]) => Promise<unknown>).apply(this, params)
  }

  /**
   * Register a method
   */
  protected registerMethod(name: string, handler: (...args: unknown[]) => Promise<unknown>): void {
    this.allowedMethods.add(name)
    ;(this as unknown as Record<string, unknown>)[name] = handler
  }
}

/**
 * Create a Workers RPC response from a target and request
 */
export async function newWorkersRpcResponse(
  target: RpcTarget,
  request: Request
): Promise<Response> {
  const url = new URL(request.url)
  const isBatch = url.pathname.endsWith('/batch')

  try {
    const body = (await request.json()) as RpcRequest | RpcRequest[]

    if (isBatch && Array.isArray(body)) {
      // Handle batch requests
      const results = await Promise.all(
        body.map(async (req) => {
          try {
            const result = await target.invoke(req.method, req.params)
            return { id: req.id, result }
          } catch (error) {
            return {
              id: req.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle single request
    const req = body as RpcRequest

    if (!target.hasMethod(req.method)) {
      return new Response(JSON.stringify({ error: `Method not found: ${req.method}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await target.invoke(req.method, req.params)

    return new Response(JSON.stringify({ id: req.id, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Batched RPC executor for coalescing multiple requests
 */
export class BatchedRpcExecutor {
  private stub: { fetch: (url: string, init: RequestInit) => Promise<Response> }
  private options: { maxBatchSize: number; flushInterval: number }
  private queue: Array<{
    method: string
    params: Record<string, unknown>
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }> = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    stub: { fetch: (url: string, init: RequestInit) => Promise<Response> },
    options: { maxBatchSize?: number; flushInterval?: number } = {}
  ) {
    this.stub = stub
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      flushInterval: options.flushInterval ?? 10,
    }
  }

  /**
   * Execute a method with batching
   */
  execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ method, params, resolve, reject })

      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush()
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), this.options.flushInterval)
      }
    })
  }

  /**
   * Flush pending requests
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.queue.length === 0) {
      return
    }

    const batch = this.queue.splice(0, this.options.maxBatchSize)

    try {
      const response = await this.stub.fetch('http://internal/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          batch.map((item, index) => ({
            id: String(index),
            method: item.method,
            params: item.params,
          }))
        ),
      })

      const { results } = (await response.json()) as {
        results: Array<{ id: string; result?: unknown; error?: string }>
      }

      batch.forEach((item, index) => {
        const result = results[index]
        if (result) {
          if (result.error) {
            item.reject(new Error(result.error))
          } else {
            item.resolve(result.result)
          }
        } else {
          item.reject(new Error('Missing result for batch item'))
        }
      })
    } catch (error) {
      batch.forEach((item) => {
        item.reject(error instanceof Error ? error : new Error('Unknown error'))
      })
    }
  }
}
