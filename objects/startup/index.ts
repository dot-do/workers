/**
 * startup.do - Your Startup, Defined in Code
 *
 * A Durable Object for managing the complete startup lifecycle:
 * founders, funding, metrics, investors, and milestones.
 * Built on dotdo with full agentic capabilities.
 */

import { DO } from 'dotdo'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, gte, lte, isNull } from 'drizzle-orm'
import * as schema from './schema'

// Re-export schema for convenience
export * from './schema'

// Type aliases for convenience
type StartupEntity = typeof schema.startups.$inferSelect
type NewStartup = typeof schema.startups.$inferInsert
type Founder = typeof schema.founders.$inferSelect
type NewFounder = typeof schema.founders.$inferInsert
type FundingRound = typeof schema.fundingRounds.$inferSelect
type NewFundingRound = typeof schema.fundingRounds.$inferInsert
type Investor = typeof schema.investors.$inferSelect
type NewInvestor = typeof schema.investors.$inferInsert
type Document = typeof schema.documents.$inferSelect
type NewDocument = typeof schema.documents.$inferInsert
type Metrics = typeof schema.metrics.$inferSelect
type NewMetrics = typeof schema.metrics.$inferInsert
type Milestone = typeof schema.milestones.$inferSelect
type NewMilestone = typeof schema.milestones.$inferInsert
type InvestorUpdate = typeof schema.investorUpdates.$inferSelect
type NewInvestorUpdate = typeof schema.investorUpdates.$inferInsert

export interface StartupEnv {
  BUSINESS?: DurableObjectStub
  LLM?: { complete: (opts: any) => Promise<any> }
  ORG?: { users: { get: (id: string) => Promise<any> } }
  R2?: R2Bucket
}

/**
 * Startup Durable Object
 *
 * Manages the complete startup lifecycle with:
 * - Core startup identity and stage
 * - Founder and team management
 * - Funding rounds and investor relations
 * - Pitch decks and key documents
 * - Metrics tracking (MRR, ARR, users, growth)
 * - Milestones and roadmap
 * - Investor updates
 * - Integration with Business DO for operations
 */
export class Startup extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })
  declare env: StartupEnv

  // ===================
  // Startup Management
  // ===================

  /**
   * Create a new startup
   */
  async create(data: Omit<NewStartup, 'id' | 'createdAt' | 'updatedAt'>): Promise<StartupEntity> {
    const id = crypto.randomUUID()
    const [startup] = await this.db
      .insert(schema.startups)
      .values({ id, ...data })
      .returning()

    await this.log('startup.created', 'startup', id, { name: data.name, stage: data.stage })
    return startup
  }

  /**
   * Get startup by ID
   */
  async get(id: string): Promise<StartupEntity | undefined> {
    const [startup] = await this.db
      .select()
      .from(schema.startups)
      .where(eq(schema.startups.id, id))
    return startup
  }

  /**
   * Get startup by slug
   */
  async getBySlug(slug: string): Promise<StartupEntity | undefined> {
    const [startup] = await this.db
      .select()
      .from(schema.startups)
      .where(eq(schema.startups.slug, slug))
    return startup
  }

  /**
   * Update startup details
   */
  async update(id: string, data: Partial<NewStartup>): Promise<StartupEntity> {
    const [startup] = await this.db
      .update(schema.startups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.startups.id, id))
      .returning()

    await this.log('startup.updated', 'startup', id, data)
    return startup
  }

  /**
   * Update startup stage (idea -> pre-seed -> seed -> series-a, etc.)
   */
  async updateStage(id: string, stage: string): Promise<StartupEntity> {
    return this.update(id, { stage })
  }

  /**
   * Mark startup as launched
   */
  async launch(id: string): Promise<StartupEntity> {
    const [startup] = await this.db
      .update(schema.startups)
      .set({ status: 'active', launchedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.startups.id, id))
      .returning()

    await this.log('startup.launched', 'startup', id)
    return startup
  }

  /**
   * Archive a startup
   */
  async archive(id: string, reason?: string): Promise<StartupEntity> {
    const [startup] = await this.db
      .update(schema.startups)
      .set({ status: 'shutdown', archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.startups.id, id))
      .returning()

    await this.log('startup.archived', 'startup', id, { reason })
    return startup
  }

  /**
   * List all startups
   */
  async list(includeArchived = false): Promise<StartupEntity[]> {
    if (includeArchived) {
      return this.db.select().from(schema.startups)
    }
    return this.db
      .select()
      .from(schema.startups)
      .where(isNull(schema.startups.archivedAt))
  }

  // ==================
  // Founder Management
  // ==================

  /**
   * Add a founder or team member
   */
  async addFounder(data: Omit<NewFounder, 'id' | 'joinedAt'>): Promise<Founder> {
    const id = crypto.randomUUID()
    const [founder] = await this.db
      .insert(schema.founders)
      .values({ id, ...data })
      .returning()

    await this.log('founder.added', 'founder', id, { name: data.name, title: data.title })
    return founder
  }

  /**
   * Get all founders and team members for a startup
   */
  async getFounders(startupId: string, includeDeparted = false): Promise<Founder[]> {
    if (includeDeparted) {
      return this.db
        .select()
        .from(schema.founders)
        .where(eq(schema.founders.startupId, startupId))
    }
    return this.db
      .select()
      .from(schema.founders)
      .where(
        and(
          eq(schema.founders.startupId, startupId),
          isNull(schema.founders.departedAt)
        )
      )
  }

  /**
   * Update founder details
   */
  async updateFounder(founderId: string, data: Partial<NewFounder>): Promise<Founder> {
    const [founder] = await this.db
      .update(schema.founders)
      .set(data)
      .where(eq(schema.founders.id, founderId))
      .returning()

    await this.log('founder.updated', 'founder', founderId, data)
    return founder
  }

  /**
   * Record founder departure
   */
  async founderDeparture(founderId: string): Promise<Founder> {
    const [founder] = await this.db
      .update(schema.founders)
      .set({ departedAt: new Date() })
      .where(eq(schema.founders.id, founderId))
      .returning()

    await this.log('founder.departed', 'founder', founderId)
    return founder
  }

  // =================
  // Funding Rounds
  // =================

  /**
   * Create a new funding round
   */
  async createRound(data: Omit<NewFundingRound, 'id' | 'createdAt'>): Promise<FundingRound> {
    const id = crypto.randomUUID()
    const [round] = await this.db
      .insert(schema.fundingRounds)
      .values({ id, ...data })
      .returning()

    await this.log('round.created', 'funding_round', id, { type: data.type, target: data.targetAmount })
    return round
  }

  /**
   * Get all funding rounds for a startup
   */
  async getRounds(startupId: string): Promise<FundingRound[]> {
    return this.db
      .select()
      .from(schema.fundingRounds)
      .where(eq(schema.fundingRounds.startupId, startupId))
      .orderBy(desc(schema.fundingRounds.createdAt))
  }

  /**
   * Update funding round
   */
  async updateRound(roundId: string, data: Partial<NewFundingRound>): Promise<FundingRound> {
    const [round] = await this.db
      .update(schema.fundingRounds)
      .set(data)
      .where(eq(schema.fundingRounds.id, roundId))
      .returning()

    await this.log('round.updated', 'funding_round', roundId, data)
    return round
  }

  /**
   * Close a funding round
   */
  async closeRound(roundId: string, raisedAmount: number, valuation?: number): Promise<FundingRound> {
    const [round] = await this.db
      .update(schema.fundingRounds)
      .set({
        status: 'closed',
        raisedAmount,
        valuation,
        closedAt: new Date()
      })
      .where(eq(schema.fundingRounds.id, roundId))
      .returning()

    await this.log('round.closed', 'funding_round', roundId, { raised: raisedAmount, valuation })
    return round
  }

  /**
   * Get total funding raised
   */
  async getTotalFunding(startupId: string): Promise<{ total: number; rounds: number }> {
    const rounds = await this.db
      .select()
      .from(schema.fundingRounds)
      .where(
        and(
          eq(schema.fundingRounds.startupId, startupId),
          eq(schema.fundingRounds.status, 'closed')
        )
      )

    const total = rounds.reduce((sum, r) => sum + (r.raisedAmount ?? 0), 0)
    return { total, rounds: rounds.length }
  }

  // =====================
  // Investor Management
  // =====================

  /**
   * Add an investor
   */
  async addInvestor(data: Omit<NewInvestor, 'id' | 'createdAt'>): Promise<Investor> {
    const id = crypto.randomUUID()
    const [investor] = await this.db
      .insert(schema.investors)
      .values({ id, ...data })
      .returning()

    await this.log('investor.added', 'investor', id, { name: data.name, type: data.type })
    return investor
  }

  /**
   * Get all investors for a startup
   */
  async getInvestors(startupId: string, relationship?: string): Promise<Investor[]> {
    if (relationship) {
      return this.db
        .select()
        .from(schema.investors)
        .where(
          and(
            eq(schema.investors.startupId, startupId),
            eq(schema.investors.relationship, relationship)
          )
        )
    }
    return this.db
      .select()
      .from(schema.investors)
      .where(eq(schema.investors.startupId, startupId))
  }

  /**
   * Update investor details
   */
  async updateInvestor(investorId: string, data: Partial<NewInvestor>): Promise<Investor> {
    const [investor] = await this.db
      .update(schema.investors)
      .set(data)
      .where(eq(schema.investors.id, investorId))
      .returning()

    await this.log('investor.updated', 'investor', investorId, data)
    return investor
  }

  /**
   * Record investor contact
   */
  async recordContact(investorId: string, notes?: string): Promise<Investor> {
    const [investor] = await this.db
      .update(schema.investors)
      .set({ lastContactAt: new Date(), notes })
      .where(eq(schema.investors.id, investorId))
      .returning()

    await this.log('investor.contacted', 'investor', investorId)
    return investor
  }

  // =================
  // Documents
  // =================

  /**
   * Add a document (pitch deck, one-pager, etc.)
   */
  async addDocument(data: Omit<NewDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    // Mark previous versions as not latest
    if (data.isLatest !== false) {
      await this.db
        .update(schema.documents)
        .set({ isLatest: false })
        .where(
          and(
            eq(schema.documents.startupId, data.startupId),
            eq(schema.documents.type, data.type)
          )
        )
    }

    const id = crypto.randomUUID()
    const [doc] = await this.db
      .insert(schema.documents)
      .values({ id, ...data })
      .returning()

    await this.log('document.added', 'document', id, { type: data.type, name: data.name })
    return doc
  }

  /**
   * Get documents for a startup
   */
  async getDocuments(startupId: string, type?: string, latestOnly = true): Promise<Document[]> {
    const conditions = [eq(schema.documents.startupId, startupId)]
    if (type) {
      conditions.push(eq(schema.documents.type, type))
    }
    if (latestOnly) {
      conditions.push(eq(schema.documents.isLatest, true))
    }

    return this.db
      .select()
      .from(schema.documents)
      .where(and(...conditions))
      .orderBy(desc(schema.documents.createdAt))
  }

  /**
   * Get the latest pitch deck
   */
  async getPitchDeck(startupId: string): Promise<Document | undefined> {
    const [doc] = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.startupId, startupId),
          eq(schema.documents.type, 'pitch-deck'),
          eq(schema.documents.isLatest, true)
        )
      )
    return doc
  }

  /**
   * Record document view
   */
  async recordDocumentView(documentId: string): Promise<Document> {
    const [doc] = await this.db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))

    const [updated] = await this.db
      .update(schema.documents)
      .set({ viewCount: (doc?.viewCount ?? 0) + 1 })
      .where(eq(schema.documents.id, documentId))
      .returning()

    await this.log('document.viewed', 'document', documentId)
    return updated
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
        target: [schema.metrics.startupId, schema.metrics.period],
        set: data,
      })
      .returning()

    await this.log('metrics.recorded', 'metrics', id, { period: data.period, mrr: data.mrr })
    return metrics
  }

  /**
   * Get metrics for a specific period
   */
  async getMetrics(startupId: string, period: string): Promise<Metrics | undefined> {
    const [metrics] = await this.db
      .select()
      .from(schema.metrics)
      .where(
        and(
          eq(schema.metrics.startupId, startupId),
          eq(schema.metrics.period, period)
        )
      )
    return metrics
  }

  /**
   * Get metrics history
   */
  async getMetricsHistory(
    startupId: string,
    startPeriod?: string,
    endPeriod?: string
  ): Promise<Metrics[]> {
    const conditions = [eq(schema.metrics.startupId, startupId)]
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
   * Get current MRR/ARR and key metrics
   */
  async getCurrentMetrics(startupId: string): Promise<{
    mrr: number
    arr: number
    users: number
    growth: number
    runway: number
  }> {
    const [latest] = await this.db
      .select()
      .from(schema.metrics)
      .where(eq(schema.metrics.startupId, startupId))
      .orderBy(desc(schema.metrics.period))
      .limit(1)

    return {
      mrr: latest?.mrr ?? 0,
      arr: latest?.arr ?? 0,
      users: latest?.users ?? 0,
      growth: latest?.growth ?? 0,
      runway: latest?.runway ?? 0,
    }
  }

  // =================
  // Milestones
  // =================

  /**
   * Create a milestone
   */
  async addMilestone(data: Omit<NewMilestone, 'id' | 'createdAt'>): Promise<Milestone> {
    const id = crypto.randomUUID()
    const [milestone] = await this.db
      .insert(schema.milestones)
      .values({ id, ...data })
      .returning()

    await this.log('milestone.created', 'milestone', id, { title: data.title, type: data.type })
    return milestone
  }

  /**
   * Get milestones for a startup
   */
  async getMilestones(startupId: string, status?: string): Promise<Milestone[]> {
    const conditions = [eq(schema.milestones.startupId, startupId)]
    if (status) {
      conditions.push(eq(schema.milestones.status, status))
    }

    return this.db
      .select()
      .from(schema.milestones)
      .where(and(...conditions))
      .orderBy(schema.milestones.targetDate)
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(milestoneId: string, evidence?: string): Promise<Milestone> {
    const [milestone] = await this.db
      .update(schema.milestones)
      .set({ status: 'completed', completedAt: new Date(), evidence })
      .where(eq(schema.milestones.id, milestoneId))
      .returning()

    await this.log('milestone.completed', 'milestone', milestoneId, { title: milestone.title })
    return milestone
  }

  /**
   * Update milestone
   */
  async updateMilestone(milestoneId: string, data: Partial<NewMilestone>): Promise<Milestone> {
    const [milestone] = await this.db
      .update(schema.milestones)
      .set(data)
      .where(eq(schema.milestones.id, milestoneId))
      .returning()

    await this.log('milestone.updated', 'milestone', milestoneId, data)
    return milestone
  }

  // ====================
  // Investor Updates
  // ====================

  /**
   * Create an investor update
   */
  async createUpdate(data: Omit<NewInvestorUpdate, 'id' | 'createdAt'>): Promise<InvestorUpdate> {
    const id = crypto.randomUUID()
    const [update] = await this.db
      .insert(schema.investorUpdates)
      .values({ id, ...data })
      .returning()

    await this.log('update.created', 'investor_update', id, { period: data.period })
    return update
  }

  /**
   * Get investor updates
   */
  async getUpdates(startupId: string, limit = 12): Promise<InvestorUpdate[]> {
    return this.db
      .select()
      .from(schema.investorUpdates)
      .where(eq(schema.investorUpdates.startupId, startupId))
      .orderBy(desc(schema.investorUpdates.period))
      .limit(limit)
  }

  /**
   * Send investor update (mark as sent)
   */
  async sendUpdate(updateId: string, recipientCount: number): Promise<InvestorUpdate> {
    const [update] = await this.db
      .update(schema.investorUpdates)
      .set({ sentAt: new Date(), recipientCount })
      .where(eq(schema.investorUpdates.id, updateId))
      .returning()

    await this.log('update.sent', 'investor_update', updateId, { recipients: recipientCount })
    return update
  }

  /**
   * Generate investor update draft using AI
   */
  async generateUpdateDraft(startupId: string, period: string): Promise<string | null> {
    if (!this.env.LLM) return null

    const [startup, metrics, milestones] = await Promise.all([
      this.get(startupId),
      this.getMetrics(startupId, period),
      this.getMilestones(startupId, 'completed'),
    ])

    const prompt = `Generate a professional investor update email for ${startup?.name}:

Period: ${period}
Metrics:
- MRR: $${metrics?.mrr ?? 0}
- Users: ${metrics?.users ?? 0}
- Growth: ${metrics?.growth ?? 0}%

Recent milestones:
${milestones.slice(0, 5).map(m => `- ${m.title}`).join('\n')}

Write a concise, data-driven update with:
1. Opening highlights (2-3 sentences)
2. Key metrics with context
3. Major achievements
4. Challenges and learnings
5. Clear asks from investors`

    const result = await this.env.LLM.complete({ prompt })
    return result?.content ?? null
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
    actor?: { id: string; type: 'user' | 'system' | 'ai' | 'investor' }
  ): Promise<void> {
    const id = crypto.randomUUID()
    await this.db.insert(schema.activityLog).values({
      id,
      startupId: resourceId ?? 'system',
      actorId: actor?.id ?? 'system',
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
  async getActivityLog(
    startupId: string,
    limit = 50,
    offset = 0
  ): Promise<(typeof schema.activityLog.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.activityLog)
      .where(eq(schema.activityLog.startupId, startupId))
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ===============
  // Dashboard
  // ===============

  /**
   * Get a full startup dashboard snapshot
   */
  async getDashboard(startupId: string) {
    const [
      startup,
      founders,
      funding,
      investors,
      metrics,
      milestones,
      pitchDeck,
      recentActivity,
    ] = await Promise.all([
      this.get(startupId),
      this.getFounders(startupId),
      this.getTotalFunding(startupId),
      this.getInvestors(startupId, 'active'),
      this.getCurrentMetrics(startupId),
      this.getMilestones(startupId),
      this.getPitchDeck(startupId),
      this.getActivityLog(startupId, 10),
    ])

    const upcomingMilestones = milestones.filter(m => m.status !== 'completed').slice(0, 5)
    const completedMilestones = milestones.filter(m => m.status === 'completed')

    return {
      startup,
      team: {
        founders,
        count: founders.length,
      },
      funding: {
        ...funding,
        investors: investors.length,
      },
      metrics,
      milestones: {
        upcoming: upcomingMilestones,
        completed: completedMilestones.length,
        total: milestones.length,
      },
      pitchDeck,
      recentActivity,
    }
  }

  // =====================
  // Business Integration
  // =====================

  /**
   * Link to Business DO for detailed operations
   */
  async getBusinessOps(startupId: string) {
    if (!this.env.BUSINESS) {
      throw new Error('BUSINESS binding not available')
    }
    return this.env.BUSINESS
  }
}

export default Startup
