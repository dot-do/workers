# Search & Vector Database Rewrite Scope

## Executive Summary

This document outlines the architecture for a Cloudflare Workers-native search platform (`search.do` / `vectors.do`) that consolidates the capabilities of Algolia, Typesense, Meilisearch, Pinecone, Weaviate, and Qdrant into a unified edge-first search and vector database service.

**Key Insight**: Cloudflare's native Vectorize + Workers AI + D1 stack provides all the building blocks needed to replace external search/vector services with a more cost-effective, lower-latency edge solution.

---

## 1. Platform Competitive Analysis

### 1.1 Traditional Search Platforms

#### Algolia
- **Core Value**: Sub-20ms search with typo tolerance and synonyms
- **Key Features**:
  - NeuralSearch (hybrid keyword + vector)
  - AI Ranking, Personalization, AI Synonyms
  - Faceting, filtering, InstantSearch UI
- **Pricing**: $0.50/1K searches (Grow), $1.75/1K (AI features)
- **Limitation**: No self-hosted option, expensive at scale

#### Typesense
- **Core Value**: Open-source, typo-tolerant search
- **Key Features**:
  - Vector search with ONNX models
  - Hybrid search with configurable alpha (keyword vs semantic)
  - Built-in embedding generation (OpenAI, PaLM, custom ONNX)
  - Cosine similarity with distance threshold
- **Pricing**: ~$30/mo starting (cloud), free self-hosted
- **Limitation**: Requires dedicated cluster

#### Meilisearch
- **Core Value**: Developer-friendly instant search
- **Key Features**:
  - Multi-search (federated search across indexes)
  - Hybrid search via embedders (OpenAI, HuggingFace, Cohere)
  - Faceted filtering, geosearch
  - Conversational search endpoint
- **Pricing**: $30/mo starting (cloud), free open-source
- **Limitation**: Limited vector dimensions

### 1.2 Vector Databases

#### Pinecone
- **Core Value**: Managed vector database for production AI
- **Key Features**:
  - Serverless with on-demand pricing
  - Namespaces for multi-tenancy
  - Metadata filtering
  - Inference API (built-in embeddings)
- **Pricing**: Free tier (2GB), $0.33/GB storage, $16/M reads
- **Limitation**: US-only free tier, expensive at scale

#### Weaviate
- **Core Value**: Open-source AI-native vector database
- **Key Features**:
  - Schema-based with modules
  - Hybrid search (semantic + keyword)
  - RAG integration, Query Agent
  - Multi-tenant isolation
- **Pricing**: $45/mo Flex, $400/mo Premium
- **Limitation**: Complex deployment

#### Qdrant
- **Core Value**: AI-native vector search with payload filtering
- **Key Features**:
  - Universal Query API
  - Multiple distance metrics (dot, cosine, euclidean, manhattan)
  - ACORN algorithm for filtered search
  - Multi-vector per point
  - FastEmbed for embeddings
- **Pricing**: Free 1GB cluster, pay-as-you-go cloud
- **Limitation**: No serverless option

---

## 2. Cloudflare Native Stack

### 2.1 Vectorize (Vector Database)

**Capabilities**:
- 5M vectors per index, 50K indexes per account
- 1536 dimensions max (float32)
- 10KB metadata per vector
- Namespaces (50K per index)
- Metadata indexing (10 per index)
- Cosine, euclidean, dot-product distance

**Limits**:
| Resource | Free | Paid |
|----------|------|------|
| Indexes | 100 | 50,000 |
| Vectors/index | 5M | 5M |
| Namespaces | 1K | 50K |
| topK (with metadata) | 20 | 20 |
| topK (without) | 100 | 100 |

**Pricing**:
- 30M queried dimensions/mo free, then $0.01/M
- 5M stored dimensions free, then $0.05/100M
- Example: 50K vectors @ 768 dims, 200K queries/mo = $1.94/mo

### 2.2 Workers AI (Embeddings)

**Models Available**:
| Model | Dimensions | Notes |
|-------|------------|-------|
| bge-small-en-v1.5 | 384 | Compact, fast |
| bge-base-en-v1.5 | 768 | Balanced |
| bge-large-en-v1.5 | 1024 | High quality |
| bge-m3 | Variable | Multilingual |
| EmbeddingGemma-300m | TBD | Google, 100+ languages |
| Qwen3-Embedding-0.6b | TBD | Text ranking |

**Advantages**:
- Zero egress between Workers AI and Vectorize
- Pay per token, no idle costs
- Edge deployment (lower latency)

### 2.3 D1 (Metadata + Full-Text)

**Capabilities**:
- SQLite with FTS5 for full-text search
- 10GB per database (10K databases allowed)
- Read replicas for global edge reads
- Time Travel (30 days)

**Use Cases in Search**:
- Document metadata storage
- Inverted index for keyword search
- Facet value storage
- Analytics and query logs

---

## 3. Architecture Vision

### 3.1 Domain Structure

```
search.do              # Unified search API (keyword + semantic)
  |
  +-- vectors.do       # Pure vector operations
  +-- indexes.do       # Index management
  +-- facets.do        # Faceted search
  +-- suggest.do       # Autocomplete/suggestions
```

### 3.2 Internal Architecture

```
search.do/
  src/
    core/
      embedding/           # Workers AI embedding generation
      tokenizer/           # Text tokenization (for FTS)
      scorer/              # Relevance scoring (TF-IDF, BM25)
      ranker/              # Result ranking & fusion
    storage/
      vectorize/           # Vectorize wrapper
      d1/                  # D1 metadata + FTS5
      cache/               # Edge caching layer
    api/
      search/              # Unified search endpoint
      index/               # Index CRUD
      vector/              # Raw vector ops
      facet/               # Facet computation
      suggest/             # Autocomplete
    connectors/
      webhook/             # Real-time sync
      cron/                # Batch reindexing
  durable-object/
    SearchIndexDO          # Per-index coordination
    QueryCoordinatorDO     # Multi-index search
  workers/
    search-edge            # Edge search worker
    index-ingest           # Background indexing
```

### 3.3 Hybrid Search Strategy

```
Query: "comfortable wireless headphones under $100"
                    |
        +-----------+-----------+
        |                       |
    Keyword Path            Semantic Path
        |                       |
    D1 FTS5                 Workers AI
    "wireless"              embed(query)
    "headphones"                |
        |                   Vectorize
        |                   k-NN search
        |                       |
        +-----------+-----------+
                    |
             Rank Fusion
        (RRF or Linear blend)
                    |
           Metadata Filter
          price < 100, in_stock
                    |
            Final Results
```

### 3.4 Data Flow

```
Document Ingestion:
  Client -> search.do/index
         -> Queue (background)
         -> Workers AI (embed)
         -> Vectorize (upsert)
         -> D1 (metadata + FTS)

Search Query:
  Client -> search.do (edge)
         -> [D1 FTS + Vectorize] parallel
         -> Rank fusion
         -> D1 (enrich metadata)
         -> Response
```

---

## 4. API Design

### 4.1 Core Search API

```typescript
// Natural language search
const results = await search.do`
  Find wireless headphones under $100
  that have good reviews for travel
`

// Structured search
const results = await search.search('products', 'wireless headphones', {
  limit: 20,
  offset: 0,
  filters: [
    { field: 'price', op: 'lt', value: 100 },
    { field: 'inStock', op: 'eq', value: true }
  ],
  facets: ['category', 'brand'],
  sort: [{ field: 'relevance', order: 'desc' }],
  semantic: true,        // Enable vector search
  hybrid: {
    alpha: 0.7           // 70% semantic, 30% keyword
  }
})
```

### 4.2 Vector Operations

```typescript
// Generate embedding
const vector = await search.embed('comfortable headphones for travel')

// Direct vector search
const similar = await search.searchVector('products', vector, {
  limit: 10,
  namespace: 'electronics',
  filter: { brand: 'Sony' }
})

// Batch embeddings
const vectors = await search.embedBatch([
  'wireless headphones',
  'bluetooth speakers',
  'usb cables'
])
```

### 4.3 Index Management

```typescript
// Create index with schema
await search.createIndex('products', {
  semantic: true,
  embeddingModel: '@cf/baai/bge-base-en-v1.5',
  fields: [
    { name: 'title', type: 'text', searchable: true, boost: 2 },
    { name: 'description', type: 'text', searchable: true },
    { name: 'price', type: 'number', filterable: true, sortable: true },
    { name: 'category', type: 'keyword', filterable: true, facetable: true },
    { name: 'brand', type: 'keyword', filterable: true, facetable: true },
    { name: 'embedding', type: 'vector', dimensions: 768 }
  ]
})

// Index documents
await search.index('products', [
  { id: 'p1', title: 'Wireless Headphones', price: 99, ... },
  { id: 'p2', title: 'Bluetooth Speaker', price: 49, ... }
])
```

### 4.4 Facets & Suggestions

```typescript
// Get facet values
const facets = await search.facets('products', ['category', 'brand'], {
  query: 'headphones',
  limit: 10
})
// { category: [{ value: 'audio', count: 150 }], brand: [...] }

// Autocomplete suggestions
const suggestions = await search.suggest('products', 'wire', {
  limit: 5,
  fuzzy: true
})
// ['wireless headphones', 'wireless speakers', 'wire cutters']
```

---

## 5. Implementation Phases

### Phase 1: Core Vector Search (MVP)
- [ ] Vectorize wrapper with Workers AI integration
- [ ] Basic upsert/query/delete operations
- [ ] Namespace support
- [ ] Metadata filtering
- [ ] SDK (`vectors.do` package)

### Phase 2: Full-Text Search
- [ ] D1 FTS5 integration
- [ ] Tokenization and normalization
- [ ] BM25 scoring
- [ ] Typo tolerance (fuzzy matching)
- [ ] Synonym support

### Phase 3: Hybrid Search
- [ ] Rank fusion (RRF + linear blend)
- [ ] Configurable alpha (keyword vs semantic)
- [ ] Query understanding (intent detection)
- [ ] Result deduplication

### Phase 4: Advanced Features
- [ ] Faceted search with counts
- [ ] Autocomplete/suggestions
- [ ] Geosearch
- [ ] Analytics (query logs, zero-result tracking)
- [ ] Natural language search (`.do` template)

### Phase 5: Enterprise Features
- [ ] Multi-tenancy (per-tenant namespaces)
- [ ] Index replication (global edge)
- [ ] Personalization
- [ ] A/B testing for ranking
- [ ] Query caching

---

## 6. Cost Comparison

### Scenario: 100K documents, 500K searches/month

| Platform | Storage | Queries | Monthly Cost |
|----------|---------|---------|--------------|
| Algolia | $40 | $250 | ~$290 |
| Pinecone | $33 | $80 | ~$113 |
| Weaviate | $12 | $75 | ~$87 |
| **search.do** | $0.05 | $0.50 | **~$1** |

**Advantage**: 100x+ cost reduction at scale

### Latency Comparison

| Platform | P50 Latency | Notes |
|----------|-------------|-------|
| Algolia | <20ms | Distributed edge |
| Pinecone | 50-100ms | Centralized regions |
| **search.do** | <10ms | Edge + cached |

---

## 7. Technical Considerations

### 7.1 Index Size Limitations

**Challenge**: Vectorize has 5M vector limit per index

**Solutions**:
1. **Sharding**: Partition by namespace/tenant
2. **Tiering**: Hot vectors in Vectorize, cold in R2
3. **Multi-index**: Federated search across indexes

### 7.2 Embedding Generation Costs

**Challenge**: Workers AI costs per token

**Mitigations**:
1. **Caching**: Hash-based embedding cache in KV
2. **Batching**: Batch document embeddings
3. **Model selection**: Use smaller models (bge-small) for suggestions

### 7.3 Hybrid Search Latency

**Challenge**: Parallel D1 + Vectorize adds latency

**Optimizations**:
1. **Speculative execution**: Start both paths immediately
2. **Early termination**: Stop if one path has high-confidence results
3. **Caching**: Cache frequent queries at edge

### 7.4 Full-Text Search Quality

**Challenge**: D1 FTS5 is basic compared to Elasticsearch

**Enhancements**:
1. **Stemming**: Porter stemmer for English
2. **Synonyms**: Synonym expansion before search
3. **Boosting**: Field-level relevance weights
4. **Typo tolerance**: Levenshtein distance matching

---

## 8. Existing Code to Leverage

### From `searches.do` SDK
- Complete TypeScript interface for search API
- Filter, facet, and sort type definitions
- Natural language `.do` template pattern

### From `rewrites/mongo` Vector Search
- Vectorize type definitions
- Vector search stage translator
- Workers AI embedding integration

### From `rewrites/convex` Full-Text
- Tokenization and normalization
- Fuzzy matching (Levenshtein)
- TF-IDF-like relevance scoring
- Search filter builder pattern

---

## 9. Success Metrics

### Performance
- P50 search latency < 10ms
- P99 search latency < 50ms
- Indexing throughput > 1000 docs/sec

### Cost
- < $5/mo for 100K docs, 500K queries
- Zero egress costs (all Cloudflare)

### Developer Experience
- Index creation < 1 minute
- First search < 5 minutes from signup
- SDK in npm, types in TypeScript

---

## 10. Recommended Approach

### Start with `vectors.do`
Focus on vector operations first since Vectorize is the most mature CF primitive.

### Build on `searches.do` SDK
The SDK interface is already well-designed. Implement the backend to match.

### Hybrid search is the differentiator
Combine D1 FTS5 + Vectorize for best-of-both-worlds search quality.

### Edge caching is key
Use KV/Cache API for frequent queries to achieve sub-10ms latency.

---

## Appendix A: Cloudflare Binding Example

```typescript
// wrangler.toml
[[vectorize]]
binding = "VECTORS"
index_name = "products"

[[d1_databases]]
binding = "DB"
database_id = "xxx"

[[ai]]
binding = "AI"

// worker.ts
export default {
  async fetch(req: Request, env: Env) {
    // Generate embedding
    const { data } = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: 'wireless headphones'
    })

    // Query vectors
    const results = await env.VECTORS.query(data[0], {
      topK: 10,
      returnMetadata: 'all'
    })

    // Enrich from D1
    const ids = results.matches.map(m => m.id)
    const docs = await env.DB.prepare(
      `SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`
    ).bind(...ids).all()

    return Response.json({ results: docs.results })
  }
}
```

---

## Appendix B: Feature Parity Matrix

| Feature | Algolia | Typesense | Meilisearch | Pinecone | Weaviate | Qdrant | search.do |
|---------|---------|-----------|-------------|----------|----------|--------|-----------|
| Keyword search | Y | Y | Y | - | Y | - | Y |
| Vector search | Y | Y | Y | Y | Y | Y | Y |
| Hybrid search | Y | Y | Y | - | Y | Y | Y |
| Typo tolerance | Y | Y | Y | - | - | - | Y |
| Faceting | Y | Y | Y | - | Y | Y | Y |
| Autocomplete | Y | Y | Y | - | - | - | Y |
| Geosearch | Y | Y | Y | - | Y | - | P2 |
| Multi-tenancy | Y | Y | Y | Y | Y | Y | Y |
| Analytics | Y | - | - | - | Y | - | Y |
| Edge deployment | Y | - | - | - | - | - | Y |
| Free tier | Y | - | - | Y | Y | Y | Y |
| Open source | - | Y | Y | - | Y | Y | - |

---

*Document Version: 1.0*
*Last Updated: 2026-01-07*
*Author: Research Agent*
