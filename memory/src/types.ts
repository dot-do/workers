/**
 * Core types for the AI Memory System
 */

export interface Env {
  MEMORY: DurableObjectNamespace
  VECTORIZE: Vectorize
  ARCHIVE: R2Bucket
  DB: D1Database
  AI: Ai
  CACHE: KVNamespace
  MEMORY_WORKING_SIZE: string
  MEMORY_CONSOLIDATION_THRESHOLD: string
  EMBEDDING_MODEL: string
  SUMMARIZATION_MODEL: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface Memory {
  id: string
  sessionId: string
  type: 'episodic' | 'semantic' | 'procedural'
  content: string
  embedding?: number[]
  importance: number // 0-1 score
  timestamp: number
  lastAccessed: number
  accessCount: number
  tags?: string[]
  entities?: Entity[]
  relationships?: Relationship[]
  metadata?: Record<string, any>
}

export interface Entity {
  id: string
  type: string // person, place, concept, fact, etc.
  name: string
  attributes: Record<string, any>
  firstSeen: number
  lastSeen: number
  occurrences: number
}

export interface Relationship {
  id: string
  sourceEntityId: string
  targetEntityId: string
  type: string // knows, located_in, related_to, etc.
  strength: number // 0-1
  context: string
  timestamp: number
}

export interface WorkingMemory {
  sessionId: string
  messages: Message[]
  activeEntities: Set<string>
  context: string
  lastConsolidation: number
}

export interface SemanticSearchResult {
  memory: Memory
  similarity: number
  relevance: number
}

export interface MemoryStats {
  totalMessages: number
  workingMemorySize: number
  semanticMemorySize: number
  archivedSize: number
  entities: number
  relationships: number
  lastConsolidation: number
}

export interface ConsolidationResult {
  summary: string
  entities: Entity[]
  relationships: Relationship[]
  keyFacts: string[]
  importanceScores: Map<string, number>
}

export interface MemoryQuery {
  query: string
  sessionId?: string
  type?: Memory['type']
  timeRange?: { start: number; end: number }
  limit?: number
  minImportance?: number
}

export interface MemoryGraphNode {
  id: string
  type: 'entity' | 'memory' | 'session'
  data: any
  connections: number
}

export interface MemoryGraphEdge {
  source: string
  target: string
  type: string
  weight: number
}
