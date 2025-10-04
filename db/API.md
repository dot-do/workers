# Database Worker REST API Documentation

## Base URLs

The database worker is accessible via multiple domains:

- **Direct Access:**
  - `https://database.do/`
  - `https://db.mw/`

- **International Character Domains (Semantic):**
  - `https://彡.io/` - Data Layer (彡 = shape/pattern/database)
  - `https://口.io/` - Data Model - Nouns (口 = mouth/noun)
  - `https://回.io/` - Data Model - Things (回 = rotation/thing)

- **Via Gateway:**
  - `https://apis.do/db/`
  - `https://gateway.do/db/`

## Authentication

Most API endpoints require authentication. Include your API key or bearer token in the request headers:

```bash
Authorization: Bearer YOUR_API_KEY
```

Public endpoints (no auth required):
- `GET /health`
- `GET /`

## Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": { /* result data */ },
  "total": 100,
  "hasMore": true
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Pagination

List endpoints support pagination with the following query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```bash
GET /api/things?page=2&limit=50
```

## Things API

### List Things

Get a paginated list of things in a namespace.

**Endpoint:** `GET /api/things`

**Query Parameters:**
- `ns` (required) - Namespace (default: "default")
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `type` (optional) - Filter by entity type
- `visibility` (optional) - Filter by visibility ("public", "private")

**Example Request:**
```bash
curl -X GET "https://database.do/api/things?ns=onet&type=Occupation&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "data": [
    {
      "ns": "onet",
      "id": "11-1011.00",
      "type": "Occupation",
      "data": {
        "title": "Chief Executives",
        "description": "..."
      },
      "content": "Chief Executives determine and formulate policies...",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-02T00:00:00.000Z"
    }
  ],
  "total": 1000,
  "hasMore": true
}
```

---

### Get Single Thing

Get a specific thing by namespace and ID.

**Endpoint:** `GET /api/things/:ns/:id`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Thing ID

**Example Request:**
```bash
curl -X GET "https://database.do/api/things/onet/11-1011.00" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "ns": "onet",
  "id": "11-1011.00",
  "type": "Occupation",
  "data": {
    "title": "Chief Executives",
    "description": "Determine and formulate policies..."
  },
  "content": "Chief Executives determine and formulate policies...",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

---

### Create Thing

Create a new thing.

**Endpoint:** `POST /api/things`

**Request Body:**
```json
{
  "ns": "default",
  "id": "my-thing",
  "type": "Thing",
  "data": {
    "title": "My Thing",
    "description": "A sample thing"
  },
  "content": "Full text content for search indexing"
}
```

**Example Request:**
```bash
curl -X POST "https://database.do/api/things" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ns": "default",
    "id": "my-thing",
    "type": "Thing",
    "data": {
      "title": "My Thing"
    }
  }'
```

**Example Response:**
```json
{
  "ns": "default",
  "id": "my-thing",
  "type": "Thing",
  "data": {
    "title": "My Thing"
  },
  "createdAt": "2025-01-04T12:00:00.000Z",
  "updatedAt": "2025-01-04T12:00:00.000Z"
}
```

---

### Update Thing

Update an existing thing.

**Endpoint:** `PUT /api/things/:ns/:id`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Thing ID

**Request Body:**
```json
{
  "type": "Thing",
  "data": {
    "title": "Updated Title"
  }
}
```

**Example Request:**
```bash
curl -X PUT "https://database.do/api/things/default/my-thing" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "Updated Title"
    }
  }'
```

---

### Delete Thing

Delete a thing.

**Endpoint:** `DELETE /api/things/:ns/:id`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Thing ID

**Example Request:**
```bash
curl -X DELETE "https://database.do/api/things/default/my-thing" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "success": true,
  "deleted": 1
}
```

---

### Count Things

Get count of things in a namespace.

**Endpoint:** `GET /api/things/count/:ns`

**Parameters:**
- `ns` (required) - Namespace

**Query Parameters:**
- `type` (optional) - Filter by entity type
- `visibility` (optional) - Filter by visibility

**Example Request:**
```bash
curl -X GET "https://database.do/api/things/count/onet?type=Occupation" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "count": 1016
}
```

---

## Relationships API

### List Relationships

Get a paginated list of relationships in a namespace.

**Endpoint:** `GET /api/relationships`

**Query Parameters:**
- `ns` (required) - Namespace (default: "default")
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `predicate` (optional) - Filter by relationship predicate

**Example Request:**
```bash
curl -X GET "https://database.do/api/relationships?ns=onet&predicate=requires&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Get Relationships for a Thing (Outgoing)

Get all relationships where this thing is the source.

**Endpoint:** `GET /api/relationships/:ns/:id`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Thing ID

**Query Parameters:**
- `predicate` (optional) - Filter by relationship predicate
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Example Request:**
```bash
curl -X GET "https://database.do/api/relationships/onet/11-1011.00?predicate=requires" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "data": [
    {
      "fromNs": "onet",
      "fromId": "11-1011.00",
      "fromType": "Occupation",
      "predicate": "requires",
      "toNs": "onet",
      "toId": "2.A.1.a",
      "toType": "Ability",
      "data": {},
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "hasMore": true
}
```

---

### Get Incoming Relationships

Get all relationships where this thing is the target.

**Endpoint:** `GET /api/relationships/:ns/:id/incoming`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Thing ID

**Query Parameters:**
- `predicate` (optional) - Filter by relationship predicate
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Example Request:**
```bash
curl -X GET "https://database.do/api/relationships/onet/2.A.1.a/incoming" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Create Relationship

Create a new relationship between two things.

**Endpoint:** `POST /api/relationships`

**Request Body:**
```json
{
  "fromNs": "default",
  "fromId": "thing-a",
  "fromType": "Thing",
  "predicate": "relatesTo",
  "toNs": "default",
  "toId": "thing-b",
  "toType": "Thing",
  "data": {}
}
```

**Example Request:**
```bash
curl -X POST "https://database.do/api/relationships" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fromNs": "default",
    "fromId": "thing-a",
    "predicate": "relatesTo",
    "toNs": "default",
    "toId": "thing-b"
  }'
```

---

### Delete Relationship

Delete a relationship.

**Endpoint:** `DELETE /api/relationships/:ns/:id`

**Parameters:**
- `ns` (required) - Namespace
- `id` (required) - Relationship ID (composite key)

**Example Request:**
```bash
curl -X DELETE "https://database.do/api/relationships/default/rel-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Search API

### Full-Text Search

Search things using full-text search.

**Endpoint:** `GET /api/search`

**Query Parameters:**
- `q` (required) - Search query
- `ns` (optional) - Filter by namespace
- `limit` (optional) - Max results (default: 10)
- `minScore` (optional) - Minimum relevance score (default: 0)

**Example Request:**
```bash
curl -X GET "https://database.do/api/search?q=software+engineer&ns=onet&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "data": [
    {
      "ns": "onet",
      "id": "15-1252.00",
      "type": "Occupation",
      "content": "Software Developers, Applications",
      "score": 0.95
    }
  ],
  "total": 15
}
```

---

### Vector Similarity Search

Search things using vector embeddings.

**Endpoint:** `POST /api/search/vector`

**Request Body:**
```json
{
  "embedding": [0.1, 0.2, ...],  // Array of floats
  "ns": "onet",
  "limit": 10,
  "minScore": 0.7,
  "model": "workers-ai"  // or "openai", "gemma-768", etc.
}
```

**Example Request:**
```bash
curl -X POST "https://database.do/api/search/vector" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, 0.3, ...],
    "ns": "onet",
    "limit": 10,
    "model": "workers-ai"
  }'
```

**Example Response:**
```json
{
  "data": [
    {
      "ns": "onet",
      "id": "15-1252.00",
      "type": "Occupation",
      "content": "Software Developers, Applications",
      "distance": 0.15,
      "score": 0.87
    }
  ]
}
```

---

### Hybrid Search (Text + Vector)

Combine full-text and vector search for best results.

**Endpoint:** `POST /api/search/hybrid`

**Request Body:**
```json
{
  "query": "software engineer",
  "embedding": [0.1, 0.2, ...],
  "ns": "onet",
  "limit": 10,
  "minScore": 0.7,
  "model": "workers-ai"
}
```

**Example Request:**
```bash
curl -X POST "https://database.do/api/search/hybrid" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software engineer",
    "embedding": [0.1, 0.2, ...],
    "ns": "onet",
    "limit": 10
  }'
```

---

### Search Chunks

Search across document chunks (for long documents).

**Endpoint:** `POST /api/search/chunks`

**Request Body:**
```json
{
  "embedding": [0.1, 0.2, ...],
  "ns": "default",
  "limit": 10,
  "minScore": 0.7,
  "model": "workers-ai"
}
```

**Example Request:**
```bash
curl -X POST "https://database.do/api/search/chunks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, ...],
    "ns": "default",
    "limit": 10
  }'
```

**Example Response:**
```json
{
  "data": [
    {
      "ns": "default",
      "id": "document-123",
      "chunkIndex": 5,
      "chunkText": "This is chunk 5 of the document...",
      "chunkTokens": 512,
      "type": "Document",
      "distance": 0.12,
      "score": 0.91
    }
  ]
}
```

---

## Health & Monitoring

### Health Check

Check service health.

**Endpoint:** `GET /health`

**Example Request:**
```bash
curl https://database.do/health
```

**Example Response:**
```json
{
  "status": "ok",
  "clickhouse": {
    "status": "ok"
  },
  "postgres": {
    "status": "deprecated",
    "message": "PostgreSQL deprecated - using ClickHouse only"
  },
  "architecture": "ClickHouse primary, Vectorize (future)",
  "timestamp": "2025-01-04T12:00:00.000Z"
}
```

---

### Database Statistics

Get database statistics.

**Endpoint:** `GET /stats`

**Example Request:**
```bash
curl https://database.do/stats
```

---

### Type Distribution

Get entity type distribution.

**Endpoint:** `GET /types`

**Query Parameters:**
- `ns` (optional) - Filter by namespace

**Example Request:**
```bash
curl https://database.do/types?ns=onet
```

---

### Recent Activity

Get recent database activity from ClickHouse.

**Endpoint:** `GET /activity`

**Query Parameters:**
- `limit` (optional) - Max results (default: 100)

**Example Request:**
```bash
curl https://database.do/activity?limit=50
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid API key |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are rate-limited per API key:

- **Free tier:** 100 requests/minute
- **Pro tier:** 1000 requests/minute
- **Enterprise:** Custom limits

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704384000
```

---

## SDK Support

Official SDKs are available for:

- **JavaScript/TypeScript:** `@dot-do/sdk`
- **Python:** `dotdo-sdk`
- **Go:** `github.com/dot-do/sdk-go`

**Example (JavaScript):**
```javascript
import { DotDoClient } from '@dot-do/sdk'

const client = new DotDoClient({ apiKey: 'YOUR_API_KEY' })

// List things
const things = await client.things.list({ ns: 'onet', limit: 10 })

// Search
const results = await client.search.text({ q: 'software engineer' })

// Vector search
const vectorResults = await client.search.vector({
  embedding: [...],
  ns: 'onet'
})
```

---

## Support

For API support, please contact:

- **Email:** support@do.industries
- **GitHub:** https://github.com/dot-do/workers
- **Documentation:** https://docs.do.industries

---

**Last Updated:** 2025-01-04
**Version:** 1.0.0
