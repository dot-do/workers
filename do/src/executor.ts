/**
 * Code execution logic using Dynamic Worker Loader
 */

import type { Env, ExecuteCodeRequest, ExecuteCodeResponse, WorkerCode, RequestLog } from './types'

/**
 * Execute TypeScript code in a secure V8 isolate
 */
export async function executeCode(
  request: ExecuteCodeRequest,
  env: Env
): Promise<ExecuteCodeResponse> {
  const startTime = Date.now()
  const logs: string[] = []
  const requests: RequestLog[] = []

  try {
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

    // Build bindings for the code
    const bindings = buildBindings(request.bindings || [], env, logs, requests)

    // Load the worker with the code
    const worker = env.LOADER.get(executionId, async () => {
      const workerCode: WorkerCode = {
        compatibilityDate: env.DEFAULT_COMPATIBILITY_DATE || '2025-07-08',
        mainModule: 'main.js',
        modules: {
          'main.js': wrapCode(request.code, request.captureConsole ?? true)
        },
        env: bindings
      }
      return workerCode
    })

    // Execute the code with timeout
    const timeout = request.timeout || parseInt(env.MAX_EXECUTION_TIME || '30000')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Execute by calling the worker's fetch handler
      const response = await worker.fetch('http://execute', {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Parse the result
      const result = await response.json()

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
 * Build bindings object for the dynamic worker
 */
function buildBindings(
  requestedBindings: string[],
  env: Env,
  logs: string[],
  requests: RequestLog[]
): Record<string, any> {
  const bindings: Record<string, any> = {}

  // Add requested service bindings
  if (requestedBindings.includes('db') && env.DB) {
    bindings.DB = env.DB
  }
  if (requestedBindings.includes('ai') && env.AI) {
    bindings.AI = env.AI
  }
  if (requestedBindings.includes('mcp') && env.MCP) {
    bindings.MCP = env.MCP
  }

  // Add logging utilities
  bindings.__logRequest = (log: RequestLog) => {
    requests.push(log)
  }

  return bindings
}
