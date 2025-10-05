/**
 * Provenance Tracking System
 * Tracks creator attribution, AI disclosure, and license propagation
 */

import type { ProvenanceEntry, AIDisclosure, License } from '../types/content'

export class ProvenanceTracker {
  constructor(private db: D1Database) {}

  /**
   * Add provenance entry for a contributor
   */
  async addProvenance(entry: ProvenanceEntry): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO content_provenance (
          id, content_id, creator_id, creator_type, creator_name,
          role, contribution_type, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.id,
        entry.contentId,
        entry.creatorId,
        entry.creatorType,
        entry.creatorName,
        entry.role,
        entry.contributionType,
        entry.timestamp,
        JSON.stringify(entry.metadata || {}),
      )
      .run()
  }

  /**
   * Get full provenance chain for content
   */
  async getProvenance(contentId: string): Promise<ProvenanceEntry[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM content_provenance WHERE content_id = ? ORDER BY timestamp ASC')
      .bind(contentId)
      .all()

    return results.map(row => ({
      id: row.id as string,
      contentId: row.content_id as string,
      creatorId: row.creator_id as string,
      creatorType: row.creator_type as any,
      creatorName: row.creator_name as string,
      role: row.role as any,
      contributionType: row.contribution_type as any,
      timestamp: row.timestamp as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  /**
   * Create or update AI disclosure
   */
  async updateAIDisclosure(disclosure: AIDisclosure): Promise<void> {
    // Check if disclosure exists
    const existing = await this.db
      .prepare('SELECT id FROM ai_disclosure WHERE content_id = ?')
      .bind(disclosure.contentId)
      .first()

    if (existing) {
      // Update existing
      await this.db
        .prepare(`
          UPDATE ai_disclosure
          SET ai_generated = ?, ai_assisted = ?, ai_models = ?,
              human_review = ?, disclosure_text = ?, updated_at = ?,
              metadata = ?
          WHERE content_id = ?
        `)
        .bind(
          disclosure.aiGenerated ? 1 : 0,
          disclosure.aiAssisted ? 1 : 0,
          JSON.stringify(disclosure.aiModels || []),
          disclosure.humanReview ? 1 : 0,
          disclosure.disclosureText,
          disclosure.updatedAt,
          JSON.stringify(disclosure.metadata || {}),
          disclosure.contentId,
        )
        .run()
    } else {
      // Insert new
      await this.db
        .prepare(`
          INSERT INTO ai_disclosure (
            id, content_id, ai_generated, ai_assisted, ai_models,
            human_review, disclosure_text, created_at, updated_at, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          disclosure.id,
          disclosure.contentId,
          disclosure.aiGenerated ? 1 : 0,
          disclosure.aiAssisted ? 1 : 0,
          JSON.stringify(disclosure.aiModels || []),
          disclosure.humanReview ? 1 : 0,
          disclosure.disclosureText,
          disclosure.createdAt,
          disclosure.updatedAt,
          JSON.stringify(disclosure.metadata || {}),
        )
        .run()
    }
  }

  /**
   * Get AI disclosure for content
   */
  async getAIDisclosure(contentId: string): Promise<AIDisclosure | null> {
    const row = await this.db
      .prepare('SELECT * FROM ai_disclosure WHERE content_id = ?')
      .bind(contentId)
      .first()

    if (!row) return null

    return {
      id: row.id as string,
      contentId: row.content_id as string,
      aiGenerated: Boolean(row.ai_generated),
      aiAssisted: Boolean(row.ai_assisted),
      aiModels: row.ai_models ? JSON.parse(row.ai_models as string) : undefined,
      humanReview: Boolean(row.human_review),
      disclosureText: row.disclosure_text as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * Track license and propagation
   */
  async setLicense(license: License): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO license_propagation (
          id, content_id, license, source_license, effective_date,
          expiration_date, constraints, attributions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        license.id,
        license.contentId,
        license.license,
        license.sourceLicense || null,
        license.effectiveDate,
        license.expirationDate || null,
        JSON.stringify(license.constraints || {}),
        JSON.stringify(license.attributions || []),
      )
      .run()

    // Update content table
    await this.db
      .prepare('UPDATE content SET license = ? WHERE id = ?')
      .bind(license.license, license.contentId)
      .run()
  }

  /**
   * Get license information
   */
  async getLicense(contentId: string): Promise<License | null> {
    const row = await this.db
      .prepare('SELECT * FROM license_propagation WHERE content_id = ? ORDER BY effective_date DESC LIMIT 1')
      .bind(contentId)
      .first()

    if (!row) return null

    return {
      id: row.id as string,
      contentId: row.content_id as string,
      license: row.license as string,
      sourceLicense: row.source_license as string | undefined,
      effectiveDate: row.effective_date as number,
      expirationDate: row.expiration_date as number | undefined,
      constraints: row.constraints ? JSON.parse(row.constraints as string) : undefined,
      attributions: row.attributions ? JSON.parse(row.attributions as string) : undefined,
    }
  }

  /**
   * Propagate license from source content
   */
  async propagateLicense(sourceContentId: string, targetContentId: string): Promise<void> {
    const sourceLicense = await this.getLicense(sourceContentId)
    if (!sourceLicense) {
      throw new Error(`No license found for source content ${sourceContentId}`)
    }

    // Check if source license allows derivatives
    if (sourceLicense.constraints?.derivatives === false) {
      throw new Error(`Source license does not allow derivative works`)
    }

    const newLicense: License = {
      id: crypto.randomUUID(),
      contentId: targetContentId,
      license: sourceLicense.license,
      sourceLicense: sourceLicense.license,
      effectiveDate: Date.now(),
      expirationDate: sourceLicense.expirationDate,
      constraints: sourceLicense.constraints,
      attributions: [
        ...(sourceLicense.attributions || []),
        {
          name: sourceContentId,
          license: sourceLicense.license,
        },
      ],
    }

    await this.setLicense(newLicense)
  }

  /**
   * Generate compliance report for content
   */
  async generateComplianceReport(contentId: string): Promise<{
    provenance: ProvenanceEntry[]
    aiDisclosure: AIDisclosure | null
    license: License | null
    gdprCompliant: boolean
    aiActCompliant: boolean
    issues: string[]
  }> {
    const provenance = await this.getProvenance(contentId)
    const aiDisclosure = await this.getAIDisclosure(contentId)
    const license = await this.getLicense(contentId)

    const issues: string[] = []
    let gdprCompliant = true
    let aiActCompliant = true

    // Check AI disclosure requirements
    const hasAIContribution = provenance.some(p => p.creatorType === 'ai_model' || p.creatorType === 'ai_tool')

    if (hasAIContribution && !aiDisclosure) {
      issues.push('AI contribution detected but no disclosure provided')
      gdprCompliant = false
      aiActCompliant = false
    }

    if (aiDisclosure && (aiDisclosure.aiGenerated || aiDisclosure.aiAssisted) && !aiDisclosure.humanReview) {
      issues.push('AI-generated content without human review')
      aiActCompliant = false
    }

    // Check license requirements
    if (!license) {
      issues.push('No license information')
    } else if (license.constraints?.attribution && (!license.attributions || license.attributions.length === 0)) {
      issues.push('Attribution required but no attributions provided')
    }

    // Check provenance chain
    if (provenance.length === 0) {
      issues.push('No provenance information')
      gdprCompliant = false
    }

    return {
      provenance,
      aiDisclosure,
      license,
      gdprCompliant,
      aiActCompliant,
      issues,
    }
  }
}
