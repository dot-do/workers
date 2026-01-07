# @dotdo/worker-cloudflare

Cloudflare SDK exposed as a multi-transport RPC worker.

## Overview

This worker wraps the official [Cloudflare Node.js SDK](https://github.com/cloudflare/cloudflare-typescript), providing programmatic access to Cloudflare's API for managing zones, DNS, Workers, KV, R2, and more via Cloudflare Workers RPC.

## Installation

```bash
pnpm add cloudflare @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import Cloudflare from 'cloudflare'
import { RPC } from 'workers.do/rpc'
export default RPC(new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN }))
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "CLOUDFLARE",
      "service": "worker-cloudflare"
    }
  ]
}
```

Access via:

```typescript
this.env.CLOUDFLARE
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.CLOUDFLARE.zones.list()` |
| REST | `GET /api/zones/list` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'zones.list', params: [] }` |

## Common Operations

```typescript
// List zones
const zones = await env.CLOUDFLARE.zones.list()

// Get DNS records
const records = await env.CLOUDFLARE.dns.records.list({
  zone_id: 'zone_xxx'
})

// Create DNS record
const record = await env.CLOUDFLARE.dns.records.create({
  zone_id: 'zone_xxx',
  type: 'A',
  name: 'api',
  content: '192.0.2.1'
})

// List Workers
const workers = await env.CLOUDFLARE.workers.scripts.list({
  account_id: 'account_xxx'
})

// Purge cache
await env.CLOUDFLARE.cache.purge({
  zone_id: 'zone_xxx',
  files: ['https://example.com/styles.css']
})
```

## Environment Variables

The worker requires:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with appropriate permissions

## Dependencies

- `cloudflare` ^4.0.0
- `@dotdo/rpc` workspace:*

## License

MIT
