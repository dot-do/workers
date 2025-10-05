/**
 * Content Graph Builder
 * Builds and queries content relationship graph
 */

import type { ContentRelationship } from '../types/content'

export class ContentGraphBuilder {
  constructor(private db: D1Database) {}

  /**
   * Create a relationship between two pieces of content
   */
  async createRelationship(relationship: ContentRelationship): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO content_relationships (
          id, source_id, target_id, relationship_type,
          strength, created_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        relationship.id,
        relationship.sourceId,
        relationship.targetId,
        relationship.relationshipType,
        relationship.strength || null,
        relationship.createdAt,
        JSON.stringify(relationship.metadata || {}),
      )
      .run()
  }

  /**
   * Get all relationships for a piece of content
   */
  async getRelationships(
    contentId: string,
    direction: 'outbound' | 'inbound' | 'both' = 'both',
  ): Promise<ContentRelationship[]> {
    let query: string
    const params: string[] = []

    if (direction === 'outbound') {
      query = 'SELECT * FROM content_relationships WHERE source_id = ?'
      params.push(contentId)
    } else if (direction === 'inbound') {
      query = 'SELECT * FROM content_relationships WHERE target_id = ?'
      params.push(contentId)
    } else {
      query = 'SELECT * FROM content_relationships WHERE source_id = ? OR target_id = ?'
      params.push(contentId, contentId)
    }

    const { results } = await this.db.prepare(query).bind(...params).all()

    return results.map(row => ({
      id: row.id as string,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      relationshipType: row.relationship_type as any,
      strength: row.strength as number | undefined,
      createdAt: row.created_at as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  /**
   * Find related content by relationship type
   */
  async findRelated(
    contentId: string,
    relationshipType: string,
    maxDepth: number = 2,
  ): Promise<Array<{
    contentId: string
    depth: number
    path: string[]
    relationshipType: string
  }>> {
    const visited = new Set<string>()
    const related: Array<any> = []

    await this.traverseGraph(
      contentId,
      relationshipType,
      0,
      maxDepth,
      [],
      visited,
      related,
    )

    return related
  }

  /**
   * Recursive graph traversal
   */
  private async traverseGraph(
    currentId: string,
    relationshipType: string,
    currentDepth: number,
    maxDepth: number,
    path: string[],
    visited: Set<string>,
    results: Array<any>,
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(currentId)) {
      return
    }

    visited.add(currentId)

    const { results: relationships } = await this.db
      .prepare(`
        SELECT * FROM content_relationships
        WHERE source_id = ? AND relationship_type = ?
      `)
      .bind(currentId, relationshipType)
      .all()

    for (const rel of relationships) {
      const targetId = rel.target_id as string

      results.push({
        contentId: targetId,
        depth: currentDepth + 1,
        path: [...path, currentId, targetId],
        relationshipType: rel.relationship_type as string,
      })

      await this.traverseGraph(
        targetId,
        relationshipType,
        currentDepth + 1,
        maxDepth,
        [...path, currentId],
        visited,
        results,
      )
    }
  }

  /**
   * Get content recommendation based on graph
   */
  async getRecommendations(
    contentId: string,
    limit: number = 10,
  ): Promise<Array<{
    contentId: string
    score: number
    reason: string
  }>> {
    // Find content with similar relationships
    const { results } = await this.db
      .prepare(`
        SELECT
          cr2.target_id as recommended_id,
          COUNT(*) as common_relationships,
          GROUP_CONCAT(cr2.relationship_type) as relationship_types
        FROM content_relationships cr1
        JOIN content_relationships cr2 ON cr1.relationship_type = cr2.relationship_type
        WHERE cr1.source_id = ?
          AND cr2.source_id != ?
          AND cr2.target_id != ?
        GROUP BY cr2.target_id
        ORDER BY common_relationships DESC
        LIMIT ?
      `)
      .bind(contentId, contentId, contentId, limit)
      .all()

    return results.map((row, index) => ({
      contentId: row.recommended_id as string,
      score: 1 - (index / limit), // Simple scoring
      reason: `Shares ${row.common_relationships} common relationships: ${row.relationship_types}`,
    }))
  }

  /**
   * Detect content that should be updated or archived
   */
  async findStaleContent(thresholdDays: number = 180): Promise<Array<{
    contentId: string
    reason: string
    lastUpdated: number
    supersededBy?: string
  }>> {
    const cutoffTime = Date.now() - thresholdDays * 24 * 60 * 60 * 1000

    // Find content that hasn't been updated and has newer versions
    const { results } = await this.db
      .prepare(`
        SELECT
          c.id,
          c.updated_at,
          cr.target_id as superseded_by
        FROM content c
        LEFT JOIN content_relationships cr
          ON c.id = cr.source_id
          AND cr.relationship_type = 'supersedes'
        WHERE c.status = 'published'
          AND c.updated_at < ?
        ORDER BY c.updated_at ASC
      `)
      .bind(cutoffTime)
      .all()

    return results.map(row => ({
      contentId: row.id as string,
      reason: row.superseded_by
        ? 'Content has been superseded by newer version'
        : 'Content has not been updated recently',
      lastUpdated: row.updated_at as number,
      supersededBy: row.superseded_by as string | undefined,
    }))
  }

  /**
   * Build content lineage (version history via graph)
   */
  async getContentLineage(contentId: string): Promise<{
    ancestors: Array<{ contentId: string; relationship: string }>
    descendants: Array<{ contentId: string; relationship: string }>
  }> {
    // Get ancestors (what this content derived from)
    const { results: ancestorResults } = await this.db
      .prepare(`
        WITH RECURSIVE lineage AS (
          SELECT target_id as content_id, relationship_type, 1 as depth
          FROM content_relationships
          WHERE source_id = ?
            AND relationship_type IN ('derived_from', 'translates', 'updates')

          UNION ALL

          SELECT cr.target_id, cr.relationship_type, l.depth + 1
          FROM content_relationships cr
          JOIN lineage l ON cr.source_id = l.content_id
          WHERE cr.relationship_type IN ('derived_from', 'translates', 'updates')
            AND l.depth < 10
        )
        SELECT * FROM lineage
      `)
      .bind(contentId)
      .all()

    // Get descendants (what derived from this content)
    const { results: descendantResults } = await this.db
      .prepare(`
        WITH RECURSIVE lineage AS (
          SELECT source_id as content_id, relationship_type, 1 as depth
          FROM content_relationships
          WHERE target_id = ?
            AND relationship_type IN ('derived_from', 'translates', 'updates')

          UNION ALL

          SELECT cr.source_id, cr.relationship_type, l.depth + 1
          FROM content_relationships cr
          JOIN lineage l ON cr.target_id = l.content_id
          WHERE cr.relationship_type IN ('derived_from', 'translates', 'updates')
            AND l.depth < 10
        )
        SELECT * FROM lineage
      `)
      .bind(contentId)
      .all()

    return {
      ancestors: ancestorResults.map(row => ({
        contentId: row.content_id as string,
        relationship: row.relationship_type as string,
      })),
      descendants: descendantResults.map(row => ({
        contentId: row.content_id as string,
        relationship: row.relationship_type as string,
      })),
    }
  }

  /**
   * Calculate content influence score
   */
  async calculateInfluenceScore(contentId: string): Promise<number> {
    // Score based on:
    // 1. Number of inbound references
    // 2. Number of derivative works
    // 3. Consumption metrics (would integrate with ConsumptionTracker)

    const { results: inbound } = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM content_relationships
        WHERE target_id = ? AND relationship_type = 'references'
      `)
      .bind(contentId)
      .all()

    const { results: derivatives } = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM content_relationships
        WHERE target_id = ? AND relationship_type = 'derived_from'
      `)
      .bind(contentId)
      .all()

    const inboundCount = (inbound[0] as any).count || 0
    const derivativeCount = (derivatives[0] as any).count || 0

    // Simple weighted score
    return inboundCount * 1.0 + derivativeCount * 2.0
  }
}
