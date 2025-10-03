# Domain Monitor Worker

> **Automated domain monitoring with health checks, expiration alerts, and screenshot verification**

Cloudflare Worker that runs hourly via cron triggers to monitor domain health, expiration dates, and visual changes.

## Features

- 📅 **Expiration Monitoring** - Track domain expiration dates and send alerts
- 🏥 **Health Checks** - Monitor DNS, HTTP, HTTPS, and SSL certificate validity
- 📸 **Screenshot Capture** - Visual verification using Browserless API
- 🔔 **Multi-Channel Alerts** - Email, Slack, and webhook notifications
- ⏰ **Scheduled Monitoring** - Runs every hour via Cloudflare Cron Triggers
- 📊 **Historical Tracking** - Store health checks, screenshots, and alerts in D1
- 🔄 **Queue-Based Processing** - Parallel domain checks using Cloudflare Queues
- 🎯 **Service Integration** - Uses domains/ and dns-tools/ services via RPC

## Architecture

```
┌────────────────────────────────┐
│  Cloudflare Cron Trigger       │
│  (Runs every hour)             │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   Domain Monitor Scheduler     │
│   - Query domains to check     │
│   - Queue monitoring tasks     │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   Cloudflare Queue Consumer    │
│   - Process in parallel        │
│   - Max 10 per batch           │
└────────┬───────────┬───────────┘
         │           │
    ┌────▼───┐  ┌───▼────┐
    │ Health │  │Expiry  │
    │ Check  │  │Check   │
    └────┬───┘  └───┬────┘
         │          │
    ┌────▼──────────▼────┐
    │  Store Results     │
    │  Send Alerts       │
    └────────────────────┘
```

## Installation

```bash
cd workers/domain-monitor
pnpm install
```

## Database Setup

Create D1 database:

```bash
# Create database
wrangler d1 create production

# Run migrations
wrangler d1 execute production --file=schema.sql
```

Update `wrangler.jsonc` with your database ID.

## Configuration

### Environment Variables

Add to `.dev.vars` (local) or Wrangler secrets (production):

```bash
# Optional - for screenshot capture
BROWSERLESS_API_KEY=your_browserless_api_key

# Optional - for Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional - for email alerts
EMAIL_API_KEY=your_email_api_key
```

### Monitoring Configuration

Configure per-domain monitoring in the database:

```sql
INSERT INTO monitoring (
  domain,
  registrar,
  expirationDate,
  monitoringEnabled,
  alertsEnabled,
  healthCheckEnabled,
  screenshotEnabled
) VALUES (
  'example.com',
  'porkbun',
  '2026-01-01',
  1,  -- monitoring enabled
  1,  -- alerts enabled
  1,  -- health checks enabled
  0   -- screenshots disabled (optional, requires Browserless)
);
```

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

### Automatic Monitoring (Cron)

The worker automatically runs every hour at minute 0 (configurable in `wrangler.jsonc`):

```jsonc
{
  "triggers": {
    "crons": ["0 * * * *"]  // Every hour
  }
}
```

**Monitoring Process:**
1. Cron trigger fires
2. Query domains with `nextCheck <= now`
3. Queue monitoring tasks
4. Process tasks in parallel (max 10/batch)
5. Perform health checks
6. Check expiration dates
7. Capture screenshots (if enabled)
8. Send alerts if needed
9. Update `nextCheck` time

### Manual API Usage

**Get monitoring statistics:**
```bash
GET /stats
```

**Response:**
```json
{
  "totalDomains": 150,
  "monitoredDomains": 120,
  "healthyDomains": 115,
  "unhealthyDomains": 5,
  "expiringWithin30Days": 8,
  "expiringWithin7Days": 2,
  "lastCheckTime": "2025-10-03T18:00:00Z",
  "checksToday": 240,
  "alertsSentToday": 3
}
```

**Get all monitored domains:**
```bash
GET /domains
```

**Get expiring domains:**
```bash
GET /domains/expiring?days=30
```

**Perform manual health check:**
```bash
POST /health/example.com
```

**Response:**
```json
{
  "domain": "example.com",
  "timestamp": "2025-10-03T18:00:00Z",
  "checks": {
    "dns": {
      "status": "pass",
      "message": "2 A records found",
      "responseTime": 45,
      "details": {
        "records": ["93.184.215.14", "93.184.215.15"]
      }
    },
    "http": {
      "status": "pass",
      "message": "HTTP 301",
      "responseTime": 120,
      "details": {
        "statusCode": 301,
        "redirectLocation": "https://example.com"
      }
    },
    "https": {
      "status": "pass",
      "message": "HTTPS 200",
      "responseTime": 180
    },
    "ssl": {
      "status": "pass",
      "message": "SSL certificate valid",
      "responseTime": 180
    }
  },
  "overall": "healthy",
  "issues": []
}
```

**Capture screenshot:**
```bash
POST /screenshot/example.com
```

**Add domain to monitoring:**
```bash
POST /monitor
Content-Type: application/json

{
  "domain": "example.com",
  "registrar": "porkbun",
  "expirationDate": "2026-01-01"
}
```

## Expiration Alerts

Alerts are sent at configured thresholds (default: 30, 14, 7, 1 days before expiry).

**Alert Severity Levels:**
- **Critical** - Expired or < 7 days
- **Warning** - 8-30 days
- **Info** - > 30 days

**Alert Channels:**

### Slack
Sends rich message with attachment:

```json
{
  "text": "🚨 Domain Expiration Alert",
  "attachments": [{
    "color": "#ff0000",
    "fields": [
      { "title": "Domain", "value": "example.com" },
      { "title": "Days Until Expiry", "value": "7" },
      { "title": "Expiration Date", "value": "10/10/2025" },
      { "title": "Severity", "value": "CRITICAL" }
    ]
  }]
}
```

### Email
Sends plain text email:

```
Subject: 🚨 URGENT: example.com expires in 7 days

Domain Expiration Alert

Domain: example.com
Registrar: porkbun
Expires: 10/10/2025
Days Until Expiry: 7
Severity: CRITICAL

Please renew this domain before it expires.
```

## Health Checks

Performs comprehensive checks on each monitored domain:

**DNS Check:**
- Queries A records via Cloudflare 1.1.1.1
- Uses dns-tools/ service if available
- Fails if no records found or NXDOMAIN

**HTTP Check:**
- HEAD request to `http://domain`
- Accepts 2xx or 3xx status codes
- Detects redirects to HTTPS

**HTTPS Check:**
- HEAD request to `https://domain`
- Must return 2xx status
- Validates SSL automatically

**SSL Check:**
- Verifies certificate validity
- Detects expired certificates
- Detects self-signed certificates

**Overall Health:**
- **Healthy** - All checks pass
- **Degraded** - Warnings but no critical issues
- **Unhealthy** - One or more critical failures

## Screenshot Monitoring

Captures screenshots and detects visual changes using Browserless API.

**Features:**
- Full-page screenshot capture
- SHA-256 hash-based change detection
- Configurable capture interval
- Store screenshots in D1 (hash only) or R2 (image data)

**Setup:**
1. Get Browserless API key: https://www.browserless.io/
2. Add to secrets: `wrangler secret put BROWSERLESS_API_KEY`
3. Enable per-domain: `UPDATE monitoring SET screenshotEnabled = 1 WHERE domain = 'example.com'`

**Change Detection:**
- Compares SHA-256 hash of new screenshot with previous
- Alerts if hash differs (visual change detected)
- Useful for detecting unauthorized modifications

## Service Dependencies

**Required:**
- `db` - D1 database for storing monitoring data

**Optional (Enhanced Features):**
- `domains` - Domain search/pricing service (Workstream 1)
- `dns-tools` - DNS/IP/WHOIS lookups (Workstream 3)

**Configure in `wrangler.jsonc`:**
```jsonc
{
  "services": [
    { "binding": "DOMAINS", "service": "domains" },
    { "binding": "DNS_TOOLS", "service": "dns-tools" }
  ]
}
```

## Database Schema

**Tables:**
- `monitoring` - Domain monitoring configuration
- `health_checks` - Historical health check results
- `screenshots` - Screenshot history and hashes
- `alerts` - Alert log

**See `schema.sql` for complete schema.**

## Performance

- **Cron Frequency**: Hourly (configurable)
- **Queue Batch Size**: 10 domains per batch
- **Queue Timeout**: 30 seconds per batch
- **Health Check Time**: 0.5-2 seconds per domain
- **Screenshot Time**: 3-10 seconds per domain
- **Throughput**: ~300 domains/hour (health checks only)
- **Throughput**: ~50 domains/hour (with screenshots)

## Monitoring Best Practices

1. **Start Small** - Monitor critical domains first
2. **Set Realistic Intervals** - Hourly for production, daily for staging
3. **Use Screenshots Sparingly** - They're slow and expensive
4. **Configure Alert Thresholds** - Default (30, 14, 7, 1) is reasonable
5. **Test Alerts** - Use Slack webhook to verify alerts work
6. **Monitor the Monitor** - Check D1 database for errors

## Troubleshooting

**Cron not running:**
- Check `wrangler tail` for errors
- Verify cron syntax in `wrangler.jsonc`
- Check Cloudflare dashboard > Workers > Triggers

**Queue not processing:**
- Verify queue binding in `wrangler.jsonc`
- Check queue metrics in dashboard
- Look for retry loops (message.retry())

**Alerts not sending:**
- Verify API keys/webhook URLs
- Check function logs for errors
- Test with manual API call first

**Screenshots failing:**
- Verify Browserless API key
- Check API quota limits
- Test with smaller sites first
- Disable for problematic domains

## Cost Estimates

**Cloudflare Workers:**
- Cron triggers: Free (unlimited)
- Queue operations: Free (first 1M/month)
- D1 database: Free tier (5GB storage, 25M reads/day)
- Worker requests: Free tier (100k/day)

**External Services:**
- Browserless: $29/month (100k requests)
- IPinfo: Free (50k/month)
- WhoisXML: Free (500 credits)
- Slack: Free
- Email provider: Varies

**Total:** ~$0-50/month depending on screenshot usage

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy with secrets
wrangler secret put BROWSERLESS_API_KEY
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put EMAIL_API_KEY

# Create D1 database
wrangler d1 create production
wrangler d1 execute production --file=schema.sql

# Create queue
wrangler queues create domain-monitoring
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

**Test coverage:**
- ✅ Health checks (DNS, HTTP, HTTPS, SSL)
- ✅ Expiration monitoring
- ✅ Alert generation
- ⏳ Screenshot capture (requires API key)
- ⏳ Queue processing (requires D1)

## Related Services

- **workers/domains/** - Domain search & pricing (Workstream 1)
- **admin/** - Domain management UI (Workstream 2)
- **workers/dns-tools/** - DNS/IP/WHOIS tools (Workstream 3)

## Resources

- **Cloudflare Cron Triggers**: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- **Cloudflare Queues**: https://developers.cloudflare.com/queues/
- **Browserless API**: https://www.browserless.io/docs/
- **D1 Database**: https://developers.cloudflare.com/d1/

## License

MIT

---

**Repository:** `workers/domain-monitor`
**Type:** Cloudflare Worker (Scheduled Service)
**Status:** ✅ Complete - Workstream 4 - Issue #7
