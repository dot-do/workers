/**
 * Memory Durable Object - Stateful conversation memory
 *
 * Responsibilities:
 * - Maintain working memory (last N messages)
 * - Track conversation context
 * - Trigger memory consolidation
 * - Manage memory lifecycle (hibernate/wake)
 * - Real-time memory access patterns
 */

import { DurableObject } from 'cloudflare:workers'
import type { Env, Message, WorkingMemory, MemoryStats } from './types'

export class MemoryObject extends DurableObject<Env> {
  private memory: WorkingMemory
  private workingSize: number
  private consolidationThreshold: number

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    this.workingSize = parseInt(env.MEMORY_WORKING_SIZE || '50')
    this.consolidationThreshold = parseInt(env.MEMORY_CONSOLIDATION_THRESHOLD || '100')

    // Initialize from storage or create new
    this.memory = {
      sessionId: '',
      messages: [],
      activeEntities: new Set(),
      context: '',
      lastConsolidation: 0
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Handle WebSocket upgrades for real-time memory streaming
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocket(request)
      }

      switch (path) {
        case '/init':
          return this.handleInit(request)
        case '/add':
          return this.handleAddMessage(request)
        case '/get':
          return this.handleGetMemory(request)
        case '/search':
          return this.handleSearch(request)
        case '/consolidate':
          return this.handleConsolidate(request)
        case '/stats':
          return this.handleStats(request)
        case '/export':
          return this.handleExport(request)
        default:
          return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('Memory Object error:', error)
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  /**
   * Initialize a new memory session
   */
  private async handleInit(request: Request): Promise<Response> {
    const { sessionId } = await request.json()

    // Try to restore from storage
    const stored = await this.ctx.storage.get<WorkingMemory>(`memory:${sessionId}`)

    if (stored) {
      this.memory = stored
      this.memory.activeEntities = new Set(stored.activeEntities || [])
    } else {
      this.memory = {
        sessionId,
        messages: [],
        activeEntities: new Set(),
        context: '',
        lastConsolidation: Date.now()
      }
      await this.ctx.storage.put(`memory:${sessionId}`, this.memory)
    }

    return new Response(JSON.stringify({
      sessionId: this.memory.sessionId,
      messagesCount: this.memory.messages.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Add a new message to working memory
   */
  private async handleAddMessage(request: Request): Promise<Response> {
    const message: Message = await request.json()

    // Add to working memory
    this.memory.messages.push(message)

    // Trim to working size (keep most recent)
    if (this.memory.messages.length > this.workingSize) {
      const toArchive = this.memory.messages.shift()!
      await this.archiveMessage(toArchive)
    }

    // Extract entities from message (simple keyword extraction)
    const entities = this.extractEntities(message.content)
    entities.forEach(e => this.memory.activeEntities.add(e))

    // Update context
    await this.updateContext()

    // Save to storage
    await this.ctx.storage.put(`memory:${this.memory.sessionId}`, {
      ...this.memory,
      activeEntities: Array.from(this.memory.activeEntities)
    })

    // Check if consolidation needed
    const totalMessages = await this.getTotalMessageCount()
    if (totalMessages >= this.consolidationThreshold) {
      // Trigger consolidation asynchronously
      this.ctx.waitUntil(this.triggerConsolidation())
    }

    return new Response(JSON.stringify({
      id: message.id,
      workingMemorySize: this.memory.messages.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Get current working memory
   */
  private async handleGetMemory(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const includeContext = url.searchParams.get('context') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || String(this.workingSize))

    const messages = this.memory.messages.slice(-limit)

    return new Response(JSON.stringify({
      sessionId: this.memory.sessionId,
      messages,
      activeEntities: Array.from(this.memory.activeEntities),
      context: includeContext ? this.memory.context : undefined,
      workingMemorySize: this.memory.messages.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Search memories semantically
   */
  private async handleSearch(request: Request): Promise<Response> {
    const { query, limit = 10 } = await request.json()

    // Generate embedding for query
    const embedding = await this.generateEmbedding(query)

    // Search vectorize
    const results = await this.env.VECTORIZE.query(embedding, {
      topK: limit,
      filter: { sessionId: this.memory.sessionId }
    })

    // Enhance with importance and recency
    const memories = results.matches.map(match => ({
      ...match.metadata,
      similarity: match.score,
      relevance: this.calculateRelevance(match.score, match.metadata.timestamp, match.metadata.importance)
    }))

    return new Response(JSON.stringify({ memories }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Manually trigger memory consolidation
   */
  private async handleConsolidate(request: Request): Promise<Response> {
    const result = await this.consolidateMemories()

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Get memory statistics
   */
  private async handleStats(request: Request): Promise<Response> {
    const totalMessages = await this.getTotalMessageCount()
    const semanticCount = await this.getSemanticMemoryCount()
    const archivedSize = await this.getArchivedSize()
    const entities = await this.getEntityCount()
    const relationships = await this.getRelationshipCount()

    const stats: MemoryStats = {
      totalMessages,
      workingMemorySize: this.memory.messages.length,
      semanticMemorySize: semanticCount,
      archivedSize,
      entities,
      relationships,
      lastConsolidation: this.memory.lastConsolidation
    }

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Export full memory archive
   */
  private async handleExport(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'

    // Retrieve all messages from R2
    const archiveKey = `sessions/${this.memory.sessionId}/archive.json`
    const archived = await this.env.ARCHIVE.get(archiveKey)
    const archivedMessages = archived ? await archived.json() : []

    const allMessages = [...archivedMessages, ...this.memory.messages]

    if (format === 'markdown') {
      const markdown = this.convertToMarkdown(allMessages)
      return new Response(markdown, {
        headers: { 'Content-Type': 'text/markdown' }
      })
    }

    return new Response(JSON.stringify({ messages: allMessages }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * WebSocket handler for real-time memory streaming
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)

    // Send initial memory state
    server.send(JSON.stringify({
      type: 'init',
      data: {
        sessionId: this.memory.sessionId,
        messages: this.memory.messages,
        activeEntities: Array.from(this.memory.activeEntities)
      }
    }))

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  /**
   * WebSocket message handler
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = JSON.parse(message as string)

      switch (data.type) {
        case 'add_message':
          await this.handleAddMessage(new Request('http://internal/add', {
            method: 'POST',
            body: JSON.stringify(data.message)
          }))

          // Broadcast to all connected clients
          this.ctx.getWebSockets().forEach(socket => {
            socket.send(JSON.stringify({
              type: 'message_added',
              data: data.message
            }))
          })
          break

        case 'search':
          const searchResult = await this.handleSearch(new Request('http://internal/search', {
            method: 'POST',
            body: JSON.stringify(data)
          }))
          const searchData = await searchResult.json()
          ws.send(JSON.stringify({
            type: 'search_results',
            data: searchData
          }))
          break
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: String(error)
      }))
    }
  }

  /**
   * WebSocket close handler
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    console.log('WebSocket closed:', { code, reason, wasClean })
  }

  /**
   * Archive a message to R2 and Vectorize
   */
  private async archiveMessage(message: Message): Promise<void> {
    // Store in R2 (append to archive)
    const archiveKey = `sessions/${this.memory.sessionId}/archive.json`
    const existing = await this.env.ARCHIVE.get(archiveKey)
    const messages = existing ? await existing.json() : []
    messages.push(message)

    await this.env.ARCHIVE.put(archiveKey, JSON.stringify(messages))

    // Generate embedding and store in Vectorize
    const embedding = await this.generateEmbedding(message.content)

    await this.env.VECTORIZE.upsert([{
      id: message.id,
      values: embedding,
      metadata: {
        sessionId: this.memory.sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        importance: 0.5, // Default importance
        type: 'episodic'
      }
    }])
  }

  /**
   * Update conversation context
   */
  private async updateContext(): Promise<void> {
    // Build context from recent messages
    const recentMessages = this.memory.messages.slice(-10)
    this.memory.context = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
  }

  /**
   * Extract entities from text (simple implementation)
   */
  private extractEntities(text: string): string[] {
    // Simple capitalized word extraction
    // In production, use NER model
    const words = text.split(/\s+/)
    return words
      .filter(w => /^[A-Z][a-z]+/.test(w) && w.length > 3)
      .slice(0, 10) // Limit to 10 entities
  }

  /**
   * Generate embedding using Workers AI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.env.AI.run(this.env.EMBEDDING_MODEL, {
      text: [text]
    })
    return response.data[0]
  }

  /**
   * Consolidate memories (summarization + entity extraction)
   */
  private async consolidateMemories(): Promise<any> {
    const messages = this.memory.messages.map(m => `${m.role}: ${m.content}`).join('\n')

    // Generate summary using Workers AI
    const summary = await this.env.AI.run(this.env.SUMMARIZATION_MODEL, {
      prompt: `Summarize the following conversation, extracting key facts, entities, and relationships:\n\n${messages}\n\nSummary:`
    })

    // Update consolidation timestamp
    this.memory.lastConsolidation = Date.now()

    return {
      summary: summary.response,
      timestamp: this.memory.lastConsolidation
    }
  }

  /**
   * Trigger async consolidation
   */
  private async triggerConsolidation(): Promise<void> {
    await this.consolidateMemories()
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(similarity: number, timestamp: number, importance: number): number {
    const recencyScore = Math.exp(-(Date.now() - timestamp) / (1000 * 60 * 60 * 24 * 7)) // 1 week decay
    return (similarity * 0.5) + (recencyScore * 0.3) + (importance * 0.2)
  }

  /**
   * Get total message count
   */
  private async getTotalMessageCount(): Promise<number> {
    const archiveKey = `sessions/${this.memory.sessionId}/archive.json`
    const archived = await this.env.ARCHIVE.get(archiveKey)
    const archivedMessages = archived ? await archived.json() : []
    return archivedMessages.length + this.memory.messages.length
  }

  /**
   * Get semantic memory count
   */
  private async getSemanticMemoryCount(): Promise<number> {
    // Query Vectorize for count
    const results = await this.env.VECTORIZE.query([0], {
      topK: 1,
      filter: { sessionId: this.memory.sessionId },
      returnMetadata: false
    })
    return results.count || 0
  }

  /**
   * Get archived size
   */
  private async getArchivedSize(): Promise<number> {
    const archiveKey = `sessions/${this.memory.sessionId}/archive.json`
    const archived = await this.env.ARCHIVE.get(archiveKey)
    return archived ? (await archived.arrayBuffer()).byteLength : 0
  }

  /**
   * Get entity count
   */
  private async getEntityCount(): Promise<number> {
    const result = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM entities WHERE session_id = ?'
    ).bind(this.memory.sessionId).first()
    return result?.count || 0
  }

  /**
   * Get relationship count
   */
  private async getRelationshipCount(): Promise<number> {
    const result = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM relationships WHERE session_id = ?'
    ).bind(this.memory.sessionId).first()
    return result?.count || 0
  }

  /**
   * Convert messages to Markdown
   */
  private convertToMarkdown(messages: Message[]): string {
    return messages.map(m => {
      const date = new Date(m.timestamp).toISOString()
      return `## ${m.role} (${date})\n\n${m.content}\n`
    }).join('\n---\n\n')
  }

  /**
   * Alarm handler for scheduled consolidation
   */
  async alarm(): Promise<void> {
    await this.consolidateMemories()

    // Schedule next consolidation in 1 hour
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
  }
}
