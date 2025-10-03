# Domain Search & Pricing API

> **Multi-registrar domain availability checking and price comparison**

Cloudflare Worker that searches for domain availability across multiple registrars (Dynadot, Porkbun, Netim, SAV) and provides price comparison.

## Features

- 🔍 **Multi-Registrar Search** - Parallel availability checking across 4+ registrars
- 💰 **Price Comparison** - Find the cheapest registrar for any domain
- ⚡ **Fast & Parallel** - All registrar queries run concurrently
- 🎯 **AI Builder Focused** - Pre-configured for popular dev TLDs (.dev, .app, .ai, .com)
- 📊 **Analytics Integration** - All searches logged to database
- 🔌 **Multiple Interfaces** - RPC, HTTP REST API

## Supported Registrars

| Registrar | API Support | Auth Required | Best For |
|-----------|-------------|---------------|----------|
| **Porkbun** | ✅ Full | Optional | .dev ($6), .app ($6), .com ($9.68) |
| **Dynadot** | ✅ Full | Required | .ai ($74.90), bulk operations |
| **Netim** | ✅ Full | Required | 1,300+ TLDs, near-registry pricing |
| **SAV** | ✅ Full | Required | Creator-focused domains, auctions |
| **TLD-List** | 🟡 Pricing only | Required (Enterprise) | Price comparison (54+ registrars) |

## Installation

```bash
cd workers/domains
pnpm install
```

## Configuration

Copy `.dev.vars.example` to `.dev.vars` and add your API keys:

```bash
cp .dev.vars.example .dev.vars
```

**Required API Keys:**
- `DYNADOT_KEY` - Dynadot reseller API key
- `PORKBUN_API_KEY` + `PORKBUN_SECRET_KEY` - Porkbun API credentials (optional for pricing-only)
- `NETIM_API_KEY` - Netim reseller API key
- `SAV_API_KEY` - SAV API key
- `TLDLIST_API_KEY` - TLD-List Enterprise API key (optional)

## Development

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy to production
pnpm deploy
```

## Usage

### HTTP API

**Search single domain:**
```bash
# Search across all registrars
curl https://domains.do/search/example.com

# Search specific registrars
curl https://domains.do/search/example.com?registrars=porkbun,dynadot
```

**Response:**
```json
{
  "domain": "example.com",
  "available": true,
  "cheapestPrice": 9.68,
  "cheapestRegistrar": "porkbun",
  "results": [
    {
      "registrar": "porkbun",
      "domain": "example.com",
      "available": true,
      "price": 9.68,
      "premium": false,
      "responseTime": 234
    },
    {
      "registrar": "dynadot",
      "domain": "example.com",
      "available": true,
      "price": 11.99,
      "premium": false,
      "responseTime": 456
    }
  ],
  "searchTime": 567
}
```

**Bulk search:**
```bash
curl -X POST https://domains.do/search/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["example.com", "test.dev", "myapp.ai"],
    "registrars": ["porkbun", "dynadot"]
  }'
```

**Get TLD pricing:**
```bash
curl https://domains.do/pricing/dev
```

**Get AI builder preferred TLDs:**
```bash
curl https://domains.do/tlds/preferred
```

**Get recommended registrar for TLD:**
```bash
curl https://domains.do/tlds/dev/recommended
```

### RPC Interface

```typescript
// From another worker
const result = await env.DOMAINS_SERVICE.search('example.com')

// Bulk search
const results = await env.DOMAINS_SERVICE.bulkSearch({
  domains: ['example.com', 'test.dev'],
  registrars: ['porkbun', 'dynadot']
})

// Get pricing
const pricing = await env.DOMAINS_SERVICE.getPricing('dev')

// Get preferred TLDs
const tlds = env.DOMAINS_SERVICE.getPreferredTLDs()

// Get recommended registrar
const registrar = env.DOMAINS_SERVICE.getRecommendedRegistrar('dev')
```

### TypeScript SDK

```typescript
import type { DomainSearchResult } from 'domains.do'

const response = await fetch('https://domains.do/search/example.com')
const result: DomainSearchResult = await response.json()

console.log(`Domain: ${result.domain}`)
console.log(`Available: ${result.available}`)
console.log(`Cheapest: $${result.cheapestPrice} at ${result.cheapestRegistrar}`)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/search/:domain` | Search single domain |
| POST | `/search/bulk` | Bulk domain search |
| GET | `/pricing/:tld` | Get TLD pricing |
| GET | `/tlds/preferred` | Get AI builder preferred TLDs |
| GET | `/tlds/:tld/recommended` | Get recommended registrar for TLD |

## Architecture

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Hono   │  Gateway
    └────┬────┘
         │
    ┌────▼─────────┐
    │DomainsService│  RPC Interface
    └────┬─────────┘
         │
    ┌────▼────────────────┐
    │  Parallel Search    │
    └────┬────────────────┘
         │
    ┌────▼────┬────┬────┬─────┐
    │Porkbun  │Dyna│Neti│ SAV │  Registrars
    │         │dot │m   │     │
    └─────────┴────┴────┴─────┘
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

**Test Coverage:**
- ✅ Search functionality
- ✅ Bulk search
- ✅ Price comparison
- ✅ Error handling
- ✅ API response format

## Performance

- **Parallel execution**: All registrar queries run concurrently
- **Fast response times**: Typically 200-500ms for 4 registrar search
- **Caching ready**: Results can be cached in KV or R2
- **Rate limiting**: Implement at gateway level

## Pricing Research

Based on extensive API research:

| TLD | Best Registrar | Price/Year | Use Case |
|-----|----------------|------------|----------|
| .dev | Porkbun | $6.00 | Developer projects |
| .app | Porkbun | $6.00 | Applications |
| .com | Porkbun | $9.68 | General purpose |
| .ai | Dynadot | $74.90 | AI/ML projects |
| .io | Dynadot | $30-40 | Tech startups |

## Dependencies

- `hono` - HTTP framework
- `domains.do` - Foundation types package
- `@cloudflare/workers-types` - TypeScript types

## Related Services

- **admin/** - Domain management UI (Workstream 2)
- **workers/dns-tools/** - DNS utilities (Workstream 3)
- **workers/domain-monitor/** - Domain monitoring (Workstream 4)

## Resources

- **Porkbun API**: https://porkbun.com/api/json/v3/documentation
- **Dynadot API**: https://www.dynadot.com/domain/api3.html
- **Netim API**: https://support.netim.com/en/wiki/Category:API
- **SAV API**: https://docs.sav.com/
- **TLD-List**: https://tld-list.com/

## License

MIT

---

**Service:** `domains`
**Type:** Domain Microservice
**Layer:** Integration
**Status:** ✅ Production Ready
