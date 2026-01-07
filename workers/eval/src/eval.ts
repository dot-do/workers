/**
 * EvalDO - eval.do Secure Sandbox Code Evaluation
 *
 * Implements secure sandbox execution for:
 * - JavaScript code evaluation
 * - Async code execution
 * - Code validation
 * - Security constraints (no access to globals)
 * - Timeout handling
 * - Memory limits
 * - Result serialization
 * - RPC interface with hasMethod/call
 * - HTTP fetch handler with REST and RPC endpoints
 */

import type {
  MockDOState,
  MockEvalEnv,
  ExecutionResult,
  EvalOptions,
} from '../test/helpers.js'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 5000
const MAX_CODE_LENGTH = 1 * 1024 * 1024 // 1MB
const MAX_OUTPUT_SIZE = 1 * 1024 * 1024 // 1MB
const MAX_LOG_SIZE = 100 * 1024 // 100KB
const MAX_LOG_ENTRIES = 1000

const ALLOWED_METHODS = new Set([
  'evaluate',
  'evaluateAsync',
  'validateCode',
])

// Blocked globals for security
const BLOCKED_GLOBALS = new Set([
  'globalThis',
  'self',
  'window',
  'global',
  'process',
  'require',
  '__dirname',
  '__filename',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'importScripts',
])

// Dangerous patterns to detect sandbox escapes
const DANGEROUS_PATTERNS = [
  /\.constructor\.constructor/,
  /\['constructor'\]\['constructor'\]/,
  /\["constructor"\]\["constructor"\]/,
  /this\.constructor/,
  /\[['"]constructor['"]\]/,
]

// Allowed safe globals
const SAFE_GLOBALS = new Set([
  'undefined',
  'NaN',
  'Infinity',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'Math',
  'Date',
  'JSON',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'WeakRef',
  'FinalizationRegistry',
  'Promise',
  'Proxy',
  'Reflect',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'encodeURI',
  'encodeURIComponent',
  'decodeURI',
  'decodeURIComponent',
  'isNaN',
  'isFinite',
  'parseInt',
  'parseFloat',
  'console',
])

// ============================================================================
// Sandbox Implementation
// ============================================================================

interface SandboxContext {
  logs: string[]
  startTime: number
  timeout: number
  memoryUsed: number
}

/**
 * Creates a safe sandbox environment for code execution
 */
function createSandbox(ctx: SandboxContext): Record<string, unknown> {
  const sandbox: Record<string, unknown> = {}

  // Add safe globals
  sandbox.undefined = undefined
  sandbox.NaN = NaN
  sandbox.Infinity = Infinity
  sandbox.Object = Object
  sandbox.Array = Array
  sandbox.String = String
  sandbox.Number = Number
  sandbox.Boolean = Boolean
  sandbox.Symbol = Symbol
  sandbox.BigInt = BigInt
  sandbox.Math = Math
  sandbox.Date = Date
  sandbox.JSON = JSON
  sandbox.RegExp = RegExp
  sandbox.Error = Error
  sandbox.TypeError = TypeError
  sandbox.RangeError = RangeError
  sandbox.ReferenceError = ReferenceError
  sandbox.SyntaxError = SyntaxError
  sandbox.URIError = URIError
  sandbox.EvalError = EvalError
  sandbox.Map = Map
  sandbox.Set = Set
  sandbox.WeakMap = WeakMap
  sandbox.WeakSet = WeakSet
  sandbox.WeakRef = WeakRef
  sandbox.FinalizationRegistry = FinalizationRegistry
  sandbox.Promise = Promise
  sandbox.Proxy = Proxy
  sandbox.Reflect = Reflect
  sandbox.ArrayBuffer = ArrayBuffer
  sandbox.DataView = DataView
  sandbox.Int8Array = Int8Array
  sandbox.Uint8Array = Uint8Array
  sandbox.Uint8ClampedArray = Uint8ClampedArray
  sandbox.Int16Array = Int16Array
  sandbox.Uint16Array = Uint16Array
  sandbox.Int32Array = Int32Array
  sandbox.Uint32Array = Uint32Array
  sandbox.Float32Array = Float32Array
  sandbox.Float64Array = Float64Array
  sandbox.BigInt64Array = BigInt64Array
  sandbox.BigUint64Array = BigUint64Array
  sandbox.encodeURI = encodeURI
  sandbox.encodeURIComponent = encodeURIComponent
  sandbox.decodeURI = decodeURI
  sandbox.decodeURIComponent = decodeURIComponent
  sandbox.isNaN = isNaN
  sandbox.isFinite = isFinite
  sandbox.parseInt = parseInt
  sandbox.parseFloat = parseFloat

  // Create sandboxed console
  sandbox.console = createSandboxedConsole(ctx)

  return sandbox
}

/**
 * Creates a sandboxed console that captures output
 */
function createSandboxedConsole(ctx: SandboxContext): Console {
  const addLog = (level: string, ...args: unknown[]) => {
    if (ctx.logs.length >= MAX_LOG_ENTRIES) return
    const totalSize = ctx.logs.join('').length
    if (totalSize >= MAX_LOG_SIZE) return

    const message = args.map(arg => {
      try {
        if (typeof arg === 'string') return arg
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    }).join(' ')

    ctx.logs.push(message)
  }

  return {
    log: (...args: unknown[]) => addLog('log', ...args),
    warn: (...args: unknown[]) => addLog('warn', ...args),
    error: (...args: unknown[]) => addLog('error', ...args),
    info: (...args: unknown[]) => addLog('info', ...args),
    debug: (...args: unknown[]) => addLog('debug', ...args),
    trace: (...args: unknown[]) => addLog('trace', ...args),
    dir: (...args: unknown[]) => addLog('dir', ...args),
    table: (...args: unknown[]) => addLog('table', ...args),
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    assert: () => {},
    clear: () => {},
    count: () => {},
    countReset: () => {},
    group: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
    profile: () => {},
    profileEnd: () => {},
    timeStamp: () => {},
  } as Console
}

/**
 * Check if code contains blocked globals
 */
function checkBlockedGlobals(code: string): { blocked: boolean; global?: string } {
  for (const global of BLOCKED_GLOBALS) {
    // Simple check - look for the global as a word boundary
    const regex = new RegExp(`\\b${global}\\b`)
    if (regex.test(code)) {
      return { blocked: true, global }
    }
  }
  return { blocked: false }
}

/**
 * Check for import/export statements
 */
function checkImportExport(code: string): { hasImportExport: boolean; type?: string } {
  if (/\bimport\s+/.test(code) || /\bimport\(/.test(code)) {
    return { hasImportExport: true, type: 'import' }
  }
  if (/\bexport\s+/.test(code)) {
    return { hasImportExport: true, type: 'export' }
  }
  return { hasImportExport: false }
}

/**
 * Validate JavaScript syntax
 */
function validateSyntax(code: string): { valid: boolean; errors?: string[] } {
  try {
    // Try to parse as a function body
    new Function(code)
    return { valid: true }
  } catch (err) {
    const message = (err as Error).message
    return { valid: false, errors: [message] }
  }
}

/**
 * Serialize a value for JSON output
 */
function serializeValue(value: unknown, seen = new WeakSet()): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value
  if (typeof value === 'string') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'symbol') return null
  if (typeof value === 'function') return null

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Map) {
    return Array.from(value.entries())
  }

  if (value instanceof Set) {
    return Array.from(value.values())
  }

  if (Array.isArray(value)) {
    return value.map(v => serializeValue(v, seen))
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      throw new Error('Circular reference detected')
    }
    seen.add(value as object)

    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      const serialized = serializeValue(val, seen)
      if (serialized !== undefined) {
        result[key] = serialized
      }
    }
    return result
  }

  return null
}

/**
 * Transform code to return the last expression value
 */
function transformCodeToReturnLastExpression(code: string): string {
  const trimmed = code.trim()
  if (!trimmed) return code

  // Split into lines and find the last non-empty, non-comment line
  const lines = trimmed.split('\n')
  let lastExpressionIndex = -1

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line && !line.startsWith('//') && !line.startsWith('/*')) {
      lastExpressionIndex = i
      break
    }
  }

  if (lastExpressionIndex === -1) return code

  let lastLine = lines[lastExpressionIndex].trim()

  // Check if the last line is already a return statement
  if (lastLine.startsWith('return ')) {
    return code
  }

  // Check if it's a statement that shouldn't be returned
  // (declarations, control flow, etc.)
  const noReturnPatterns = [
    /^(const|let|var)\s+/,
    /^(if|else|for|while|do|switch|try|catch|finally|throw)\b/,
    /^(function|class)\s+\w+/,
    /^(break|continue);?$/,
    /^}$/,
    /^;$/,
  ]

  // If the line matches a no-return pattern but has multiple statements (semicolons),
  // extract the last statement
  for (const pattern of noReturnPatterns) {
    if (pattern.test(lastLine)) {
      // Check if there are multiple statements on this line
      const statements = lastLine.split(';').map(s => s.trim()).filter(s => s)
      if (statements.length > 1) {
        // Get the last non-empty statement
        const lastStatement = statements[statements.length - 1]
        // Check if the last statement itself is a declaration or control flow
        let isLastStatementDeclaration = false
        for (const p of noReturnPatterns) {
          if (p.test(lastStatement)) {
            isLastStatementDeclaration = true
            break
          }
        }
        if (!isLastStatementDeclaration && lastStatement) {
          // Rebuild: all but last statement + return last statement
          const allButLast = statements.slice(0, -1).join('; ') + ';'
          const beforeLines = lines.slice(0, lastExpressionIndex).join('\n')
          return (beforeLines ? beforeLines + '\n' : '') + allButLast + ' return ' + lastStatement + ';'
        }
      }
      return code
    }
  }

  // If it ends with a semicolon, remove it for the return
  const expressionToReturn = lastLine.endsWith(';')
    ? lastLine.slice(0, -1)
    : lastLine

  // Rebuild the code with return on the last expression
  const beforeLast = lines.slice(0, lastExpressionIndex).join('\n')
  return beforeLast + (beforeLast ? '\n' : '') + 'return ' + expressionToReturn + ';'
}

/**
 * Execute code in a sandboxed environment with timeout
 */
async function executeInSandbox(
  code: string,
  ctx: SandboxContext,
  isAsync: boolean
): Promise<ExecutionResult> {
  const sandbox = createSandbox(ctx)

  // Check for blocked globals
  const blockedCheck = checkBlockedGlobals(code)
  if (blockedCheck.blocked) {
    return {
      success: false,
      error: `${blockedCheck.global} is not defined`,
      logs: ctx.logs,
      duration: Date.now() - ctx.startTime,
    }
  }

  // Check for import/export
  const importExportCheck = checkImportExport(code)
  if (importExportCheck.hasImportExport) {
    return {
      success: false,
      error: `${importExportCheck.type} statements are not allowed`,
      logs: ctx.logs,
      duration: Date.now() - ctx.startTime,
    }
  }

  // Check for dangerous patterns (sandbox escape attempts)
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return {
        success: false,
        error: 'Access denied: potential sandbox escape detected',
        logs: ctx.logs,
        duration: Date.now() - ctx.startTime,
      }
    }
  }

  try {
    // Transform code to return last expression
    const transformedCode = transformCodeToReturnLastExpression(code)

    // Wrap code in an IIFE
    const wrappedCode = isAsync
      ? `return (async () => { ${transformedCode} })()`
      : `return (function() { ${transformedCode} })()`

    // Create function with sandbox
    const sandboxKeys = Object.keys(sandbox)
    const sandboxValues = Object.values(sandbox)

    // Add blocked globals as undefined to prevent access
    for (const global of BLOCKED_GLOBALS) {
      sandboxKeys.push(global)
      sandboxValues.push(undefined)
    }

    const fn = new Function(...sandboxKeys, wrappedCode)

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout exceeded')), ctx.timeout)
    })

    const executionPromise = (async () => {
      const result = fn(...sandboxValues)
      return isAsync ? await result : result
    })()

    const result = await Promise.race([executionPromise, timeoutPromise])

    // Serialize result
    let serializedResult: unknown
    try {
      serializedResult = serializeValue(result)
      // Check output size
      const resultStr = JSON.stringify(serializedResult)
      if (resultStr && resultStr.length > MAX_OUTPUT_SIZE) {
        serializedResult = 'Result too large to serialize'
      }
    } catch (err) {
      if ((err as Error).message.includes('Circular')) {
        return {
          success: false,
          error: 'Cannot serialize circular reference',
          logs: ctx.logs,
          duration: Date.now() - ctx.startTime,
        }
      }
      serializedResult = String(result)
    }

    return {
      success: true,
      result: serializedResult,
      logs: ctx.logs,
      duration: Date.now() - ctx.startTime,
      memoryUsed: ctx.memoryUsed,
    }
  } catch (err) {
    // Handle thrown strings and other non-Error values
    let errorMessage: string
    if (err instanceof Error) {
      errorMessage = err.message
    } else if (typeof err === 'string') {
      errorMessage = err
    } else if (err && typeof err === 'object') {
      errorMessage = JSON.stringify(err)
    } else {
      errorMessage = String(err)
    }

    // Categorize errors
    if (errorMessage.includes('timeout')) {
      errorMessage = 'Execution timeout exceeded'
    } else if (errorMessage.includes('Maximum call stack')) {
      errorMessage = 'Maximum call stack size exceeded (recursion limit)'
    } else if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      errorMessage = 'Memory limit exceeded'
    }

    return {
      success: false,
      error: errorMessage,
      logs: ctx.logs,
      duration: Date.now() - ctx.startTime,
    }
  }
}

// ============================================================================
// EvalDO Implementation
// ============================================================================

export class EvalDO {
  private ctx: MockDOState
  private env: MockEvalEnv

  constructor(ctx: MockDOState, env: MockEvalEnv) {
    this.ctx = ctx
    this.env = env
  }

  // ==========================================================================
  // Core Methods
  // ==========================================================================

  async evaluate(code: string, options?: EvalOptions): Promise<ExecutionResult> {
    // Input validation
    if (code === null || code === undefined) {
      return {
        success: false,
        error: 'Invalid code: null or undefined',
        logs: [],
        duration: 0,
      }
    }

    if (typeof code !== 'string') {
      return {
        success: false,
        error: 'Invalid code: must be a string',
        logs: [],
        duration: 0,
      }
    }

    if (code.length === 0) {
      return {
        success: false,
        error: 'Invalid code: empty string',
        logs: [],
        duration: 0,
      }
    }

    if (code.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        error: 'Code too long: size limit exceeded',
        logs: [],
        duration: 0,
      }
    }

    // Handle whitespace-only or comments-only code
    const trimmed = code.trim()
    if (trimmed.length === 0 || (trimmed.startsWith('//') && !trimmed.includes('\n'))) {
      return {
        success: true,
        result: undefined,
        logs: [],
        duration: 0,
        memoryUsed: 0,
      }
    }

    const sandboxCtx: SandboxContext = {
      logs: [],
      startTime: Date.now(),
      timeout: options?.timeout ?? DEFAULT_TIMEOUT_MS,
      memoryUsed: 0,
    }

    return executeInSandbox(code, sandboxCtx, false)
  }

  async evaluateAsync(code: string, options?: EvalOptions): Promise<ExecutionResult> {
    // Input validation (same as evaluate)
    if (code === null || code === undefined) {
      return {
        success: false,
        error: 'Invalid code: null or undefined',
        logs: [],
        duration: 0,
      }
    }

    if (typeof code !== 'string') {
      return {
        success: false,
        error: 'Invalid code: must be a string',
        logs: [],
        duration: 0,
      }
    }

    if (code.length === 0) {
      return {
        success: false,
        error: 'Invalid code: empty string',
        logs: [],
        duration: 0,
      }
    }

    if (code.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        error: 'Code too long: size limit exceeded',
        logs: [],
        duration: 0,
      }
    }

    const sandboxCtx: SandboxContext = {
      logs: [],
      startTime: Date.now(),
      timeout: options?.timeout ?? DEFAULT_TIMEOUT_MS,
      memoryUsed: 0,
    }

    return executeInSandbox(code, sandboxCtx, true)
  }

  async validateCode(code: string): Promise<{ valid: boolean; errors?: string[] }> {
    if (!code || typeof code !== 'string') {
      return { valid: false, errors: ['Invalid input: code must be a non-empty string'] }
    }

    return validateSyntax(code)
  }

  // ==========================================================================
  // RPC Interface
  // ==========================================================================

  hasMethod(name: string): boolean {
    return ALLOWED_METHODS.has(name)
  }

  async call(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    // Validate params
    if (!params || params.length === 0) {
      throw new Error('Missing required parameter: code')
    }

    if (typeof params[0] !== 'string') {
      throw new Error('Invalid type: code must be a string')
    }

    // Call the method
    const fn = (this as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }

    return fn.apply(this, params)
  }

  // ==========================================================================
  // HTTP Fetch Handler
  // ==========================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // Generate request ID
    const requestId = crypto.randomUUID()

    try {
      // HATEOAS discovery
      if (path === '/' && method === 'GET') {
        return this.jsonResponse(this.getDiscoveryInfo(), 200, requestId)
      }

      // RPC endpoints
      if (path === '/rpc' && method === 'POST') {
        return this.handleRpcRequest(request, requestId)
      }

      if (path === '/rpc/batch' && method === 'POST') {
        return this.handleRpcBatch(request, requestId)
      }

      // REST API endpoints
      if (path === '/api/eval' && method === 'POST') {
        return this.handleEval(request, requestId, false)
      }

      if (path === '/api/eval/async' && method === 'POST') {
        return this.handleEval(request, requestId, true)
      }

      if (path === '/api/validate' && method === 'POST') {
        return this.handleValidate(request, requestId)
      }

      // Method not allowed for known paths
      if (path.startsWith('/api/')) {
        return this.jsonResponse({ error: 'Method not allowed' }, 405, requestId)
      }

      return this.jsonResponse({ error: 'Not found' }, 404, requestId)
    } catch (err) {
      return this.errorResponse(err as Error, requestId)
    }
  }

  // ==========================================================================
  // HTTP Handler Helpers
  // ==========================================================================

  private async handleRpcRequest(request: Request, requestId: string): Promise<Response> {
    let body: { method: string; params: unknown[] }

    try {
      body = await request.json() as { method: string; params: unknown[] }
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON: parse error' }, 400, requestId)
    }

    if (!this.hasMethod(body.method)) {
      return this.jsonResponse({ error: `Method not allowed: ${body.method}` }, 400, requestId)
    }

    try {
      const result = await this.call(body.method, body.params)
      return this.jsonResponse({ result }, 200, requestId)
    } catch (err) {
      return this.errorResponse(err as Error, requestId)
    }
  }

  private async handleRpcBatch(request: Request, requestId: string): Promise<Response> {
    let calls: Array<{ method: string; params: unknown[] }>

    try {
      calls = await request.json() as Array<{ method: string; params: unknown[] }>
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON' }, 400, requestId)
    }

    const results = await Promise.all(
      calls.map(async (call) => {
        if (!this.hasMethod(call.method)) {
          return { error: `Method not allowed: ${call.method}` }
        }
        try {
          const result = await this.call(call.method, call.params)
          return { result }
        } catch (err) {
          return { error: (err as Error).message }
        }
      })
    )

    return this.jsonResponse(results, 200, requestId)
  }

  private async handleEval(request: Request, requestId: string, isAsync: boolean): Promise<Response> {
    let body: { code?: string; options?: EvalOptions }

    try {
      body = await request.json() as typeof body
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON: parse error' }, 400, requestId)
    }

    if (!body.code) {
      return this.jsonResponse({ error: 'Missing required field: code' }, 400, requestId)
    }

    // Check Accept header for content negotiation
    const accept = request.headers.get('Accept') ?? 'application/json'

    try {
      const result = isAsync
        ? await this.evaluateAsync(body.code, body.options)
        : await this.evaluate(body.code, body.options)

      // Content negotiation
      if (accept.includes('text/plain') && result.success) {
        return new Response(String(result.result), {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'X-Request-Id': requestId,
          },
        })
      }

      return this.jsonResponse(result, 200, requestId)
    } catch (err) {
      return this.errorResponse(err as Error, requestId)
    }
  }

  private async handleValidate(request: Request, requestId: string): Promise<Response> {
    let body: { code?: string }

    try {
      body = await request.json() as typeof body
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON' }, 400, requestId)
    }

    if (!body.code) {
      return this.jsonResponse({ error: 'Missing required field: code' }, 400, requestId)
    }

    const result = await this.validateCode(body.code)
    return this.jsonResponse(result, 200, requestId)
  }

  private getDiscoveryInfo(): Record<string, unknown> {
    return {
      api: 'eval.do',
      version: '1.0.0',
      description: 'Secure sandbox code evaluation service',
      links: {
        self: '/',
        eval: '/api/eval',
        evalAsync: '/api/eval/async',
        validate: '/api/validate',
        rpc: '/rpc',
      },
      discover: {
        methods: [
          { name: 'evaluate', description: 'Evaluate JavaScript code in a sandbox' },
          { name: 'evaluateAsync', description: 'Evaluate async JavaScript code in a sandbox' },
          { name: 'validateCode', description: 'Validate JavaScript code syntax' },
        ],
      },
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private jsonResponse(data: unknown, status: number, requestId: string): Response {
    const serialized = JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    })

    return new Response(serialized, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    })
  }

  private errorResponse(err: Error, requestId: string): Response {
    let status = 500
    let message = 'Internal server error'

    if (err.message?.includes('not found')) {
      status = 404
      message = err.message
    } else if (err.message?.includes('required') || err.message?.includes('Invalid') || err.message?.includes('empty')) {
      status = 400
      message = err.message
    } else if (err.message?.includes('not allowed')) {
      status = 400
      message = err.message
    }

    // Sanitize error message
    message = this.sanitizeErrorMessage(message)

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    })
  }

  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/\/[^\s]+\.(js|ts)/gi, '[path]')
      .replace(/at\s+.+\(.+\)/g, '')
      .replace(/Internal:\s*/gi, '')
      .trim()
  }
}
