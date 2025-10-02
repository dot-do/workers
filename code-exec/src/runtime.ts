/**
 * Runtime API for Sandboxed Code Execution
 * Provides controlled access to AI, API, database, and console functions
 */

import type {
  CodeExecEnv,
  RuntimeFunctions,
  ExecutionConfig,
  LogEntry,
  AiInput,
  AiResponse,
  ApiOptions,
  ApiResponse,
  DbQuery,
  DbResult,
  CapturedConsole,
} from './types'
import { DEFAULT_EXECUTION_CONFIG } from './types'

/**
 * Create runtime API for sandboxed code
 */
export function createRuntime(env: CodeExecEnv, config: ExecutionConfig = {}): { runtime: RuntimeFunctions; logs: LogEntry[] } {
  const mergedConfig = { ...DEFAULT_EXECUTION_CONFIG, ...config }
  const logs: LogEntry[] = []

  // Captured console that logs to array
  const capturedConsole: CapturedConsole = {
    log: (...args: any[]) => {
      logs.push({ level: 'log', message: formatArgs(args), timestamp: Date.now(), args })
    },
    info: (...args: any[]) => {
      logs.push({ level: 'info', message: formatArgs(args), timestamp: Date.now(), args })
    },
    warn: (...args: any[]) => {
      logs.push({ level: 'warn', message: formatArgs(args), timestamp: Date.now(), args })
    },
    error: (...args: any[]) => {
      logs.push({ level: 'error', message: formatArgs(args), timestamp: Date.now(), args })
    },
    debug: (...args: any[]) => {
      logs.push({ level: 'debug', message: formatArgs(args), timestamp: Date.now(), args })
    },
  }

  // AI API - Execute AI models
  const ai = async (model: string, input: AiInput): Promise<AiResponse> => {
    if (!mergedConfig.allowedAPIs.includes('ai')) {
      throw new Error('AI API is not allowed in this execution context')
    }

    try {
      const result = await env.AI.run(model as any, input as any)
      return result as AiResponse
    } catch (error) {
      throw new Error(`AI execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // HTTP API - Make controlled HTTP requests
  const api = async (url: string, options: ApiOptions = {}): Promise<ApiResponse> => {
    if (!mergedConfig.allowedAPIs.includes('api')) {
      throw new Error('API access is not allowed in this execution context')
    }

    // Check domain whitelist
    const urlObj = new URL(url)
    if (mergedConfig.allowedDomains.length > 0 && !mergedConfig.allowedDomains.includes(urlObj.hostname)) {
      throw new Error(`Domain ${urlObj.hostname} is not in allowed domains list`)
    }

    const { method = 'GET', headers = {}, body, timeout = 30000 } = options

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      }

      if (body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
        if (!headers['Content-Type']) {
          fetchOptions.headers = { ...headers, 'Content-Type': 'application/json' }
        }
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const text = await response.text()
      let parsedBody: any
      try {
        parsedBody = JSON.parse(text)
      } catch {
        parsedBody = text
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: parsedBody,
        text,
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`API request timeout after ${timeout}ms`)
      }
      throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Database API - Execute queries via DB service
  const db = async (query: DbQuery): Promise<DbResult> => {
    if (!mergedConfig.allowedAPIs.includes('db')) {
      throw new Error('Database access is not allowed in this execution context')
    }

    if (!env.DB) {
      throw new Error('Database service is not available')
    }

    try {
      // Call DB service RPC method (assuming it has executeQuery method)
      const result = await env.DB.executeQuery(query)
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
      }
    } catch (error) {
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const runtime: RuntimeFunctions = {
    ai,
    api,
    db,
    console: capturedConsole,
  }

  return { runtime, logs }
}

/**
 * Format console arguments for logging
 */
function formatArgs(args: any[]): string {
  return args
    .map(arg => {
      if (typeof arg === 'string') return arg
      if (typeof arg === 'undefined') return 'undefined'
      if (arg === null) return 'null'
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

/**
 * Get logs from runtime
 */
export function getLogs(runtime: { runtime: RuntimeFunctions; logs: LogEntry[] }): LogEntry[] {
  return runtime.logs
}
