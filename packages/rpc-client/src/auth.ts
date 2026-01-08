/**
 * @dotdo/rpc-client/auth - Authentication Utilities
 *
 * Provides API key resolution from environment variables:
 * - DO_API_KEY / DO_TOKEN
 * - ORG_AI_API_KEY / ORG_AI_TOKEN
 *
 * Works with both string environment variables and
 * Cloudflare Secrets Store bindings.
 *
 * @packageDocumentation
 */

import { getEffectiveEnv } from './env.js'

/**
 * Cloudflare Secrets Store binding interface
 *
 * When using Cloudflare's Secrets Store, bindings have a .get() method
 * that returns a promise resolving to the secret value.
 */
export interface SecretsBinding {
  get(): Promise<string>
}

/**
 * Environment variable keys checked for API key (in priority order)
 */
export const API_KEY_ENV_VARS = [
  'DO_API_KEY',
  'DO_TOKEN',
  'ORG_AI_API_KEY',
  'ORG_AI_TOKEN',
] as const

/**
 * Get default API key from environment (async version)
 *
 * Supports both string environment variables and Cloudflare Secrets Store
 * bindings (which have a .get() method).
 *
 * Resolution order:
 * 1. Explicit envOverride parameter
 * 2. Global env set via setEnv()
 * 3. Node.js process.env (auto-detected)
 *
 * @param envOverride - Optional explicit environment override
 * @returns Promise resolving to API key or undefined
 *
 * @example
 * ```typescript
 * // Get API key from environment
 * const apiKey = await getDefaultApiKey()
 *
 * // With explicit override
 * const apiKey = await getDefaultApiKey({ DO_API_KEY: 'my-key' })
 *
 * // Works with Cloudflare Secrets Store
 * const apiKey = await getDefaultApiKey(env) // env.DO_API_KEY is a SecretBinding
 * ```
 */
export async function getDefaultApiKey(
  envOverride?: Record<string, unknown>
): Promise<string | undefined> {
  const env = getEffectiveEnv(envOverride)

  if (env) {
    for (const key of API_KEY_ENV_VARS) {
      const binding = env[key]

      // Check for Cloudflare Secrets Store bindings (.get() method)
      if (binding && typeof (binding as SecretsBinding).get === 'function') {
        try {
          return await (binding as SecretsBinding).get()
        } catch {
          // Continue to next key if this one fails
          continue
        }
      }

      // Check for string value
      if (typeof binding === 'string' && binding) {
        return binding
      }
    }
  }

  return undefined
}

/**
 * Get default API key from environment (sync version)
 *
 * Synchronous version for default client initialization.
 * Does not support Cloudflare Secrets Store bindings (use async version for those).
 *
 * Resolution order:
 * 1. Explicit envOverride parameter
 * 2. Global env set via setEnv()
 * 3. Node.js process.env (auto-detected)
 *
 * @param envOverride - Optional explicit environment override
 * @returns API key or undefined
 *
 * @example
 * ```typescript
 * // Get API key synchronously
 * const apiKey = getDefaultApiKeySync()
 *
 * // With explicit override
 * const apiKey = getDefaultApiKeySync({ DO_API_KEY: 'my-key' })
 * ```
 */
export function getDefaultApiKeySync(
  envOverride?: Record<string, string | undefined>
): string | undefined {
  const env = getEffectiveEnv(envOverride)

  if (env) {
    for (const key of API_KEY_ENV_VARS) {
      const value = env[key]
      if (typeof value === 'string' && value) {
        return value
      }
    }
  }

  return undefined
}

/**
 * Validate API key format
 *
 * Basic validation to catch obvious issues before making requests.
 *
 * @param apiKey - API key to validate
 * @returns true if format looks valid
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Must be non-empty string
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  // Must be at least 16 characters (arbitrary minimum for security)
  if (apiKey.length < 16) {
    return false
  }

  // Must not contain obvious placeholder text
  const invalidPatterns = [
    'your-api-key',
    'YOUR_API_KEY',
    'xxx',
    'placeholder',
    'example',
    'test-key',
  ]

  const lowerKey = apiKey.toLowerCase()
  for (const pattern of invalidPatterns) {
    if (lowerKey.includes(pattern)) {
      return false
    }
  }

  return true
}

/**
 * Extract bearer token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token or undefined
 */
export function extractBearerToken(authHeader: string | null | undefined): string | undefined {
  if (!authHeader) return undefined

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]
}

/**
 * Create Authorization header value
 *
 * @param token - Bearer token
 * @returns Authorization header value
 */
export function createAuthHeader(token: string): string {
  return `Bearer ${token}`
}
