/**
 * Shared utilities for all Workers services
 * @module @dot-do/worker-utils
 */

import type { ApiResponse, ApiError } from '@dot-do/worker-types'

/**
 * Creates a successful API response
 */
export function success<T>(data: T, meta?: any): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      ...meta,
    },
  }
}

/**
 * Creates an error API response
 */
export function error(code: string, message: string, details?: unknown, status = 500): Response {
  const errorObj: ApiError = {
    code,
    message,
    details,
  }

  const response: ApiResponse = {
    success: false,
    error: errorObj,
    meta: {
      timestamp: Date.now(),
    },
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Wraps an async handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (err) {
      console.error('Handler error:', err)
      return error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error', err, 500)
    }
  }) as T
}

/**
 * Validates required environment variables
 */
export function validateEnv<T extends Record<string, any>>(env: T, required: (keyof T)[]): void {
  const missing = required.filter((key) => !env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Parses JSON with error handling
 */
export async function parseJson<T = any>(request: Request): Promise<T> {
  try {
    return await request.json()
  } catch (err) {
    throw new Error('Invalid JSON body')
  }
}

/**
 * Generates a unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * Delays execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retries an async operation
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    backoff?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const { retries = 3, delay: delayMs = 1000, backoff = 2, onRetry } = options

  let lastError: Error
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < retries) {
        if (onRetry) onRetry(lastError, attempt + 1)
        await delay(delayMs * Math.pow(backoff, attempt))
      }
    }
  }

  throw lastError!
}

/**
 * Converts a string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
}

/**
 * Converts a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Converts a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

/**
 * Safely stringifies an object (handles circular references)
 */
export function safeStringify(obj: any): string {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  })
}

/**
 * Checks if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Picks specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omits specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}
