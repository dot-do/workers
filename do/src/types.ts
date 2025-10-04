/**
 * Type definitions for do worker (code execution)
 */

export interface Env {
  // Worker Loader binding for dynamic code execution
  LOADER: WorkerLoader

  // Service bindings - all core services
  AI: Fetcher
  DB: Fetcher
  AUTH: Fetcher
  GATEWAY: Fetcher
  SCHEDULE: Fetcher
  WEBHOOKS: Fetcher
  EMAIL: Fetcher
  MCP: Fetcher
  QUEUE: Fetcher
  DO?: Fetcher // Self-reference (optional - prefer ctx.exports.DO via enable_ctx_exports flag)

  // KV for caching
  CODE_CACHE?: KVNamespace

  // Environment variables
  ENVIRONMENT?: string
  MAX_EXECUTION_TIME?: string
  DEFAULT_COMPATIBILITY_DATE?: string
}

/**
 * Authentication context passed through all service calls
 */
export interface AuthContext {
  user?: {
    id: string
    email: string
    name?: string
    role?: string
    permissions?: string[]
    metadata?: Record<string, any>
  }
  session?: {
    id: string
    expiresAt: number
  }
  apiKey?: {
    id: string
    name: string
    permissions: string[]
  }
  authenticated: boolean
}

/**
 * Request context wrapper for all service calls
 */
export interface ServiceContext {
  auth: AuthContext
  requestId: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface WorkerLoader {
  get(id: string, getCodeCallback: () => Promise<WorkerCode>): WorkerStub
}

export interface WorkerCode {
  compatibilityDate: string
  compatibilityFlags?: string[]
  mainModule: string
  modules: Record<string, string | ModuleDefinition>
  env?: Record<string, any>
  globalOutbound?: any
}

export interface ModuleDefinition {
  js?: string
  cjs?: string
  py?: string
  text?: string
  data?: ArrayBuffer
  json?: object
}

export interface WorkerStub {
  fetch(request: Request | string): Promise<Response>
  getEntrypoint(name?: string, props?: any): any
}

export interface ExecuteCodeRequest {
  code: string
  bindings?: string[]
  timeout?: number
  cacheKey?: string
  captureConsole?: boolean
  captureFetch?: boolean
}

export interface ExecuteCodeResponse {
  success: boolean
  result?: any
  logs?: string[]
  requests?: RequestLog[]
  error?: {
    message: string
    stack?: string
  }
  executionTime?: number
  cacheHit?: boolean
}

export interface RequestLog {
  url: string
  method: string
  timestamp: number
  headers?: Record<string, string>
  response?: {
    status: number
    statusText: string
  }
}
