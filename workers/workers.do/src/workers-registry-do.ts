/**
 * WorkersRegistryDO - Durable Object for worker registry
 *
 * This Durable Object stores and manages worker metadata and deployments for a user.
 * It supports both Cloudflare RPC protocol (for DO-to-DO calls) and capnweb JSON-RPC
 * protocol (for CLI/HTTP clients).
 *
 * ## Architecture
 *
 * The DO exposes two services:
 * - `workers` - Registry metadata (id, name, url, timestamps, linkedFolders)
 * - `deployments` - Deployed code artifacts (workerId, name, code, url)
 *
 * These services are intentionally separate as they serve different purposes:
 * - Workers represent the logical registry entry for a worker
 * - Deployments represent the actual deployed code artifacts
 *
 * ## Storage Patterns
 *
 * Both services use a common key-value storage pattern with optional secondary indexes:
 * - Primary key: `{prefix}:{id}` -> Entity
 * - Secondary index: `{indexName}:{value}` -> id (for O(1) lookups)
 *
 * @module workers-registry-do
 */

import { DurableObject, RpcTarget } from 'cloudflare:workers'

// ============================================================================
// Error Types and Constants
// ============================================================================

/**
 * Standard JSON-RPC 2.0 error codes
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const RpcErrorCode = {
  /** Invalid JSON was received by the server */
  PARSE_ERROR: -32700,
  /** The JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,
  /** The method does not exist or is not available */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameter(s) */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
} as const

// ============================================================================
// Worker Types
// ============================================================================

/**
 * Represents a registered worker in the registry.
 *
 * Workers are logical entries that track metadata about deployed workers,
 * including their URLs, timestamps, and linked local folders.
 */
export interface Worker {
  /** Unique identifier for the worker */
  $id: string
  /** Human-readable name for the worker */
  name: string
  /** URL where the worker is accessible */
  url: string
  /** ISO 8601 timestamp when the worker was first registered */
  createdAt: string
  /** ISO 8601 timestamp when the worker was last deployed */
  deployedAt?: string
  /** ISO 8601 timestamp when the worker was last accessed */
  accessedAt?: string
  /** Local filesystem folders linked to this worker */
  linkedFolders?: string[]
}

/**
 * Options for listing workers with sorting and pagination
 */
export interface ListOptions {
  /**
   * Field to sort results by (descending order - most recent first)
   * @default 'accessed'
   */
  sortBy?: 'created' | 'deployed' | 'accessed'
  /**
   * Maximum number of results to return
   * @default 20
   */
  limit?: number
}

/**
 * Options for linking a local folder to a worker
 */
export interface LinkOptions {
  /** The local filesystem path to link */
  folder: string
}

// ============================================================================
// Deployment Types
// ============================================================================

/**
 * Represents a deployed worker with its code and configuration.
 *
 * Deployments store the actual code artifacts and are separate from
 * the worker registry entries.
 */
export interface Deployment {
  /** Unique identifier for the deployment (matches worker ID) */
  workerId: string
  /** Human-readable name for the deployment (must be unique) */
  name: string
  /** The deployed worker code */
  code: string
  /** URL where the deployment is accessible */
  url: string
  /** ISO 8601 timestamp when the deployment was created */
  createdAt: string
  /** ISO 8601 timestamp when the deployment was last updated */
  updatedAt?: string
}

/**
 * Options for creating a new deployment
 */
export interface CreateDeploymentOptions {
  /** Unique identifier for the deployment */
  workerId: string
  /** Human-readable name (must be unique within the user's namespace) */
  name: string
  /** The worker code to deploy */
  code: string
  /** URL where the deployment will be accessible */
  url: string
}

/**
 * Options for listing deployments with cursor-based pagination
 */
export interface ListDeploymentsOptions {
  /**
   * Maximum number of results per page
   * @default 100
   */
  limit?: number
  /** Cursor from previous response for fetching next page */
  cursor?: string
}

/**
 * Result of listing deployments with pagination metadata
 */
export interface ListDeploymentsResult {
  /** Array of deployments for the current page */
  deployments: Deployment[]
  /** Cursor for fetching the next page (undefined if no more results) */
  cursor?: string
  /** Whether there are more results after this page */
  hasMore: boolean
}

/**
 * Options for updating an existing deployment
 */
export interface UpdateDeploymentOptions {
  /** New URL for the deployment */
  url?: string
  /** New code for the deployment */
  code?: string
}

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Create a JSON response with proper headers
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code
 * @returns Response with JSON body and Content-Type header
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Get the current timestamp as ISO 8601 string
 * @returns Current time in ISO 8601 format
 */
function now(): string {
  return new Date().toISOString()
}

// ============================================================================
// Workers Service
// ============================================================================

/**
 * Workers service - manages worker registry metadata.
 *
 * This service handles CRUD operations for worker registry entries,
 * including:
 * - Listing workers with sorting and pagination
 * - Getting individual workers by ID
 * - Registering new workers
 * - Linking local folders to workers
 * - Updating access and deployment timestamps
 *
 * Storage pattern:
 * - Primary: `worker:{$id}` -> Worker object
 *
 * Exposed via Cloudflare RPC as `stub.workers.*`
 */
class WorkersService extends RpcTarget {
  /** Storage key prefix for worker entries */
  private static readonly PREFIX = 'worker:'

  private storage: DurableObjectStorage

  /**
   * Create a new WorkersService instance
   * @param storage - The DO storage instance
   */
  constructor(storage: DurableObjectStorage) {
    super()
    this.storage = storage
  }

  /**
   * List all workers with optional sorting and limit.
   *
   * Workers are sorted in descending order (most recent first) by the
   * specified field. If a worker is missing the sort field, it falls
   * back to createdAt.
   *
   * @param options - List options
   * @returns Array of workers sorted by the specified field
   *
   * @example
   * ```typescript
   * // List 10 most recently accessed workers
   * const workers = await stub.workers.list({ sortBy: 'accessed', limit: 10 })
   *
   * // List all workers sorted by creation date
   * const workers = await stub.workers.list({ sortBy: 'created' })
   * ```
   */
  async list(options: ListOptions = {}): Promise<Worker[]> {
    const { sortBy = 'accessed', limit = 20 } = options

    const map = await this.storage.list<Worker>({ prefix: WorkersService.PREFIX })
    const workers: Worker[] = []

    for (const [, worker] of map) {
      workers.push(worker)
    }

    // Sort by requested field (descending - most recent first)
    workers.sort((a, b) => {
      const aDate = this.getSortDate(a, sortBy)
      const bDate = this.getSortDate(b, sortBy)
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    return workers.slice(0, limit)
  }

  /**
   * Get the date value to use for sorting a worker
   * @param worker - The worker to get the sort date from
   * @param sortBy - The field to sort by
   * @returns ISO 8601 date string
   */
  private getSortDate(
    worker: Worker,
    sortBy: 'created' | 'deployed' | 'accessed'
  ): string {
    switch (sortBy) {
      case 'created':
        return worker.createdAt
      case 'deployed':
        return worker.deployedAt || worker.createdAt
      case 'accessed':
      default:
        return worker.accessedAt || worker.createdAt
    }
  }

  /**
   * Get a single worker by its ID.
   *
   * @param workerId - The worker ID to look up
   * @returns The worker if found, null otherwise
   *
   * @example
   * ```typescript
   * const worker = await stub.workers.get('my-api')
   * if (worker) {
   *   console.log(`Worker ${worker.name} at ${worker.url}`)
   * }
   * ```
   */
  async get(workerId: string): Promise<Worker | null> {
    const worker = await this.storage.get<Worker>(
      `${WorkersService.PREFIX}${workerId}`
    )
    return worker || null
  }

  /**
   * Link a local folder to a worker.
   *
   * This associates a local filesystem path with a worker, useful for
   * tracking which local projects are connected to which deployed workers.
   * Duplicate folders are automatically deduplicated.
   *
   * @param workerId - The worker ID to link to
   * @param options - Link options containing the folder path
   * @returns true if the worker was found and updated, false if not found
   *
   * @example
   * ```typescript
   * const success = await stub.workers.link('my-api', { folder: '/path/to/project' })
   * if (!success) {
   *   console.error('Worker not found')
   * }
   * ```
   */
  async link(workerId: string, options: LinkOptions): Promise<boolean> {
    const worker = await this.storage.get<Worker>(
      `${WorkersService.PREFIX}${workerId}`
    )
    if (!worker) {
      return false
    }

    const folders = worker.linkedFolders || []
    if (!folders.includes(options.folder)) {
      folders.push(options.folder)
    }

    await this.storage.put(`${WorkersService.PREFIX}${workerId}`, {
      ...worker,
      linkedFolders: folders,
      accessedAt: now(),
    })

    return true
  }

  /**
   * Register a new worker in the registry.
   *
   * This creates or updates a worker entry with the provided data.
   * The createdAt and accessedAt timestamps are automatically set.
   * If a worker with the same ID exists, it will be overwritten.
   *
   * @param worker - The worker data (without createdAt, which is auto-set)
   * @returns The created worker with all timestamps populated
   *
   * @example
   * ```typescript
   * const worker = await stub.workers.register({
   *   $id: 'my-api',
   *   name: 'My API Worker',
   *   url: 'https://my-api.workers.dev'
   * })
   * console.log(`Created at: ${worker.createdAt}`)
   * ```
   */
  async register(worker: Omit<Worker, 'createdAt'>): Promise<Worker> {
    const timestamp = now()
    const fullWorker: Worker = {
      ...worker,
      createdAt: timestamp,
      accessedAt: timestamp,
    }

    await this.storage.put(`${WorkersService.PREFIX}${worker.$id}`, fullWorker)
    return fullWorker
  }

  /**
   * Update the accessed timestamp for a worker.
   *
   * Call this when a worker is accessed to keep the "last accessed"
   * timestamp current for sorting purposes.
   *
   * @param workerId - The worker ID to update
   *
   * @example
   * ```typescript
   * await stub.workers.updateAccessed('my-api')
   * ```
   */
  async updateAccessed(workerId: string): Promise<void> {
    const worker = await this.storage.get<Worker>(
      `${WorkersService.PREFIX}${workerId}`
    )
    if (worker) {
      await this.storage.put(`${WorkersService.PREFIX}${workerId}`, {
        ...worker,
        accessedAt: now(),
      })
    }
  }

  /**
   * Update the deployed timestamp for a worker.
   *
   * Call this when a worker is deployed to mark the deployment time.
   * This also updates the accessedAt timestamp.
   *
   * @param workerId - The worker ID to update
   *
   * @example
   * ```typescript
   * await stub.workers.updateDeployed('my-api')
   * ```
   */
  async updateDeployed(workerId: string): Promise<void> {
    const worker = await this.storage.get<Worker>(
      `${WorkersService.PREFIX}${workerId}`
    )
    if (worker) {
      const timestamp = now()
      await this.storage.put(`${WorkersService.PREFIX}${workerId}`, {
        ...worker,
        deployedAt: timestamp,
        accessedAt: timestamp,
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
   * Create a new deployment.
   *
   * Creates a deployment record and a secondary index for name lookup.
   * Both workerId and name must be unique within the user's namespace.
   *
   * Storage writes (atomic batch):
   * - `deployment:{workerId}` -> Deployment
   * - `name:{name}` -> workerId
   *
   * @param options - Deployment creation options
   * @returns The created deployment with createdAt timestamp
   * @throws Error if workerId or name already exists
   *
   * @example
   * ```typescript
   * const deployment = await stub.deployments.create({
   *   workerId: 'worker-123',
   *   name: 'my-api',
   *   code: 'export default { fetch() { return new Response("ok") } }',
   *   url: 'https://my-api.workers.do'
   * })
   * ```
   */
  async create(options: CreateDeploymentOptions): Promise<Deployment> {
    const { workerId, name, code, url } = options

    // Check both constraints in parallel for efficiency
    const [existingById, existingWorkerId] = await Promise.all([
      this.storage.get<Deployment>(
        `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
      ),
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
      createdAt: now(),
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
   * Get a deployment by its workerId.
   *
   * Time complexity: O(1)
   *
   * @param workerId - The deployment ID to look up
   * @returns The deployment if found, null otherwise
   *
   * @example
   * ```typescript
   * const deployment = await stub.deployments.get('worker-123')
   * if (deployment) {
   *   console.log(`Deployment: ${deployment.name}`)
   * }
   * ```
   */
  async get(workerId: string): Promise<Deployment | null> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    return deployment || null
  }

  /**
   * Get a deployment by its name using secondary index.
   *
   * Time complexity: O(1) - two lookups
   * Flow: name:{name} -> workerId -> deployment:{workerId} -> Deployment
   *
   * @param name - The deployment name to look up
   * @returns The deployment if found, null otherwise
   *
   * @example
   * ```typescript
   * const deployment = await stub.deployments.getByName('my-api')
   * if (deployment) {
   *   console.log(`Worker ID: ${deployment.workerId}`)
   * }
   * ```
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
   * Get multiple deployments by workerIds in a single batch.
   *
   * Time complexity: O(n) where n = workerIds.length
   *
   * @param workerIds - Array of worker IDs to fetch
   * @returns Record of workerId -> Deployment (only includes found deployments)
   *
   * @example
   * ```typescript
   * const deployments = await stub.deployments.getMany(['worker-1', 'worker-2'])
   * for (const [id, deployment] of Object.entries(deployments)) {
   *   console.log(`${id}: ${deployment.name}`)
   * }
   * ```
   */
  async getMany(workerIds: string[]): Promise<Record<string, Deployment>> {
    if (workerIds.length === 0) {
      return {}
    }

    const keys = workerIds.map(
      (id) => `${DeploymentsService.PREFIX_DEPLOYMENT}${id}`
    )
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
   * List deployments with cursor-based pagination.
   *
   * Pagination strategy:
   * - Uses storage.list() with prefix and limit
   * - Fetches limit+1 to determine hasMore without extra query
   * - Cursor is the full storage key for startAfter
   * - Results are ordered by storage key (lexicographic by workerId)
   *
   * @param options - List options with limit and cursor
   * @returns Paginated list of deployments with cursor and hasMore flag
   *
   * @example
   * ```typescript
   * // Fetch first page
   * const page1 = await stub.deployments.list({ limit: 10 })
   *
   * // Fetch next page if available
   * if (page1.hasMore) {
   *   const page2 = await stub.deployments.list({
   *     limit: 10,
   *     cursor: page1.cursor
   *   })
   * }
   * ```
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
      if (deployments.length > 0) {
        lastKey = `${DeploymentsService.PREFIX_DEPLOYMENT}${deployments[deployments.length - 1].workerId}`
      }
    }

    return {
      deployments,
      cursor: hasMore ? lastKey : undefined,
      hasMore,
    }
  }

  /**
   * Delete a deployment by workerId.
   *
   * Removes both primary record and secondary index atomically.
   *
   * Storage deletes:
   * - `deployment:{workerId}`
   * - `name:{name}`
   *
   * @param workerId - The deployment ID to delete
   * @returns true if the deployment existed and was deleted, false otherwise
   *
   * @example
   * ```typescript
   * const deleted = await stub.deployments.delete('worker-123')
   * if (deleted) {
   *   console.log('Deployment removed')
   * }
   * ```
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
   * Delete multiple deployments by workerIds.
   *
   * Removes both primary records and secondary indexes atomically.
   *
   * @param workerIds - Array of worker IDs to delete
   * @returns Number of deployments actually deleted
   *
   * @example
   * ```typescript
   * const count = await stub.deployments.deleteMany(['worker-1', 'worker-2'])
   * console.log(`Deleted ${count} deployments`)
   * ```
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
   * Update a deployment's url and/or code.
   *
   * Updates the specified fields and sets the updatedAt timestamp.
   * Note: name cannot be updated (would require index migration).
   *
   * @param workerId - The deployment ID to update
   * @param options - Update options (url and/or code)
   * @returns The updated deployment, or null if not found
   *
   * @example
   * ```typescript
   * const updated = await stub.deployments.update('worker-123', {
   *   code: 'export default { fetch() { return new Response("v2") } }'
   * })
   * if (updated) {
   *   console.log(`Updated at: ${updated.updatedAt}`)
   * }
   * ```
   */
  async update(
    workerId: string,
    options: UpdateDeploymentOptions
  ): Promise<Deployment | null> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    if (!deployment) {
      return null
    }

    const updated: Deployment = {
      ...deployment,
      updatedAt: now(),
    }

    if (options.url !== undefined) {
      updated.url = options.url
    }
    if (options.code !== undefined) {
      updated.code = options.code
    }

    await this.storage.put(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`,
      updated
    )
    return updated
  }

  /**
   * Check if a deployment exists by workerId.
   *
   * More efficient than get() when you don't need the full deployment.
   *
   * @param workerId - The deployment ID to check
   * @returns true if the deployment exists
   *
   * @example
   * ```typescript
   * if (await stub.deployments.exists('worker-123')) {
   *   console.log('Deployment exists')
   * }
   * ```
   */
  async exists(workerId: string): Promise<boolean> {
    const deployment = await this.storage.get<Deployment>(
      `${DeploymentsService.PREFIX_DEPLOYMENT}${workerId}`
    )
    return deployment !== undefined
  }

  /**
   * Check if a name is available (not taken by another deployment).
   *
   * @param name - The name to check
   * @returns true if the name is available for use
   *
   * @example
   * ```typescript
   * if (await stub.deployments.isNameAvailable('my-api')) {
   *   // Safe to create deployment with this name
   * }
   * ```
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const workerId = await this.storage.get<string>(
      `${DeploymentsService.PREFIX_NAME}${name}`
    )
    return workerId === undefined
  }

  /**
   * Count total number of deployments.
   *
   * Note: This scans all deployment keys - use sparingly for large stores.
   *
   * @returns Total number of deployments
   *
   * @example
   * ```typescript
   * const total = await stub.deployments.count()
   * console.log(`${total} deployments`)
   * ```
   */
  async count(): Promise<number> {
    const map = await this.storage.list({
      prefix: DeploymentsService.PREFIX_DEPLOYMENT,
    })
    return map.size
  }
}

// ============================================================================
// RPC Types
// ============================================================================

/**
 * JSON-RPC 2.0 request message format
 * @see https://www.jsonrpc.org/specification
 */
interface RpcMessage {
  /** Method name in "service.method" format (e.g., "workers.list") */
  method: string
  /** Array of parameters to pass to the method */
  params?: unknown[]
  /** Request identifier for correlating responses */
  id?: string | number
}

/**
 * JSON-RPC 2.0 response message format
 */
interface RpcResponse {
  /** Result of the method call (mutually exclusive with error) */
  result?: unknown
  /** Error object if the call failed (mutually exclusive with result) */
  error?: { code: number; message: string }
  /** Request identifier matching the request */
  id?: string | number
}

// ============================================================================
// Main Durable Object
// ============================================================================

/**
 * WorkersRegistryDO - Main Durable Object class
 *
 * This Durable Object manages worker registry data and deployments for a user.
 * Each user gets their own DO instance, providing complete isolation.
 *
 * ## Access Methods
 *
 * The DO can be accessed via:
 *
 * 1. **Cloudflare RPC** (for DO-to-DO calls):
 * ```typescript
 * const stub = env.WORKERS_REGISTRY.get(id)
 * const workers = await stub.workers.list()
 * const deployments = await stub.deployments.list()
 * ```
 *
 * 2. **JSON-RPC over HTTP** (for CLI/external clients):
 * ```typescript
 * const response = await stub.fetch('/', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     method: 'workers.list',
 *     params: [{ limit: 10 }],
 *     id: 1
 *   })
 * })
 * ```
 *
 * 3. **REST API** (for simple read operations):
 * ```typescript
 * const response = await stub.fetch('/workers')
 * const response = await stub.fetch('/workers/my-api')
 * ```
 *
 * ## Services
 *
 * - `workers` - Registry metadata (WorkersService)
 * - `deployments` - Deployed code artifacts (DeploymentsService)
 */
export class WorkersRegistryDO extends DurableObject<Record<string, unknown>> {
  /**
   * Workers service for managing registry metadata.
   * Exposed via RPC as `stub.workers.*`
   */
  readonly workers: WorkersService

  /**
   * Deployments service for managing deployed code artifacts.
   * Exposed via RPC as `stub.deployments.*`
   */
  readonly deployments: DeploymentsService

  /**
   * Create a new WorkersRegistryDO instance
   * @param state - The DO state provided by the Cloudflare runtime
   * @param env - Environment bindings
   */
  constructor(state: DurableObjectState, env: Record<string, unknown>) {
    super(state, env)
    this.workers = new WorkersService(state.storage)
    this.deployments = new DeploymentsService(state.storage)
  }

  /**
   * Handle HTTP requests to the DO.
   *
   * Supports three request types:
   * - POST to root: JSON-RPC protocol (single or batch)
   * - GET /workers or /list: List all workers
   * - GET /workers/:id or /get/:id: Get single worker
   *
   * @param request - The incoming HTTP request
   * @returns HTTP response with JSON body
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle JSON-RPC (POST to root)
    if (
      request.method === 'POST' &&
      (url.pathname === '/' || url.pathname === '')
    ) {
      return this.handleRpc(request)
    }

    // REST API endpoints
    return this.handleRest(url)
  }

  /**
   * Handle REST API requests
   * @param url - The parsed request URL
   * @returns HTTP response
   */
  private async handleRest(url: URL): Promise<Response> {
    // GET /workers or /list
    if (url.pathname === '/list' || url.pathname === '/workers') {
      const sortBy =
        (url.searchParams.get('sortBy') as 'created' | 'deployed' | 'accessed') ||
        'accessed'
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const workers = await this.workers.list({ sortBy, limit })
      return jsonResponse(workers)
    }

    // GET /workers/:id or /get/:id
    if (
      url.pathname.startsWith('/get/') ||
      url.pathname.startsWith('/workers/')
    ) {
      const workerId = url.pathname.split('/').pop() || ''
      const worker = await this.workers.get(workerId)
      if (!worker) {
        return jsonResponse({ error: 'not_found' }, 404)
      }
      return jsonResponse(worker)
    }

    // 404 for unknown endpoints
    return jsonResponse({ error: 'not_found', path: url.pathname }, 404)
  }

  /**
   * Handle JSON-RPC requests.
   *
   * Supports both single requests and batch requests (array of requests).
   * Format: { "method": "service.method", "params": [...], "id": 1 }
   *
   * @param request - The incoming POST request with JSON body
   * @returns JSON-RPC response
   */
  private async handleRpc(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as RpcMessage | RpcMessage[]

      // Handle batch requests
      if (Array.isArray(body)) {
        const results = await Promise.all(body.map((msg) => this.executeRpc(msg)))
        return jsonResponse(results)
      }

      // Single request
      const result = await this.executeRpc(body)
      return jsonResponse(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return jsonResponse(
        {
          error: {
            code: RpcErrorCode.PARSE_ERROR,
            message: `Parse error: ${errorMessage}`,
          },
        },
        400
      )
    }
  }

  /**
   * Execute a single RPC call
   * @param msg - The RPC message to execute
   * @returns RPC response with result or error
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
        error: {
          code: RpcErrorCode.METHOD_NOT_FOUND,
          message: `Unknown service: ${service}`,
        },
        id,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: { code: RpcErrorCode.INTERNAL_ERROR, message: errorMessage },
        id,
      }
    }
  }

  /**
   * Route method calls to the workers service
   * @param method - The method name to call
   * @param params - Array of parameters
   * @returns Method result
   * @throws Error for unknown methods
   */
  private async callWorkersMethod(
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case 'list':
        return this.workers.list((params[0] as ListOptions) || {})

      case 'get':
        return this.workers.get(params[0] as string)

      case 'link':
        return this.workers.link(params[0] as string, params[1] as LinkOptions)

      case 'register':
        return this.workers.register(params[0] as Omit<Worker, 'createdAt'>)

      case 'updateAccessed':
        return this.workers.updateAccessed(params[0] as string)

      case 'updateDeployed':
        return this.workers.updateDeployed(params[0] as string)

      default:
        throw new Error(`Unknown method: workers.${method}`)
    }
  }

  /**
   * Route method calls to the deployments service
   * @param method - The method name to call
   * @param params - Array of parameters
   * @returns Method result
   * @throws Error for unknown methods
   */
  private async callDeploymentsMethod(
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    switch (method) {
      case 'create':
        return this.deployments.create(params[0] as CreateDeploymentOptions)

      case 'get':
        return this.deployments.get(params[0] as string)

      case 'getMany':
        return this.deployments.getMany(params[0] as string[])

      case 'getByName':
        return this.deployments.getByName(params[0] as string)

      case 'list':
        return this.deployments.list((params[0] as ListDeploymentsOptions) || {})

      case 'delete':
        return this.deployments.delete(params[0] as string)

      case 'deleteMany':
        return this.deployments.deleteMany(params[0] as string[])

      case 'update':
        return this.deployments.update(
          params[0] as string,
          params[1] as UpdateDeploymentOptions
        )

      case 'exists':
        return this.deployments.exists(params[0] as string)

      case 'isNameAvailable':
        return this.deployments.isNameAvailable(params[0] as string)

      case 'count':
        return this.deployments.count()

      default:
        throw new Error(`Unknown method: deployments.${method}`)
    }
  }
}
