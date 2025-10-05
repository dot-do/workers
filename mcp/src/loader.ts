/**
 * Dynamic Worker Loader
 * Manages worker lifecycle, hot-reload, and registry operations
 */

import type { Env } from './types'

export interface WorkerConfig {
  id: string
  userId: string
  organizationId?: string
  name: string
  description?: string
  mainModule: string
  modules: Record<string, string>
  env?: Record<string, string>
  bindings?: Record<string, any>
  status: 'active' | 'paused' | 'error'
  version: number
  createdAt: string
  updatedAt: string
  lastLoadedAt?: string
}

export interface WorkerVersion {
  id: string
  workerId: string
  version: number
  mainModule: string
  modules: Record<string, string>
  env?: Record<string, string>
  bindings?: Record<string, any>
  createdAt: string
  createdBy: string
  description?: string
}

export interface ExecutionLog {
  id: string
  workerId: string
  userId: string
  method: string
  path?: string
  statusCode?: number
  executionTime?: number
  memoryUsed?: number
  cpuTime?: number
  error?: string
  createdAt: string
}

export interface ReloadLog {
  id: string
  workerId: string
  oldVersion?: number
  newVersion: number
  reloadType: 'hot' | 'cold' | 'forced'
  success: boolean
  error?: string
  executionTime?: number
  createdAt: string
}

/**
 * Worker Registry - Database Operations
 */
export class WorkerRegistry {
  constructor(private env: Env) {}

  /**
   * Get worker configuration from database
   */
  async getWorker(workerId: string): Promise<WorkerConfig | null> {
    const result = await this.env.WORKER_REGISTRY_DB
      .prepare('SELECT * FROM worker_configs WHERE id = ?')
      .bind(workerId)
      .first<any>()

    if (!result) return null

    return {
      ...result,
      modules: JSON.parse(result.modules),
      env: result.env ? JSON.parse(result.env) : undefined,
      bindings: result.bindings ? JSON.parse(result.bindings) : undefined,
    }
  }

  /**
   * Save or update worker configuration
   */
  async saveWorker(config: WorkerConfig): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare(
        `INSERT INTO worker_configs (id, userId, organizationId, name, description, mainModule, modules, env, bindings, status, version, createdAt, updatedAt, lastLoadedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           mainModule = excluded.mainModule,
           modules = excluded.modules,
           env = excluded.env,
           bindings = excluded.bindings,
           status = excluded.status,
           version = excluded.version,
           updatedAt = excluded.updatedAt,
           lastLoadedAt = excluded.lastLoadedAt`
      )
      .bind(
        config.id,
        config.userId,
        config.organizationId || null,
        config.name,
        config.description || null,
        config.mainModule,
        JSON.stringify(config.modules),
        config.env ? JSON.stringify(config.env) : null,
        config.bindings ? JSON.stringify(config.bindings) : null,
        config.status,
        config.version,
        config.createdAt,
        config.updatedAt,
        config.lastLoadedAt || null
      )
      .run()
  }

  /**
   * List workers for a user
   */
  async listUserWorkers(userId: string, limit = 50, offset = 0): Promise<WorkerConfig[]> {
    const result = await this.env.WORKER_REGISTRY_DB
      .prepare('SELECT * FROM worker_configs WHERE userId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?')
      .bind(userId, limit, offset)
      .all<any>()

    return (result.results || []).map((row) => ({
      ...row,
      modules: JSON.parse(row.modules),
      env: row.env ? JSON.parse(row.env) : undefined,
      bindings: row.bindings ? JSON.parse(row.bindings) : undefined,
    }))
  }

  /**
   * Delete worker configuration
   */
  async deleteWorker(workerId: string): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare('DELETE FROM worker_configs WHERE id = ?')
      .bind(workerId)
      .run()
  }

  /**
   * Update worker status
   */
  async updateWorkerStatus(workerId: string, status: 'active' | 'paused' | 'error', error?: string): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare('UPDATE worker_configs SET status = ?, updatedAt = ? WHERE id = ?')
      .bind(status, new Date().toISOString(), workerId)
      .run()

    if (error) {
      // Log error in execution_logs
      await this.logExecution({
        id: crypto.randomUUID(),
        workerId,
        userId: '', // Will be filled by caller
        method: 'status_update',
        error,
        createdAt: new Date().toISOString(),
      })
    }
  }

  /**
   * Save worker version for rollback
   */
  async saveWorkerVersion(version: WorkerVersion): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare(
        `INSERT INTO worker_versions (id, workerId, version, mainModule, modules, env, bindings, createdAt, createdBy, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        version.id,
        version.workerId,
        version.version,
        version.mainModule,
        JSON.stringify(version.modules),
        version.env ? JSON.stringify(version.env) : null,
        version.bindings ? JSON.stringify(version.bindings) : null,
        version.createdAt,
        version.createdBy,
        version.description || null
      )
      .run()
  }

  /**
   * Get worker version history
   */
  async getWorkerVersions(workerId: string, limit = 10): Promise<WorkerVersion[]> {
    const result = await this.env.WORKER_REGISTRY_DB
      .prepare('SELECT * FROM worker_versions WHERE workerId = ? ORDER BY version DESC LIMIT ?')
      .bind(workerId, limit)
      .all<any>()

    return (result.results || []).map((row) => ({
      ...row,
      modules: JSON.parse(row.modules),
      env: row.env ? JSON.parse(row.env) : undefined,
      bindings: row.bindings ? JSON.parse(row.bindings) : undefined,
    }))
  }

  /**
   * Rollback to specific version
   */
  async rollbackWorker(workerId: string, targetVersion: number, userId: string): Promise<WorkerConfig> {
    const version = await this.env.WORKER_REGISTRY_DB
      .prepare('SELECT * FROM worker_versions WHERE workerId = ? AND version = ?')
      .bind(workerId, targetVersion)
      .first<any>()

    if (!version) {
      throw new Error(`Version ${targetVersion} not found for worker ${workerId}`)
    }

    const config = await this.getWorker(workerId)
    if (!config) {
      throw new Error(`Worker ${workerId} not found`)
    }

    // Create new version with rollback data
    const newVersion = config.version + 1
    await this.saveWorkerVersion({
      id: crypto.randomUUID(),
      workerId,
      version: newVersion,
      mainModule: version.mainModule,
      modules: JSON.parse(version.modules),
      env: version.env ? JSON.parse(version.env) : undefined,
      bindings: version.bindings ? JSON.parse(version.bindings) : undefined,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      description: `Rollback to version ${targetVersion}`,
    })

    // Update worker config
    config.mainModule = version.mainModule
    config.modules = JSON.parse(version.modules)
    config.env = version.env ? JSON.parse(version.env) : undefined
    config.bindings = version.bindings ? JSON.parse(version.bindings) : undefined
    config.version = newVersion
    config.updatedAt = new Date().toISOString()

    await this.saveWorker(config)
    return config
  }

  /**
   * Log worker execution
   */
  async logExecution(log: ExecutionLog): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare(
        `INSERT INTO execution_logs (id, workerId, userId, method, path, statusCode, executionTime, memoryUsed, cpuTime, error, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.id,
        log.workerId,
        log.userId,
        log.method,
        log.path || null,
        log.statusCode || null,
        log.executionTime || null,
        log.memoryUsed || null,
        log.cpuTime || null,
        log.error || null,
        log.createdAt
      )
      .run()
  }

  /**
   * Log worker reload
   */
  async logReload(log: ReloadLog): Promise<void> {
    await this.env.WORKER_REGISTRY_DB
      .prepare(
        `INSERT INTO worker_reload_log (id, workerId, oldVersion, newVersion, reloadType, success, error, executionTime, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.id,
        log.workerId,
        log.oldVersion || null,
        log.newVersion,
        log.reloadType,
        log.success ? 1 : 0,
        log.error || null,
        log.executionTime || null,
        log.createdAt
      )
      .run()
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(workerId: string, hours = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const result = await this.env.WORKER_REGISTRY_DB
      .prepare(
        `SELECT
          COUNT(*) as totalRequests,
          SUM(CASE WHEN error IS NULL THEN 1 ELSE 0 END) as successfulRequests,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as failedRequests,
          AVG(executionTime) as avgExecutionTime,
          MAX(executionTime) as maxExecutionTime,
          MIN(executionTime) as minExecutionTime
         FROM execution_logs
         WHERE workerId = ? AND createdAt >= ?`
      )
      .bind(workerId, since)
      .first()

    return result || {}
  }
}

/**
 * Dynamic Worker Loader
 * NOTE: Uses Cloudflare's WorkerLoader (private beta or future API)
 * Currently implemented as a proof-of-concept for the interface
 */
export class DynamicWorkerLoader {
  private registry: WorkerRegistry
  private workerCache = new Map<string, { worker: any; config: WorkerConfig; loadedAt: number }>()

  constructor(private env: Env) {
    this.registry = new WorkerRegistry(env)
  }

  /**
   * Load worker instance
   * Implements hot-reload if worker code has changed
   */
  async loadWorker(workerId: string, userId?: string): Promise<any> {
    const config = await this.registry.getWorker(workerId)
    if (!config) {
      throw new Error(`Worker ${workerId} not found`)
    }

    if (config.status !== 'active') {
      throw new Error(`Worker ${workerId} is not active (status: ${config.status})`)
    }

    // Check cache for hot-reload
    const cached = this.workerCache.get(workerId)
    if (cached) {
      // Check if worker code has changed
      if (cached.config.version === config.version) {
        console.log(`[Loader] Using cached worker ${workerId} (version ${config.version})`)
        return cached.worker
      }

      // Hot reload needed
      console.log(`[Loader] Hot-reloading worker ${workerId} (version ${cached.config.version} → ${config.version})`)
      const reloadStart = Date.now()

      try {
        const worker = await this.createWorkerInstance(config)
        this.workerCache.set(workerId, { worker, config, loadedAt: Date.now() })

        // Log successful reload
        await this.registry.logReload({
          id: crypto.randomUUID(),
          workerId,
          oldVersion: cached.config.version,
          newVersion: config.version,
          reloadType: 'hot',
          success: true,
          executionTime: Date.now() - reloadStart,
          createdAt: new Date().toISOString(),
        })

        return worker
      } catch (error) {
        // Log failed reload
        await this.registry.logReload({
          id: crypto.randomUUID(),
          workerId,
          oldVersion: cached.config.version,
          newVersion: config.version,
          reloadType: 'hot',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - reloadStart,
          createdAt: new Date().toISOString(),
        })

        // Fall back to cached version on error
        console.error(`[Loader] Hot-reload failed for worker ${workerId}, using cached version`)
        return cached.worker
      }
    }

    // Cold load
    console.log(`[Loader] Cold-loading worker ${workerId} (version ${config.version})`)
    const loadStart = Date.now()

    try {
      const worker = await this.createWorkerInstance(config)
      this.workerCache.set(workerId, { worker, config, loadedAt: Date.now() })

      // Update lastLoadedAt
      config.lastLoadedAt = new Date().toISOString()
      await this.registry.saveWorker(config)

      // Log successful load
      await this.registry.logReload({
        id: crypto.randomUUID(),
        workerId,
        newVersion: config.version,
        reloadType: 'cold',
        success: true,
        executionTime: Date.now() - loadStart,
        createdAt: new Date().toISOString(),
      })

      return worker
    } catch (error) {
      // Update status to error
      await this.registry.updateWorkerStatus(workerId, 'error', error instanceof Error ? error.message : 'Load failed')

      // Log failed load
      await this.registry.logReload({
        id: crypto.randomUUID(),
        workerId,
        newVersion: config.version,
        reloadType: 'cold',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - loadStart,
        createdAt: new Date().toISOString(),
      })

      throw error
    }
  }

  /**
   * Create worker instance
   * NOTE: This is a proof-of-concept. In production, this would use Cloudflare's WorkerLoader API
   */
  private async createWorkerInstance(config: WorkerConfig): Promise<any> {
    // In a real implementation, this would use:
    // const worker = await this.env.WORKER_LOADER.create({
    //   mainModule: config.mainModule,
    //   modules: config.modules,
    //   env: { ...config.env, ...config.bindings }
    // })

    // For now, return a mock worker that evaluates the code
    return {
      async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        try {
          // Evaluate the main module
          const mainCode = config.modules[config.mainModule]
          if (!mainCode) {
            throw new Error(`Main module ${config.mainModule} not found`)
          }

          // Create a sandboxed environment
          const workerEnv = {
            ...config.env,
            ...config.bindings,
            // Pass through service bindings from parent
            DB: env.DB,
            AI: env.AI,
            AUTH: env.AUTH,
            QUEUE: env.QUEUE,
          }

          // Simple evaluation (in production, would use proper module loader)
          const fn = new Function('request', 'env', 'ctx', `
            ${mainCode}
            return (typeof fetch === 'function') ? fetch(request, env, ctx) :
                   (typeof default !== 'undefined' && default.fetch) ? default.fetch(request, env, ctx) :
                   new Response('No fetch handler found', { status: 500 })
          `)

          const response = await fn(request, workerEnv, ctx)
          return response
        } catch (error) {
          console.error('[Worker] Execution error:', error)
          return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    }
  }

  /**
   * Unload worker from cache
   */
  async unloadWorker(workerId: string): Promise<void> {
    this.workerCache.delete(workerId)
    console.log(`[Loader] Unloaded worker ${workerId} from cache`)
  }

  /**
   * Force reload worker
   */
  async forceReload(workerId: string): Promise<any> {
    await this.unloadWorker(workerId)
    return await this.loadWorker(workerId)
  }

  /**
   * Clear all cached workers
   */
  clearCache(): void {
    this.workerCache.clear()
    console.log('[Loader] Cleared worker cache')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; workers: { id: string; version: number; loadedAt: number }[] } {
    return {
      size: this.workerCache.size,
      workers: Array.from(this.workerCache.entries()).map(([id, { config, loadedAt }]) => ({
        id,
        version: config.version,
        loadedAt,
      })),
    }
  }
}

/**
 * Default worker template
 */
export const DEFAULT_WORKER_TEMPLATE = `
// Dynamic Worker Template
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Handle health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', worker: 'dynamic' })
    }

    // Handle execute endpoint
    if (url.pathname === '/execute' && request.method === 'POST') {
      try {
        const { code } = await request.json()
        const logs = []

        // Sandboxed console
        const console = {
          log: (...args) => logs.push({ level: 'log', args }),
          error: (...args) => logs.push({ level: 'error', args }),
          warn: (...args) => logs.push({ level: 'warn', args }),
        }

        // Execute user code
        const start = Date.now()
        const fn = new Function('env', 'console', code)
        const result = await fn(env, console)
        const executionTime = Date.now() - start

        return Response.json({
          result,
          logs,
          executionTime,
        })
      } catch (error) {
        return Response.json({
          error: {
            message: error.message,
            stack: error.stack,
          },
        }, { status: 500 })
      }
    }

    return Response.json({
      message: 'Dynamic Worker',
      endpoints: ['/health', '/execute']
    })
  }
}
`
