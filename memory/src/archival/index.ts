/**
 * Long-term Archival System - R2-based unlimited storage
 *
 * Features:
 * - R2 storage for all conversations
 * - Efficient retrieval by time/topic
 * - Memory replay (reconstruct context)
 * - Export formats (JSON, Markdown, PDF)
 * - Compression and optimization
 */

import type { Env, Message, Memory } from '../types'

export class ArchivalStorage {
  constructor(private env: Env) {}

  /**
   * Archive messages to R2
   */
  async archiveMessages(sessionId: string, messages: Message[]): Promise<void> {
    const archiveKey = `sessions/${sessionId}/messages/${Date.now()}.json`

    await this.env.ARCHIVE.put(archiveKey, JSON.stringify(messages), {
      customMetadata: {
        sessionId,
        messageCount: String(messages.length),
        startTime: String(messages[0]?.timestamp || Date.now()),
        endTime: String(messages[messages.length - 1]?.timestamp || Date.now())
      }
    })

    // Update session index
    await this.updateSessionIndex(sessionId, archiveKey)
  }

  /**
   * Archive a complete session
   */
  async archiveSession(sessionId: string): Promise<string> {
    // Get all messages from Durable Object and R2
    const allMessages = await this.getSessionMessages(sessionId)

    // Get all memories from D1
    const memories = await this.getSessionMemories(sessionId)

    // Get entities and relationships
    const entities = await this.getSessionEntities(sessionId)
    const relationships = await this.getSessionRelationships(sessionId)

    // Build complete archive
    const archive = {
      sessionId,
      timestamp: Date.now(),
      messageCount: allMessages.length,
      memoryCount: memories.length,
      entityCount: entities.length,
      relationshipCount: relationships.length,
      messages: allMessages,
      memories,
      entities,
      relationships
    }

    // Store complete archive
    const archiveKey = `archives/${sessionId}/complete.json`
    await this.env.ARCHIVE.put(archiveKey, JSON.stringify(archive), {
      customMetadata: {
        sessionId,
        type: 'complete_archive',
        timestamp: String(Date.now())
      }
    })

    return archiveKey
  }

  /**
   * Retrieve archived messages by time range
   */
  async getMessagesByTimeRange(sessionId: string, start: number, end: number): Promise<Message[]> {
    const index = await this.getSessionIndex(sessionId)
    const messages: Message[] = []

    // Find relevant archive files
    for (const entry of index.archives) {
      const archiveStart = entry.startTime
      const archiveEnd = entry.endTime

      // Check if archive overlaps with requested range
      if (archiveEnd >= start && archiveStart <= end) {
        const archived = await this.env.ARCHIVE.get(entry.key)
        if (archived) {
          const archiveMessages: Message[] = await archived.json()
          messages.push(...archiveMessages.filter(m =>
            m.timestamp >= start && m.timestamp <= end
          ))
        }
      }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Replay memory - reconstruct conversation context
   */
  async replayMemory(sessionId: string, targetTimestamp: number, contextWindow: number = 10): Promise<{
    messages: Message[]
    context: string
    entities: string[]
  }> {
    // Get messages around target timestamp
    const start = targetTimestamp - (contextWindow * 60 * 1000) // contextWindow minutes before
    const end = targetTimestamp + (contextWindow * 60 * 1000) // contextWindow minutes after

    const messages = await this.getMessagesByTimeRange(sessionId, start, end)

    // Extract entities mentioned
    const entities = await this.extractEntitiesFromMessages(messages)

    // Build context summary
    const context = messages
      .map(m => `[${new Date(m.timestamp).toISOString()}] ${m.role}: ${m.content}`)
      .join('\n')

    return { messages, context, entities }
  }

  /**
   * Export session in various formats
   */
  async exportSession(sessionId: string, format: 'json' | 'markdown' | 'html' | 'txt'): Promise<string> {
    const archive = await this.getCompleteArchive(sessionId)

    switch (format) {
      case 'json':
        return JSON.stringify(archive, null, 2)

      case 'markdown':
        return this.convertToMarkdown(archive)

      case 'html':
        return this.convertToHTML(archive)

      case 'txt':
        return this.convertToText(archive)

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Search archived conversations
   */
  async searchArchives(sessionId: string, query: string): Promise<Message[]> {
    const allMessages = await this.getSessionMessages(sessionId)

    // Simple text search (in production, use full-text search)
    const lowerQuery = query.toLowerCase()
    return allMessages.filter(m =>
      m.content.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(sessionId: string): Promise<{
    totalSize: number
    messageCount: number
    archiveCount: number
    oldestMessage: number
    newestMessage: number
  }> {
    const index = await this.getSessionIndex(sessionId)

    let totalSize = 0
    let messageCount = 0
    let oldestMessage = Infinity
    let newestMessage = 0

    for (const entry of index.archives) {
      const obj = await this.env.ARCHIVE.head(entry.key)
      if (obj) {
        totalSize += obj.size
        messageCount += entry.messageCount
        oldestMessage = Math.min(oldestMessage, entry.startTime)
        newestMessage = Math.max(newestMessage, entry.endTime)
      }
    }

    return {
      totalSize,
      messageCount,
      archiveCount: index.archives.length,
      oldestMessage: oldestMessage === Infinity ? 0 : oldestMessage,
      newestMessage
    }
  }

  /**
   * Compress old archives
   */
  async compressOldArchives(sessionId: string, olderThan: number): Promise<number> {
    const index = await this.getSessionIndex(sessionId)
    let compressedCount = 0

    for (const entry of index.archives) {
      if (entry.endTime < olderThan) {
        const archived = await this.env.ARCHIVE.get(entry.key)
        if (archived) {
          const data = await archived.text()

          // Simple compression: remove whitespace from JSON
          const compressed = JSON.stringify(JSON.parse(data))

          // Store compressed version
          await this.env.ARCHIVE.put(entry.key, compressed, {
            customMetadata: {
              ...archived.customMetadata,
              compressed: 'true'
            }
          })

          compressedCount++
        }
      }
    }

    return compressedCount
  }

  /**
   * Delete old archives
   */
  async deleteOldArchives(sessionId: string, olderThan: number): Promise<number> {
    const index = await this.getSessionIndex(sessionId)
    let deletedCount = 0

    const newArchives = []

    for (const entry of index.archives) {
      if (entry.endTime < olderThan) {
        await this.env.ARCHIVE.delete(entry.key)
        deletedCount++
      } else {
        newArchives.push(entry)
      }
    }

    // Update index
    index.archives = newArchives
    await this.saveSessionIndex(sessionId, index)

    return deletedCount
  }

  /**
   * Get session index
   */
  private async getSessionIndex(sessionId: string): Promise<SessionIndex> {
    const indexKey = `sessions/${sessionId}/index.json`
    const index = await this.env.ARCHIVE.get(indexKey)

    if (index) {
      return await index.json()
    }

    return {
      sessionId,
      archives: [],
      created: Date.now(),
      updated: Date.now()
    }
  }

  /**
   * Update session index
   */
  private async updateSessionIndex(sessionId: string, archiveKey: string): Promise<void> {
    const index = await this.getSessionIndex(sessionId)

    const obj = await this.env.ARCHIVE.head(archiveKey)
    if (!obj) return

    index.archives.push({
      key: archiveKey,
      messageCount: parseInt(obj.customMetadata?.messageCount || '0'),
      startTime: parseInt(obj.customMetadata?.startTime || '0'),
      endTime: parseInt(obj.customMetadata?.endTime || '0'),
      size: obj.size
    })

    index.updated = Date.now()

    await this.saveSessionIndex(sessionId, index)
  }

  /**
   * Save session index
   */
  private async saveSessionIndex(sessionId: string, index: SessionIndex): Promise<void> {
    const indexKey = `sessions/${sessionId}/index.json`
    await this.env.ARCHIVE.put(indexKey, JSON.stringify(index))
  }

  /**
   * Get all messages for a session
   */
  private async getSessionMessages(sessionId: string): Promise<Message[]> {
    const index = await this.getSessionIndex(sessionId)
    const allMessages: Message[] = []

    for (const entry of index.archives) {
      const archived = await this.env.ARCHIVE.get(entry.key)
      if (archived) {
        const messages: Message[] = await archived.json()
        allMessages.push(...messages)
      }
    }

    return allMessages.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get session memories
   */
  private async getSessionMemories(sessionId: string): Promise<Memory[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM memories WHERE session_id = ? ORDER BY timestamp DESC'
    ).bind(sessionId).all()

    return results.results as Memory[]
  }

  /**
   * Get session entities
   */
  private async getSessionEntities(sessionId: string): Promise<any[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM entities WHERE session_id = ?'
    ).bind(sessionId).all()

    return results.results.map((r: any) => ({
      ...r,
      attributes: JSON.parse(r.attributes || '{}')
    }))
  }

  /**
   * Get session relationships
   */
  private async getSessionRelationships(sessionId: string): Promise<any[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM relationships WHERE session_id = ?'
    ).bind(sessionId).all()

    return results.results
  }

  /**
   * Get complete archive
   */
  private async getCompleteArchive(sessionId: string): Promise<any> {
    const archiveKey = `archives/${sessionId}/complete.json`
    const archived = await this.env.ARCHIVE.get(archiveKey)

    if (archived) {
      return await archived.json()
    }

    // Build on-the-fly if not exists
    const messages = await this.getSessionMessages(sessionId)
    const memories = await this.getSessionMemories(sessionId)
    const entities = await this.getSessionEntities(sessionId)
    const relationships = await this.getSessionRelationships(sessionId)

    return {
      sessionId,
      timestamp: Date.now(),
      messageCount: messages.length,
      memoryCount: memories.length,
      entityCount: entities.length,
      relationshipCount: relationships.length,
      messages,
      memories,
      entities,
      relationships
    }
  }

  /**
   * Extract entities from messages
   */
  private async extractEntitiesFromMessages(messages: Message[]): Promise<string[]> {
    const entitySet = new Set<string>()

    for (const message of messages) {
      // Simple entity extraction (capitalized words)
      const words = message.content.split(/\s+/)
      words
        .filter(w => /^[A-Z][a-z]+/.test(w) && w.length > 3)
        .forEach(w => entitySet.add(w))
    }

    return Array.from(entitySet)
  }

  /**
   * Convert archive to Markdown
   */
  private convertToMarkdown(archive: any): string {
    let md = `# Session ${archive.sessionId}\n\n`
    md += `**Date:** ${new Date(archive.timestamp).toISOString()}\n`
    md += `**Messages:** ${archive.messageCount}\n`
    md += `**Entities:** ${archive.entityCount}\n\n`

    md += `## Conversation\n\n`

    for (const message of archive.messages) {
      const date = new Date(message.timestamp).toISOString()
      md += `### ${message.role} (${date})\n\n${message.content}\n\n`
    }

    if (archive.entities.length > 0) {
      md += `## Entities\n\n`
      for (const entity of archive.entities) {
        md += `- **${entity.name}** (${entity.type})\n`
      }
      md += `\n`
    }

    return md
  }

  /**
   * Convert archive to HTML
   */
  private convertToHTML(archive: any): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Session ${archive.sessionId}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { margin: 20px 0; padding: 10px; border-left: 3px solid #ccc; }
    .user { border-color: #007bff; }
    .assistant { border-color: #28a745; }
    .timestamp { color: #666; font-size: 0.9em; }
    .entity { display: inline-block; margin: 5px; padding: 5px 10px; background: #f0f0f0; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Session ${archive.sessionId}</h1>
  <p><strong>Date:</strong> ${new Date(archive.timestamp).toISOString()}</p>
  <p><strong>Messages:</strong> ${archive.messageCount}</p>

  <h2>Conversation</h2>
`

    for (const message of archive.messages) {
      const date = new Date(message.timestamp).toISOString()
      html += `
  <div class="message ${message.role}">
    <div class="timestamp">${date} - ${message.role}</div>
    <div>${message.content}</div>
  </div>
`
    }

    if (archive.entities.length > 0) {
      html += `
  <h2>Entities</h2>
  <div>
`
      for (const entity of archive.entities) {
        html += `    <span class="entity">${entity.name} (${entity.type})</span>\n`
      }
      html += `  </div>\n`
    }

    html += `</body>
</html>`

    return html
  }

  /**
   * Convert archive to plain text
   */
  private convertToText(archive: any): string {
    let text = `Session ${archive.sessionId}\n`
    text += `Date: ${new Date(archive.timestamp).toISOString()}\n`
    text += `Messages: ${archive.messageCount}\n`
    text += `${'='.repeat(80)}\n\n`

    for (const message of archive.messages) {
      const date = new Date(message.timestamp).toISOString()
      text += `[${date}] ${message.role}:\n${message.content}\n\n`
    }

    return text
  }
}

interface SessionIndex {
  sessionId: string
  archives: ArchiveEntry[]
  created: number
  updated: number
}

interface ArchiveEntry {
  key: string
  messageCount: number
  startTime: number
  endTime: number
  size: number
}
