/**
 * Type definitions for do worker (code execution)
 */

export interface Env {
  // Worker Loader binding for dynamic code execution
  LOADER: WorkerLoader

  // Service bindings
  DB?: Fetcher
  AI?: Fetcher
  MCP?: Fetcher

  // KV for caching
  CODE_CACHE?: KVNamespace

  // Environment variables
  ENVIRONMENT?: string
  MAX_EXECUTION_TIME?: string
  DEFAULT_COMPATIBILITY_DATE?: string
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
