/**
 * WorkersRegistryDO - Durable Object for worker registry
 *
 * Stores and manages worker metadata for a user.
 * Supports both capnweb RPC protocol and REST API.
 */

import { DurableObject, RpcTarget } from 'cloudflare:workers'

export interface Worker {
  $id: string
  name: string
  url: string
  createdAt: string
  deployedAt?: string
  accessedAt?: string
  linkedFolders?: string[]
}

export interface ListOptions {
  sortBy?: 'created' | 'deployed' | 'accessed'
  limit?: number
}

export interface LinkOptions {
  folder: string
}

/**
 * Workers service - exposed via RPC as "workers"
 */
class WorkersService extends RpcTarget {
  private storage: DurableObjectStorage

  constructor(storage: DurableObjectStorage) {
    super()
    this.storage = storage
  }

  /**
   * List workers with sorting
   */
  async list(options: ListOptions = {}): Promise<Worker[]> {
    const { sortBy = 'accessed', limit = 20 } = options

    // Get all workers from storage
    const map = await this.storage.list<Worker>({ prefix: 'worker:' })
    const workers: Worker[] = []

    for (const [, worker] of map) {
      workers.push(worker)
    }

    // Sort by requested field (descending - most recent first)
    workers.sort((a, b) => {
      const aDate = sortBy === 'created' ? a.createdAt :
                    sortBy === 'deployed' ? (a.deployedAt || a.createdAt) :
                    (a.accessedAt || a.createdAt)
      const bDate = sortBy === 'created' ? b.createdAt :
                    sortBy === 'deployed' ? (b.deployedAt || b.createdAt) :
                    (b.accessedAt || b.createdAt)
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    return workers.slice(0, limit)
  }

  /**
   * Get a single worker by ID
   */
  async get(workerId: string): Promise<Worker | null> {
    return await this.storage.get<Worker>(`worker:${workerId}`) || null
  }

  /**
   * Link a folder to a worker
   */
  async link(workerId: string, options: LinkOptions): Promise<boolean> {
    const worker = await this.storage.get<Worker>(`worker:${workerId}`)
    if (!worker) {
      return false
    }

    const folders = worker.linkedFolders || []
    if (!folders.includes(options.folder)) {
      folders.push(options.folder)
    }

    await this.storage.put(`worker:${workerId}`, {
      ...worker,
      linkedFolders: folders,
      accessedAt: new Date().toISOString()
    })

    return true
  }

  /**
   * Register a new worker
   */
  async register(worker: Omit<Worker, 'createdAt'>): Promise<Worker> {
    const now = new Date().toISOString()
    const fullWorker: Worker = {
      ...worker,
      createdAt: now,
      accessedAt: now
    }

    await this.storage.put(`worker:${worker.$id}`, fullWorker)
    return fullWorker
  }

  /**
   * Update accessed timestamp
   */
  async updateAccessed(workerId: string): Promise<void> {
    const worker = await this.storage.get<Worker>(`worker:${workerId}`)
    if (worker) {
      await this.storage.put(`worker:${workerId}`, {
        ...worker,
        accessedAt: new Date().toISOString()
      })
    }
  }

  /**
   * Update deployed timestamp
   */
  async updateDeployed(workerId: string): Promise<void> {
    const worker = await this.storage.get<Worker>(`worker:${workerId}`)
    if (worker) {
      const now = new Date().toISOString()
      await this.storage.put(`worker:${workerId}`, {
        ...worker,
        deployedAt: now,
        accessedAt: now
      })
    }
  }
}

/**
 * Capnweb RPC message format
 */
interface RpcMessage {
  method: string
  params?: any[]
  id?: string | number
}

interface RpcResponse {
  result?: any
  error?: { code: number; message: string }
  id?: string | number
}

/**
 * WorkersRegistryDO - Main Durable Object class
 *
 * Exposes "workers" service via both:
 * - Cloudflare RPC (for DO-to-DO calls)
 * - Capnweb protocol (for CLI/HTTP clients)
 */
export class WorkersRegistryDO extends DurableObject<Record<string, unknown>> {
  // RPC service exposed as "workers"
  workers: WorkersService

  constructor(state: DurableObjectState, env: Record<string, unknown>) {
    super(state, env)
    this.workers = new WorkersService(state.storage)
  }

  /**
   * Handle HTTP requests
   * Supports both capnweb RPC and REST API
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle capnweb RPC (POST to root with JSON body)
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '')) {
      return this.handleRpc(request)
    }

    // REST API endpoints
    if (url.pathname === '/list' || url.pathname === '/workers') {
      const sortBy = url.searchParams.get('sortBy') as 'created' | 'deployed' | 'accessed' || 'accessed'
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const workers = await this.workers.list({ sortBy, limit })
      return new Response(JSON.stringify(workers), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url.pathname.startsWith('/get/') || url.pathname.startsWith('/workers/')) {
      const workerId = url.pathname.split('/').pop() || ''
      const worker = await this.workers.get(workerId)
      if (!worker) {
        return new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify(worker), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Default: return 404
    return new Response(JSON.stringify({ error: 'not_found', path: url.pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Handle capnweb RPC requests
   * Format: { "method": "workers.list", "params": [...], "id": 1 }
   */
  private async handleRpc(request: Request): Promise<Response> {
    try {
      const body = await request.json() as RpcMessage | RpcMessage[]

      // Handle batch requests
      if (Array.isArray(body)) {
        const results = await Promise.all(body.map(msg => this.executeRpc(msg)))
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Single request
      const result = await this.executeRpc(body)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return new Response(JSON.stringify({
        error: { code: -32700, message: `Parse error: ${errorMessage}` }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  /**
   * Execute a single RPC call
   */
  private async executeRpc(msg: RpcMessage): Promise<RpcResponse> {
    const { method, params = [], id } = msg

    try {
      // Parse method: "service.method" format
      const [service, methodName] = method.split('.')

      if (service === 'workers') {
        const result = await this.callWorkersMethod(methodName, params)
        return { result, id }
      }

      // Unknown service
      return {
        error: { code: -32601, message: `Unknown service: ${service}` },
        id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: { code: -32603, message: errorMessage },
        id
      }
    }
  }

  /**
   * Call a method on the workers service
   */
  private async callWorkersMethod(method: string, params: any[]): Promise<any> {
    switch (method) {
      case 'list':
        return this.workers.list(params[0] || {})

      case 'get':
        return this.workers.get(params[0])

      case 'link':
        return this.workers.link(params[0], params[1])

      case 'register':
        return this.workers.register(params[0])

      case 'updateAccessed':
        return this.workers.updateAccessed(params[0])

      case 'updateDeployed':
        return this.workers.updateDeployed(params[0])

      default:
        throw new Error(`Unknown method: workers.${method}`)
    }
  }
}
