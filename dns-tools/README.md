# DNS Tools Worker

> **Comprehensive DNS, IP, ASN, and WHOIS lookup service**

Cloudflare Worker providing DNS resolution, IP geolocation, ASN information, reverse DNS, and WHOIS lookups via both RPC (Service Bindings) and HTTP REST API.

## Features

- 🔍 **DNS Lookup** - Query any DNS record type (A, AAAA, MX, NS, TXT, SOA, PTR, CAA, SRV)
- 🌍 **IP Geolocation** - Get location, ISP, and ASN info for any IP
- 🔢 **ASN Lookup** - Autonomous System Number information and prefixes
- 🔄 **Reverse DNS** - PTR lookups for IP-to-hostname resolution
- 📋 **WHOIS Lookup** - Domain registration information
- ⚡ **High Performance** - Uses Cloudflare's 1.1.1.1 DNS resolver (0ms latency)
- 🔗 **Dual Interface** - Both RPC (Service Bindings) and HTTP REST API
- 📦 **Batch Operations** - Lookup multiple targets in parallel

## API Integrations

| Service | Purpose | Cost | Usage |
|---------|---------|------|-------|
| **Cloudflare DNS** | DNS resolution | Free | Unlimited |
| **Cloudflare Request** | Request IP info | Free | Unlimited |
| **IPinfo.io** | IP geolocation, ASN | Free tier: 50k/month | Optional |
| **WhoisXML API** | WHOIS data | 500 free credits | Optional |

## Installation

```bash
cd workers/dns-tools
pnpm install
```

## Configuration

Add API keys to `.dev.vars` (local) or Wrangler secrets (production):

```bash
# Optional - for enhanced IP/ASN lookups
IPINFO_TOKEN=your_ipinfo_token

# Optional - for WHOIS lookups
WHOISXML_API_KEY=your_whoisxml_key
```

**Get API keys:**
- IPinfo: https://ipinfo.io/signup
- WhoisXML: https://www.whoisxmlapi.com/

## Development

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Usage

### RPC Interface (Service Bindings)

```typescript
import type { DNSToolsService } from '@do/dns-tools'

// In your worker
export default {
  async fetch(request: Request, env: Env) {
    const dnsTools = env.DNS_TOOLS as DNSToolsService

    // DNS lookup
    const dns = await dnsTools.dns('example.com', 'A')

    // IP lookup
    const ip = await dnsTools.ip('8.8.8.8')

    // ASN lookup
    const asn = await dnsTools.asn('AS15169')

    // Reverse DNS
    const hostname = await dnsTools.hostname('8.8.8.8')

    // WHOIS
    const whois = await dnsTools.whois('example.com')

    return Response.json({ dns, ip, asn, hostname, whois })
  }
}
```

**Configure service binding in wrangler.jsonc:**
```jsonc
{
  "services": [
    {
      "binding": "DNS_TOOLS",
      "service": "dns-tools",
      "environment": "production"
    }
  ]
}
```

### HTTP REST API

**Base URL:** `https://dns-tools.yourdomain.workers.dev`

#### DNS Lookup

```bash
# Single record type
GET /dns/example.com?type=A

# All record types
GET /dns/example.com/all
```

**Response:**
```json
{
  "domain": "example.com",
  "recordType": "A",
  "records": [
    {
      "type": "A",
      "value": "93.184.215.14",
      "ttl": 3600
    }
  ],
  "responseTime": 45,
  "cached": false
}
```

#### IP Geolocation

```bash
# Single IP
GET /ip/8.8.8.8

# Batch lookup
POST /ip/batch
Content-Type: application/json

{
  "ips": ["8.8.8.8", "1.1.1.1"]
}

# Current request IP
GET /ip
```

**Response:**
```json
{
  "ip": "8.8.8.8",
  "hostname": "dns.google",
  "city": "Mountain View",
  "region": "California",
  "country": "United States",
  "countryCode": "US",
  "latitude": 37.4056,
  "longitude": -122.0775,
  "timezone": "America/Los_Angeles",
  "postalCode": "94043",
  "asn": "AS15169",
  "asnName": "Google LLC",
  "responseTime": 120,
  "cached": false
}
```

#### ASN Lookup

```bash
GET /asn/AS15169
# or
GET /asn/15169
```

**Response:**
```json
{
  "asn": "AS15169",
  "name": "Google LLC",
  "countryCode": "US",
  "routes": ["8.8.8.0/24", "8.8.4.0/24"],
  "prefixes": [
    {
      "prefix": "8.8.8.0/24",
      "description": "Google Public DNS"
    }
  ],
  "responseTime": 95,
  "cached": false
}
```

#### Reverse DNS (Hostname)

```bash
# Single IP
GET /hostname/8.8.8.8

# Batch lookup
POST /hostname/batch
Content-Type: application/json

{
  "ips": ["8.8.8.8", "1.1.1.1"]
}
```

**Response:**
```json
{
  "ip": "8.8.8.8",
  "hostnames": ["dns.google"],
  "primary": "dns.google",
  "responseTime": 67,
  "cached": false
}
```

#### WHOIS Lookup

```bash
# Single domain
GET /whois/example.com

# Batch lookup
POST /whois/batch
Content-Type: application/json

{
  "domains": ["example.com", "google.com"]
}
```

**Response:**
```json
{
  "domain": "example.com",
  "registrar": "RESERVED-Internet Assigned Numbers Authority",
  "nameservers": ["a.iana-servers.net", "b.iana-servers.net"],
  "status": ["clientDeleteProhibited", "clientTransferProhibited"],
  "createdDate": "1995-08-14T04:00:00Z",
  "updatedDate": "2024-08-14T07:01:38Z",
  "expiresDate": "2025-08-13T04:00:00Z",
  "dnssec": false,
  "responseTime": 234,
  "cached": false
}
```

#### Unified Lookup

```bash
POST /lookup
Content-Type: application/json

{
  "type": "dns",
  "target": "example.com",
  "recordType": "A"
}
```

**Bulk lookup:**
```bash
POST /lookup/bulk
Content-Type: application/json

{
  "parallel": true,
  "lookups": [
    { "type": "dns", "target": "example.com", "recordType": "A" },
    { "type": "ip", "target": "8.8.8.8" },
    { "type": "whois", "target": "example.com" }
  ]
}
```

**Response:**
```json
{
  "results": [ /* array of lookup results */ ],
  "totalTime": 456,
  "successCount": 3,
  "errorCount": 0
}
```

## Architecture

```
┌──────────────────┐
│  DNS Tools API   │
└────────┬─────────┘
         │
    ┌────▼────┬────────┬─────────┬──────────┐
    │         │        │         │          │
┌───▼──┐  ┌──▼───┐ ┌──▼────┐ ┌──▼─────┐ ┌─▼────┐
│ DNS  │  │  IP  │ │  ASN  │ │Hostname│ │WHOIS │
│Lookup│  │Lookup│ │Lookup │ │ Lookup │ │Lookup│
└───┬──┘  └──┬───┘ └──┬────┘ └──┬─────┘ └─┬────┘
    │        │        │         │         │
┌───▼────────▼────────▼─────────▼─────────▼────┐
│     Cloudflare + External APIs               │
│  • 1.1.1.1 DNS                               │
│  • IPinfo.io (optional)                      │
│  • WhoisXML API (optional)                   │
└──────────────────────────────────────────────┘
```

## Performance

- **DNS Lookups**: 10-50ms (uses Cloudflare's 1.1.1.1)
- **IP Geolocation**: 50-150ms (IPinfo.io API)
- **ASN Lookups**: 80-200ms (IPinfo.io API)
- **Reverse DNS**: 30-100ms (PTR via 1.1.1.1)
- **WHOIS**: 150-500ms (WhoisXML API)

**Optimization:**
- Parallel batch operations
- Response caching (planned)
- Smart API usage (Cloudflare features first, external APIs as fallback)

## Error Handling

All endpoints return errors in consistent format:

```json
{
  "domain": "example.com",
  "recordType": "A",
  "records": [],
  "responseTime": 23,
  "cached": false,
  "error": "Name error (NXDOMAIN)"
}
```

**Common errors:**
- `Name error (NXDOMAIN)` - Domain doesn't exist
- `IPinfo API token not configured` - Missing API key
- `Invalid IP address format` - Malformed input
- `DNS query failed: 429 Too Many Requests` - Rate limited

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

**Test coverage:**
- ✅ DNS lookup (all record types)
- ✅ IP geolocation
- ✅ ASN lookup
- ✅ Reverse DNS (IPv4 and IPv6)
- ✅ WHOIS lookup
- ✅ Batch operations
- ✅ Error handling

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy with secrets
wrangler secret put IPINFO_TOKEN
wrangler secret put WHOISXML_API_KEY
```

## Dependencies

- `hono` - HTTP framework
- `domains.do` - Type definitions (workspace package)
- `@cloudflare/workers-types` - TypeScript types
- `vitest` - Testing

## Related Services

- **workers/domains/** - Domain search & pricing (Workstream 1)
- **admin/** - Domain management UI (Workstream 2)
- **workers/domain-monitor/** - Domain monitoring (Workstream 4)

## Resources

- **Cloudflare DNS-over-HTTPS**: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/
- **IPinfo.io API**: https://ipinfo.io/developers
- **WhoisXML API**: https://www.whoisxmlapi.com/documentation/

## License

MIT

---

**Repository:** `workers/dns-tools`
**Type:** Cloudflare Worker (Microservice)
**Status:** ✅ Complete - Workstream 3 - Issue #6
