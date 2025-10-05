import type { RpcRequest, RpcResponse, RpcMethod, RpcContext } from './types'

/**
 * CapnWeb RPC Registry
 * Manages RPC method registration and execution
 */
export class CapnWebRegistry {
  private methods: Map<string, RpcMethod> = new Map()

  /**
   * Register an RPC method
   */
  register(method: RpcMethod): void {
    this.methods.set(method.name, method)
  }

  /**
   * Get all registered methods
   */
  getMethods(): RpcMethod[] {
    return Array.from(this.methods.values())
  }

  /**
   * Get method by name
   */
  getMethod(name: string): RpcMethod | undefined {
    return this.methods.get(name)
  }

  /**
   * Execute an RPC method
   */
  async execute(request: RpcRequest, context: RpcContext): Promise<RpcResponse> {
    const method = this.methods.get(request.method)

    if (!method) {
      return {
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
        id: request.id,
      }
    }

    // Check authentication requirement
    if (method.requiresAuth && !context.auth) {
      return {
        error: {
          code: -32000,
          message: 'Authentication required',
        },
        id: request.id,
      }
    }

    // Validate params with schema if provided
    if (method.schema) {
      try {
        request.params = method.schema.parse(request.params)
      } catch (error: any) {
        return {
          error: {
            code: -32602,
            message: 'Invalid params',
            data: error.errors,
          },
          id: request.id,
        }
      }
    }

    // Execute method handler
    try {
      const result = await method.handler(request.params || {}, context)
      return {
        result,
        id: request.id,
      }
    } catch (error: any) {
      console.error(`RPC method error [${request.method}]:`, error)
      return {
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error.stack,
        },
        id: request.id,
      }
    }
  }

  /**
   * Execute batch of RPC requests
   */
  async executeBatch(requests: RpcRequest[], context: RpcContext): Promise<RpcResponse[]> {
    return await Promise.all(requests.map((req) => this.execute(req, context)))
  }
}

/**
 * Create RPC error response
 */
export function createRpcError(code: number, message: string, data?: any, id?: string): RpcResponse {
  return {
    error: { code, message, data },
    id,
  }
}

/**
 * Create RPC success response
 */
export function createRpcSuccess(result: any, id?: string): RpcResponse {
  return {
    result,
    id,
  }
}

/**
 * Parse RPC request from body
 */
export async function parseRpcRequest(request: Request): Promise<RpcRequest | RpcRequest[]> {
  const contentType = request.headers.get('Content-Type') || ''

  if (!contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }

  const body = await request.json()

  // Handle batch requests
  if (Array.isArray(body)) {
    return body as RpcRequest[]
  }

  return body as RpcRequest
}

/**
 * Validate RPC request structure
 */
export function validateRpcRequest(req: any): req is RpcRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    typeof req.method === 'string' &&
    (req.params === undefined || typeof req.params === 'object')
  )
}
