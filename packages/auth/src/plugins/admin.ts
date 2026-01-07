// Better Auth admin plugin for user management
// Re-exports better-auth admin plugin with workers.do defaults

import { admin as betterAuthAdmin, type AdminOptions } from 'better-auth/plugins'

export type { AdminOptions }

/**
 * Workers.do-specific admin plugin options
 */
export interface WorkersAdminOptions extends Partial<AdminOptions> {
  /** Admin role name (default: 'admin') */
  adminRole?: string
  /** Super admin role (default: 'super_admin') */
  superAdminRole?: string
  /** Require email for admin actions */
  requireAdminEmail?: boolean
}

/**
 * Admin plugin for user management
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { admin } from '@dotdo/auth/plugins/admin'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [
 *     admin({
 *       adminRole: 'admin',
 *       superAdminRole: 'super_admin'
 *     })
 *   ]
 * })
 *
 * // List users (admin only)
 * const users = await auth.api.admin.listUsers({
 *   limit: 50,
 *   offset: 0
 * })
 *
 * // Ban user
 * await auth.api.admin.banUser({
 *   userId: 'user_123',
 *   reason: 'Violation of terms'
 * })
 *
 * // Impersonate user
 * const session = await auth.api.admin.impersonateUser({
 *   userId: 'user_123',
 *   adminId: 'admin_456'
 * })
 * ```
 */
export function admin(options: WorkersAdminOptions = {}) {
  const { adminRole = 'admin', superAdminRole = 'super_admin', requireAdminEmail = true, ...rest } = options

  return betterAuthAdmin({
    ...rest,
  })
}

export default admin
