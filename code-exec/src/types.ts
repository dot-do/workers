/**
 * Code Execution Service Types
 */

export interface CodeExecEnv {
  AI: Ai
  DB: any // DB service binding
  EXECUTIONS_DB: D1Database
}

/**
 * Supported programming languages
 */
export type SupportedLanguage = 'javascript' | 'typescript' | 'python'

/**
 * Execution context provided to code
 */
export interface ExecutionContext {
  [key: string]: any
}

/**
 * Code execution configuration
 */
export interface ExecutionConfig {
  timeout?: number // Execution timeout in milliseconds (default: 30000)
  memoryLimit?: number // Memory limit in bytes (not enforced in Workers)
  allowedAPIs?: RuntimeAPI[] // Allowed runtime APIs (default: all)
  allowedDomains?: string[] // Allowed domains for fetch
  captureConsole?: boolean // Capture console output (default: true)
}

/**
 * Runtime APIs available in sandboxed code
 */
export type RuntimeAPI = 'ai' | 'api' | 'db' | 'console'

/**
 * Code execution result
 */
export interface ExecutionResult {
  success: boolean
  result?: any
  error?: string
  logs: LogEntry[]
  metrics: ExecutionMetrics
  executionId: string
}

/**
 * Log entry
 */
export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: number
  args?: any[]
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  duration: number // Execution time in milliseconds
  startTime: number
  endTime: number
  memoryUsed?: number // Not available in Workers
}

/**
 * Runtime function implementations
 */
export interface RuntimeFunctions {
  ai: (model: string, input: AiInput) => Promise<AiResponse>
  api: (url: string, options?: ApiOptions) => Promise<ApiResponse>
  db: (query: DbQuery) => Promise<DbResult>
  console: CapturedConsole
}

/**
 * AI model input types
 */
export type AiInput =
  | { messages: Array<{ role: string; content: string }> }
  | { prompt: string }
  | { text: string }

/**
 * AI model response
 */
export interface AiResponse {
  response?: string
  output?: any
  embedding?: number[]
}

/**
 * HTTP API request options
 */
export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: string | Record<string, any>
  timeout?: number
}

/**
 * HTTP API response
 */
export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: any
  text: string
}

/**
 * Database query types
 */
export type DbQuery =
  | { select: { from: string; where?: Record<string, any>; limit?: number; offset?: number } }
  | { insert: { into: string; values: Record<string, any> | Array<Record<string, any>> } }
  | { update: { table: string; set: Record<string, any>; where?: Record<string, any> } }
  | { delete: { from: string; where?: Record<string, any> } }

/**
 * Database query result
 */
export interface DbResult {
  rows: Array<Record<string, any>>
  rowCount: number
}

/**
 * Captured console interface
 */
export interface CapturedConsole {
  log: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
}

/**
 * Execution record stored in database
 */
export interface ExecutionRecord {
  id: string
  code: string
  language: SupportedLanguage
  context?: string // JSON string
  config?: string // JSON string
  success: boolean
  result?: string // JSON string
  error?: string
  logs?: string // JSON string
  duration: number
  created_at: number
  user_id?: string
  ip_address?: string
}

/**
 * Default execution configuration
 */
export const DEFAULT_EXECUTION_CONFIG: Required<ExecutionConfig> = {
  timeout: 30000, // 30 seconds
  memoryLimit: 128 * 1024 * 1024, // 128MB (not enforced)
  allowedAPIs: ['ai', 'api', 'db', 'console'],
  allowedDomains: [], // No external API access by default
  captureConsole: true,
}

/**
 * Code validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Security patterns to block
 */
export const BLOCKED_PATTERNS = [
  { pattern: /require\s*\(/gi, message: 'require() is not allowed' },
  { pattern: /import\s+.*\s+from/gi, message: 'import statements are not allowed' },
  { pattern: /eval\s*\(/gi, message: 'eval() is not allowed' },
  { pattern: /Function\s*\(/gi, message: 'Function constructor is not allowed' },
  { pattern: /process\./gi, message: 'process object is not available' },
  { pattern: /__dirname/gi, message: '__dirname is not available' },
  { pattern: /__filename/gi, message: '__filename is not available' },
  { pattern: /module\.exports/gi, message: 'module.exports is not available' },
] as const

/**
 * Maximum code size in bytes
 */
export const MAX_CODE_SIZE = 100 * 1024 // 100KB
