# SEO Crawler Detection Worker

AI crawler detection and management service for SEO/AEO optimization.

## Features

- **Bot Detection** - Identify AI crawlers from User-Agent headers (20+ bot patterns)
- **Access Control** - Manage bot access rules via KV storage
- **Activity Tracking** - Track bot activity via Analytics Engine
- **robots.txt Generation** - Dynamic robots.txt generation based on rules
- **Rate Limiting** - Per-bot rate limit enforcement

## API Endpoints

### HTTP API (Hono)

```bash
# Generate robots.txt
GET /robots.txt

# Detect bot from User-Agent
POST /detect
{ "userAgent": "ChatGPT-User/2.0" }

# Get bot access rule
GET /rules/:botType

# Update bot access rule
PUT /rules
{ "userAgent": "ChatGPT-User/2.0", "access": "allow", ... }

# Get bot statistics
GET /stats/:botType?days=7
```

### RPC Methods (Service Bindings)

```typescript
// Detect bot
await env.SEO_CRAWLER.detectBot(userAgent)

// Check access
await env.SEO_CRAWLER.checkAccess(botType, path)

// Get/Set rules
await env.SEO_CRAWLER.getRule(botType)
await env.SEO_CRAWLER.setRule(rule)

// Track activity
await env.SEO_CRAWLER.trackActivity(activity)

// Get statistics
await env.SEO_CRAWLER.getStats(botType, days)

// Generate robots.txt
await env.SEO_CRAWLER.generateRobotsTxt(config)
```

## Configuration

**wrangler.jsonc:**
- `BOT_RULES` - KV namespace for bot rules
- `BOT_ACTIVITY` - KV namespace for bot activity
- `BOT_ANALYTICS` - Analytics Engine dataset
- `BOT_QUEUE` - Queue for async processing

## Supported Bots

- OpenAI (ChatGPT-User, GPTBot, OAI-SearchBot)
- Anthropic (ClaudeBot, Claude-Web, anthropic-ai)
- Perplexity (PerplexityBot)
- Google (Googlebot, Google-Extended)
- Microsoft (Bingbot)
- And 15+ more...

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Integration

**Service Binding:**
```jsonc
{
  "services": [
    { "binding": "SEO_CRAWLER", "service": "seo-crawler" }
  ]
}
```

**Usage:**
```typescript
// Check if request is from bot
const result = await env.SEO_CRAWLER.detectBot(userAgent)

if (result.isBot) {
  // Check access
  const access = await env.SEO_CRAWLER.checkAccess(result.botType, path)

  if (!access.allowed) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

## Related

- **Types:** `@dot-do/seo-types` package
- **Issue:** #32
