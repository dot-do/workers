# Browse Worker

Web browsing automation worker powered by Cloudflare Browser Rendering and BrowserBase.

## Features

- **Cloudflare Browser Rendering** - Fast, cost-effective browsing with Puppeteer
- **BrowserBase Stealth Mode** - Advanced anti-detection for protected sites
- **Automatic CAPTCHA Solving** - Handled automatically by BrowserBase
- **Content Extraction** - HTML, text, screenshots
- **KV Caching** - Intelligent caching to reduce costs
- **Multiple Interfaces** - RPC, HTTP, MCP

## Quick Start

### Via HTTP

```bash
# Browse with Cloudflare
curl -X POST https://browse.do/browse \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com"}'

# Browse with stealth mode
curl -X POST https://browse.do/browse/stealth \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com", "options": {"proxies": true}}'
```

### Via RPC

```typescript
// From another worker
const result = await env.BROWSE_SERVICE.browse('https://example.com', {
  screenshot: { fullPage: true },
  cache: true
})

console.log(result.html)
console.log(result.screenshot) // base64 PNG
```

### Via MCP

```typescript
// Claude Code can use these MCP tools
const result = await mcp.browse_url({
  url: 'https://example.com',
  options: {
    screenshot: { fullPage: true },
    viewport: { width: 1280, height: 1024 }
  }
})
```

## Configuration

### Environment Variables

Set these via `wrangler secret put`:

```bash
wrangler secret put BROWSERBASE_API_KEY
wrangler secret put BROWSERBASE_PROJECT_ID
```

### KV Namespace

Create KV namespace for caching:

```bash
wrangler kv:namespace create BROWSE_CACHE
wrangler kv:namespace create BROWSE_CACHE --preview
```

Update `wrangler.jsonc` with the namespace IDs.

## API Reference

### BrowseOptions

```typescript
interface BrowseOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  timeout?: number // milliseconds
  viewport?: { width: number; height: number }
  userAgent?: string
  cookies?: Array<{ name: string; value: string }>
  javascript?: string // code to execute
  css?: string // CSS to inject
  screenshot?: {
    fullPage?: boolean
    selector?: string
    format?: 'png' | 'jpeg'
    quality?: number
  }
  cache?: boolean
  cacheTtl?: number // seconds
}
```

### BrowseResult

```typescript
interface BrowseResult {
  html?: string
  text?: string
  screenshot?: string // base64
  metadata: {
    url: string
    title: string
    statusCode: number
    loadTime: number
    timestamp: string
  }
  cached: boolean
}
```

## Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /browse` - Browse with Cloudflare Browser Rendering
- `POST /browse/stealth` - Browse with BrowserBase stealth mode
- `DELETE /cache` - Clear cache

## MCP Tools

### browse_url

Browse a web page with Cloudflare Browser Rendering. Fast and cost-effective.

**Parameters:**
- `url` (required) - The URL to browse
- `options` (optional) - BrowseOptions object

**Returns:** BrowseResult

### browse_stealth

Browse a web page with BrowserBase stealth mode. Bypasses bot detection.

**Parameters:**
- `url` (required) - The URL to browse
- `options` (optional) - BrowserBaseOptions object

**Returns:** BrowseResult

### browse_clear_cache

Clear the browse cache.

**Parameters:**
- `pattern` (optional) - Pattern to match cache keys

**Returns:** `{ cleared: number }`

## Use Cases

### Extract Content

```typescript
const result = await env.BROWSE_SERVICE.browse('https://example.com')
console.log(result.text) // Clean text content
```

### Take Screenshots

```typescript
const result = await env.BROWSE_SERVICE.browse('https://example.com', {
  screenshot: {
    fullPage: true,
    format: 'png'
  }
})

// result.screenshot is base64 PNG
const imageBuffer = Buffer.from(result.screenshot, 'base64')
```

### Bypass Bot Detection

```typescript
const result = await env.BROWSE_SERVICE.browseStealth('https://protected-site.com', {
  advancedStealth: true,
  proxies: true
})

// BrowserBase handles CAPTCHAs automatically
console.log(result.html)
```

### Execute JavaScript

```typescript
const result = await env.BROWSE_SERVICE.browse('https://example.com', {
  javascript: `
    document.querySelector('h1').innerText = 'Modified!';
    return document.title;
  `
})
```

## Caching Strategy

The browse worker uses KV for intelligent caching:

1. **Cache Key** - Hash of URL + options (viewport, JS, CSS, screenshot settings)
2. **Cache TTL** - Default 1 hour, configurable via `cacheTtl`
3. **Cache Hit** - Returns cached result instantly
4. **Cache Miss** - Fetches fresh content and stores in cache

Disable caching by setting `cache: false` in options.

## Cost Optimization

- **Use caching** - Enable cache for frequently accessed pages
- **Choose the right mode** - Use Cloudflare for standard browsing, BrowserBase only when needed
- **Optimize viewport** - Smaller viewports render faster
- **Wait conditions** - Use `domcontentloaded` instead of `load` when possible

## Testing

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Local development
pnpm dev
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Or via deploy API
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -d @deployment.json
```

## Related

- [scraper worker](../scraper) - Screenshot service built on browse worker
- [mcp worker](../mcp) - MCP server with browse tools
- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [BrowserBase Docs](https://docs.browserbase.com/)

## License

MIT
