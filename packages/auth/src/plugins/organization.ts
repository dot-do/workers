// Better Auth organization plugin for multi-tenancy
// Re-exports better-auth organization plugin with workers.do defaults

import { organization as betterAuthOrganization, type OrganizationOptions } from 'better-auth/plugins'

export type { OrganizationOptions }

/**
 * Workers.do-specific organization plugin options
 */
export interface WorkersOrganizationOptions extends Partial<OrganizationOptions> {
  /** Allow users to create organizations (default: true) */
  allowUserCreation?: boolean
  /** Default role for new members (default: 'member') */
  defaultRole?: string
  /** Available roles */
  roles?: string[]
}

/**
 * Organization plugin for multi-tenancy
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { organization } from '@dotdo/auth/plugins/organization'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [
 *     organization({
 *       allowUserCreation: true,
 *       roles: ['owner', 'admin', 'member', 'viewer']
 *     })
 *   ]
 * })
 *
 * // Create organization
 * const org = await auth.api.createOrganization({
 *   name: 'Acme Corp',
 *   slug: 'acme'
 * })
 *
 * // Invite member
 * await auth.api.inviteMember({
 *   organizationId: org.id,
 *   email: 'alice@example.com',
 *   role: 'admin'
 * })
 * ```
 */
export function organization(options: WorkersOrganizationOptions = {}) {
  const {
    allowUserCreation = true,
    defaultRole = 'member',
    roles = ['owner', 'admin', 'member', 'viewer'],
    ...rest
  } = options

  return betterAuthOrganization({
    allowUserToCreateOrganization: allowUserCreation,
    ...rest,
  })
}

export default organization
