/**
 * Code execution logic using Dynamic Worker Loader
 */

import type { Env, ExecuteCodeRequest, ExecuteCodeResponse, WorkerCode, RequestLog, ServiceContext } from './types'
import { authorizeCodeExecution, getCodePermissions, checkRateLimit } from './authorization'

/**
 * Execute TypeScript code in a secure V8 isolate
 */
export async function executeCode(
  request: ExecuteCodeRequest,
  env: Env,
  context?: ServiceContext
): Promise<ExecuteCodeResponse> {
  const startTime = Date.now()
  const logs: string[] = []
  const requests: RequestLog[] = []

  try {
    // Check if Worker Loader is available
    if (!env.LOADER) {
      return {
        success: false,
        error: {
          message: 'Worker Loader not available. This feature requires Cloudflare Workers with dynamic code execution enabled.'
        },
        logs,
        executionTime: Date.now() - startTime
      }
    }

    // ========== AUTHORIZATION ==========
    // If context provided, check authorization
    if (context) {
      // Check rate limit
      const rateLimitResult = checkRateLimit(context)
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: {
            message: rateLimitResult.error || 'Rate limit exceeded'
          },
          logs,
          executionTime: Date.now() - startTime
        }
      }

      // Check code execution authorization
      const authResult = authorizeCodeExecution(request, context, env)
      if (!authResult.authorized) {
        return {
          success: false,
          error: {
            message: authResult.error || 'Authorization failed'
          },
          logs,
          executionTime: Date.now() - startTime
        }
      }

      // Apply tier-based timeout limit
      const permissions = getCodePermissions(context)
      const requestedTimeout = request.timeout || parseInt(env.MAX_EXECUTION_TIME || '30000')
      if (requestedTimeout > permissions.maxExecutionTime) {
        request.timeout = permissions.maxExecutionTime
      }
    }
    // Generate unique ID for this execution
    const executionId = request.cacheKey || `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Check cache if cacheKey provided
    if (request.cacheKey && env.CODE_CACHE) {
      const cached = await env.CODE_CACHE.get(request.cacheKey)
      if (cached) {
        return {
          ...JSON.parse(cached),
          cacheHit: true
        }
      }
    }

    // Load the worker with the code
    const worker = await env.LOADER.get(executionId, async () => {
      const workerCode: WorkerCode = {
        compatibilityDate: env.DEFAULT_COMPATIBILITY_DATE || '2025-07-08',
        mainModule: 'main.js',
        modules: {
          'main.js': wrapCode(request.code, request.captureConsole ?? true)
        },
        env: {
          // Provide DO binding - SDK will use this
          DO: env.DO || { fetch: () => Promise.resolve(new Response('DO service not available', { status: 503 })) },
          // Provide logging utilities
          __logRequest: (log: RequestLog) => { requests.push(log) },
          // Provide read-only context
          __context: context ? {
            user: context.auth.user,
            namespace: context ? getCodePermissions(context).namespace : '*',
            authenticated: context.auth.authenticated,
            requestId: context.requestId
          } : undefined
        },
        // Outbound handler - inject context into all service calls
        globalOutbound: context ? createOutboundHandler(context, env, requests) : undefined
      }
      return workerCode
    })

    // Execute the code with timeout
    const timeout = request.timeout || parseInt(env.MAX_EXECUTION_TIME || '30000')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Execute by calling the worker's fetch handler
      const fetchRequest = new Request('http://execute', { signal: controller.signal })
      const response = await worker.fetch(fetchRequest)

      clearTimeout(timeoutId)

      // Parse the result
      const result = await response.json() as { output?: any; logs?: string[]; error?: string; stack?: string }

      // Check if there was an error in the user code
      if (result.error) {
        return {
          success: false,
          error: {
            message: result.error,
            stack: result.stack
          },
          logs: result.logs || logs,
          requests: request.captureFetch ? requests : undefined,
          executionTime: Date.now() - startTime
        }
      }

      const executionResponse: ExecuteCodeResponse = {
        success: true,
        result: result.output,
        logs: result.logs || logs,
        requests: request.captureFetch ? requests : undefined,
        executionTime: Date.now() - startTime
      }

      // Cache result if cacheKey provided
      if (request.cacheKey && env.CODE_CACHE) {
        await env.CODE_CACHE.put(
          request.cacheKey,
          JSON.stringify(executionResponse),
          { expirationTtl: 3600 } // 1 hour
        )
      }

      return executionResponse
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      logs,
      requests: request.captureFetch ? requests : undefined,
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * Wrap user code to capture console.log and result
 */
function wrapCode(code: string, captureConsole: boolean): string {
  const captureCode = `
const __logs = [];
const __originalConsoleLog = console.log;
console.log = (...args) => {
  __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

export default {
  async fetch(request, env) {
    let __output;
    try {
      __output = await (async () => {
        ${code}
      })();
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack,
        logs: __logs
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      output: __output,
      logs: __logs
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
`

  const simpleCode = `
export default {
  async fetch(request, env) {
    let __output;
    try {
      __output = await (async () => {
        ${code}
      })();
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      output: __output
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
`

  return captureConsole ? captureCode : simpleCode
}

/**
 * Create outbound handler to intercept fetch calls from user code
 * This proxies requests through the DO service with user context injected
 */
function createOutboundHandler(
  context: ServiceContext,
  env: Env,
  requests: RequestLog[]
) {
  return async (request: Request) => {
    const url = new URL(request.url)

    // Log the request
    const log: RequestLog = {
      url: request.url,
      method: request.method,
      timestamp: Date.now()
    }
    requests.push(log)

    // Check if this is an internal service call
    // Internal services use http:// with service names as hostnames
    const isInternalService = url.protocol === 'http:' && [
      'db', 'auth', 'gateway', 'schedule',
      'webhooks', 'email', 'mcp', 'queue'
    ].includes(url.hostname)

    if (isInternalService) {
      // Route through DO worker with context headers
      const headers = new Headers(request.headers)
      headers.set('X-Request-ID', context.requestId)
      headers.set('X-User-ID', context.auth.user?.id || '')
      headers.set('X-User-Email', context.auth.user?.email || '')
      headers.set('X-Authenticated', String(context.auth.authenticated))

      if (context.auth.user?.role) {
        headers.set('X-User-Role', context.auth.user.role)
      }

      if (context.auth.user?.permissions) {
        headers.set('X-User-Permissions', context.auth.user.permissions.join(','))
      }

      // Get the service binding from env
      const serviceName = url.hostname.toUpperCase()
      const serviceBinding = env[serviceName as keyof Env] as any

      if (!serviceBinding || !serviceBinding.fetch) {
        return new Response(
          JSON.stringify({ error: `Service ${serviceName} not available` }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Proxy to service with context
      try {
        const newRequest = new Request(request.url, {
          method: request.method,
          headers,
          body: request.body
        })

        return await serviceBinding.fetch(newRequest)
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: `Service ${serviceName} error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // External request - pass through
    try {
      return await fetch(request)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: `External fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
