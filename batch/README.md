# Batch Service

RPC-based batch processing service for bulk imports, exports, and transformations.

## Features

- **Bulk Imports**: Import things and relationships in batches
- **Bulk Exports**: Export data to JSON, CSV, or NDJSON formats
- **Embedding Generation**: Generate embeddings for multiple items
- **Data Transformation**: Transform data in batches
- **Progress Tracking**: Track processing progress in real-time
- **Error Handling**: Track failed items with detailed error messages
- **Queue-Based**: Async processing via Cloudflare Queues

## Batch Types

### 1. Import Things (`import-things`)

Bulk import things into the database.

**Example:**
```typescript
await env.BATCH.createBatchJob({
  type: 'import-things',
  items: [
    {
      ns: 'products',
      id: 'product-1',
      type: 'Product',
      data: { name: 'Widget', price: 19.99 },
      content: 'A high-quality widget',
      visibility: 'public'
    }
  ]
})
```

### 2. Import Relationships (`import-relationships`)

Bulk import relationships between things.

**Example:**
```typescript
await env.BATCH.createBatchJob({
  type: 'import-relationships',
  items: [
    {
      ns: 'relationships',
      id: 'rel-1',
      type: 'hasCategory',
      fromNs: 'products',
      fromId: 'product-1',
      toNs: 'categories',
      toId: 'category-1',
      data: {}
    }
  ]
})
```

### 3. Generate Embeddings (`generate-embeddings`)

Generate embeddings for multiple items.

**Example:**
```typescript
await env.BATCH.createBatchJob({
  type: 'generate-embeddings',
  items: [
    { ns: 'products', id: 'product-1' },
    { ns: 'products', id: 'product-2' }
  ]
})
```

### 4. Export Things (`export-things`)

Export things from the database.

**Example:**
```typescript
await env.BATCH.createBatchJob({
  type: 'export-things',
  items: [
    { ns: 'products', id: 'product-1' },
    { ns: 'products', id: 'product-2' }
  ]
})
```

### 5. Transform Data (`transform-data`)

Transform data in batches (placeholder for custom transformations).

**Example:**
```typescript
await env.BATCH.createBatchJob({
  type: 'transform-data',
  items: [
    { data: { original: 'value' } }
  ]
})
```

## RPC Interface

### `createBatchJob(job: BatchJob): Promise<string>`

Create a new batch job.

**Parameters:**
- `type`: Batch type (see above)
- `items`: Array of items to process
- `input`: Optional input data
- `options`: Optional configuration

**Returns:** Job ID

### `getBatchJob(jobId: string): Promise<BatchJobRecord | null>`

Get batch job status and details.

**Returns:**
```typescript
{
  id: string
  type: BatchType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total: number
  processed: number
  failed: number
  results: any[]
  errors: Array<{ index: number, error: string }>
  createdAt: string
  updatedAt: string
  completedAt?: string
}
```

### `exportToFormat(ns: string, format: 'json' | 'csv' | 'ndjson'): Promise<ReadableStream>`

Export namespace to specific format.

**Parameters:**
- `ns`: Namespace to export
- `format`: Output format

**Returns:** ReadableStream of exported data

### `getStats(): Promise<BatchStats>`

Get batch processing statistics.

**Returns:**
```typescript
{
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  successRate: string
}
```

## HTTP API

### `POST /batch`

Create a new batch job.

**Request:**
```json
{
  "type": "import-things",
  "items": [
    {
      "ns": "products",
      "id": "product-1",
      "type": "Product",
      "data": { "name": "Widget" }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "abc123",
  "message": "Batch job created and queued"
}
```

### `GET /batch/:id`

Get batch job status.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "abc123",
    "type": "import-things",
    "status": "completed",
    "total": 100,
    "processed": 100,
    "failed": 0,
    "createdAt": "2025-10-02T10:00:00Z",
    "completedAt": "2025-10-02T10:05:00Z"
  }
}
```

### `GET /export/:ns?format=json`

Export namespace to format.

**Query Parameters:**
- `format`: `json`, `csv`, or `ndjson` (default: `json`)

**Response:** File download with appropriate Content-Type

### `GET /stats`

Get batch statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "pending": 5,
    "processing": 10,
    "completed": 30,
    "failed": 5,
    "successRate": "85.71%"
  }
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "batch",
  "timestamp": "2025-10-02T10:00:00Z"
}
```

## Queue Consumer

The service includes a queue consumer that processes batch jobs asynchronously.

**Queue Configuration:**
- Queue: `batch-queue`
- Max Batch Size: 100
- Max Batch Timeout: 30s
- Max Retries: 3
- Dead Letter Queue: `batch-dlq`

## Service Bindings

Required bindings in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "things" },
    { "binding": "EMBEDDINGS", "service": "embeddings" }
  ],
  "queues": {
    "consumers": [
      {
        "queue": "batch-queue",
        "max_batch_size": 100,
        "max_batch_timeout": 30
      }
    ],
    "producers": [
      { "binding": "BATCH_QUEUE", "queue": "batch-queue" }
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

## Testing

Run tests with:

```bash
pnpm test
```

Tests cover:
- Batch job creation for all types
- Batch processing with progress tracking
- Error handling and failed item tracking
- Export to JSON, CSV, and NDJSON
- Statistics calculation

## Examples

### Import 1000 Products

```typescript
const items = products.map(p => ({
  ns: 'products',
  id: p.id,
  type: 'Product',
  data: p,
  visibility: 'public'
}))

const jobId = await env.BATCH.createBatchJob({
  type: 'import-things',
  items
})

// Check progress
const job = await env.BATCH.getBatchJob(jobId)
console.log(`${job.processed}/${job.total} processed`)
```

### Export Products to CSV

```typescript
const stream = await env.BATCH.exportToFormat('products', 'csv')

// Or via HTTP:
// GET /export/products?format=csv
```

### Generate Embeddings for All Products

```typescript
const products = await env.DB.list('products')
const items = products.data.map(p => ({
  ns: 'products',
  id: p.id
}))

await env.BATCH.createBatchJob({
  type: 'generate-embeddings',
  items
})
```

## Architecture

### Flow

1. **Create Job**: Job metadata stored in database
2. **Queue Message**: Job queued for async processing
3. **Process Items**: Queue consumer processes items one by one
4. **Track Progress**: Progress updated every 100 items
5. **Complete**: Final status and results saved

### Error Handling

- Failed items are tracked with error messages
- Job marked as `failed` if any items fail
- Detailed error log in `job.errors` array
- Queue retries up to 3 times
- Dead letter queue for unrecoverable failures

## Performance

- **Batch Size**: 100 items per queue message
- **Concurrency**: Limited by queue consumer concurrency
- **Progress Updates**: Every 100 items
- **Timeout**: 30s per batch
- **Retries**: 3 attempts per batch

## License

MIT
