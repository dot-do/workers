/**
 * business.do - The single source of truth for your startup
 *
 * A Durable Object for managing business entities, teams, metrics,
 * and billing. Built on dotdo with full agentic capabilities.
 */

import { DO } from 'dotdo'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, gte, lte, isNull } from 'drizzle-orm'
import * as schema from './schema'

// Re-export schema for convenience
export * from './schema'

// Type aliases for convenience
type Business = typeof schema.businesses.$inferSelect
type NewBusiness = typeof schema.businesses.$inferInsert
type TeamMember = typeof schema.teamMembers.$inferSelect
type NewTeamMember = typeof schema.teamMembers.$inferInsert
type Metrics = typeof schema.metrics.$inferSelect
type NewMetrics = typeof schema.metrics.$inferInsert
type Subscription = typeof schema.subscriptions.$inferSelect
type Setting = typeof schema.settings.$inferSelect

export interface BusinessEnv {
  STRIPE?: { charges: { create: (opts: any) => Promise<any> } }
  ORG?: { users: { get: (id: string) => Promise<any> } }
  LLM?: { complete: (opts: any) => Promise<any> }
}

/**
 * Business Durable Object
 *
 * Manages a single business entity with:
 * - Business profile and settings
 * - Team member management
 * - Revenue and metrics tracking
 * - Subscription and billing status
 * - Activity logging for audit trails
 */
export class Business extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })
  declare env: BusinessEnv

  // ===================
  // Business Management
  // ===================

  /**
   * Create a new business entity
   */
  async create(data: Omit<NewBusiness, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> {
    const id = crypto.randomUUID()
    const [business] = await this.db
      .insert(schema.businesses)
      .values({ id, ...data })
      .returning()

    await this.log('business.created', 'business', id, { name: data.name })
    return business
  }

  /**
   * Get business by ID
   */
  async get(id: string): Promise<Business | undefined> {
    const [business] = await this.db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, id))
    return business
  }

  /**
   * Get business by slug
   */
  async getBySlug(slug: string): Promise<Business | undefined> {
    const [business] = await this.db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.slug, slug))
    return business
  }

  /**
   * Update business details
   */
  async update(id: string, data: Partial<NewBusiness>): Promise<Business> {
    const [business] = await this.db
      .update(schema.businesses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.businesses.id, id))
      .returning()

    await this.log('business.updated', 'business', id, data)
    return business
  }

  /**
   * Archive a business (soft delete)
   */
  async archive(id: string): Promise<Business> {
    const [business] = await this.db
      .update(schema.businesses)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.businesses.id, id))
      .returning()

    await this.log('business.archived', 'business', id)
    return business
  }

  /**
   * Restore an archived business
   */
  async restore(id: string): Promise<Business> {
    const [business] = await this.db
      .update(schema.businesses)
      .set({ status: 'active', archivedAt: null, updatedAt: new Date() })
      .where(eq(schema.businesses.id, id))
      .returning()

    await this.log('business.restored', 'business', id)
    return business
  }

  /**
   * List all active businesses
   */
  async list(includeArchived = false): Promise<Business[]> {
    if (includeArchived) {
      return this.db.select().from(schema.businesses)
    }
    return this.db
      .select()
      .from(schema.businesses)
      .where(isNull(schema.businesses.archivedAt))
  }

  // =================
  // Team Management
  // =================

  /**
   * Add a team member
   */
  async addTeamMember(data: Omit<NewTeamMember, 'id' | 'invitedAt'>): Promise<TeamMember> {
    const id = crypto.randomUUID()
    const [member] = await this.db
      .insert(schema.teamMembers)
      .values({ id, ...data })
      .returning()

    await this.log('team.member_added', 'team_member', id, { email: data.email, role: data.role })
    return member
  }

  /**
   * Get team members for a business
   */
  async getTeam(businessId: string, includeRemoved = false): Promise<TeamMember[]> {
    if (includeRemoved) {
      return this.db
        .select()
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.businessId, businessId))
    }
    return this.db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.businessId, businessId),
          isNull(schema.teamMembers.removedAt)
        )
      )
  }

  /**
   * Update team member role or details
   */
  async updateTeamMember(memberId: string, data: Partial<NewTeamMember>): Promise<TeamMember> {
    const [member] = await this.db
      .update(schema.teamMembers)
      .set(data)
      .where(eq(schema.teamMembers.id, memberId))
      .returning()

    await this.log('team.member_updated', 'team_member', memberId, data)
    return member
  }

  /**
   * Remove a team member (soft delete)
   */
  async removeTeamMember(memberId: string): Promise<TeamMember> {
    const [member] = await this.db
      .update(schema.teamMembers)
      .set({ removedAt: new Date() })
      .where(eq(schema.teamMembers.id, memberId))
      .returning()

    await this.log('team.member_removed', 'team_member', memberId)
    return member
  }

  /**
   * Accept an invitation and join the team
   */
  async acceptInvite(memberId: string): Promise<TeamMember> {
    const [member] = await this.db
      .update(schema.teamMembers)
      .set({ joinedAt: new Date() })
      .where(eq(schema.teamMembers.id, memberId))
      .returning()

    await this.log('team.member_joined', 'team_member', memberId)
    return member
  }

  // ==================
  // Metrics Tracking
  // ==================

  /**
   * Record metrics for a period
   */
  async recordMetrics(data: Omit<NewMetrics, 'id' | 'createdAt'>): Promise<Metrics> {
    const id = crypto.randomUUID()
    const [metrics] = await this.db
      .insert(schema.metrics)
      .values({ id, ...data })
      .onConflictDoUpdate({
        target: [schema.metrics.businessId, schema.metrics.period],
        set: data,
      })
      .returning()

    await this.log('metrics.recorded', 'metrics', id, { period: data.period })
    return metrics
  }

  /**
   * Get metrics for a specific period
   */
  async getMetrics(businessId: string, period: string): Promise<Metrics | undefined> {
    const [metrics] = await this.db
      .select()
      .from(schema.metrics)
      .where(
        and(
          eq(schema.metrics.businessId, businessId),
          eq(schema.metrics.period, period)
        )
      )
    return metrics
  }

  /**
   * Get metrics history for a business
   */
  async getMetricsHistory(
    businessId: string,
    startPeriod?: string,
    endPeriod?: string
  ): Promise<Metrics[]> {
    let query = this.db
      .select()
      .from(schema.metrics)
      .where(eq(schema.metrics.businessId, businessId))
      .orderBy(desc(schema.metrics.period))

    // Filter by period range if provided
    const conditions = [eq(schema.metrics.businessId, businessId)]
    if (startPeriod) {
      conditions.push(gte(schema.metrics.period, startPeriod))
    }
    if (endPeriod) {
      conditions.push(lte(schema.metrics.period, endPeriod))
    }

    return this.db
      .select()
      .from(schema.metrics)
      .where(and(...conditions))
      .orderBy(desc(schema.metrics.period))
  }

  /**
   * Get current MRR/ARR snapshot
   */
  async getCurrentRevenue(businessId: string): Promise<{ mrr: number; arr: number }> {
    const [latest] = await this.db
      .select({ mrr: schema.metrics.mrr, arr: schema.metrics.arr })
      .from(schema.metrics)
      .where(eq(schema.metrics.businessId, businessId))
      .orderBy(desc(schema.metrics.period))
      .limit(1)

    return { mrr: latest?.mrr ?? 0, arr: latest?.arr ?? 0 }
  }

  // ========================
  // Subscription Management
  // ========================

  /**
   * Create or update subscription
   */
  async setSubscription(
    businessId: string,
    data: Omit<typeof schema.subscriptions.$inferInsert, 'id' | 'businessId' | 'createdAt'>
  ): Promise<Subscription> {
    const id = crypto.randomUUID()
    const [subscription] = await this.db
      .insert(schema.subscriptions)
      .values({ id, businessId, ...data })
      .onConflictDoUpdate({
        target: schema.subscriptions.businessId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning()

    await this.log('subscription.updated', 'subscription', subscription.id, { plan: data.plan })
    return subscription
  }

  /**
   * Get current subscription for a business
   */
  async getSubscription(businessId: string): Promise<Subscription | undefined> {
    const [subscription] = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.businessId, businessId))
    return subscription
  }

  /**
   * Check if business has active subscription
   */
  async hasActiveSubscription(businessId: string): Promise<boolean> {
    const subscription = await this.getSubscription(businessId)
    if (!subscription) return false
    return ['active', 'trialing'].includes(subscription.status ?? '')
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(businessId: string, atPeriodEnd = true): Promise<Subscription> {
    const [subscription] = await this.db
      .update(schema.subscriptions)
      .set({
        cancelAtPeriodEnd: atPeriodEnd,
        status: atPeriodEnd ? undefined : 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.businessId, businessId))
      .returning()

    await this.log('subscription.canceled', 'subscription', subscription.id, { atPeriodEnd })
    return subscription
  }

  // =======================
  // Settings & Configuration
  // =======================

  /**
   * Set a configuration value
   */
  async setSetting(
    businessId: string,
    key: string,
    value: unknown,
    category = 'general',
    isSecret = false
  ): Promise<Setting> {
    const id = crypto.randomUUID()
    const [setting] = await this.db
      .insert(schema.settings)
      .values({ id, businessId, key, value: JSON.stringify(value), category, isSecret })
      .onConflictDoUpdate({
        target: [schema.settings.businessId, schema.settings.key],
        set: { value: JSON.stringify(value), category, isSecret, updatedAt: new Date() },
      })
      .returning()

    await this.log('settings.updated', 'setting', setting.id, { key, category })
    return setting
  }

  /**
   * Get a configuration value
   */
  async getSetting<T = unknown>(businessId: string, key: string): Promise<T | undefined> {
    const [setting] = await this.db
      .select()
      .from(schema.settings)
      .where(
        and(
          eq(schema.settings.businessId, businessId),
          eq(schema.settings.key, key)
        )
      )
    return setting?.value as T | undefined
  }

  /**
   * Get all settings for a business
   */
  async getSettings(businessId: string, category?: string): Promise<Setting[]> {
    const conditions = [eq(schema.settings.businessId, businessId)]
    if (category) {
      conditions.push(eq(schema.settings.category, category))
    }
    return this.db
      .select()
      .from(schema.settings)
      .where(and(...conditions))
  }

  /**
   * Delete a setting
   */
  async deleteSetting(businessId: string, key: string): Promise<void> {
    await this.db
      .delete(schema.settings)
      .where(
        and(
          eq(schema.settings.businessId, businessId),
          eq(schema.settings.key, key)
        )
      )
    await this.log('settings.deleted', 'setting', undefined, { key })
  }

  // ===============
  // Activity Log
  // ===============

  /**
   * Log an activity
   */
  async log(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    actor?: { id: string; type: 'user' | 'system' | 'ai' }
  ): Promise<void> {
    const id = crypto.randomUUID()
    await this.db.insert(schema.activityLog).values({
      id,
      businessId: resourceId ?? 'system',
      actorId: actor?.id ?? 'system',
      actorType: actor?.type ?? 'system',
      action,
      resource,
      resourceId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  }

  /**
   * Get activity log for a business
   */
  async getActivityLog(
    businessId: string,
    limit = 50,
    offset = 0
  ): Promise<(typeof schema.activityLog.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.activityLog)
      .where(eq(schema.activityLog.businessId, businessId))
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ===============
  // Dashboard
  // ===============

  /**
   * Get a full business dashboard snapshot
   */
  async getDashboard(businessId: string) {
    const [business, team, metrics, subscription, recentActivity] = await Promise.all([
      this.get(businessId),
      this.getTeam(businessId),
      this.getCurrentRevenue(businessId),
      this.getSubscription(businessId),
      this.getActivityLog(businessId, 10),
    ])

    return {
      business,
      team: {
        members: team,
        count: team.length,
      },
      metrics,
      subscription,
      recentActivity,
    }
  }
}

export default Business
