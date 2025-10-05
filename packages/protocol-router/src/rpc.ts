/**
 * RPC Protocol Handler
 *
 * Handles JSON-RPC 2.0 requests
 */

import type { Context } from 'hono'
import type { RpcHandler, JsonRpcRequest, JsonRpcResponse, JsonRpcErrorCode } from './types'

/**
 * Create JSON-RPC error response
 */
export function createRpcError(code: JsonRpcErrorCode, message: string, data?: any, id?: string | number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data,
    },
    id,
  }
}

/**
 * Create JSON-RPC success response
 */
export function createRpcSuccess(result: any, id?: string | number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    result,
    id,
  }
}

/**
 * Validate JSON-RPC request
 */
export function validateRpcRequest(data: any): data is JsonRpcRequest {
  return (
    data &&
    typeof data === 'object' &&
    data.jsonrpc === '2.0' &&
    typeof data.method === 'string' &&
    (data.params === undefined || typeof data.params === 'object')
  )
}

/**
 * Handle RPC request
 */
export async function handleRpcRequest(handler: RpcHandler, c: Context): Promise<Response> {
  try {
    // Parse request body
    const body = await c.req.json().catch(() => null)

    if (!body) {
      return c.json(createRpcError(-32700 as JsonRpcErrorCode, 'Parse error'), 400)
    }

    // Handle batch requests
    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map(async (request) => {
          if (!validateRpcRequest(request)) {
            return createRpcError(-32600 as JsonRpcErrorCode, 'Invalid Request', undefined, (request as any).id)
          }
          return await executeRpcMethod(handler, request, c)
        })
      )
      return c.json(responses)
    }

    // Handle single request
    if (!validateRpcRequest(body)) {
      return c.json(createRpcError(-32600 as JsonRpcErrorCode, 'Invalid Request'), 400)
    }

    const response = await executeRpcMethod(handler, body, c)
    return c.json(response)
  } catch (error: any) {
    console.error('RPC handler error:', error)
    return c.json(createRpcError(-32603 as JsonRpcErrorCode, 'Internal error', error.message), 500)
  }
}

/**
 * Execute single RPC method
 */
async function executeRpcMethod(handler: RpcHandler, request: JsonRpcRequest, c: Context): Promise<JsonRpcResponse> {
  try {
    let result: any

    // Check if handler is WorkerEntrypoint
    if (typeof handler === 'function') {
      // Custom handler function
      result = await handler(request.method, request.params || {}, c)
    } else {
      // WorkerEntrypoint - call method directly
      const method = (handler as any)[request.method]

      if (!method || typeof method !== 'function') {
        return createRpcError(-32601 as JsonRpcErrorCode, `Method not found: ${request.method}`, undefined, request.id)
      }

      // Bind method to handler instance and call with params
      if (request.params && typeof request.params === 'object' && !Array.isArray(request.params)) {
        // Named parameters - destructure
        result = await method.call(handler, request.params)
      } else if (Array.isArray(request.params)) {
        // Positional parameters
        result = await method.call(handler, ...request.params)
      } else {
        // No parameters
        result = await method.call(handler)
      }
    }

    return createRpcSuccess(result, request.id)
  } catch (error: any) {
    console.error(`RPC method error [${request.method}]:`, error)

    // Check for specific error types
    if (error.message?.includes('not found')) {
      return createRpcError(-32601 as JsonRpcErrorCode, `Method not found: ${request.method}`, error.message, request.id)
    }

    if (error.message?.includes('Invalid') || error.message?.includes('validation')) {
      return createRpcError(-32602 as JsonRpcErrorCode, 'Invalid params', error.message, request.id)
    }

    return createRpcError(-32603 as JsonRpcErrorCode, 'Internal error', error.message, request.id)
  }
}
