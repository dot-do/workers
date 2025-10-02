# Embeddings Service

Generate and manage vector embeddings for semantic search using Workers AI and OpenAI.

## Features

- **Multiple AI Models**
  - Workers AI: `@cf/google/embeddinggemma-300m` (768 dimensions)
  - OpenAI: `text-embedding-3-small` (1536 dimensions)

- **RPC Interface** - Called by other services via service bindings
- **HTTP API** - RESTful endpoints for embedding operations
- **Queue Processing** - Async embedding generation for bulk operations
- **Backfill Support** - Automatically generate embeddings for existing entities
- **Similarity Comparison** - Cosine similarity calculation

## RPC Methods

```typescript
// Generate embedding for text
const embedding = await env.EMBEDDINGS_SERVICE.generateEmbedding(text, 'workers-ai')

// Embed a thing and store in database
await env.EMBEDDINGS_SERVICE.embedThing('onet', 'software-developers')

// Backfill embeddings for things without them
const result = await env.EMBEDDINGS_SERVICE.backfillEmbeddings({
  ns: 'onet',
  limit: 100,
  model: 'workers-ai'
})

// Compare two embeddings
const similarity = env.EMBEDDINGS_SERVICE.compareEmbeddings(emb1, emb2)

// Queue embedding job for async processing
await env.EMBEDDINGS_SERVICE.queueEmbeddingJob('onet', 'occupation-id')
```

## HTTP Endpoints

### Generate Embedding

```bash
POST /embed
Content-Type: application/json

{
  "text": "Software development involves designing and coding applications",
  "model": "workers-ai" // or "openai"
}
```

**Response:**
```json
{
  "embedding": [0.123, 0.456, ...],
  "dimensions": 768,
  "model": "workers-ai"
}
```

### Embed Thing

```bash
POST /embed/thing/:ns/:id?model=workers-ai
```

**Response:**
```json
{
  "success": true,
  "ns": "onet",
  "id": "software-developers"
}
```

### Queue Embedding Job

```bash
POST /embed/queue/:ns/:id?model=workers-ai
```

**Response:**
```json
{
  "queued": true,
  "ns": "onet",
  "id": "software-developers"
}
```

### Backfill Embeddings

```bash
POST /embed/backfill
Content-Type: application/json

{
  "ns": "onet",  // optional
  "limit": 100,
  "model": "workers-ai"
}
```

**Response:**
```json
{
  "total": 100,
  "successful": 98,
  "failed": 2
}
```

### Compare Embeddings

```bash
POST /embed/compare
Content-Type: application/json

{
  "embedding1": [0.1, 0.2, ...],
  "embedding2": [0.15, 0.18, ...]
}
```

**Response:**
```json
{
  "similarity": 0.92,
  "match": "high"
}
```

## Queue Processing

The service automatically processes embedding jobs from the `embeddings` queue:

```typescript
// Messages are processed in batches
{
  "ns": "onet",
  "id": "software-developers",
  "model": "workers-ai"  // optional
}
```

Failed jobs are automatically retried with exponential backoff.

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...  # Required for OpenAI model
```

### Service Bindings

```jsonc
// wrangler.jsonc
{
  "services": [
    { "binding": "DB", "service": "db" }
  ],
  "ai": {
    "binding": "AI"
  },
  "queues": {
    "consumers": [
      { "queue": "embeddings", "max_batch_size": 10 }
    ],
    "producers": [
      { "queue": "embeddings", "binding": "EMBEDDINGS_QUEUE" }
    ]
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Models

### Workers AI (Default)

- **Model:** `@cf/google/embeddinggemma-300m`
- **Dimensions:** 768
- **Cost:** Free (Workers AI quota)
- **Speed:** Fast (runs on edge)

### OpenAI

- **Model:** `text-embedding-3-small`
- **Dimensions:** 1536
- **Cost:** $0.00002 per 1K tokens
- **Speed:** Slower (API call)
- **Quality:** Higher quality embeddings

## Usage Examples

### Generate Embeddings for All Occupations

```typescript
const result = await env.EMBEDDINGS_SERVICE.backfillEmbeddings({
  ns: 'onet',
  limit: 1000,
  model: 'workers-ai'
})

console.log(`Embedded ${result.successful} occupations`)
```

### Queue Bulk Embedding Jobs

```typescript
const occupations = await env.DB.listThings('onet', 'Occupation')

for (const occupation of occupations) {
  await env.EMBEDDINGS_SERVICE.queueEmbeddingJob(
    occupation.ns,
    occupation.id,
    'workers-ai'
  )
}
```

### Find Similar Entities

```typescript
// Get embedding for search query
const queryEmbedding = await env.EMBEDDINGS_SERVICE.generateEmbedding(
  'programming and software development',
  'workers-ai'
)

// Compare with entity embeddings
const thing = await env.DB.getThing('onet', 'software-developers')
const similarity = env.EMBEDDINGS_SERVICE.compareEmbeddings(
  queryEmbedding,
  thing.embedding
)

if (similarity > 0.8) {
  console.log('Highly relevant!')
}
```

## Error Handling

The service validates all inputs using Zod schemas and returns appropriate HTTP status codes:

- `400` - Validation error (invalid input)
- `404` - Thing not found
- `503` - Queue not configured
- `500` - Internal server error

## Testing

Run the test suite:

```bash
pnpm test
```

Test coverage includes:
- ✅ Workers AI embedding generation
- ✅ OpenAI embedding generation
- ✅ Thing embedding and storage
- ✅ Backfill operations
- ✅ Cosine similarity calculation
- ✅ Queue job processing
- ✅ Error handling
- ✅ Input validation

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/RPC
       ▼
┌─────────────────┐     ┌──────────┐
│   Embeddings    │────▶│ Workers  │
│    Service      │     │   AI     │
└────────┬────────┘     └──────────┘
         │
         │ Service Binding
         ▼
┌─────────────────┐     ┌──────────┐
│   Database      │────▶│  Queue   │
│    Service      │     │ Consumer │
└─────────────────┘     └──────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

## License

MIT
