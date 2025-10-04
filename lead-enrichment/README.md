# Lead Enrichment Service

Enriches contact and company data from external sources (Apollo.io, Clearbit, Hunter.io, Snov.io).

## Features

- **Multiple Providers**: Apollo, Clearbit, Hunter, Snov with intelligent fallback
- **Smart Caching**: 30-day cache to minimize API costs
- **Bulk Processing**: Queue-based bulk enrichment with concurrency control
- **Usage Tracking**: Track enrichment costs and provider performance
- **Rate Limiting**: Protect against API abuse

## Enrichment Sources

### Apollo.io
- **Best For**: B2B contact and company data
- **Fields**: Email, phone, title, company, LinkedIn, Twitter, GitHub
- **Cost**: 1 credit per enrichment
- **Coverage**: 275M+ contacts, 60M+ companies

### Clearbit
- **Best For**: Company technographics and detailed profiles
- **Fields**: Email, company, title, location, social profiles, tech stack
- **Cost**: 1 credit per enrichment
- **Coverage**: 20M+ companies

### Hunter.io
- **Best For**: Email finding and verification
- **Fields**: Email, email verification
- **Cost**: 0.5 credits per enrichment
- **Coverage**: 100M+ email addresses

### Snov.io
- **Best For**: Email finding and verification
- **Fields**: Email, company info
- **Cost**: 0.5 credits per enrichment

## Usage

### RPC (Service Binding)

```typescript
// Enrich a contact
const enriched = await env.LEAD_ENRICHMENT.enrichContact({
  email: 'john@example.com',
  company: 'Acme Corp',
})

// Enrich a company
const company = await env.LEAD_ENRICHMENT.enrichCompany({
  domain: 'example.com',
})

// Bulk enrich (queued)
const job = await env.LEAD_ENRICHMENT.bulkEnrich({
  contacts: [
    { email: 'john@example.com' },
    { email: 'jane@example.com' },
  ],
  concurrency: 5,
})

// Check bulk status
const status = await env.LEAD_ENRICHMENT.getBulkStatus(job.jobId)
```

### HTTP API

```bash
# Enrich contact
curl -X POST https://api.do/enrich/contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "company": "Acme Corp"
  }'

# Enrich company
curl -X POST https://api.do/enrich/company \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com"
  }'

# Bulk enrich
curl -X POST https://api.do/enrich/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      { "email": "john@example.com" },
      { "email": "jane@example.com" }
    ],
    "concurrency": 5
  }'

# Check bulk status
curl https://api.do/enrich/bulk/{jobId}
```

## Configuration

### API Keys

Set as secrets via `wrangler secret put`:

```bash
wrangler secret put APOLLO_API_KEY
wrangler secret put CLEARBIT_API_KEY
wrangler secret put HUNTER_API_KEY
wrangler secret put SNOV_API_KEY
```

### Caching

- **TTL**: 30 days (configurable)
- **Storage**: Cloudflare KV
- **Cache Key**: Based on email, name, company, domain

### Rate Limiting

- **Per Minute**: 100 requests
- **Per Hour**: 5,000 requests
- **Per Day**: 50,000 requests

## Enrichment Flow

1. **Check Cache**: Look for cached enrichment (30-day TTL)
2. **Select Source**: Choose provider based on availability, cost, and fields
3. **Enrich**: Call provider API
4. **Cache**: Store result for future lookups
5. **Track**: Log usage for billing and analytics

## Cost Optimization

### Caching Strategy
- Cache all enrichments for 30 days
- Avoid re-enriching same contact/company
- Saves ~90% of API costs

### Source Selection
- Apollo/Clearbit: High priority, 1 credit
- Hunter/Snov: Medium priority, 0.5 credits
- Fall back to cheaper sources when possible

### Bulk Processing
- Queue-based processing (max 10 per batch)
- Concurrency control (default: 5 concurrent)
- Automatic retry on failures

## Database Schema

```sql
CREATE TABLE enrichment_usage (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  type TEXT NOT NULL, -- 'contact' or 'company'
  cost REAL NOT NULL,
  success INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  organization_id TEXT,
  user_id TEXT
);

-- Index for analytics
CREATE INDEX idx_enrichment_usage_provider ON enrichment_usage(provider);
CREATE INDEX idx_enrichment_usage_timestamp ON enrichment_usage(timestamp);
```

## Error Handling

- **404 Not Found**: Provider couldn't find the contact/company
- **401 Unauthorized**: Invalid API key
- **429 Rate Limited**: Too many requests to provider
- **500 Server Error**: Provider API error

All errors are logged and tracked. Failed enrichments don't count toward usage.

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to staging
wrangler deploy --env staging
```

## Monitoring

Track these metrics:
- **Enrichment Rate**: Successful / Total
- **Cache Hit Rate**: Cached / Total
- **Provider Performance**: Response time, success rate
- **Cost Per Enrichment**: Total cost / Enrichments
- **Queue Backlog**: Pending bulk enrichments

## Related Services

- **email-validation**: Validate emails before enrichment
- **email-campaigns**: Enrich campaign contacts
- **email-sender**: Use enriched data for personalization
