# Deliverability Monitoring Service

Email deliverability monitoring and domain reputation tracking service.

## Features

- **Deliverability Metrics**: Track sent, delivered, bounced, complained, opened, clicked, replied counts
- **Rate Calculations**: Delivery rate, bounce rate, complaint rate, open rate, click rate, reply rate
- **Domain Reputation**: Sender score, IP reputation, blacklist monitoring, DNS authentication (SPF/DKIM/DMARC)
- **Health Analysis**: Comprehensive domain health scoring with severity-based issues and recommendations
- **Status Indicators**: excellent/good/warning/critical based on industry thresholds
- **Caching**: KV-based caching (1-hour TTL) for fast reputation lookups

## API

### RPC Methods

```typescript
interface DeliverabilityService {
  // Get deliverability metrics for a time period
  getMetrics(request: GetMetricsRequest): Promise<DeliverabilityMetrics>

  // Get domain reputation and DNS auth status
  getReputation(request: GetReputationRequest): Promise<DomainReputation>

  // Comprehensive domain health analysis
  analyzeDomain(request: AnalyzeDomainRequest): Promise<AnalyzeDomainResponse>
}
```

### HTTP Endpoints

```bash
# Get metrics
GET /domains/:domainId/metrics?period=week&startDate=2024-01-01&endDate=2024-01-08

# Get reputation
GET /domains/:domainId/reputation?refresh=true

# Analyze domain
POST /domains/:domainId/analyze
{
  "depth": "full"  // or "quick"
}
```

## Status Thresholds

- **Critical**: bounce > 10% OR complaint > 0.5% OR delivery < 85%
- **Warning**: bounce > 5% OR complaint > 0.1% OR delivery < 95%
- **Excellent**: bounce < 2% AND complaint < 0.05% AND delivery > 98%
- **Good**: Everything else

## Usage

```typescript
import { DeliverabilityService } from '@do/deliverability'

// Get weekly metrics
const metrics = await env.DELIVERABILITY.getMetrics({
  domainId: 'domain123',
  period: 'week'
})

console.log(`Delivery rate: ${metrics.deliveryRate * 100}%`)
console.log(`Status: ${metrics.status}`)
console.log(`Issues: ${metrics.issues.join(', ')}`)

// Check domain reputation
const reputation = await env.DELIVERABILITY.getReputation({
  domainId: 'domain123',
  refresh: true
})

console.log(`Sender score: ${reputation.senderScore}/100`)
console.log(`SPF: ${reputation.spfStatus}`)
console.log(`DKIM: ${reputation.dkimStatus}`)
console.log(`Blacklists: ${reputation.blacklistCount}`)

// Full domain analysis
const analysis = await env.DELIVERABILITY.analyzeDomain({
  domainId: 'domain123',
  depth: 'full'
})

console.log(`Overall score: ${analysis.score}/100`)
console.log(`Status: ${analysis.status}`)
analysis.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`)
  console.log(`  → ${issue.recommendation}`)
})
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

## Tests

Comprehensive test suite covering:
- Metrics calculation and rate computation
- Status determination (excellent/good/warning/critical)
- Issue detection and recommendations
- Reputation scoring and caching
- Domain health analysis
- Error handling

Target: 80%+ coverage
