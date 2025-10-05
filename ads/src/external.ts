/**
 * External Network Integration
 * Submit high-performing house ads to external networks (Google, Bing)
 */

import type { Ad } from './types'

/**
 * External network submission options
 */
export interface SubmissionOptions {
  budget?: number // Override budget
  bid?: number // Override bid
  targeting?: any // Override targeting
}

/**
 * External ad submission result
 */
export interface ExternalAdSubmission {
  id: string
  adId: string
  network: 'google' | 'bing'
  externalAdId: string
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'paused'
  submittedAt: string
  approvedAt?: string
  rejectionReason?: string
}

/**
 * Promotion eligibility check
 */
export interface PromotionEligibility {
  eligible: boolean
  reasons: string[]
  qualityScore: number
  ctr: number
  roas: number
}

/**
 * External Network Manager
 * Manages submission and tracking of ads to external networks
 */
export class ExternalNetworkManager {
  constructor(
    private env: {
      ADS_DB: D1Database
      ADS_KV: KVNamespace
      GOOGLE_ADS?: any
      BING_ADS?: any
    }
  ) {}

  /**
   * Submit ad to Google Ad Network
   */
  async submitToGoogleNetwork(userId: string, adId: string, options: SubmissionOptions = {}): Promise<ExternalAdSubmission> {
    if (!this.env.GOOGLE_ADS) {
      throw new Error('Google Ads integration not available')
    }

    // Get ad from database
    const ad = await this.getAd(adId)
    if (!ad) {
      throw new Error(`Ad ${adId} not found`)
    }

    // Check eligibility
    const eligibility = await this.evaluateForPromotion(adId)
    if (!eligibility.eligible) {
      throw new Error(`Ad not eligible for promotion: ${eligibility.reasons.join(', ')}`)
    }

    // Prepare submission
    const submission = {
      internalAdId: adId,
      creative: {
        imageUrl: ad.config.imageUrl,
        width: ad.config.width || 300,
        height: ad.config.height || 250,
        altText: ad.config.altText || ad.config.name,
      },
      targeting: options.targeting || ad.targeting,
      bid: options.bid || ad.bid * 1.2, // 20% higher for external
      dailyBudget: options.budget || (ad.dailyBudget ? ad.dailyBudget * 2 : undefined), // 2x house budget
    }

    // Submit to Google Ads worker
    const result = await this.env.GOOGLE_ADS.submitDisplayAd(userId, submission)

    // Track in our database
    const submissionId = crypto.randomUUID()
    const externalSubmission: ExternalAdSubmission = {
      id: submissionId,
      adId,
      network: 'google',
      externalAdId: result.externalAdId,
      status: result.status,
      submittedAt: result.submittedAt,
      approvedAt: result.approvedAt,
      rejectionReason: result.rejectionReason,
    }

    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_external_networks (id, ad_id, network, external_ad_id, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(submissionId, adId, 'google', result.externalAdId, result.status, result.submittedAt)
      .run()

    return externalSubmission
  }

  /**
   * Submit ad to Bing Ad Network
   */
  async submitToBingNetwork(userId: string, adId: string, options: SubmissionOptions = {}): Promise<ExternalAdSubmission> {
    if (!this.env.BING_ADS) {
      throw new Error('Bing Ads integration not available')
    }

    // Similar to Google, but for Bing
    const ad = await this.getAd(adId)
    if (!ad) {
      throw new Error(`Ad ${adId} not found`)
    }

    const eligibility = await this.evaluateForPromotion(adId)
    if (!eligibility.eligible) {
      throw new Error(`Ad not eligible for promotion: ${eligibility.reasons.join(', ')}`)
    }

    // Note: Bing doesn't have a direct display network submission API like Google
    // This would create a search campaign instead
    const campaignConfig = {
      name: `House Ad ${adId} Promotion`,
      dailyBudget: options.budget || (ad.dailyBudget ? ad.dailyBudget * 2 : 100),
      targeting: options.targeting || ad.targeting,
    }

    const campaign = await this.env.BING_ADS.createSearchCampaign(userId, campaignConfig)

    const submissionId = crypto.randomUUID()
    const externalSubmission: ExternalAdSubmission = {
      id: submissionId,
      adId,
      network: 'bing',
      externalAdId: campaign.externalCampaignId,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }

    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_external_networks (id, ad_id, network, external_ad_id, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(submissionId, adId, 'bing', campaign.externalCampaignId, 'pending', externalSubmission.submittedAt)
      .run()

    return externalSubmission
  }

  /**
   * Get external ad status
   */
  async getExternalAdStatus(adId: string, network: 'google' | 'bing'): Promise<ExternalAdSubmission | null> {
    const result = await this.env.ADS_DB.prepare(
      'SELECT id, ad_id, network, external_ad_id, status, submitted_at, approved_at, rejection_reason FROM ad_external_networks WHERE ad_id = ? AND network = ?'
    )
      .bind(adId, network)
      .first()

    if (!result) {
      return null
    }

    return {
      id: result.id as string,
      adId: result.ad_id as string,
      network: result.network as 'google' | 'bing',
      externalAdId: result.external_ad_id as string,
      status: result.status as 'pending' | 'approved' | 'rejected' | 'running' | 'paused',
      submittedAt: result.submitted_at as string,
      approvedAt: result.approved_at as string | undefined,
      rejectionReason: result.rejection_reason as string | undefined,
    }
  }

  /**
   * Sync performance from external networks
   */
  async syncExternalPerformance(adId: string): Promise<void> {
    // Get all external submissions for this ad
    const submissions = await this.env.ADS_DB.prepare('SELECT network, external_ad_id FROM ad_external_networks WHERE ad_id = ?').bind(adId).all()

    for (const submission of submissions.results) {
      const network = submission.network as 'google' | 'bing'
      const externalAdId = submission.external_ad_id as string

      try {
        if (network === 'google' && this.env.GOOGLE_ADS) {
          // Sync from Google Ads
          const performance = await this.env.GOOGLE_ADS.syncCampaignPerformance('default', externalAdId)
          await this.storeExternalMetrics(adId, network, performance)
        } else if (network === 'bing' && this.env.BING_ADS) {
          // Sync from Bing Ads
          const performance = await this.env.BING_ADS.syncCampaignPerformance('default', externalAdId)
          await this.storeExternalMetrics(adId, network, performance)
        }
      } catch (error) {
        console.error(`Failed to sync performance for ${network} ad ${externalAdId}:`, error)
      }
    }
  }

  /**
   * Evaluate ad for promotion eligibility
   */
  async evaluateForPromotion(adId: string): Promise<PromotionEligibility> {
    const ad = await this.getAd(adId)
    if (!ad) {
      return {
        eligible: false,
        reasons: ['Ad not found'],
        qualityScore: 0,
        ctr: 0,
        roas: 0,
      }
    }

    const reasons: string[] = []
    let eligible = true

    // Check quality score (must be >= 8)
    if (ad.qualityScore < 8) {
      eligible = false
      reasons.push(`Quality score too low: ${ad.qualityScore} (minimum 8)`)
    }

    // Check CTR (must be >= 3%)
    if (ad.metrics.ctr < 0.03) {
      eligible = false
      reasons.push(`CTR too low: ${(ad.metrics.ctr * 100).toFixed(2)}% (minimum 3%)`)
    }

    // Check ROAS (must be >= 2.0)
    if (ad.metrics.roas < 2.0) {
      eligible = false
      reasons.push(`ROAS too low: ${ad.metrics.roas.toFixed(2)} (minimum 2.0)`)
    }

    // Check minimum impressions (must have >= 1000)
    if (ad.metrics.impressions < 1000) {
      eligible = false
      reasons.push(`Insufficient data: ${ad.metrics.impressions} impressions (minimum 1000)`)
    }

    // Check status (must be active)
    if (ad.status !== 'active') {
      eligible = false
      reasons.push(`Ad not active: ${ad.status}`)
    }

    if (eligible) {
      reasons.push('Ad meets all promotion criteria')
    }

    return {
      eligible,
      reasons,
      qualityScore: ad.qualityScore,
      ctr: ad.metrics.ctr,
      roas: ad.metrics.roas,
    }
  }

  /**
   * Automatically promote best-performing ads
   */
  async promoteBestPerformers(userId: string, limit: number = 5): Promise<ExternalAdSubmission[]> {
    // Get all active ads sorted by performance
    const candidates = await this.env.ADS_DB.prepare(
      `SELECT id, quality_score, metrics FROM ads
       WHERE status = 'active'
       AND spent < COALESCE(daily_budget, 999999)
       ORDER BY quality_score DESC, spent ASC
       LIMIT ?`
    )
      .bind(limit * 2) // Get more candidates to filter
      .all()

    const submissions: ExternalAdSubmission[] = []

    for (const row of candidates.results) {
      const adId = row.id as string

      // Check if already submitted
      const existing = await this.getExternalAdStatus(adId, 'google')
      if (existing) {
        continue // Skip if already submitted
      }

      // Check eligibility
      const eligibility = await this.evaluateForPromotion(adId)
      if (!eligibility.eligible) {
        continue
      }

      try {
        // Submit to Google network
        const submission = await this.submitToGoogleNetwork(userId, adId, {
          budget: row.daily_budget ? (row.daily_budget as number) * 2 : 200,
          bid: row.bid ? (row.bid as number) * 1.2 : 5,
        })

        submissions.push(submission)

        // Stop when we reach the limit
        if (submissions.length >= limit) {
          break
        }
      } catch (error) {
        console.error(`Failed to promote ad ${adId}:`, error)
      }
    }

    return submissions
  }

  /**
   * Get ad from database
   */
  private async getAd(adId: string): Promise<Ad | null> {
    const result = await this.env.ADS_DB.prepare('SELECT * FROM ads WHERE id = ?').bind(adId).first()

    if (!result) {
      return null
    }

    return {
      id: result.id as string,
      campaignId: result.campaign_id as string,
      creativeId: result.creative_id as string,
      status: result.status as any,
      targeting: result.targeting ? JSON.parse(result.targeting as string) : undefined,
      bid: result.bid as number,
      dailyBudget: result.daily_budget as number,
      totalBudget: result.total_budget as number,
      spent: result.spent as number,
      qualityScore: result.quality_score as number,
      metrics: JSON.parse(result.metrics as string),
      config: JSON.parse(result.config as string),
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }
  }

  /**
   * Store external metrics in database
   */
  private async storeExternalMetrics(adId: string, network: 'google' | 'bing', metrics: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0]

    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_external_metrics (ad_id, network, date, impressions, clicks, conversions, spend, revenue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(ad_id, network, date) DO UPDATE SET
         impressions = excluded.impressions,
         clicks = excluded.clicks,
         conversions = excluded.conversions,
         spend = excluded.spend,
         revenue = excluded.revenue`
    )
      .bind(adId, network, date, metrics.impressions, metrics.clicks, metrics.conversions, metrics.spend, metrics.revenue || 0)
      .run()
  }
}
