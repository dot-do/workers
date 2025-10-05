# Scraper Worker

Screenshot service built on the browse worker with intelligent R2 caching.

## Features

- **High-Quality Screenshots** - Full page or element-specific captures
- **R2 Caching** - 24-hour default cache, configurable TTL
- **Stealth Mode** - Optional BrowserBase integration for protected sites
- **Claude-Optimized** - Returns base64 images for direct AI analysis
- **Automatic Cleanup** - Daily scheduled task removes expired screenshots
- **Multiple Interfaces** - RPC, HTTP, MCP

## Quick Start

### Via HTTP

```bash
# Take screenshot
curl -X POST https://scraper.do/screenshot \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com",
    "options": {
      "fullPage": true,
      "format": "png"
    }
  }'
```

### Via RPC

```typescript
// From another worker
const result = await env.SCRAPER_SERVICE.screenshot('https://example.com', {
  fullPage: true,
  viewport: { width: 1920, height: 1080 }
})

// result.image is base64 PNG
const imageBuffer = Buffer.from(result.image, 'base64')
```

### Via MCP (Claude Code)

```typescript
// Claude uses this MCP tool
const screenshot = await mcp.screenshot({
  url: 'https://example.com',
  fullPage: true,
  format: 'png'
})

// Claude can now "see" the webpage
```

## Configuration

### R2 Bucket

Create R2 bucket for screenshot storage:

```bash
wrangler r2 bucket create screenshots-production
wrangler r2 bucket create screenshots-preview
```

Update `wrangler.jsonc` with the bucket names.

### Service Bindings

The scraper requires the browse service:

```jsonc
{
  "services": [
    {
      "binding": "BROWSE_SERVICE",
      "service": "browse"
    }
  ]
}
```

### Scheduled Cleanup

Add to `wrangler.jsonc` for automatic cleanup:

```jsonc
{
  "triggers": {
    "crons": ["0 2 * * *"]  // Daily at 2 AM
  }
}
```

## API Reference

### ScreenshotOptions

```typescript
interface ScreenshotOptions {
  fullPage?: boolean // Capture full page
  selector?: string // Capture specific element
  viewport?: { width: number; height: number }
  format?: 'png' | 'jpeg'
  quality?: number // JPEG quality (0-100)
  stealth?: boolean // Use BrowserBase stealth mode
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  timeout?: number // milliseconds
  javascript?: string // Execute before screenshot
  css?: string // Inject before screenshot
  cache?: boolean // Enable caching
  cacheTtl?: number // Cache TTL in seconds
}
```

### ScreenshotResult

```typescript
interface ScreenshotResult {
  image: string // base64
  format: 'png' | 'jpeg'
  size: number // bytes
  metadata: {
    url: string
    title: string
    viewport: { width: number; height: number }
    timestamp: string
    renderTime: number
  }
  cached: boolean
  cacheKey?: string
}
```

## Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /screenshot` - Capture screenshot
- `DELETE /cache` - Clear cache
- `POST /cleanup` - Cleanup expired screenshots

## MCP Tools

### screenshot

Capture a screenshot of a web page for Claude analysis.

**Parameters:**
- `url` (required) - The URL to screenshot
- `fullPage` (optional) - Capture full page (default: false)
- `viewport` (optional) - Viewport dimensions (default: 1280x1024)
- `format` (optional) - Image format: 'png' or 'jpeg' (default: 'png')
- `quality` (optional) - JPEG quality 0-100 (default: 80)
- `stealth` (optional) - Use stealth mode (default: false)
- `selector` (optional) - CSS selector to capture specific element
- `javascript` (optional) - JavaScript to execute before screenshot
- `css` (optional) - CSS to inject before screenshot
- `cache` (optional) - Cache the screenshot (default: true)
- `cacheTtl` (optional) - Cache TTL in seconds (default: 86400)

**Returns:** ScreenshotResult with base64 image

**Example:**
```typescript
const result = await mcp.screenshot({
  url: 'https://github.com/microsoft/typescript',
  fullPage: false,
  viewport: { width: 1280, height: 1024 }
})

// Claude can now analyze the screenshot
```

### screenshot_clear_cache

Clear the screenshot cache.

**Parameters:**
- `url` (optional) - URL pattern to match

**Returns:** `{ cleared: number }`

### screenshot_cleanup_expired

Clean up expired screenshots.

**Returns:** `{ deleted: number }`

## Use Cases

### Full Page Screenshot

```typescript
const result = await env.SCRAPER_SERVICE.screenshot('https://example.com', {
  fullPage: true,
  format: 'png'
})
```

### Element Screenshot

```typescript
const result = await env.SCRAPER_SERVICE.screenshot('https://example.com', {
  selector: '#main-content',
  format: 'png'
})
```

### Mobile Screenshot

```typescript
const result = await env.SCRAPER_SERVICE.screenshot('https://example.com', {
  viewport: { width: 375, height: 667 }, // iPhone SE
  format: 'png'
})
```

### Stealth Screenshot

```typescript
const result = await env.SCRAPER_SERVICE.screenshot('https://protected-site.com', {
  stealth: true,
  fullPage: true
})
```

### Custom Styling

```typescript
const result = await env.SCRAPER_SERVICE.screenshot('https://example.com', {
  css: `
    body { background: white !important; }
    .ads { display: none !important; }
  `,
  fullPage: true
})
```

## Caching Strategy

1. **Cache Key** - Hash of URL + options (viewport, format, selector, etc.)
2. **Default TTL** - 24 hours (86400 seconds)
3. **Custom TTL** - Set via `cacheTtl` option
4. **Cache Storage** - R2 bucket with metadata
5. **Automatic Cleanup** - Daily scheduled task removes expired screenshots

## Cost Optimization

- **Caching** - Enable caching to reduce browse worker calls
- **Format** - Use JPEG for smaller file sizes (60-80% smaller)
- **Viewport** - Smaller viewports = faster rendering + smaller files
- **Cleanup** - Regular cleanup prevents unnecessary storage costs

## Size Limits

- **Default Max** - 10MB per screenshot
- **Configurable** - Set `MAX_SCREENSHOT_SIZE` environment variable
- **Automatic Validation** - Rejects screenshots exceeding limit

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

## Claude Code Integration

The scraper worker is designed specifically for Claude Code screenshot analysis:

1. Claude calls `screenshot` MCP tool
2. Scraper captures screenshot via browse worker
3. Returns base64 PNG to Claude
4. Claude analyzes visual layout, design, bugs, etc.

**Example Claude Workflow:**
```
User: "Take a screenshot of github.com and check for accessibility issues"

Claude:
1. Calls screenshot({ url: 'https://github.com' })
2. Receives base64 screenshot
3. Analyzes visual content
4. Reports accessibility concerns
```

## Related

- [browse worker](../browse) - Browser automation foundation
- [mcp worker](../mcp) - MCP server with scraper tools
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

## License

MIT
