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

// ============================================================================
// Deployments Types
// ============================================================================

export interface Deployment {
  workerId: string
  name: string
  code: string
  url: string
  createdAt: string
  updatedAt?: string
}

export interface CreateDeploymentOptions {
  workerId: string
  name: string
  code: string
  url: string
}

export interface ListDeploymentsOptions {
  limit?: number
  cursor?: string
}

export interface ListDeploymentsResult {
  deployments: Deployment[]
  cursor?: string
  hasMore: boolean
}

export interface UpdateDeploymentOptions {
  url?: string
  code?: string
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

// ============================================================================
// Deployments Service
// ============================================================================

/**
 * DeploymentsService - exposed via RPC as "deployments"
 *
 * Storage Architecture:
 * =====================
 *
 * Key Patterns:
 * - Primary:   `deployment:{workerId}` → Deployment object
 * - Secondary: `name:{name}` → workerId (for O(1) name lookup)
 *
 * Design Decisions:
 * - workerId is the primary key (immutable, system-generated)
 * - name is user-facing identifier with uniqueness constraint
 * - Secondary index enables O(1) name→deployment lookup without scanning
 * - All multi-key operations use atomic transactions where possible
 *
 * Pagination:
 * - Cursor-based using storage.list() with startAfter
 * - Cursor is the full storage key: `deployment:{workerId}`
 * - Fetches limit+1 to determine hasMore without extra query
 *
 * Consistency:
 * - Create: check existence → put both keys atomically
 * - Delete: remove primary → remove secondary
 * - Name changes: not supported (would require index update)
 */
class DeploymentsService extends RpcTarget {
  private storage: DurableObjectStorage

  // Storage key prefixes
  private static readonly PREFIX_DEPLOYMENT = 'deployment:'
  private static readonly PREFIX_NAME = 'name:'

  constructor(storage: DurableObjectStorage) {
    super()
    this.storage = storage
  }

  /**
   * Create a new deployment
   * Stores deployment with secondary index for name lookup
   *
   * Storage writes:
   * - `deployment:{workerId}` → Deployment
   * - `name:{name}` → workerId
   */
  async create(options: CreateDeploymentOptions): Promise<Deployment> {
    const { workerId, name, code, url } = options

    // Check both constraints in parallel for efficiency
    const [existingById, existingWorkerId] = await Promise.all([
      this.storage.get<Deployment>(`${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`),
      this.storage.get<string>(`${DeploymentsService.PREFIX_NAME}${name}`),
    ])

    if (existingById) {
      throw new Error(`Deployment with workerId "${workerId}" already exists`)
    }

    if (existingWorkerId) {
      throw new Error(`Deployment with name "${name}" already exists`)
    }

    const deployment: Deployment = {
      workerId,
      name,
      code,
      url,
      createdAt: new Date().toISOString(),
    }

    // Store deployment and secondary index atomically using batch put
    const entries: Record<string, Deployment | string> = {
      [`${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`]: deployment,
      [`${DeploymentsService.PREFIX_NAME}${name}`]: workerId,
    }
    await this.storage.put(entries)

    return deployment
  }

  /**
   * Get deployment by workerId
   * Time complexity: O(1)
   */
  async get(workerId: string): Promise<Deployment | null> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    return deployment || null
  }

  /**
   * Get deployment by name via secondary index
   * Time complexity: O(1) - two lookups
   *
   * Flow: name:{name} → workerId → deployment:{workerId} → Deployment
   */
  async getByName(name: string): Promise<Deployment | null> {
    const workerId = await this.storage.get<string>(
      `${DeploymentsService.PREFIX_NAME}${name}`
    )
    if (!workerId) {
      return null
    }
    return this.get(workerId)
  }

  /**
   * Get multiple deployments by workerIds in a single batch
   * Time complexity: O(n) where n = workerIds.length
   *
   * @param workerIds - Array of worker IDs to fetch
   * @returns Record of workerId → Deployment (only includes found deployments)
   */
  async getMany(workerIds: string[]): Promise<Record<string, Deployment>> {
    if (workerIds.length === 0) {
      return {}
    }

    const keys = workerIds.map((id) => `${DeploymentsService.PREFIX_DEPLOYMENT}${id}`)
    const results = await this.storage.get<Deployment>(keys)

    // Transform keys back to workerIds
    const deployments: Record<string, Deployment> = {}
    for (const [key, deployment] of results) {
      const workerId = key.slice(DeploymentsService.PREFIX_DEPLOYMENT.length)
      deployments[workerId] = deployment
    }

    return deployments
  }

  /**
   * List deployments with cursor-based pagination
   *
   * Pagination strategy:
   * - Uses storage.list() with prefix and limit
   * - Fetches limit+1 to determine hasMore without extra query
   * - Cursor is the full storage key for startAfter
   * - Results are ordered by storage key (lexicographic by workerId)
   */
  async list(options: ListDeploymentsOptions = {}): Promise<ListDeploymentsResult> {
    const { limit = 100, cursor } = options

    // Build list options with efficient pagination
    const listOptions: DurableObjectListOptions = {
      prefix: DeploymentsService.PREFIX_DEPLOYMENT,
      limit: limit + 1, // Fetch one extra to determine hasMore
    }

    if (cursor) {
      // startAfter excludes the cursor key itself
      listOptions.startAfter = cursor
    }

    const map = await this.storage.list<Deployment>(listOptions)
    const deployments: Deployment[] = []
    let lastKey: string | undefined

    for (const [key, deployment] of map) {
      deployments.push(deployment)
      lastKey = key
    }

    // Check if there are more results
    const hasMore = deployments.length > limit
    if (hasMore) {
      deployments.pop() // Remove the extra item
      // Recompute lastKey from the last item we're keeping
      lastKey = `${DeploymentsService.PREFIX_DEPLOYMENT}${deployments[deployments.length - 1].workerId}`
    }

    return {
      deployments,
      cursor: hasMore ? lastKey : undefined,
      hasMore,
    }
  }

  /**
   * Delete a deployment by workerId
   * Removes both primary record and secondary index atomically
   *
   * Storage deletes:
   * - `deployment:{workerId}`
   * - `name:{name}`
   */
  async delete(workerId: string): Promise<boolean> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    if (!deployment) {
      return false
    }

    // Remove deployment and secondary index atomically
    await this.storage.delete([
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`,
      `${DeploymentsService.PREFIX_NAME}${deployment.name}`,
    ])

    return true
  }

  /**
   * Delete multiple deployments by workerIds
   * Removes both primary records and secondary indexes atomically
   *
   * @param workerIds - Array of worker IDs to delete
   * @returns Number of deployments actually deleted
   */
  async deleteMany(workerIds: string[]): Promise<number> {
    if (workerIds.length === 0) {
      return 0
    }

    // Fetch all deployments to get their names for secondary index cleanup
    const deployments = await this.getMany(workerIds)
    const entries = Object.entries(deployments)

    if (entries.length === 0) {
      return 0
    }

    // Build list of all keys to delete (primary + secondary)
    const keysToDelete: string[] = []
    for (const [workerId, deployment] of entries) {
      keysToDelete.push(`${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`)
      keysToDelete.push(`${DeploymentsService.PREFIX_NAME}${deployment.name}`)
    }

    // Delete all keys atomically
    await this.storage.delete(keysToDelete)

    return entries.length
  }

  /**
   * Update a deployment's url and/or code
   * Note: name cannot be updated (would require index migration)
   */
  async update(workerId: string, options: UpdateDeploymentOptions): Promise<Deployment | null> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    if (!deployment) {
      return null
    }

    const updated: Deployment = {
      ...deployment,
      updatedAt: new Date().toISOString(),
    }

    if (options.url !== undefined) {
      updated.url = options.url
    }
    if (options.code !== undefined) {
      updated.code = options.code
    }

    await this.storage.put(`${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`, updated)
    return updated
  }

  /**
   * Check if a deployment exists by workerId
   * More efficient than get() when you don't need the full deployment
   */
  async exists(workerId: string): Promise<boolean> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    return deployment !== undefined
  }

  /**
   * Check if a name is available (not taken by another deployment)
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const workerId = await this.storage.get<string>(
      `${DeploymentsService.PREFIX_NAME}${name}`
    )
    return workerId === undefined
  }

  /**
   * Count total deployments
   * Note: This scans all deployment keys - use sparingly for large stores
   */
  async count(): Promise<number> {
    const map = await this.storage.list({
      prefix: DeploymentsService.PREFIX_DEPLOYMENT,
    })
    return map.size
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
  // RPC services - must be public instance fields for RPC exposure
  // The Cloudflare runtime detects these via reflection
  readonly workers: WorkersService
  readonly deployments: DeploymentsService

  constructor(state: DurableObjectState, env: Record<string, unknown>) {
    super(state, env)
    this.workers = new WorkersService(state.storage)
    this.deployments = new DeploymentsService(state.storage)
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

      if (service === 'deployments') {
        const result = await this.callDeploymentsMethod(methodName, params)
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

  /**
   * Call a method on the deployments service
   */
  private async callDeploymentsMethod(method: string, params: any[]): Promise<any> {
    switch (method) {
      case 'create':
        return this.deployments.create(params[0])

      case 'get':
        return this.deployments.get(params[0])

      case 'getMany':
        return this.deployments.getMany(params[0])

      case 'getByName':
        return this.deployments.getByName(params[0])

      case 'list':
        return this.deployments.list(params[0] || {})

      case 'delete':
        return this.deployments.delete(params[0])

      case 'deleteMany':
        return this.deployments.deleteMany(params[0])

      case 'update':
        return this.deployments.update(params[0], params[1])

      case 'exists':
        return this.deployments.exists(params[0])

      case 'isNameAvailable':
        return this.deployments.isNameAvailable(params[0])

      case 'count':
        return this.deployments.count()

      default:
        throw new Error(`Unknown method: deployments.${method}`)
    }
  }
}
