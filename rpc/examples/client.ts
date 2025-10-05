/**
 * RPC Client SDK Example
 *
 * Demonstrates how to use the RPC service from TypeScript/JavaScript applications
 */

export interface RpcClientOptions {
  baseUrl?: string
  token?: string
  timeout?: number
}

export interface RpcRequest {
  method: string
  params?: any
  id?: string
}

export interface RpcResponse {
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id?: string
}

export class RpcClient {
  private baseUrl: string
  private token?: string
  private timeout: number

  constructor(options: RpcClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://rpc.do'
    this.token = options.token
    this.timeout = options.timeout || 30000
  }

  /**
   * Make a single RPC call
   */
  async call(method: string, params?: any): Promise<any> {
    const request: RpcRequest = {
      method,
      params: params || {},
      id: this.generateId(),
    }

    const response = await this.sendRequest(request)

    if (response.error) {
      throw new RpcError(response.error.code, response.error.message, response.error.data)
    }

    return response.result
  }

  /**
   * Make multiple RPC calls in a batch
   */
  async batch(requests: Array<{ method: string; params?: any }>): Promise<any[]> {
    const rpcRequests = requests.map((req) => ({
      method: req.method,
      params: req.params || {},
      id: this.generateId(),
    }))

    const responses = await this.sendRequest(rpcRequests)

    return responses.map((res: RpcResponse) => {
      if (res.error) {
        throw new RpcError(res.error.code, res.error.message, res.error.data)
      }
      return res.result
    })
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = undefined
  }

  /**
   * Send HTTP request to RPC endpoint
   */
  private async sendRequest(request: RpcRequest | RpcRequest[]): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }

      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * RPC Error Class
 */
export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

/**
 * Usage Examples
 */

// Example 1: Basic usage
async function example1() {
  const rpc = new RpcClient({ baseUrl: 'https://rpc.do' })

  // Ping (no auth required)
  const pong = await rpc.call('system.ping')
  console.log('Ping:', pong)

  // Get system info
  const info = await rpc.call('system.info')
  console.log('System Info:', info)
}

// Example 2: With authentication
async function example2() {
  const rpc = new RpcClient({
    baseUrl: 'https://rpc.do',
    token: 'your-oauth-token',
  })

  // Get current user
  const user = await rpc.call('auth.whoami')
  console.log('Current User:', user)

  // Get entity from database
  const entity = await rpc.call('db.get', {
    ns: 'test',
    id: 'person-alice',
  })
  console.log('Entity:', entity)
}

// Example 3: Batch requests
async function example3() {
  const rpc = new RpcClient({
    baseUrl: 'https://rpc.do',
    token: 'your-oauth-token',
  })

  const results = await rpc.batch([
    { method: 'db.get', params: { ns: 'test', id: 'person-alice' } },
    { method: 'db.get', params: { ns: 'test', id: 'person-bob' } },
    { method: 'db.list', params: { ns: 'test', limit: 10 } },
  ])

  console.log('Batch Results:', results)
}

// Example 4: Error handling
async function example4() {
  const rpc = new RpcClient({ baseUrl: 'https://rpc.do' })

  try {
    await rpc.call('auth.whoami') // Requires auth
  } catch (error) {
    if (error instanceof RpcError) {
      console.error('RPC Error:', error.code, error.message)
    }
  }
}

// Example 5: Database operations
async function example5() {
  const rpc = new RpcClient({
    baseUrl: 'https://rpc.do',
    token: 'your-oauth-token',
  })

  // Create entity
  const created = await rpc.call('db.upsert', {
    ns: 'test',
    id: 'my-entity',
    type: 'Thing',
    data: { name: 'My Thing', description: 'Test entity' },
  })
  console.log('Created:', created)

  // Get entity
  const entity = await rpc.call('db.get', {
    ns: 'test',
    id: 'my-entity',
  })
  console.log('Entity:', entity)

  // Search entities
  const results = await rpc.call('db.search', {
    query: 'thing',
    ns: 'test',
  })
  console.log('Search Results:', results)

  // Delete entity
  await rpc.call('db.delete', {
    ns: 'test',
    id: 'my-entity',
  })
  console.log('Deleted')
}

// Example 6: Relationships
async function example6() {
  const rpc = new RpcClient({
    baseUrl: 'https://rpc.do',
    token: 'your-oauth-token',
  })

  // Create relationship
  await rpc.call('db.createRelationship', {
    fromNs: 'test',
    fromId: 'person-alice',
    toNs: 'test',
    toId: 'person-bob',
    type: 'knows',
    properties: { since: '2020-01-01' },
  })

  // Get relationships
  const rels = await rpc.call('db.relationships', {
    ns: 'test',
    id: 'person-alice',
  })
  console.log('Relationships:', rels)
}

// Export examples
export const examples = {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
}
