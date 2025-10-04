# Blog Stream Worker

AI-powered blog post generation with streaming responses.

## Features

✅ **On-Demand Generation** - Generate blog posts on-the-fly when not found in DB
✅ **Streaming Responses** - Server-Sent Events (SSE) for real-time content streaming
✅ **Safety Validation** - Comprehensive title validation (SQL injection, XSS, path traversal)
✅ **Workers AI Generation** - Uses OpenChat 3.5 model via Workers AI
✅ **Database Integration** - Automatic caching of generated posts
✅ **RPC Interface** - Service-to-service communication support

## API

### HTTP Endpoints

#### `GET /`
Health check endpoint.

**Response:**
```json
{
  "service": "blog-stream",
  "version": "1.0.0",
  "status": "ready"
}
```

#### `GET /blog/:slug`
Get or generate a blog post. Returns existing post from DB or streams AI-generated content.

**Parameters:**
- `slug` - URL-safe blog post identifier (e.g., `hello-world`, `getting-started-with-ai`)

**Response (Existing Post):**
```json
{
  "source": "database",
  "post": {
    "id": "hello-world",
    "slug": "hello-world",
    "title": "Hello World",
    "content": "# Hello World\n\n...",
    "excerpt": "Welcome to...",
    "author": "AI Generated",
    "published_at": "2025-01-08T00:00:00Z",
    "created_at": "2025-01-08T00:00:00Z",
    "updated_at": "2025-01-08T00:00:00Z"
  }
}
```

**Response (Streaming Generation):**
Server-Sent Events (SSE) stream:

```
data: {"type":"start","title":"Hello World","slug":"hello-world","generating":true}

data: {"type":"content","text":"# Hello World\n\n"}

data: {"type":"content","text":"Welcome to this blog post..."}

data: {"type":"complete","slug":"hello-world","title":"Hello World","contentLength":1234}
```

**Error Response:**
```json
{
  "error": "Invalid blog post title",
  "reason": "Title contains XSS patterns"
}
```

### RPC Interface

```typescript
// Generate blog post via RPC
const result = await env.BLOG_STREAM_SERVICE.generatePost('hello-world')

// Check if post exists
const exists = await env.BLOG_STREAM_SERVICE.postExists('hello-world')
```

## Safety Checks

The worker validates blog post slugs against multiple attack vectors:

- **SQL Injection** - Blocks `'`, `"`, `;`, `\` characters
- **XSS** - Blocks `<script>`, `<iframe>`, `javascript:`, `onerror=`
- **Path Traversal** - Blocks `..`, `//` patterns
- **Command Injection** - Blocks `;`, `&`, `|`, `` ` ``, `$`, `()` characters
- **Length Validation** - Max 200 characters
- **Empty Slugs** - Rejects empty or dash-only slugs

## AI Model

Uses **OpenChat 3.5** (`@cf/openchat/openchat-3.5-0106`) via Cloudflare Workers AI.

**Benefits:**
- ✅ No API keys required
- ✅ Built-in to Workers platform
- ✅ Fast streaming responses
- ✅ Cost-effective at scale
- ✅ Good quality blog content

No additional configuration needed - the AI binding is included in `wrangler.jsonc`.

## Usage Examples

### Client-Side (EventSource)

```javascript
const eventSource = new EventSource('/blog/hello-world')

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'start':
      console.log('Generation started:', data.title)
      break

    case 'content':
      // Append content to UI
      document.getElementById('content').textContent += data.text
      break

    case 'complete':
      console.log('Generation complete')
      eventSource.close()
      break

    case 'error':
      console.error('Error:', data.error)
      eventSource.close()
      break
  }
})
```

### Server-Side (RPC)

```typescript
// From another worker
const post = await env.BLOG_STREAM_SERVICE.generatePost('ai-best-practices')

if (post.success) {
  console.log('Generated:', post.post.title)
  console.log('Content length:', post.post.content.length)
} else {
  console.error('Failed:', post.error)
}
```

### Fetch API (Manual Stream)

```typescript
const response = await fetch('https://blog.apis.do/blog/hello-world')
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      console.log('Event:', data)
    }
  }
}
```

## Database Schema

Posts are stored in the `blog.posts` namespace with type `BlogPost`:

```typescript
interface BlogPost {
  id: string           // Same as slug
  slug: string         // URL-safe identifier
  title: string        // Human-readable title
  content: string      // Full markdown content
  excerpt?: string     // First 200 characters + "..."
  author?: string      // "AI Generated"
  published_at?: string  // ISO 8601 timestamp
  created_at: string   // ISO 8601 timestamp
  updated_at: string   // ISO 8601 timestamp
}
```

## Service Bindings

- `DB_SERVICE` - Database service for post storage/retrieval
- `AI` - Workers AI binding for content generation
- `DEPLOY_SERVICE` - Deploy API (for observability)

## Environment Variables

No environment variables required - all configuration is in `wrangler.jsonc`.

## Development

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy to production
pnpm deploy
```

## Testing

```bash
# Health check
curl http://localhost:8788/

# Get existing post
curl http://localhost:8788/blog/hello-world

# Generate new post (streaming)
curl http://localhost:8788/blog/ai-best-practices
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /blog/hello-world
       ▼
┌─────────────────┐
│  Blog Stream    │ ◄── Check DB_SERVICE
│     Worker      │
└────────┬────────┘
         │
         ├── Found? → Return cached post
         │
         └── Not found? → Generate with AI
                    │
                    ├── Validate title safety
                    ├── Stream AI generation (SSE)
                    └── Save to DB (fire & forget)
```

## Performance

- **Cached Posts**: <50ms response time
- **New Generation**: 3-8 seconds (streaming starts immediately)
- **Database Saves**: Async, non-blocking
- **Concurrent Requests**: Unlimited (stateless)

## Error Handling

- Invalid slugs return 400 with reason
- DB errors gracefully degrade to generation
- AI errors stream error event
- Saves fail silently (logged)

## Monitoring

All requests are logged to the `pipeline` service via tail consumers for:
- Request patterns
- Generation times
- Error rates
- Cache hit/miss ratios

## Future Enhancements

- [ ] Support multiple languages
- [ ] Custom style/tone preferences
- [ ] Image generation integration
- [ ] SEO metadata generation
- [ ] Related posts suggestions
- [ ] Content versioning
- [ ] A/B testing different AI prompts

## Related Workers

- `db` - Database service for post storage
- `gateway` - API gateway for routing
- `pipeline` - Observability and logging
