import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { executeCode } from './executor'
import type { Env, ExecuteCodeRequest } from './types'

/**
 * DO Worker - Code Execution Service
 *
 * Executes TypeScript code in secure V8 isolates using Dynamic Worker Loader
 * Provides code execution API for cli.do and mcp.do
 */
export class CodeExecutionService extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>()

    // CORS for browser clients
    app.use('*', cors())

    // Health check
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        service: 'code-execution',
        version: '1.0.0',
        features: ['worker-loader', 'v8-isolates', 'console-capture', 'request-logging']
      })
    })

    // Service info
    app.get('/', (c) => {
      return c.json({
        name: 'do-code-execution',
        version: '1.0.0',
        description: 'Code execution service using Dynamic Worker Loader',
        features: {
          worker_loader: true,
          v8_isolates: true,
          console_capture: true,
          request_logging: true,
          caching: true,
          bindings: ['db', 'ai', 'mcp']
        },
        endpoints: {
          execute: 'POST /execute',
          health: 'GET /health'
        }
      })
    })

    /**
     * Execute code endpoint
     *
     * POST /execute
     * {
     *   "code": "console.log('Hello World'); return 42;",
     *   "bindings": ["db", "ai"],
     *   "timeout": 5000,
     *   "cacheKey": "optional-cache-key",
     *   "captureConsole": true,
     *   "captureFetch": true
     * }
     */
    app.post('/execute', async (c) => {
      try {
        const body = await c.req.json<ExecuteCodeRequest>()

        // Validate request
        if (!body.code || typeof body.code !== 'string') {
          return c.json({
            success: false,
            error: {
              message: 'Invalid request: code field is required'
            }
          }, 400)
        }

        // Execute code
        const result = await executeCode(body, c.env)

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
     * RPC method for direct service-to-service calls
     */
    async execute(request: ExecuteCodeRequest): Promise<any> {
      return await executeCode(request, this.env)
    }

    return app.fetch(request, this.env)
  }
}

export default CodeExecutionService
