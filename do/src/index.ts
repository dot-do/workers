import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { executeCode } from './executor'
import { DOService, createServiceContext, extractAuthContext } from './services'
import { getTierSummary } from './authorization'
import type { Env, ExecuteCodeRequest, ServiceContext } from './types'

/**
 * DO Worker - Unified Service Entry Point
 *
 * Provides:
 * 1. Unified RPC interface for all services
 * 2. Code execution with Dynamic Worker Loader
 * 3. Automatic authentication context passing
 * 4. Single binding point for all services
 */
export class DO extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const app = new Hono<{ Bindings: Env; Variables: { serviceContext: ServiceContext; doService: DOService } }>()

    // CORS for browser clients
    app.use('*', cors())

    // Auth middleware - extract context and create DO service
    app.use('*', async (c, next) => {
      const auth = await extractAuthContext(c.req.raw, c.env)
      const context = createServiceContext(c.req.raw, auth)
      const doService = new DOService(c.env, context)

      c.set('serviceContext', context)
      c.set('doService', doService)

      await next()
    })

    // Health check
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        service: 'do',
        version: '1.0.0',
        features: [
          'unified-services',
          'context-passing',
          'worker-loader',
          'v8-isolates'
        ],
        services: [
          'db', 'auth', 'gateway', 'schedule',
          'webhooks', 'email', 'mcp', 'queue'
        ]
      })
    })

    // Service info
    app.get('/', (c) => {
      const context = c.get('serviceContext')
      return c.json({
        name: 'do',
        version: '1.0.0',
        description: 'Unified service entry point with context passing',
        authenticated: context.auth.authenticated,
        user: context.auth.user?.email || 'anonymous',
        services: {
          db: 'Database operations',
          auth: 'Authentication and authorization',
          email: 'Transactional emails',
          queue: 'Message queues',
          schedule: 'Scheduled tasks',
          webhooks: 'External webhooks',
          mcp: 'Model Context Protocol',
          gateway: 'API gateway'
        },
        endpoints: {
          execute: 'POST /execute - Execute code',
          rpc: 'POST /rpc/:service/:method - Call service method',
          health: 'GET /health'
        }
      })
    })

    /**
     * Execute code endpoint (with authorization)
     */
    app.post('/execute', async (c) => {
      try {
        const body = await c.req.json<ExecuteCodeRequest>()
        const context = c.get('serviceContext')

        if (!body.code || typeof body.code !== 'string') {
          return c.json({
            success: false,
            error: {
              message: 'Invalid request: code field is required'
            }
          }, 400)
        }

        // Execute with authorization context
        const result = await executeCode(body, c.env, context, this.ctx)
        return c.json(result, result.success ? 200 : 500)
      } catch (error) {
        return c.json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }, 500)
      }
    })

    /**
     * Eval endpoint - completely sandboxed execution
     * No context, no env, no outbound fetch
     * Pure code evaluation only
     */
    app.post('/eval', async (c) => {
      try {
        const body = await c.req.json<ExecuteCodeRequest>()

        if (!body.code || typeof body.code !== 'string') {
          return c.json({
            success: false,
            error: {
              message: 'Invalid request: code field is required'
            }
          }, 400)
        }

        // Import sandboxed executor
        const { executeSandboxedCode } = await import('./executor')

        // Execute without any context or bindings
        const result = await executeSandboxedCode(body, c.env, this.ctx)
        return c.json(result, result.success ? 200 : 500)
      } catch (error) {
        return c.json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }, 500)
      }
    })

    /**
     * Authorization info endpoint
     * Returns user's tier, namespace, and permissions
     */
    app.get('/auth', (c) => {
      const context = c.get('serviceContext')
      const summary = getTierSummary(context)

      return c.json({
        authenticated: context.auth.authenticated,
        user: context.auth.user?.email || 'anonymous',
        ...summary
      })
    })

    /**
     * RPC endpoint - unified service calls
     *
     * POST /rpc/:service/:method
     * {
     *   "params": { ... }
     * }
     */
    app.post('/rpc/:service/:method', async (c) => {
      const service = c.req.param('service')
      const method = c.req.param('method')
      const doService = c.get('doService')

      try {
        const body = await c.req.json()
        const params = body.params || {}

        // Call the method on DOService
        const methodName = `${service}_${method}` as keyof DOService
        const serviceFn = doService[methodName]

        if (typeof serviceFn !== 'function') {
          return c.json({
            success: false,
            error: {
              message: `Method ${service}.${method} not found`
            }
          }, 404)
        }

        // Call with spread params if array, otherwise pass as single arg
        const result = Array.isArray(params)
          ? await (serviceFn as any).apply(doService, params)
          : await (serviceFn as any).call(doService, params)

        return c.json({
          success: true,
          result
        })
      } catch (error) {
        return c.json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        }, 500)
      }
    })

    return app.fetch(request, this.env)
  }

  // ========== RPC Methods - Direct access ==========
  // These can be called directly via service bindings

  async db_query(sql: string, params?: any[], context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_query(sql, params)
  }

  async db_get(ns: string, id: string, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_get(ns, id)
  }

  async db_list(ns: string, options?: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_list(ns, options)
  }

  async db_upsert(ns: string, id: string, data: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_upsert(ns, id, data)
  }

  async db_delete(ns: string, id: string, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_delete(ns, id)
  }

  async db_search(ns: string, query: string, options?: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.db_search(ns, query, options)
  }

  async email_send(to: string, subject: string, body: string, options?: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.email_send(to, subject, body, options)
  }

  async email_sendTemplate(to: string, template: string, data: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.email_sendTemplate(to, template, data)
  }

  async queue_send(queue: string, message: any, options?: any, context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.queue_send(queue, message, options)
  }

  async queue_batch(queue: string, messages: any[], context?: ServiceContext) {
    const doService = this.getService(context)
    return doService.queue_batch(queue, messages)
  }

  async execute(request: ExecuteCodeRequest, context?: ServiceContext): Promise<any> {
    return await executeCode(request, this.env, context, this.ctx)
  }

  // ========== Private Helper ==========

  private getService(context?: ServiceContext): DOService {
    // If context provided, use it; otherwise create anonymous context
    const ctx = context || {
      auth: { authenticated: false },
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      metadata: {}
    }

    return new DOService(this.env, ctx)
  }
}

export default DO
