export class DatabaseService extends WorkerEntrypoint<Env> {
  // Things (entities)
  async get(ns: string, id: string, options?: GetOptions)
  async list(ns: string, options?: ListOptions)
  async upsert(thing: Thing)
  async delete(ns: string, id: string)
  async count(ns: string, filters?: CountFilters)

  // Search
  async search(query: string, embedding?: number[], options?: SearchOptions)
  async vectorSearch(embedding: number[], options?: VectorSearchOptions)

  // Relationships
  async getRelationships(ns: string, id: string, options?: RelationshipListOptions)
  async getIncomingRelationships(ns: string, id: string, options?: RelationshipListOptions)
  async upsertRelationship(relationship: Relationship)
  async deleteRelationship(ns: string, id: string)
  async listRelationships(ns: string, options?: RelationshipListOptions)

  // Vector embeddings
  async getEntitiesWithoutEmbeddings(options?: { ns?: string; limit?: number; model?: EmbeddingModel })
  async updateEmbeddingsBatch(embeddings: Array<{ ns: string; id: string; embedding: number[]; model: EmbeddingModel }>)

  // Chunking
  async createChunks(chunks: Chunk[])
  async getChunks(ns: string, id: string)
  async searchChunks(options: ChunkSearchOptions)
  async getChunksWithoutEmbeddings(options?: { ns?: string; limit?: number; model?: EmbeddingModel })
  async updateChunkEmbeddingsBatch(embeddings: ChunkEmbedding[])

  // Analytics
  async stats()
  async typeDistribution(ns?: string)
  async clickhouseStats()
  async recentActivity(limit?: number)

  // Raw SQL (use with caution)
  async query(queryString: string, params?: Record<string, any>)
  async executeSql(query: string)
  async transaction(fn: (tx: any) => Promise<any>)

  // Direct ClickHouse access
  clickhouse()
  async sql(strings: TemplateStringsArray, ...values: unknown[])
}


// Get entity
const thing = await env.DB.get('agents', 'code-reviewer')

// List entities with pagination
const result = await env.DB.list('workflows', {
  page: 1,
  limit: 20,
  type: 'Automation',
  visibility: 'public',
})

// Create/update entity
await env.DB.upsert({
  ns: 'agents',
  id: 'code-reviewer',
  type: 'Agent',
  data: { name: 'Code Reviewer', model: 'gpt-4' },
  content: 'AI agent that reviews code for quality and security issues',
})

// Vector search
const embedding = await generateEmbedding('search query')
const results = await env.DB.vectorSearch(embedding, {
  ns: 'docs',
  limit: 10,
  minScore: 0.7,
  model: 'gemini-768',
})

// Hybrid search (text + vector)
const hybridResults = await env.DB.search('machine learning', embedding, {
  ns: 'docs',
  limit: 10,
  model: 'gemini-768',
})

// Create relationship
await env.DB.upsertRelationship({
  fromNs: 'agents',
  fromId: 'code-reviewer',
  fromType: 'Agent',
  predicate: 'uses',
  toNs: 'services',
  toId: 'openai',
  toType: 'Service',
  data: { model: 'gpt-4', temperature: 0.7 },
})

// Get relationships
const rels = await env.DB.getRelationships('agents', 'code-reviewer')
// Returns: { uses: [{ ns: 'services', id: 'openai', ... }], ... }

// Queue entities for embedding generation
const entities = await env.DB.getEntitiesWithoutEmbeddings({
  ns: 'docs',
  limit: 100,
  model: 'gemini-768',
})

// Batch update embeddings
await env.DB.updateEmbeddingsBatch([
  { ns: 'docs', id: 'guide-1', embedding: [...], model: 'gemini-768' },
  { ns: 'docs', id: 'guide-2', embedding: [...], model: 'gemini-768' },
])
