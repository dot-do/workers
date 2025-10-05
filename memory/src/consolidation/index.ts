/**
 * Memory Consolidation System
 *
 * Features:
 * - Automatic summarization using Workers AI
 * - Entity extraction and tracking
 * - Relationship discovery
 * - Memory merging and deduplication
 * - Importance scoring
 */

import type { Env, Memory, Entity, Relationship, ConsolidationResult, Message } from '../types'

export class MemoryConsolidation {
  constructor(private env: Env) {}

  /**
   * Consolidate memories for a session
   */
  async consolidate(sessionId: string, messages: Message[]): Promise<ConsolidationResult> {
    // Generate summary
    const summary = await this.generateSummary(messages)

    // Extract entities
    const entities = await this.extractEntities(messages)

    // Discover relationships
    const relationships = await this.discoverRelationships(entities, messages)

    // Extract key facts
    const keyFacts = await this.extractKeyFacts(summary)

    // Calculate importance scores
    const importanceScores = await this.calculateImportanceScores(messages, entities, relationships)

    // Store consolidated data
    await this.storeConsolidatedData(sessionId, { summary, entities, relationships, keyFacts, importanceScores })

    return { summary, entities, relationships, keyFacts, importanceScores }
  }

  /**
   * Generate summary using Workers AI
   */
  private async generateSummary(messages: Message[]): Promise<string> {
    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const response = await this.env.AI.run(this.env.SUMMARIZATION_MODEL, {
      prompt: `Analyze this conversation and provide a concise summary focusing on:
1. Main topics discussed
2. Key decisions or conclusions
3. Important facts mentioned
4. Any action items or follow-ups

Conversation:
${conversation}

Summary:`,
      max_tokens: 500
    })

    return response.response
  }

  /**
   * Extract entities using Workers AI
   */
  private async extractEntities(messages: Message[]): Promise<Entity[]> {
    const conversation = messages
      .map(m => m.content)
      .join('\n')

    const response = await this.env.AI.run(this.env.SUMMARIZATION_MODEL, {
      prompt: `Extract all entities from this conversation. For each entity, identify:
- Type (person, organization, location, concept, product, date, etc.)
- Name
- Key attributes

Provide output as JSON array:
[{"type": "person", "name": "John", "attributes": {"role": "developer"}}]

Conversation:
${conversation}

Entities (JSON only):`,
      max_tokens: 1000
    })

    try {
      const jsonMatch = response.response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []

      const extracted = JSON.parse(jsonMatch[0])

      // Convert to Entity objects
      const entities: Entity[] = extracted.map((e: any) => ({
        id: this.generateId('entity'),
        type: e.type || 'concept',
        name: e.name,
        attributes: e.attributes || {},
        firstSeen: messages[0]?.timestamp || Date.now(),
        lastSeen: messages[messages.length - 1]?.timestamp || Date.now(),
        occurrences: this.countOccurrences(e.name, messages)
      }))

      return entities
    } catch (error) {
      console.error('Failed to parse entities:', error)
      return []
    }
  }

  /**
   * Discover relationships between entities
   */
  private async discoverRelationships(entities: Entity[], messages: Message[]): Promise<Relationship[]> {
    if (entities.length < 2) return []

    const entityNames = entities.map(e => e.name).join(', ')
    const conversation = messages.map(m => m.content).join('\n')

    const response = await this.env.AI.run(this.env.SUMMARIZATION_MODEL, {
      prompt: `Given these entities: ${entityNames}

Identify relationships between them from this conversation:
${conversation}

Provide output as JSON array:
[{"source": "EntityA", "target": "EntityB", "type": "relationship_type", "context": "brief context"}]

Relationships (JSON only):`,
      max_tokens: 1000
    })

    try {
      const jsonMatch = response.response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []

      const extracted = JSON.parse(jsonMatch[0])

      // Map entity names to IDs
      const nameToId = new Map(entities.map(e => [e.name, e.id]))

      const relationships: Relationship[] = extracted
        .filter((r: any) => nameToId.has(r.source) && nameToId.has(r.target))
        .map((r: any) => ({
          id: this.generateId('relationship'),
          sourceEntityId: nameToId.get(r.source)!,
          targetEntityId: nameToId.get(r.target)!,
          type: r.type || 'related_to',
          strength: this.calculateRelationshipStrength(r.source, r.target, messages),
          context: r.context || '',
          timestamp: Date.now()
        }))

      return relationships
    } catch (error) {
      console.error('Failed to parse relationships:', error)
      return []
    }
  }

  /**
   * Extract key facts from summary
   */
  private async extractKeyFacts(summary: string): Promise<string[]> {
    const response = await this.env.AI.run(this.env.SUMMARIZATION_MODEL, {
      prompt: `Extract key facts from this summary as a bullet-point list:

${summary}

Key facts (one per line, starting with "-"):`,
      max_tokens: 300
    })

    const facts = response.response
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim())
      .filter(fact => fact.length > 0)

    return facts
  }

  /**
   * Calculate importance scores for messages
   */
  private async calculateImportanceScores(
    messages: Message[],
    entities: Entity[],
    relationships: Relationship[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    for (const message of messages) {
      let score = 0.5 // Base score

      // Entity mentions boost importance
      const entityMentions = entities.filter(e =>
        message.content.toLowerCase().includes(e.name.toLowerCase())
      ).length
      score += Math.min(entityMentions * 0.05, 0.2)

      // Questions are important
      if (message.content.includes('?')) {
        score += 0.1
      }

      // Length can indicate importance (to a point)
      const wordCount = message.content.split(/\s+/).length
      if (wordCount > 50) {
        score += 0.1
      } else if (wordCount < 10) {
        score -= 0.1
      }

      // Role-specific adjustments
      if (message.role === 'system') {
        score += 0.2
      }

      // Clamp to [0, 1]
      score = Math.max(0, Math.min(1, score))

      scores.set(message.id, score)
    }

    return scores
  }

  /**
   * Store consolidated data in D1 and Vectorize
   */
  private async storeConsolidatedData(
    sessionId: string,
    result: ConsolidationResult
  ): Promise<void> {
    const now = Date.now()

    // Store entities
    for (const entity of result.entities) {
      await this.env.DB.prepare(`
        INSERT INTO entities (id, session_id, type, name, attributes, first_seen, last_seen, occurrences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen = excluded.last_seen,
          occurrences = excluded.occurrences,
          attributes = excluded.attributes
      `).bind(
        entity.id,
        sessionId,
        entity.type,
        entity.name,
        JSON.stringify(entity.attributes),
        entity.firstSeen,
        entity.lastSeen,
        entity.occurrences
      ).run()
    }

    // Store relationships
    for (const rel of result.relationships) {
      await this.env.DB.prepare(`
        INSERT INTO relationships (id, session_id, source_entity_id, target_entity_id, type, strength, context, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          strength = excluded.strength,
          context = excluded.context
      `).bind(
        rel.id,
        sessionId,
        rel.sourceEntityId,
        rel.targetEntityId,
        rel.type,
        rel.strength,
        rel.context,
        rel.timestamp
      ).run()
    }

    // Store summary as semantic memory
    const summaryEmbedding = await this.generateEmbedding(result.summary)
    const summaryId = this.generateId('summary')

    await this.env.VECTORIZE.upsert([{
      id: summaryId,
      values: summaryEmbedding,
      metadata: {
        sessionId,
        type: 'semantic',
        content: result.summary,
        timestamp: now,
        importance: 0.9, // Summaries are high importance
        tags: ['summary', 'consolidated']
      }
    }])

    // Store key facts as semantic memories
    for (const fact of result.keyFacts) {
      const factEmbedding = await this.generateEmbedding(fact)
      const factId = this.generateId('fact')

      await this.env.VECTORIZE.upsert([{
        id: factId,
        values: factEmbedding,
        metadata: {
          sessionId,
          type: 'semantic',
          content: fact,
          timestamp: now,
          importance: 0.8,
          tags: ['fact', 'consolidated']
        }
      }])
    }

    // Update importance scores in existing memories
    for (const [messageId, importance] of result.importanceScores) {
      await this.env.DB.prepare(`
        UPDATE memories
        SET importance = ?
        WHERE id = ?
      `).bind(importance, messageId).run()
    }
  }

  /**
   * Merge similar memories
   */
  async mergeSimilarMemories(sessionId: string, similarityThreshold: number = 0.95): Promise<number> {
    // Get all memories for session
    const memories = await this.getSessionMemories(sessionId)

    if (memories.length < 2) return 0

    let mergeCount = 0

    // Find similar pairs
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = await this.calculateSimilarity(memories[i], memories[j])

        if (similarity >= similarityThreshold) {
          // Merge j into i
          await this.mergeMemories(memories[i], memories[j])
          mergeCount++
        }
      }
    }

    return mergeCount
  }

  /**
   * Generate embedding
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.env.AI.run(this.env.EMBEDDING_MODEL, {
      text: [text]
    })
    return response.data[0]
  }

  /**
   * Count entity occurrences in messages
   */
  private countOccurrences(name: string, messages: Message[]): number {
    const pattern = new RegExp(name, 'gi')
    return messages.reduce((count, msg) => {
      const matches = msg.content.match(pattern)
      return count + (matches?.length || 0)
    }, 0)
  }

  /**
   * Calculate relationship strength
   */
  private calculateRelationshipStrength(sourceNa: string, targetName: string, messages: Message[]): number {
    // Count co-occurrences
    let coOccurrences = 0

    for (const message of messages) {
      const hasSource = message.content.toLowerCase().includes(sourceNa.toLowerCase())
      const hasTarget = message.content.toLowerCase().includes(targetName.toLowerCase())

      if (hasSource && hasTarget) {
        coOccurrences++
      }
    }

    // Normalize to [0, 1]
    return Math.min(coOccurrences / 5, 1)
  }

  /**
   * Get session memories
   */
  private async getSessionMemories(sessionId: string): Promise<Memory[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM memories WHERE session_id = ?'
    ).bind(sessionId).all()

    return results.results as Memory[]
  }

  /**
   * Calculate similarity between memories
   */
  private async calculateSimilarity(m1: Memory, m2: Memory): Promise<number> {
    if (!m1.embedding || !m2.embedding) return 0

    // Cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < m1.embedding.length; i++) {
      dotProduct += m1.embedding[i] * m2.embedding[i]
      norm1 += m1.embedding[i] * m1.embedding[i]
      norm2 += m2.embedding[i] * m2.embedding[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * Merge two memories
   */
  private async mergeMemories(target: Memory, source: Memory): Promise<void> {
    // Combine content
    const mergedContent = `${target.content}\n\n${source.content}`

    // Average importance
    const mergedImportance = (target.importance + source.importance) / 2

    // Sum access counts
    const mergedAccessCount = target.accessCount + source.accessCount

    // Update target memory
    await this.env.DB.prepare(`
      UPDATE memories
      SET content = ?,
          importance = ?,
          access_count = ?
      WHERE id = ?
    `).bind(mergedContent, mergedImportance, mergedAccessCount, target.id).run()

    // Delete source memory
    await this.env.DB.prepare('DELETE FROM memories WHERE id = ?').bind(source.id).run()

    // Remove source from Vectorize
    await this.env.VECTORIZE.deleteByIds([source.id])
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}
