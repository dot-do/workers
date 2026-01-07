/**
 * org.do - Organization Durable Object
 *
 * The single source of truth for organization identity, state, and configuration.
 * Extends dotdo to provide multi-tenant organization management:
 *
 * - Organization settings and configuration
 * - Member and role management
 * - SSO/SAML integration
 * - Billing and subscription state
 * - Audit logging
 *
 * @example
 * ```typescript
 * import { Org } from 'org.do'
 *
 * // In your worker
 * export { Org }
 *
 * export default {
 *   async fetch(request, env) {
 *     const orgId = getOrgFromRequest(request)
 *     const stub = env.ORG.get(env.ORG.idFromName(orgId))
 *     return stub.fetch(request)
 *   }
 * }
 * ```
 */

import { DOCore as DO, type DOEnv } from '@dotdo/do-core'
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, like, isNull, sql } from 'drizzle-orm'
import * as schema from './schema'

// Re-export schema for consumers
export * from './schema'

// Types
export interface OrgEnv extends DOEnv {
  // Optional service bindings for integrations
  WORKOS?: unknown
  STRIPE?: unknown
}

export interface CreateOrgInput {
  name: string
  slug: string
  domain?: string
  logoUrl?: string
  settings?: schema.OrganizationSettings
}

export interface InviteMemberInput {
  email: string
  name?: string
  roleId?: string
}

export interface CreateRoleInput {
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateSettingsInput {
  name?: string
  slug?: string
  domain?: string
  logoUrl?: string
  settings?: Partial<schema.OrganizationSettings>
}

export interface SSOConnectionInput {
  type: 'saml' | 'oidc' | 'oauth'
  provider?: string
  config: schema.SSOConfig
  domains?: string[]
}

export interface AuditLogInput {
  action: string
  resource?: string
  resourceId?: string
  changes?: schema.AuditChanges
  metadata?: Record<string, unknown>
}

/**
 * Organization Durable Object
 *
 * Each instance represents one organization. The DO ID is derived from the org ID.
 */
export class Org extends DO<OrgEnv> {
  private _db?: DrizzleD1Database<typeof schema>
  private _orgId?: string
  private _actor?: { id: string; email?: string; ip?: string; type?: 'user' | 'api_key' | 'system' }

  /**
   * Get the Drizzle database instance
   */
  get db(): DrizzleD1Database<typeof schema> {
    if (!this._db) {
      this._db = drizzle(this.ctx.storage.sql as any, { schema })
    }
    return this._db
  }

  /**
   * Get the organization ID for this DO instance
   */
  get orgId(): string {
    if (!this._orgId) {
      this._orgId = this.ctx.id.toString()
    }
    return this._orgId
  }

  /**
   * Set the current actor for audit logging
   */
  setActor(actor: { id: string; email?: string; ip?: string; type?: 'user' | 'api_key' | 'system' }) {
    this._actor = actor
  }

  // ============================================================
  // Organization Management
  // ============================================================

  /**
   * Initialize a new organization
   */
  async createOrg(input: CreateOrgInput): Promise<typeof schema.organizations.$inferSelect> {
    const id = this.orgId
    const org = {
      id,
      name: input.name,
      slug: input.slug,
      domain: input.domain,
      logoUrl: input.logoUrl,
      settings: input.settings ?? {},
    }

    await this.db.insert(schema.organizations).values(org)

    // Create default roles
    await this.createRole({ name: 'Owner', description: 'Full access to organization', permissions: ['*'] })
    await this.createRole({ name: 'Admin', description: 'Manage members and settings', permissions: ['org:admin', 'members:*', 'roles:read'] })
    await this.createRole({ name: 'Member', description: 'Basic member access', permissions: ['org:read', 'members:read'] })

    // Create default subscription (free tier)
    await this.db.insert(schema.subscriptions).values({
      id: `sub_${id}`,
      organizationId: id,
      plan: 'free',
      status: 'active',
      seats: 5,
      seatsUsed: 0,
    })

    await this.log({ action: 'organization.created', resourceId: id })

    return org as typeof schema.organizations.$inferSelect
  }

  /**
   * Get organization details
   */
  async getOrg(): Promise<typeof schema.organizations.$inferSelect | null> {
    const result = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, this.orgId))
    return result[0] ?? null
  }

  /**
   * Update organization settings
   */
  async updateOrg(input: UpdateSettingsInput): Promise<typeof schema.organizations.$inferSelect | null> {
    const current = await this.getOrg()
    if (!current) return null

    const updates: Partial<typeof schema.organizations.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (input.name !== undefined) updates.name = input.name
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.domain !== undefined) updates.domain = input.domain
    if (input.logoUrl !== undefined) updates.logoUrl = input.logoUrl
    if (input.settings !== undefined) {
      updates.settings = { ...current.settings, ...input.settings }
    }

    await this.db.update(schema.organizations)
      .set(updates)
      .where(eq(schema.organizations.id, this.orgId))

    await this.log({
      action: 'organization.updated',
      resourceId: this.orgId,
      changes: { before: current, after: { ...current, ...updates } },
    })

    return this.getOrg()
  }

  /**
   * Delete the organization and all associated data
   */
  async deleteOrg(): Promise<void> {
    await this.log({ action: 'organization.deleted', resourceId: this.orgId })
    await this.db.delete(schema.organizations).where(eq(schema.organizations.id, this.orgId))
  }

  // ============================================================
  // Member Management
  // ============================================================

  /**
   * Invite a new member to the organization
   */
  async inviteMember(input: InviteMemberInput): Promise<typeof schema.members.$inferSelect> {
    const id = `mem_${crypto.randomUUID()}`

    // Check seat limit
    const subscription = await this.getSubscription()
    if (subscription && subscription.seatsUsed >= subscription.seats) {
      throw new Error('Seat limit reached. Please upgrade your plan.')
    }

    const member = {
      id,
      organizationId: this.orgId,
      userId: '', // Set when they accept the invite
      email: input.email,
      name: input.name,
      roleId: input.roleId ?? (await this.getDefaultRole())?.id,
      status: 'invited' as const,
      invitedAt: new Date(),
    }

    await this.db.insert(schema.members).values(member)

    // Update seat count
    if (subscription) {
      await this.db.update(schema.subscriptions)
        .set({ seatsUsed: sql`${schema.subscriptions.seatsUsed} + 1` })
        .where(eq(schema.subscriptions.organizationId, this.orgId))
    }

    await this.log({
      action: 'member.invited',
      resource: 'member',
      resourceId: id,
      metadata: { email: input.email },
    })

    return member as typeof schema.members.$inferSelect
  }

  /**
   * Accept an invitation and link to a user ID
   */
  async acceptInvite(memberId: string, userId: string): Promise<typeof schema.members.$inferSelect | null> {
    await this.db.update(schema.members)
      .set({
        userId,
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.members.id, memberId),
        eq(schema.members.organizationId, this.orgId),
        eq(schema.members.status, 'invited'),
      ))

    await this.log({ action: 'member.joined', resource: 'member', resourceId: memberId })

    return this.getMember(memberId)
  }

  /**
   * Get a member by ID
   */
  async getMember(memberId: string): Promise<typeof schema.members.$inferSelect | null> {
    const result = await this.db.select().from(schema.members)
      .where(and(
        eq(schema.members.id, memberId),
        eq(schema.members.organizationId, this.orgId),
      ))
    return result[0] ?? null
  }

  /**
   * Get a member by user ID
   */
  async getMemberByUserId(userId: string): Promise<typeof schema.members.$inferSelect | null> {
    const result = await this.db.select().from(schema.members)
      .where(and(
        eq(schema.members.userId, userId),
        eq(schema.members.organizationId, this.orgId),
      ))
    return result[0] ?? null
  }

  /**
   * List all members in the organization
   */
  async listMembers(options?: { status?: 'active' | 'invited' | 'suspended' | 'deactivated'; limit?: number; offset?: number }): Promise<typeof schema.members.$inferSelect[]> {
    let query = this.db.select().from(schema.members)
      .where(eq(schema.members.organizationId, this.orgId))

    if (options?.status) {
      query = query.where(eq(schema.members.status, options.status)) as any
    }

    return query.limit(options?.limit ?? 100).offset(options?.offset ?? 0)
  }

  /**
   * Update a member's role or status
   */
  async updateMember(memberId: string, updates: { roleId?: string; status?: 'active' | 'suspended' | 'deactivated' }): Promise<typeof schema.members.$inferSelect | null> {
    const current = await this.getMember(memberId)
    if (!current) return null

    await this.db.update(schema.members)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(schema.members.id, memberId),
        eq(schema.members.organizationId, this.orgId),
      ))

    await this.log({
      action: 'member.updated',
      resource: 'member',
      resourceId: memberId,
      changes: { before: current, after: { ...current, ...updates } },
    })

    return this.getMember(memberId)
  }

  /**
   * Remove a member from the organization
   */
  async removeMember(memberId: string): Promise<void> {
    const member = await this.getMember(memberId)
    if (!member) return

    await this.db.delete(schema.members)
      .where(and(
        eq(schema.members.id, memberId),
        eq(schema.members.organizationId, this.orgId),
      ))

    // Update seat count
    await this.db.update(schema.subscriptions)
      .set({ seatsUsed: sql`MAX(0, ${schema.subscriptions.seatsUsed} - 1)` })
      .where(eq(schema.subscriptions.organizationId, this.orgId))

    await this.log({
      action: 'member.removed',
      resource: 'member',
      resourceId: memberId,
      metadata: { email: member.email },
    })
  }

  // ============================================================
  // Role Management
  // ============================================================

  /**
   * Create a new role
   */
  async createRole(input: CreateRoleInput): Promise<typeof schema.roles.$inferSelect> {
    const id = `role_${crypto.randomUUID()}`

    const role = {
      id,
      organizationId: this.orgId,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isBuiltIn: false,
    }

    await this.db.insert(schema.roles).values(role)

    await this.log({ action: 'role.created', resource: 'role', resourceId: id })

    return role as typeof schema.roles.$inferSelect
  }

  /**
   * Get a role by ID
   */
  async getRole(roleId: string): Promise<typeof schema.roles.$inferSelect | null> {
    const result = await this.db.select().from(schema.roles)
      .where(and(
        eq(schema.roles.id, roleId),
        eq(schema.roles.organizationId, this.orgId),
      ))
    return result[0] ?? null
  }

  /**
   * Get the default role for new members
   */
  async getDefaultRole(): Promise<typeof schema.roles.$inferSelect | null> {
    const org = await this.getOrg()
    if (org?.settings?.defaultRole) {
      return this.getRole(org.settings.defaultRole)
    }

    // Fall back to "Member" role
    const result = await this.db.select().from(schema.roles)
      .where(and(
        eq(schema.roles.organizationId, this.orgId),
        eq(schema.roles.name, 'Member'),
      ))
    return result[0] ?? null
  }

  /**
   * List all roles in the organization
   */
  async listRoles(): Promise<typeof schema.roles.$inferSelect[]> {
    return this.db.select().from(schema.roles)
      .where(eq(schema.roles.organizationId, this.orgId))
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<typeof schema.roles.$inferSelect | null> {
    const current = await this.getRole(roleId)
    if (!current) return null

    // Don't allow modifying built-in roles
    if (current.isBuiltIn) {
      throw new Error('Cannot modify built-in roles')
    }

    await this.db.update(schema.roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(schema.roles.id, roleId),
        eq(schema.roles.organizationId, this.orgId),
      ))

    await this.log({
      action: 'role.updated',
      resource: 'role',
      resourceId: roleId,
      changes: { before: current, after: { ...current, ...updates } },
    })

    return this.getRole(roleId)
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.getRole(roleId)
    if (!role) return

    if (role.isBuiltIn) {
      throw new Error('Cannot delete built-in roles')
    }

    await this.db.delete(schema.roles)
      .where(and(
        eq(schema.roles.id, roleId),
        eq(schema.roles.organizationId, this.orgId),
      ))

    await this.log({ action: 'role.deleted', resource: 'role', resourceId: roleId })
  }

  /**
   * Check if a member has a specific permission
   */
  async hasPermission(memberId: string, permission: string): Promise<boolean> {
    const member = await this.getMember(memberId)
    if (!member?.roleId) return false

    const role = await this.getRole(member.roleId)
    if (!role) return false

    // Check for wildcard or exact match
    return role.permissions?.some(p =>
      p === '*' ||
      p === permission ||
      (p.endsWith(':*') && permission.startsWith(p.slice(0, -1)))
    ) ?? false
  }

  // ============================================================
  // SSO/SAML Management
  // ============================================================

  /**
   * Configure an SSO connection
   */
  async configureSso(input: SSOConnectionInput): Promise<typeof schema.ssoConnections.$inferSelect> {
    const id = `sso_${crypto.randomUUID()}`

    const connection = {
      id,
      organizationId: this.orgId,
      type: input.type,
      provider: input.provider,
      config: input.config,
      domains: input.domains ?? [],
      status: 'pending' as const,
    }

    await this.db.insert(schema.ssoConnections).values(connection)

    await this.log({ action: 'sso.configured', resource: 'sso_connection', resourceId: id })

    return connection as typeof schema.ssoConnections.$inferSelect
  }

  /**
   * Activate an SSO connection
   */
  async activateSso(connectionId: string): Promise<typeof schema.ssoConnections.$inferSelect | null> {
    await this.db.update(schema.ssoConnections)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(
        eq(schema.ssoConnections.id, connectionId),
        eq(schema.ssoConnections.organizationId, this.orgId),
      ))

    await this.log({ action: 'sso.activated', resource: 'sso_connection', resourceId: connectionId })

    return this.getSsoConnection(connectionId)
  }

  /**
   * Get an SSO connection
   */
  async getSsoConnection(connectionId: string): Promise<typeof schema.ssoConnections.$inferSelect | null> {
    const result = await this.db.select().from(schema.ssoConnections)
      .where(and(
        eq(schema.ssoConnections.id, connectionId),
        eq(schema.ssoConnections.organizationId, this.orgId),
      ))
    return result[0] ?? null
  }

  /**
   * Get active SSO connection for a domain
   */
  async getSsoByDomain(domain: string): Promise<typeof schema.ssoConnections.$inferSelect | null> {
    const connections = await this.db.select().from(schema.ssoConnections)
      .where(and(
        eq(schema.ssoConnections.organizationId, this.orgId),
        eq(schema.ssoConnections.status, 'active'),
      ))

    return connections.find(c => c.domains?.includes(domain)) ?? null
  }

  /**
   * List all SSO connections
   */
  async listSsoConnections(): Promise<typeof schema.ssoConnections.$inferSelect[]> {
    return this.db.select().from(schema.ssoConnections)
      .where(eq(schema.ssoConnections.organizationId, this.orgId))
  }

  /**
   * Delete an SSO connection
   */
  async deleteSsoConnection(connectionId: string): Promise<void> {
    await this.db.delete(schema.ssoConnections)
      .where(and(
        eq(schema.ssoConnections.id, connectionId),
        eq(schema.ssoConnections.organizationId, this.orgId),
      ))

    await this.log({ action: 'sso.deleted', resource: 'sso_connection', resourceId: connectionId })
  }

  // ============================================================
  // Billing & Subscription Management
  // ============================================================

  /**
   * Get the organization's subscription
   */
  async getSubscription(): Promise<typeof schema.subscriptions.$inferSelect | null> {
    const result = await this.db.select().from(schema.subscriptions)
      .where(eq(schema.subscriptions.organizationId, this.orgId))
    return result[0] ?? null
  }

  /**
   * Update subscription (typically called from Stripe webhook)
   */
  async updateSubscription(updates: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    plan?: 'free' | 'starter' | 'pro' | 'enterprise'
    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
    seats?: number
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    trialEnd?: Date
    cancelAt?: Date
  }): Promise<typeof schema.subscriptions.$inferSelect | null> {
    const current = await this.getSubscription()
    if (!current) return null

    await this.db.update(schema.subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.subscriptions.organizationId, this.orgId))

    await this.log({
      action: 'subscription.updated',
      resource: 'subscription',
      resourceId: current.id,
      changes: { before: current, after: { ...current, ...updates } },
    })

    return this.getSubscription()
  }

  /**
   * Check if the organization can add more seats
   */
  async canAddSeat(): Promise<boolean> {
    const subscription = await this.getSubscription()
    if (!subscription) return false
    return subscription.seatsUsed < subscription.seats
  }

  /**
   * Get plan limits and usage
   */
  async getPlanUsage(): Promise<{
    plan: string
    seats: { used: number; limit: number }
    status: string
    periodEnd?: Date
  }> {
    const subscription = await this.getSubscription()
    if (!subscription) {
      return { plan: 'free', seats: { used: 0, limit: 5 }, status: 'active' }
    }

    return {
      plan: subscription.plan,
      seats: { used: subscription.seatsUsed, limit: subscription.seats },
      status: subscription.status,
      periodEnd: subscription.currentPeriodEnd ?? undefined,
    }
  }

  // ============================================================
  // Audit Logging
  // ============================================================

  /**
   * Log an audit event
   */
  async log(input: AuditLogInput): Promise<void> {
    const id = `audit_${crypto.randomUUID()}`

    await this.db.insert(schema.auditLogs).values({
      id,
      organizationId: this.orgId,
      actorId: this._actor?.id ?? 'system',
      actorType: this._actor?.type ?? 'system',
      actorEmail: this._actor?.email,
      actorIp: this._actor?.ip,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      changes: input.changes,
      metadata: input.metadata,
    })
  }

  /**
   * Get audit logs with optional filters
   */
  async getAuditLogs(options?: {
    action?: string
    resource?: string
    actorId?: string
    limit?: number
    offset?: number
    since?: Date
    until?: Date
  }): Promise<typeof schema.auditLogs.$inferSelect[]> {
    let query = this.db.select().from(schema.auditLogs)
      .where(eq(schema.auditLogs.organizationId, this.orgId))

    // Additional filters would be applied here
    // For now, just basic org filtering

    return query
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0)
  }

  // ============================================================
  // API Key Management
  // ============================================================

  /**
   * Create an API key
   */
  async createApiKey(input: {
    name: string
    permissions?: string[]
    expiresAt?: Date
  }): Promise<{ key: string; apiKey: typeof schema.apiKeys.$inferSelect }> {
    const id = `key_${crypto.randomUUID()}`
    const rawKey = `org_${crypto.randomUUID().replace(/-/g, '')}`
    const keyHash = await this.hashKey(rawKey)
    const keyPrefix = rawKey.slice(0, 12)

    const apiKey = {
      id,
      organizationId: this.orgId,
      name: input.name,
      keyHash,
      keyPrefix,
      permissions: input.permissions ?? [],
      expiresAt: input.expiresAt,
      createdBy: this._actor?.id,
    }

    await this.db.insert(schema.apiKeys).values(apiKey)

    await this.log({ action: 'api_key.created', resource: 'api_key', resourceId: id })

    // Return the raw key only once - it cannot be retrieved again
    return { key: rawKey, apiKey: apiKey as typeof schema.apiKeys.$inferSelect }
  }

  /**
   * Validate an API key and return its details
   */
  async validateApiKey(rawKey: string): Promise<typeof schema.apiKeys.$inferSelect | null> {
    const keyHash = await this.hashKey(rawKey)

    const result = await this.db.select().from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.organizationId, this.orgId),
        isNull(schema.apiKeys.revokedAt),
      ))

    const apiKey = result[0]
    if (!apiKey) return null

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null
    }

    // Update last used
    await this.db.update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, apiKey.id))

    return apiKey
  }

  /**
   * List API keys (without secrets)
   */
  async listApiKeys(): Promise<typeof schema.apiKeys.$inferSelect[]> {
    return this.db.select().from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.organizationId, this.orgId),
        isNull(schema.apiKeys.revokedAt),
      ))
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await this.db.update(schema.apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(schema.apiKeys.id, keyId),
        eq(schema.apiKeys.organizationId, this.orgId),
      ))

    await this.log({ action: 'api_key.revoked', resource: 'api_key', resourceId: keyId })
  }

  /**
   * Hash an API key for storage
   */
  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

// Backwards compatibility alias
export { Org as OrgDO }

export default Org
