# Blacklist Monitor Service

DNS-based blacklist (DNSBL) monitoring for domains and IP addresses.

## Features

- **Comprehensive Blacklist Checks**: Monitors 15+ major DNSBL services
- **High-Authority Focus**: Quick checks against Spamhaus, Barracuda, and other trusted sources
- **Historical Tracking**: Records listing/delisting events over time
- **Delisting Management**: Track delisting requests and completion status
- **Real-time Monitoring**: DNS-over-HTTPS for fast, reliable checks
- **Severity Classification**: Critical (high-authority) vs warning (low-authority) listings

## Monitored Blacklists

### High Authority (Default)
- **Spamhaus ZEN** - Combined list (SBL + XBL + PBL)
- **Spamhaus SBL** - Known spam sources
- **Spamhaus XBL** - Compromised systems
- **Spamhaus DBL** - Domain blacklist
- **Barracuda** - Reputation block list

### Medium Authority
- SORBS, SpamCop, URIBL, SURBL, Invaluement, Mailspike, and more

### Low Authority
- PSBL, RATS, Nordspam

## API

### RPC Methods

```typescript
interface BlacklistMonitorService {
  // Check domain or IP against blacklists
  checkBlacklists(request: CheckBlacklistRequest): Promise<BlacklistCheckResponse>

  // Get blacklist history
  getHistory(domain?: string, ip?: string, limit?: number): Promise<BlacklistHistoryEntry[]>

  // Get active delisting requests
  getDelistingRequests(domain?: string, ip?: string): Promise<DelistingRequest[]>

  // Create delisting request
  createDelistingRequest(blacklist: string, domain?: string, ip?: string, notes?: string): Promise<DelistingRequest>
}
```

### HTTP Endpoints

```bash
# Health check
GET /health

# Check domain or IP (high-authority blacklists only)
GET /check/:target

# Full blacklist check with options
POST /check
{
  "domain": "example.com",  // or "ip": "1.2.3.4"
  "checkAll": false,         // true = all blacklists, false = high-authority only
  "blacklists": []           // optional: specific blacklists to check
}

# Get history
GET /history/:target?limit=10

# Get delisting requests
GET /delisting/:target

# Create delisting request
POST /delisting
{
  "blacklist": "Spamhaus ZEN",
  "domain": "example.com",  // or "ip": "1.2.3.4"
  "notes": "Clean for 30 days, requesting removal"
}

# List available blacklists
GET /blacklists
```

## Usage

```typescript
import { BlacklistMonitorService } from '@do/blacklist-monitor'

// Quick check (high-authority only)
const result = await env.BLACKLIST_MONITOR.checkBlacklists({
  domain: 'example.com'
})

console.log(`Listed: ${result.listed}`)
console.log(`Blacklist count: ${result.blacklistCount}`)
console.log(`Severity: ${result.severity}`)

if (result.listed) {
  console.log(`Found on: ${result.blacklists.join(', ')}`)

  result.results.forEach(r => {
    if (r.listed) {
      console.log(`${r.blacklist}: ${r.reason}`)
    }
  })
}

// Check all blacklists
const fullCheck = await env.BLACKLIST_MONITOR.checkBlacklists({
  domain: 'example.com',
  checkAll: true
})

// Get history
const history = await env.BLACKLIST_MONITOR.getHistory('example.com')
history.forEach(entry => {
  console.log(`${entry.blacklist}: listed ${entry.listedAt}`)
  if (entry.delistedAt) {
    console.log(`  delisted ${entry.delistedAt}`)
  }
})

// Create delisting request
await env.BLACKLIST_MONITOR.createDelistingRequest(
  'Spamhaus ZEN',
  'example.com',
  undefined,
  'Domain was compromised, issue resolved 30 days ago'
)
```

## How It Works

### DNS Blacklist Lookup

Blacklists use DNS A record lookups:

1. **IP Blacklists**: Reverse IP + blacklist domain
   - Example: `4.3.2.1.zen.spamhaus.org` for IP `1.2.3.4`
   - If returns 127.0.0.x, the IP is listed

2. **Domain Blacklists**: Domain + blacklist domain
   - Example: `example.com.dbl.spamhaus.org`
   - If returns 127.0.0.x, the domain is listed

3. **Return Codes**: Different codes indicate different reasons
   - `127.0.0.2` - SBL (spam source)
   - `127.0.0.4` - XBL (exploited host)
   - `127.0.0.10` - PBL (policy block)

### Response Codes

```typescript
{
  "listed": true,
  "blacklistCount": 2,
  "blacklists": ["Spamhaus ZEN", "Barracuda"],
  "severity": "critical",  // "critical" | "warning" | "clean"
  "results": [
    {
      "blacklist": "Spamhaus ZEN",
      "listed": true,
      "reason": "SBL - Spam source",
      "returnCode": "127.0.0.2",
      "responseTime": 45
    }
  ]
}
```

## Severity Levels

- **Critical**: Listed on high-authority blacklist (Spamhaus, Barracuda)
- **Warning**: Listed on medium/low-authority blacklist
- **Clean**: Not found on any checked blacklists

## Delisting Process

1. Resolve the underlying issue (stop spam, fix compromised server, etc.)
2. Wait 30+ days with clean sending behavior
3. Create delisting request via API
4. Follow blacklist-specific delisting procedures:
   - **Spamhaus**: https://www.spamhaus.org/lookup/
   - **Barracuda**: https://barracudacentral.org/rbl/removal-request
   - **SORBS**: https://www.sorbs.net/delisting/
   - **SpamCop**: https://www.spamcop.net/fom-serve/cache/298.html

## Database Schema

```sql
-- Blacklist check results
CREATE TABLE blacklist_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT,
  ip TEXT,
  listed INTEGER,
  blacklist_count INTEGER,
  blacklists TEXT,
  severity TEXT,
  timestamp TEXT
);

-- Blacklist history (listings/delistings)
CREATE TABLE blacklist_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT,
  ip TEXT,
  blacklist TEXT,
  listed INTEGER,
  listed_at TEXT,
  delisted_at TEXT,
  reason TEXT,
  severity TEXT,
  resolved INTEGER
);

-- Delisting requests
CREATE TABLE delisting_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blacklist TEXT,
  domain TEXT,
  ip TEXT,
  status TEXT,
  requested_at TEXT,
  completed_at TEXT,
  notes TEXT
);
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Test with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Local development
pnpm dev

# Deploy
pnpm deploy
```

## Integration

```typescript
// In wrangler.jsonc
{
  "services": [
    { "binding": "BLACKLIST_MONITOR", "service": "blacklist-monitor" }
  ]
}

// Usage in other services
const blacklistResult = await env.BLACKLIST_MONITOR.checkBlacklists({
  domain: emailDomain
})

if (blacklistResult.listed) {
  // Pause sending, alert admins
  console.error(`Domain blacklisted on: ${blacklistResult.blacklists.join(', ')}`)
}
```
