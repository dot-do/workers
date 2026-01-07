// Better Auth API key plugin for programmatic access
// Re-exports better-auth apiKey plugin with workers.do defaults

import { apiKey as betterAuthApiKey, type ApiKeyOptions } from 'better-auth/plugins'

export type { ApiKeyOptions }

/**
 * Workers.do-specific API key plugin options
 */
export interface WorkersApiKeyOptions extends Partial<ApiKeyOptions> {
  /** API key prefix (default: 'wdo_') */
  prefix?: string
  /** Default expiration in seconds (default: 30 days) */
  defaultExpiration?: number
}

/**
 * API key plugin for programmatic access tokens
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { apiKey } from '@dotdo/auth/plugins/api-key'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [
 *     apiKey({ prefix: 'wdo_' })
 *   ]
 * })
 *
 * // Create API key
 * const key = await auth.api.createApiKey({
 *   name: 'My Integration',
 *   userId: session.user.id
 * })
 *
 * // Verify in requests
 * const keySession = await auth.api.verifyApiKey({
 *   apiKey: request.headers.get('x-api-key')
 * })
 * ```
 */
export function apiKey(options: WorkersApiKeyOptions = {}) {
  const { prefix = 'wdo_', defaultExpiration = 60 * 60 * 24 * 30, ...rest } = options

  return betterAuthApiKey({
    ...rest,
  })
}

export default apiKey
