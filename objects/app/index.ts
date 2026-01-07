/**
 * app.do - Complete app state management in one Durable Object
 *
 * A Durable Object for managing app-level state including users,
 * preferences, sessions, feature flags, analytics, and multi-tenant data.
 * Built on dotdo with full agentic capabilities.
 */

import { DO } from 'dotdo'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, gte, lte, isNull, sql } from 'drizzle-orm'
import * as schema from './schema'

// Re-export schema for convenience
export * from './schema'

// Type aliases for convenience
type User = typeof schema.users.$inferSelect
type NewUser = typeof schema.users.$inferInsert
type Preference = typeof schema.preferences.$inferSelect
type NewPreference = typeof schema.preferences.$inferInsert
type Session = typeof schema.sessions.$inferSelect
type NewSession = typeof schema.sessions.$inferInsert
type Config = typeof schema.config.$inferSelect
type FeatureFlag = typeof schema.featureFlags.$inferSelect
type NewFeatureFlag = typeof schema.featureFlags.$inferInsert
type AnalyticsEvent = typeof schema.analyticsEvents.$inferSelect
type AnalyticsMetrics = typeof schema.analyticsMetrics.$inferSelect
type Tenant = typeof schema.tenants.$inferSelect
type NewTenant = typeof schema.tenants.$inferInsert
type TenantMembership = typeof schema.tenantMemberships.$inferSelect

export interface AppEnv {
  ORG?: { users: { get: (id: string) => Promise<any> } }
  LLM?: { complete: (opts: any) => Promise<any> }
}

/**
 * App Durable Object
 *
 * Manages a complete app with:
 * - User profiles and authentication state
 * - User preferences and settings
 * - Active sessions tracking
 * - App configuration
 * - Feature flags with targeting
 * - Analytics events and metrics
 * - Multi-tenant support
 * - Activity logging for audit trails
 */
export class App extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })
  declare env: AppEnv
  private appId: string = ''

  /**
   * Initialize the App DO with an app ID
   */
  async init(appId: string): Promise<void> {
    this.appId = appId
  }

  // ===================
  // User Management
  // ===================

  /**
   * Create a new user
   */
  async createUser(data: Omit<NewUser, 'id' | 'appId' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = crypto.randomUUID()
    const [user] = await this.db
      .insert(schema.users)
      .values({ id, appId: this.appId, ...data })
      .returning()

    await this.log('user.created', 'user', id, { email: data.email })
    return user
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.appId, this.appId)))
    return user
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.appId, this.appId)))
    return user
  }

  /**
   * Get user by external ID (from auth provider)
   */
  async getUserByExternalId(externalId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.externalId, externalId), eq(schema.users.appId, this.appId)))
    return user
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<NewUser>): Promise<User> {
    const [user] = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.users.id, id), eq(schema.users.appId, this.appId)))
      .returning()

    await this.log('user.updated', 'user', id, data)
    return user
  }

  /**
   * Update user's last login timestamp
   */
  async recordLogin(userId: string): Promise<User> {
    const [user] = await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning()

    await this.log('user.login', 'user', userId)
    return user
  }

  /**
   * Soft delete a user
   */
  async deleteUser(id: string): Promise<User> {
    const [user] = await this.db
      .update(schema.users)
      .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning()

    await this.log('user.deleted', 'user', id)
    return user
  }

  /**
   * List users with optional filters
   */
  async listUsers(options?: {
    role?: string
    status?: string
    includeDeleted?: boolean
    limit?: number
    offset?: number
  }): Promise<User[]> {
    const conditions = [eq(schema.users.appId, this.appId)]

    if (options?.role) {
      conditions.push(eq(schema.users.role, options.role))
    }
    if (options?.status) {
      conditions.push(eq(schema.users.status, options.status))
    }
    if (!options?.includeDeleted) {
      conditions.push(isNull(schema.users.deletedAt))
    }

    let query = this.db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(desc(schema.users.createdAt))

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.offset(options.offset)
    }

    return query
  }

  // ===================
  // Preferences
  // ===================

  /**
   * Set a user preference
   */
  async setPreference(
    userId: string,
    key: string,
    value: unknown,
    category = 'general'
  ): Promise<Preference> {
    const id = crypto.randomUUID()
    const [preference] = await this.db
      .insert(schema.preferences)
      .values({ id, userId, key, value: JSON.stringify(value), category })
      .onConflictDoUpdate({
        target: [schema.preferences.userId, schema.preferences.key],
        set: { value: JSON.stringify(value), category, updatedAt: new Date() },
      })
      .returning()

    await this.log('preference.set', 'preference', preference.id, { userId, key, category })
    return preference
  }

  /**
   * Get a user preference
   */
  async getPreference<T = unknown>(userId: string, key: string): Promise<T | undefined> {
    const [preference] = await this.db
      .select()
      .from(schema.preferences)
      .where(and(eq(schema.preferences.userId, userId), eq(schema.preferences.key, key)))
    return preference?.value as T | undefined
  }

  /**
   * Get all preferences for a user
   */
  async getPreferences(userId: string, category?: string): Promise<Preference[]> {
    const conditions = [eq(schema.preferences.userId, userId)]
    if (category) {
      conditions.push(eq(schema.preferences.category, category))
    }
    return this.db.select().from(schema.preferences).where(and(...conditions))
  }

  /**
   * Delete a preference
   */
  async deletePreference(userId: string, key: string): Promise<void> {
    await this.db
      .delete(schema.preferences)
      .where(and(eq(schema.preferences.userId, userId), eq(schema.preferences.key, key)))
    await this.log('preference.deleted', 'preference', undefined, { userId, key })
  }

  // ===================
  // Sessions
  // ===================

  /**
   * Create a new session
   */
  async createSession(
    data: Omit<NewSession, 'id' | 'createdAt' | 'lastActiveAt'>
  ): Promise<Session> {
    const id = crypto.randomUUID()
    const [session] = await this.db
      .insert(schema.sessions)
      .values({ id, ...data })
      .returning()

    await this.log('session.created', 'session', id, { userId: data.userId })
    return session
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.token, token), isNull(schema.sessions.revokedAt)))
    return session
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          isNull(schema.sessions.revokedAt),
          gte(schema.sessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(schema.sessions.lastActiveAt))
  }

  /**
   * Update session activity
   */
  async touchSession(sessionId: string): Promise<Session> {
    const [session] = await this.db
      .update(schema.sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(schema.sessions.id, sessionId))
      .returning()
    return session
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<Session> {
    const [session] = await this.db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId))
      .returning()

    await this.log('session.revoked', 'session', sessionId)
    return session
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)))

    await this.log('session.revoked_all', 'session', undefined, { userId })
    return result.changes ?? 0
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(schema.sessions)
      .where(lte(schema.sessions.expiresAt, new Date()))
    return result.changes ?? 0
  }

  // ===================
  // App Configuration
  // ===================

  /**
   * Set an app config value
   */
  async setConfig(
    key: string,
    value: unknown,
    options?: { category?: string; description?: string; isSecret?: boolean }
  ): Promise<Config> {
    const id = crypto.randomUUID()
    const [config] = await this.db
      .insert(schema.config)
      .values({
        id,
        appId: this.appId,
        key,
        value: JSON.stringify(value),
        category: options?.category ?? 'general',
        description: options?.description,
        isSecret: options?.isSecret ?? false,
      })
      .onConflictDoUpdate({
        target: [schema.config.appId, schema.config.key],
        set: {
          value: JSON.stringify(value),
          category: options?.category,
          description: options?.description,
          isSecret: options?.isSecret,
          updatedAt: new Date(),
        },
      })
      .returning()

    await this.log('config.set', 'config', config.id, { key, category: options?.category })
    return config
  }

  /**
   * Get an app config value
   */
  async getConfig<T = unknown>(key: string): Promise<T | undefined> {
    const [config] = await this.db
      .select()
      .from(schema.config)
      .where(and(eq(schema.config.appId, this.appId), eq(schema.config.key, key)))
    return config?.value as T | undefined
  }

  /**
   * Get all app config
   */
  async getAllConfig(category?: string): Promise<Config[]> {
    const conditions = [eq(schema.config.appId, this.appId)]
    if (category) {
      conditions.push(eq(schema.config.category, category))
    }
    return this.db.select().from(schema.config).where(and(...conditions))
  }

  /**
   * Delete a config value
   */
  async deleteConfig(key: string): Promise<void> {
    await this.db
      .delete(schema.config)
      .where(and(eq(schema.config.appId, this.appId), eq(schema.config.key, key)))
    await this.log('config.deleted', 'config', undefined, { key })
  }

  // ===================
  // Feature Flags
  // ===================

  /**
   * Create or update a feature flag
   */
  async setFeatureFlag(
    key: string,
    data: Omit<NewFeatureFlag, 'id' | 'appId' | 'key' | 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const id = crypto.randomUUID()
    const [flag] = await this.db
      .insert(schema.featureFlags)
      .values({ id, appId: this.appId, key, ...data })
      .onConflictDoUpdate({
        target: schema.featureFlags.key,
        set: { ...data, updatedAt: new Date() },
      })
      .returning()

    await this.log('feature_flag.set', 'feature_flag', flag.id, { key, enabled: data.enabled })
    return flag
  }

  /**
   * Get a feature flag
   */
  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await this.db
      .select()
      .from(schema.featureFlags)
      .where(and(eq(schema.featureFlags.appId, this.appId), eq(schema.featureFlags.key, key)))
    return flag
  }

  /**
   * Check if a feature is enabled for a user
   */
  async isFeatureEnabled(key: string, userId?: string, tenantId?: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(key)
    if (!flag) return false
    if (!flag.enabled) return false

    // Check if user is specifically targeted
    if (userId && flag.targetUserIds) {
      const targetUsers = flag.targetUserIds as string[]
      if (targetUsers.includes(userId)) return true
    }

    // Check if tenant is specifically targeted
    if (tenantId && flag.targetTenants) {
      const targetTenants = flag.targetTenants as string[]
      if (targetTenants.includes(tenantId)) return true
    }

    // Check role-based targeting
    if (userId && flag.targetRoles) {
      const user = await this.getUser(userId)
      if (user && (flag.targetRoles as string[]).includes(user.role ?? 'user')) {
        return true
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
      if (!userId) return false
      // Consistent hashing for rollout
      const hash = await this.hashString(`${key}:${userId}`)
      return (hash % 100) < flag.rolloutPercentage
    }

    // Flag is enabled globally
    return flag.rolloutPercentage === 100 || flag.rolloutPercentage === undefined
  }

  /**
   * List all feature flags
   */
  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.db
      .select()
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.appId, this.appId))
      .orderBy(schema.featureFlags.key)
  }

  /**
   * Delete a feature flag
   */
  async deleteFeatureFlag(key: string): Promise<void> {
    await this.db
      .delete(schema.featureFlags)
      .where(and(eq(schema.featureFlags.appId, this.appId), eq(schema.featureFlags.key, key)))
    await this.log('feature_flag.deleted', 'feature_flag', undefined, { key })
  }

  // ===================
  // Analytics
  // ===================

  /**
   * Track an analytics event
   */
  async trackEvent(
    event: string,
    data?: {
      userId?: string
      sessionId?: string
      category?: string
      properties?: Record<string, unknown>
      page?: string
      referrer?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<AnalyticsEvent> {
    const id = crypto.randomUUID()
    const [analyticsEvent] = await this.db
      .insert(schema.analyticsEvents)
      .values({
        id,
        appId: this.appId,
        event,
        userId: data?.userId,
        sessionId: data?.sessionId,
        category: data?.category,
        properties: data?.properties ? JSON.stringify(data.properties) : null,
        page: data?.page,
        referrer: data?.referrer,
        ipAddress: data?.ipAddress,
        userAgent: data?.userAgent,
      })
      .returning()

    return analyticsEvent
  }

  /**
   * Get analytics events with filters
   */
  async getEvents(options?: {
    event?: string
    userId?: string
    category?: string
    since?: Date
    until?: Date
    limit?: number
  }): Promise<AnalyticsEvent[]> {
    const conditions = [eq(schema.analyticsEvents.appId, this.appId)]

    if (options?.event) {
      conditions.push(eq(schema.analyticsEvents.event, options.event))
    }
    if (options?.userId) {
      conditions.push(eq(schema.analyticsEvents.userId, options.userId))
    }
    if (options?.category) {
      conditions.push(eq(schema.analyticsEvents.category, options.category))
    }
    if (options?.since) {
      conditions.push(gte(schema.analyticsEvents.timestamp, options.since))
    }
    if (options?.until) {
      conditions.push(lte(schema.analyticsEvents.timestamp, options.until))
    }

    let query = this.db
      .select()
      .from(schema.analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsEvents.timestamp))

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    return query
  }

  /**
   * Record aggregated metrics for a period
   */
  async recordMetrics(
    period: string,
    data: Omit<typeof schema.analyticsMetrics.$inferInsert, 'id' | 'appId' | 'period' | 'createdAt'>
  ): Promise<AnalyticsMetrics> {
    const id = crypto.randomUUID()
    const [metrics] = await this.db
      .insert(schema.analyticsMetrics)
      .values({ id, appId: this.appId, period, ...data })
      .onConflictDoUpdate({
        target: [schema.analyticsMetrics.appId, schema.analyticsMetrics.period],
        set: data,
      })
      .returning()

    return metrics
  }

  /**
   * Get metrics for a period range
   */
  async getMetrics(startPeriod: string, endPeriod?: string): Promise<AnalyticsMetrics[]> {
    const conditions = [
      eq(schema.analyticsMetrics.appId, this.appId),
      gte(schema.analyticsMetrics.period, startPeriod),
    ]
    if (endPeriod) {
      conditions.push(lte(schema.analyticsMetrics.period, endPeriod))
    }

    return this.db
      .select()
      .from(schema.analyticsMetrics)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsMetrics.period))
  }

  /**
   * Get current analytics snapshot
   */
  async getAnalyticsSummary(): Promise<{
    totalUsers: number
    activeUsers: number
    totalSessions: number
    activeSessions: number
  }> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(and(eq(schema.users.appId, this.appId), isNull(schema.users.deletedAt)))

    const [activeUsers] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.appId, this.appId),
          isNull(schema.users.deletedAt),
          gte(schema.users.lastLoginAt, thirtyDaysAgo)
        )
      )

    const [totalSessions] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.sessions)

    const [activeSessions] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.sessions)
      .where(and(isNull(schema.sessions.revokedAt), gte(schema.sessions.expiresAt, now)))

    return {
      totalUsers: totalUsers?.count ?? 0,
      activeUsers: activeUsers?.count ?? 0,
      totalSessions: totalSessions?.count ?? 0,
      activeSessions: activeSessions?.count ?? 0,
    }
  }

  // ===================
  // Multi-Tenant
  // ===================

  /**
   * Create a tenant
   */
  async createTenant(data: Omit<NewTenant, 'id' | 'appId' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const id = crypto.randomUUID()
    const [tenant] = await this.db
      .insert(schema.tenants)
      .values({ id, appId: this.appId, ...data })
      .returning()

    await this.log('tenant.created', 'tenant', id, { name: data.name, slug: data.slug })
    return tenant
  }

  /**
   * Get tenant by ID
   */
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(and(eq(schema.tenants.id, id), eq(schema.tenants.appId, this.appId)))
    return tenant
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(and(eq(schema.tenants.slug, slug), eq(schema.tenants.appId, this.appId)))
    return tenant
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, data: Partial<NewTenant>): Promise<Tenant> {
    const [tenant] = await this.db
      .update(schema.tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.tenants.id, id), eq(schema.tenants.appId, this.appId)))
      .returning()

    await this.log('tenant.updated', 'tenant', id, data)
    return tenant
  }

  /**
   * List tenants
   */
  async listTenants(includeDeleted = false): Promise<Tenant[]> {
    const conditions = [eq(schema.tenants.appId, this.appId)]
    if (!includeDeleted) {
      conditions.push(isNull(schema.tenants.deletedAt))
    }
    return this.db
      .select()
      .from(schema.tenants)
      .where(and(...conditions))
      .orderBy(schema.tenants.name)
  }

  /**
   * Add user to tenant
   */
  async addUserToTenant(
    tenantId: string,
    userId: string,
    role = 'member'
  ): Promise<TenantMembership> {
    const id = crypto.randomUUID()
    const [membership] = await this.db
      .insert(schema.tenantMemberships)
      .values({ id, tenantId, userId, role })
      .returning()

    await this.log('tenant.user_added', 'tenant_membership', id, { tenantId, userId, role })
    return membership
  }

  /**
   * Get tenant members
   */
  async getTenantMembers(tenantId: string, includeRemoved = false): Promise<TenantMembership[]> {
    const conditions = [eq(schema.tenantMemberships.tenantId, tenantId)]
    if (!includeRemoved) {
      conditions.push(isNull(schema.tenantMemberships.removedAt))
    }
    return this.db
      .select()
      .from(schema.tenantMemberships)
      .where(and(...conditions))
  }

  /**
   * Get user's tenants
   */
  async getUserTenants(userId: string): Promise<Tenant[]> {
    const memberships = await this.db
      .select()
      .from(schema.tenantMemberships)
      .where(and(eq(schema.tenantMemberships.userId, userId), isNull(schema.tenantMemberships.removedAt)))

    const tenantIds = memberships.map((m) => m.tenantId)
    if (tenantIds.length === 0) return []

    return this.db
      .select()
      .from(schema.tenants)
      .where(and(eq(schema.tenants.appId, this.appId), isNull(schema.tenants.deletedAt)))
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(tenantId: string, userId: string): Promise<TenantMembership> {
    const [membership] = await this.db
      .update(schema.tenantMemberships)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(schema.tenantMemberships.tenantId, tenantId),
          eq(schema.tenantMemberships.userId, userId)
        )
      )
      .returning()

    await this.log('tenant.user_removed', 'tenant_membership', membership.id, { tenantId, userId })
    return membership
  }

  // ===================
  // Activity Log
  // ===================

  /**
   * Log an activity
   */
  async log(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    actor?: { userId?: string; tenantId?: string; type?: 'user' | 'system' | 'ai' | 'api' }
  ): Promise<void> {
    const id = crypto.randomUUID()
    await this.db.insert(schema.activityLog).values({
      id,
      appId: this.appId,
      tenantId: actor?.tenantId,
      userId: actor?.userId,
      actorType: actor?.type ?? 'system',
      action,
      resource,
      resourceId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  }

  /**
   * Get activity log
   */
  async getActivityLog(options?: {
    tenantId?: string
    userId?: string
    resource?: string
    limit?: number
    offset?: number
  }): Promise<(typeof schema.activityLog.$inferSelect)[]> {
    const conditions = [eq(schema.activityLog.appId, this.appId)]

    if (options?.tenantId) {
      conditions.push(eq(schema.activityLog.tenantId, options.tenantId))
    }
    if (options?.userId) {
      conditions.push(eq(schema.activityLog.userId, options.userId))
    }
    if (options?.resource) {
      conditions.push(eq(schema.activityLog.resource, options.resource))
    }

    let query = this.db
      .select()
      .from(schema.activityLog)
      .where(and(...conditions))
      .orderBy(desc(schema.activityLog.createdAt))

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.offset(options.offset)
    }

    return query
  }

  // ===================
  // Dashboard
  // ===================

  /**
   * Get a full app dashboard snapshot
   */
  async getDashboard() {
    const [analytics, featureFlags, config, recentActivity] = await Promise.all([
      this.getAnalyticsSummary(),
      this.listFeatureFlags(),
      this.getAllConfig(),
      this.getActivityLog({ limit: 10 }),
    ])

    return {
      analytics,
      featureFlags: {
        total: featureFlags.length,
        enabled: featureFlags.filter((f) => f.enabled).length,
        flags: featureFlags,
      },
      config: config.filter((c) => !c.isSecret),
      recentActivity,
    }
  }

  // ===================
  // Helpers
  // ===================

  /**
   * Simple hash function for consistent rollout
   */
  private async hashString(str: string): Promise<number> {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    return hashArray[0] + hashArray[1] * 256
  }
}

export default App
