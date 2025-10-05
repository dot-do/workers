/**
 * Code execution logic using Dynamic Worker Loader
 */

import type { Env, ExecuteCodeRequest, ExecuteCodeResponse, WorkerCode, RequestLog, ServiceContext } from './types'
import { authorizeCodeExecution, getCodePermissions, checkRateLimit } from './authorization'
import { createRpcClient } from 'apis.do'
import { createBusinessRuntime } from 'sdk.do'

/**
 * Execute TypeScript code in a secure V8 isolate
 */
export async function executeCode(
  request: ExecuteCodeRequest,
  env: Env,
  context?: ServiceContext,
  ctx?: ExecutionContext
): Promise<ExecuteCodeResponse> {
  const startTime = Date.now()
  const logs: string[] = []
  const requests: RequestLog[] = []

  try {
    // Check if Worker Loader is available
    console.log('env.LOADER type:', typeof env.LOADER)
    console.log('env.LOADER:', env.LOADER)
    console.log('env.LOADER keys:', env.LOADER ? Object.keys(env.LOADER) : 'null')

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
    console.log('Calling env.LOADER.get...')
    const worker = env.LOADER.get(executionId, async () => {
      console.log('Inside LOADER.get callback')

      // Create RPC client with service bindings for $ runtime
      const rpcClient = createRpcClient({
        services: {
          ai: env.AI,
          db: env.DB,
          auth: env.AUTH,
          api: env.GATEWAY,
          schedule: env.SCHEDULE,
          webhooks: env.WEBHOOKS,
          email: env.EMAIL,
          queue: env.QUEUE,
        }
      })

      // Create Business-as-Code runtime with RPC client
      const runtimeContext = context ? {
        user: context.auth.user,
        namespace: getCodePermissions(context).namespace,
        authenticated: context.auth.authenticated,
        requestId: context.requestId
      } : undefined

      // Create serializable runtime using pure RPC proxies
      const $ = createBusinessRuntime(rpcClient, runtimeContext)

      const workerCode: WorkerCode = {
        compatibilityDate: env.DEFAULT_COMPATIBILITY_DATE || '2025-07-08',
        mainModule: 'main.js',
        modules: {
          'main.js': wrapCode(request.code, request.captureConsole ?? true)
        },
        env: {
          // ✅ Serializable runtime - pure RPC proxies, no functions
          $,
          // Provide DO binding - prefer ctx.exports (automatic loopback via enable_ctx_exports)
          DO: (ctx?.exports as any)?.DO || env.DO || { fetch: () => Promise.resolve(new Response('DO service not available', { status: 503 })) },
          // Provide read-only context (plain object, serializable)
          __context: runtimeContext
        },
        // Outbound handler - inject context into all service calls
        // TEMPORARILY DISABLED: Testing if LOADER.get() works without globalOutbound
        // globalOutbound: context ? createOutboundHandler(context, env, requests) : undefined
      }
      console.log('Returning workerCode:', Object.keys(workerCode))
      return workerCode
    })
    console.log('env.LOADER.get returned')
    console.log('worker type:', typeof worker)
    console.log('worker keys:', Object.keys(worker || {}))
    console.log('worker.fetch:', typeof (worker as any)?.fetch)
    console.log('worker.getEntrypoint:', typeof (worker as any)?.getEntrypoint)

    // Check if Worker Loader returned a valid worker stub
    if (!worker || (typeof (worker as any).fetch !== 'function' && typeof (worker as any).getEntrypoint !== 'function')) {
      return {
        success: false,
        error: {
          message: 'Worker Loader is not fully functional in this environment. This may be expected in local development. Worker Loader works fully in production with beta access.'
        },
        logs,
        executionTime: Date.now() - startTime
      }
    }

    // Execute the code with timeout
    const timeout = request.timeout || parseInt(env.MAX_EXECUTION_TIME || '30000')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Execute by calling the worker's fetch handler
      // In local dev, we may need to use getEntrypoint() to get the default export
      const fetchRequest = new Request('http://execute', { signal: controller.signal })
      let response: Response

      if (typeof (worker as any).fetch === 'function') {
        // Production: Direct fetch on worker stub
        response = await worker.fetch(fetchRequest)
      } else if (typeof (worker as any).getEntrypoint === 'function') {
        // Local dev: Get default export and call its fetch
        const entrypoint = (worker as any).getEntrypoint()
        if (entrypoint && typeof entrypoint.fetch === 'function') {
          response = await entrypoint.fetch(fetchRequest)
        } else {
          throw new Error('Worker entrypoint does not have a fetch method')
        }
      } else {
        throw new Error('Worker stub has neither fetch() nor getEntrypoint()')
      }

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
 * Execute TypeScript code in a completely sandboxed V8 isolate
 * No context, no env, no outbound fetch - pure evaluation only
 */
export async function executeSandboxedCode(
  request: ExecuteCodeRequest,
  env: Env,
  ctx?: ExecutionContext
): Promise<ExecuteCodeResponse> {
  const startTime = Date.now()
  const logs: string[] = []

  try {
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

    // Generate unique ID for this execution
    const executionId = `eval-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Load the worker with sandboxed code (NO bindings)
    const worker = env.LOADER.get(executionId, async () => {
      const workerCode: WorkerCode = {
        compatibilityDate: env.DEFAULT_COMPATIBILITY_DATE || '2025-07-08',
        mainModule: 'main.js',
        modules: {
          'main.js': wrapSandboxedCode(request.code, request.captureConsole ?? true)
        },
        // EMPTY env - no bindings whatsoever
        env: {},
        // NO globalOutbound - fetch is completely disabled
      }
      return workerCode
    })

    if (!worker || (typeof (worker as any).fetch !== 'function' && typeof (worker as any).getEntrypoint !== 'function')) {
      return {
        success: false,
        error: {
          message: 'Worker Loader is not fully functional in this environment. This may be expected in local development. Worker Loader works fully in production with beta access.'
        },
        logs,
        executionTime: Date.now() - startTime
      }
    }

    // Execute with timeout
    const timeout = request.timeout || parseInt(env.MAX_EXECUTION_TIME || '30000')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const fetchRequest = new Request('http://eval', { signal: controller.signal })
      let response: Response

      if (typeof (worker as any).fetch === 'function') {
        response = await worker.fetch(fetchRequest)
      } else if (typeof (worker as any).getEntrypoint === 'function') {
        const entrypoint = (worker as any).getEntrypoint()
        if (entrypoint && typeof entrypoint.fetch === 'function') {
          response = await entrypoint.fetch(fetchRequest)
        } else {
          throw new Error('Worker entrypoint does not have a fetch method')
        }
      } else {
        throw new Error('Worker stub has neither fetch() nor getEntrypoint()')
      }

      clearTimeout(timeoutId)

      const result = await response.json() as { output?: any; logs?: string[]; error?: string; stack?: string }

      if (result.error) {
        return {
          success: false,
          error: {
            message: result.error,
            stack: result.stack
          },
          logs: result.logs || logs,
          executionTime: Date.now() - startTime
        }
      }

      return {
        success: true,
        result: result.output,
        logs: result.logs || logs,
        executionTime: Date.now() - startTime
      }
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
 * Wrap user code for sandboxed evaluation (no env, no fetch)
 */
function wrapSandboxedCode(code: string, captureConsole: boolean): string {
  if (captureConsole) {
    return `
const __logs = [];
const __originalConsoleLog = console.log;
console.log = (...args) => {
  __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

export default {
  async fetch(request) {
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
  }

  return `
export default {
  async fetch(request) {
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
}

/**
 * Create outbound handler to intercept fetch calls from user code
 * This proxies requests through the DO service with user context injected
 * Returns a Fetcher object compatible with WorkerCode.globalOutbound
 */
function createOutboundHandler(
  context: ServiceContext,
  env: Env,
  requests: RequestLog[]
): any {
  return {
    fetch: async (request: Request) => {
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
}
