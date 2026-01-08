/**
 * @dotdo/rpc-client/env - Environment Management
 *
 * Provides a global environment store that works across:
 * - Cloudflare Workers (env bindings)
 * - Node.js (process.env)
 * - Browser (manual configuration)
 *
 * @example
 * ```typescript
 * // Cloudflare Workers
 * import 'rpc.do/env'
 *
 * // Node.js
 * import 'rpc.do/env/node'
 *
 * // Manual configuration
 * import { setEnv } from '@dotdo/rpc-client/env'
 * setEnv({ DO_API_KEY: 'my-key' })
 * ```
 *
 * @packageDocumentation
 */

/**
 * Type for environment record (string keys with string | undefined values)
 */
export type EnvRecord = Record<string, string | undefined>

/**
 * Global environment store
 * Set once at app entry point, used by all .do SDKs
 */
let globalEnv: EnvRecord | null = null

/**
 * Set the global environment for all .do SDKs
 *
 * Call this once at your app's entry point to configure
 * environment access for all SDK clients.
 *
 * @param env - Environment object (Workers env, process.env, or custom)
 *
 * @example
 * ```typescript
 * // Cloudflare Workers
 * import { env } from 'cloudflare:workers'
 * import { setEnv } from '@dotdo/rpc-client'
 * setEnv(env)
 *
 * // Node.js
 * import { setEnv } from '@dotdo/rpc-client'
 * setEnv(process.env)
 *
 * // Custom
 * import { setEnv } from '@dotdo/rpc-client'
 * setEnv({ DO_API_KEY: 'my-key', DO_TOKEN: 'my-token' })
 * ```
 */
export function setEnv(env: EnvRecord): void {
  globalEnv = env
}

/**
 * Get the global environment
 *
 * Returns the environment set via setEnv(), or null if not configured.
 * SDKs should handle the null case gracefully with helpful errors.
 *
 * @returns The environment record or null
 */
export function getEnv(): EnvRecord | null {
  return globalEnv
}

/**
 * Get a specific environment variable
 *
 * @param key - Environment variable name
 * @returns The value or undefined
 */
export function getEnvVar(key: string): string | undefined {
  return globalEnv?.[key]
}

/**
 * Check if environment is configured
 *
 * @returns true if setEnv() has been called
 */
export function isEnvConfigured(): boolean {
  return globalEnv !== null
}

/**
 * Get effective environment with fallbacks
 *
 * Resolution order:
 * 1. Explicit override parameter
 * 2. Global env set via setEnv()
 * 3. Node.js process.env (auto-detected)
 *
 * @param envOverride - Optional explicit environment override
 * @returns Environment record or null
 */
export function getEffectiveEnv(envOverride?: Record<string, unknown>): Record<string, unknown> | null {
  if (envOverride) return envOverride
  if (globalEnv) return globalEnv

  // Auto-detect Node.js
  if (typeof globalThis !== 'undefined' && (globalThis as { process?: { env?: unknown } }).process?.env) {
    return (globalThis as { process: { env: Record<string, unknown> } }).process.env
  }

  return null
}

/**
 * Reset global environment (mainly for testing)
 */
export function resetEnv(): void {
  globalEnv = null
}
