# Memory Worker - AI Memory System

Persistent AI memory service with 4-tier architecture for infinite-context AI agents.

## Overview

The Memory Worker provides persistent, searchable, infinite-context memory for AI agents by combining:

- **Durable Objects** - Stateful working memory (< 1ms access)
- **Vectorize** - Semantic search over memories (< 100ms)
- **Workers AI** - Embeddings + summarization (on-demand)
- **R2** - Unlimited archival storage (< 500ms retrieval)
- **D1** - Entity/relationship graph database
- **KV** - Caching layer for frequently accessed data

## Architecture

### 4-Tier Memory System

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│              (Hono API + WebSocket Server)                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   TIER 1:    │    │   TIER 2:    │    │   TIER 3:    │
│   Working    │◄───┤  Semantic    │◄───┤   Long-term  │
│   Memory     │    │   Memory     │    │   Archive    │
│              │    │              │    │              │
│  Durable     │    │  Vectorize   │    │      R2      │
│  Objects     │    │  + D1 Graph  │    │              │
│              │    │              │    │              │
│  < 1ms       │    │  < 100ms     │    │  < 500ms     │
│  ~50 msgs    │    │  Unlimited   │    │  Unlimited   │
└──────────────┘    └──────────────┘    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   TIER 4:    │
                    │ Consolidation│
                    │              │
                    │  Workers AI  │
                    │  Embeddings  │
                    │ Summarization│
                    │              │
                    │  ~2s async   │
                    └──────────────┘
```

## Features

### Working Memory (Tier 1)
- Last 50 messages in-memory (Durable Objects)
- < 1ms access time
- Real-time WebSocket streaming
- Automatic hibernation
- State preservation

### Semantic Memory (Tier 2)
- Vector embeddings for all memories (Vectorize)
- Semantic search (< 100ms)
- Memory clustering (k-means)
- Cross-session retrieval
- Relevance ranking (similarity + recency + importance + access frequency)

### Long-term Archive (Tier 3)
- Unlimited R2 storage
- Efficient time-range retrieval
- Memory replay (reconstruct context)
- Export formats (JSON, Markdown, HTML, TXT)
- Compression for old archives

### Memory Consolidation (Tier 4)
- Automatic summarization (Workers AI)
- Entity extraction (NER)
- Relationship discovery
- Key fact extraction
- Importance scoring
- Memory deduplication

### Knowledge Graph
- Entity tracking (people, places, concepts, etc.)
- Relationship discovery
- Graph traversal (BFS/DFS)
- Path finding between entities
- Community detection
- Centrality analysis
- Export formats (JSON, DOT, Cytoscape)

## Performance

| Memory Type | Storage | Access Time | Capacity | Use Case |
|-------------|---------|-------------|----------|----------|
| **Working** | Durable Objects | < 1ms | ~50 messages | Current conversation |
| **Semantic** | Vectorize + D1 | < 100ms | Unlimited | Searchable memories |
| **Archive** | R2 | < 500ms | Unlimited | Historical data |
| **Consolidation** | Workers AI | ~2s (async) | N/A | Background processing |

## API Endpoints

### Sessions

**Initialize Session**
```bash
POST /sessions
{
  "sessionId": "session_123"
}
```

**Add Message**
```bash
POST /sessions/:sessionId/messages
{
  "id": "msg_1",
  "role": "user",
  "content": "Hello, I'm working on Project Phoenix",
  "timestamp": 1234567890000
}
```

**Get Working Memory**
```bash
GET /sessions/:sessionId/memory?context=true&limit=50
```

### Search

**Semantic Search**
```bash
POST /sessions/:sessionId/search
{
  "query": "What projects is the user working on?",
  "limit": 10,
  "minImportance": 0.5
}
```

**Find Similar Memories**
```bash
GET /memories/:memoryId/similar?limit=5
```

**Cluster Memories**
```bash
GET /sessions/:sessionId/clusters?clusters=5
```

### Consolidation

**Trigger Consolidation**
```bash
POST /sessions/:sessionId/consolidate
```

**Get Statistics**
```bash
GET /sessions/:sessionId/stats
```

### Archive

**Archive Session**
```bash
POST /sessions/:sessionId/archive
```

**Export Session**
```bash
GET /sessions/:sessionId/export?format=markdown
# Formats: json, markdown, html, txt
```

**Replay Memory**
```bash
POST /sessions/:sessionId/replay
{
  "timestamp": 1234567890000,
  "contextWindow": 10
}
```

### Knowledge Graph

**Get Entity**
```bash
GET /entities/:entityId
```

**Get Relationships**
```bash
GET /entities/:entityId/relationships
```

**Find Path**
```bash
GET /entities/:sourceId/path/:targetId
```

**Get Graph**
```bash
GET /sessions/:sessionId/graph
```

**Export Graph**
```bash
GET /sessions/:sessionId/graph/export?format=dot
# Formats: json, dot, cytoscape
```

### WebSocket

**Real-time Streaming**
```javascript
const ws = new WebSocket('wss://memory.drivly.workers.dev/sessions/session_123/ws')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Memory update:', data)
}

ws.send(JSON.stringify({
  type: 'add_message',
  message: { id: 'msg_1', role: 'user', content: 'Hello', timestamp: Date.now() }
}))
```

## Infrastructure

### Cloudflare Resources

- **D1 Database**: `memory-db` (ID: 3c587b5a-390a-48a8-843f-f8e245ce7b81)
- **KV Namespace**: `memory-cache` (ID: e2a45ed25d5c4e7e98ed99f290a82111)
- **Vectorize Index**: `memory-semantic` (768 dimensions, cosine metric)
- **R2 Bucket**: `memory-archive`
- **Durable Object**: `MemoryObject`

### Environment Variables

- `MEMORY_WORKING_SIZE`: Number of messages to keep in working memory (default: 50)
- `MEMORY_CONSOLIDATION_THRESHOLD`: Number of messages before triggering consolidation (default: 100)
- `EMBEDDING_MODEL`: Workers AI model for embeddings (default: @cf/baai/bge-base-en-v1.5)
- `SUMMARIZATION_MODEL`: Workers AI model for summarization (default: @cf/meta/llama-3.1-8b-instruct)

## Deployment

### Production
```bash
wrangler deploy
```

### Development
```bash
wrangler dev
```

## Use Cases

### Customer Support Agent
```typescript
// Agent remembers entire customer history
const memories = await search({
  query: "What issues has this customer reported?",
  sessionId: customer.id,
  limit: 10
})

// Generate response with full context
const response = await ai.generate({
  context: memories.map(m => m.content).join('\n'),
  prompt: "How can I help you today?"
})
```

### Personal AI Assistant
```typescript
// Remember user preferences across sessions
const preferences = await graph.getEntitiesByType(userId, 'preference')

// Long-term learning
const consolidation = await consolidate(userId)
console.log('Learned:', consolidation.keyFacts)
```

### AI Coding Agent
```typescript
// Remember project architecture
const projectMemories = await search({
  query: "How is the authentication system structured?",
  sessionId: projectId
})

// Learn patterns over time
const patterns = await graph.findCommunities(projectId)
```

## Scaling

### Millions of Users
- **Durable Objects**: Auto-scales per session (1 DO per session)
- **Vectorize**: Handles billions of vectors
- **R2**: Unlimited storage
- **D1**: Sharding by session ID

### Cost Optimization
1. **Lazy Loading**: Only load working memory on demand
2. **Compression**: Compress old archives
3. **TTL**: Delete old archives after N months
4. **Caching**: Use KV for frequently accessed entities

### Performance Tuning
1. **Batch Operations**: Batch D1 writes
2. **Parallel Queries**: Search + graph queries in parallel
3. **Denormalization**: Cache entity counts in sessions table
4. **Indexes**: Ensure proper indexing on all query patterns

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) - Multi-repo project overview
- [Workers CLAUDE.md](../CLAUDE.md) - Workers architecture and patterns
- [Prototype README](../../prototypes/ai-memory-system/README.md) - Original prototype

---

**Status**: Production deployment complete
**URL**: https://memory.drivly.workers.dev
**Version**: v1.0.0
**Deployed**: 2025-10-05
