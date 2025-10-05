# Ads Worker

Display ad serving engine with experimentation-first approach.

## Overview

The Ads Worker serves display ads with intelligent selection based on quality scores, bids, and targeting. It's tightly integrated with the Experiment Worker to enable continuous A/B testing and multi-armed bandit optimization.

## Features

✅ **Experimentation-First** - Every impression can be an experiment
✅ **Quality-Based Selection** - Ad quality score × bid optimization
✅ **Frequency Capping** - User-level impression limits
✅ **Smart Targeting** - Location, device, keywords, demographics
✅ **Budget Management** - Daily and total budget tracking
✅ **Performance Tracking** - Real-time metrics and analytics
✅ **Tight Integration** - Seamless experiment worker integration

## Architecture

```
Ad Request
    ↓
┌────────────────────────────────────────┐
│  selectAd(context)                     │
├────────────────────────────────────────┤
│  1. Get eligible ads (targeting)       │
│  2. Apply frequency capping            │
│  3. Check active experiment            │
│     ↓ If experiment active             │
│     → Call EXPERIMENT.assignVariant()  │
│     → Map variant config to ad         │
│  4. Fallback: Quality × Bid selection  │
│  5. Create impression record           │
└────────────────────────────────────────┘
    ↓
Return { ad, impression, experimentAssignment }
```

## Usage

### Select Ad

```typescript
import { AdsService } from 'ads'

const service = new AdsService(ctx, env)

const result = await service.selectAd({
  userId: 'user_123',
  sessionId: 'session_456',
  timestamp: Date.now(),
  device: 'mobile',
  location: 'US',
  url: 'https://example.com/page',
  referrer: 'https://google.com',
  keywords: ['technology', 'software'],
  userFeatures: {
    age: 35,
    previousPurchases: 5,
  },
})

// result contains:
// - ad: The selected ad object
// - impression: The impression record
// - experimentAssignment: Optional experiment info
```

### Record Impression

```typescript
// After ad is shown to user
await service.recordImpression(result.impression.id, 0.75) // 75% viewability
```

### Record Click

```typescript
// User clicked the ad
const click = await service.recordClick(result.impression.id)
```

### Record Conversion

```typescript
// User converted (purchased, signed up, etc.)
const conversion = await service.recordConversion(
  result.impression.id,
  49.99, // Revenue value
  click.id // Optional click ID
)
```

### Get Ad Performance

```typescript
const ad = await service.getAdPerformance('ad_123')

console.log(`Impressions: ${ad.metrics.impressions}`)
console.log(`Clicks: ${ad.metrics.clicks}`)
console.log(`CTR: ${(ad.metrics.ctr * 100).toFixed(2)}%`)
console.log(`Conversions: ${ad.metrics.conversions}`)
console.log(`ROAS: ${ad.metrics.roas.toFixed(2)}`)
```

## Integration with Experiment Worker

The ads worker automatically integrates with experiments when an active experiment is configured:

```typescript
// Example: Create experiment for ad creative testing
const experiment = await env.EXPERIMENT.createExperiment({
  name: 'Homepage Hero Ad Test',
  type: 'thompson_sampling',
  primaryMetric: 'click',
  secondaryMetrics: ['conversion', 'revenue'],
  trafficAllocation: 1.0,
}, [
  { name: 'Creative A', isControl: true, config: { adId: 'ad_123' } },
  { name: 'Creative B', config: { adId: 'ad_456' } },
  { name: 'Creative C', config: { adId: 'ad_789' } },
])

await env.EXPERIMENT.startExperiment(experiment.id)

// Configure ads worker to use this experiment
await env.ADS_KV.put('active_experiment', JSON.stringify({ id: experiment.id }))

// Now all ad selections will use Thompson Sampling to pick best variant
const result = await service.selectAd(context)

// result.experimentAssignment contains:
// - experimentId: The experiment ID
// - assignmentId: Assignment ID (for recording observations)
// - variantId: Which variant was selected

// The ads worker automatically records observations to the experiment worker
// when clicks/conversions happen
```

## Ad Selection Algorithm

### 1. Eligibility Filter
- Status = active
- Within budget (daily/total)
- Matches targeting (location, device, keywords)

### 2. Frequency Capping
- Max 5 impressions per user per ad per 24h (configurable)
- Cached in KV for fast lookup

### 3. Experiment-Based Selection
If active experiment:
- Call `EXPERIMENT.assignVariant()` with user context
- Get variant config with `adId`
- Return corresponding ad

### 4. Quality-Based Selection (Fallback)
Score = quality_score × bid
- quality_score: 0-10, based on historical performance
- bid: CPM or CPC bid amount
- Select ad with highest score

## Targeting

Ads support multi-dimensional targeting:

```typescript
const ad = {
  targeting: {
    locations: ['US', 'CA', 'UK'],
    devices: ['mobile', 'desktop'],
    ageMin: 25,
    ageMax: 54,
    languages: ['en'],
    keywords: ['technology', 'software', 'saas'],
  },
}
```

## Frequency Capping

Default: 5 impressions per user per ad per 24h

Stored in KV with structure:
```typescript
{
  userId: 'user_123',
  adId: 'ad_456',
  count: 3,
  windowStart: '2025-10-04T10:00:00Z',
  windowEnd: '2025-10-05T10:00:00Z',
}
```

TTL: 24 hours (auto-expires)

## Quality Score

Quality score (0-10) is calculated based on historical performance:

```
quality_score = (
  0.4 × CTR_normalized +
  0.3 × CVR_normalized +
  0.2 × ROAS_normalized +
  0.1 × viewability
)
```

Updated daily via background job.

## Budget Management

Two budget types:
- **Daily Budget**: Reset at midnight UTC
- **Total Budget**: Lifetime budget for ad

Ads are automatically paused when budget is exhausted.

## Metrics Tracked

### Real-Time Metrics (per ad)
- impressions
- clicks
- conversions
- spend
- revenue

### Calculated Metrics
- CTR = clicks / impressions
- CPC = spend / clicks
- CPM = (spend / impressions) × 1000
- CVR = conversions / clicks
- ROAS = revenue / spend

## RPC Interface

- `selectAd(context)` - Select ad for user/context
- `recordImpression(impressionId, viewability?)` - Record impression
- `recordClick(impressionId)` - Record click
- `recordConversion(impressionId, value, clickId?)` - Record conversion
- `getAdPerformance(adId, dateRange?)` - Get ad metrics

## HTTP API

```bash
# Select ad
curl -X POST https://ads.services.do/select \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "sessionId": "session_456", ...}'

# Record impression
curl -X POST https://ads.services.do/impressions/{id}/record \
  -H "Content-Type: application/json" \
  -d '{"viewability": 0.75}'

# Record click
curl -X POST https://ads.services.do/impressions/{id}/click

# Record conversion
curl -X POST https://ads.services.do/impressions/{id}/conversion \
  -H "Content-Type: application/json" \
  -d '{"value": 49.99, "clickId": "click_123"}'

# Get ad performance
curl https://ads.services.do/ads/{id}/performance
```

## Performance

- **<50ms p99 latency** for ad selection
- **10k+ requests/second** throughput
- **KV-backed caching** for fast frequency cap lookups
- **Async experiment integration** (non-blocking)

## Database Schema

See `schema.sql` for complete schema. Key tables:

- `ads` - Ad configurations and metrics
- `ad_impressions` - Impression tracking with experiment references
- `ad_clicks` - Click tracking
- `ad_conversions` - Conversion tracking with revenue
- `ad_metrics_daily` - Aggregated daily metrics

## Example: Complete Flow

```typescript
// 1. User visits page
const result = await env.ADS.selectAd({
  userId: 'user_123',
  sessionId: 'session_456',
  timestamp: Date.now(),
  device: 'mobile',
  location: 'US',
  url: 'https://example.com/blog/post',
})

// 2. Show ad to user
displayAd(result.ad, result.impression.id)

// 3. Ad is viewable
await env.ADS.recordImpression(result.impression.id, 0.80)

// 4. User clicks ad
await env.ADS.recordClick(result.impression.id)

// 5. User converts
await env.ADS.recordConversion(result.impression.id, 49.99)

// All metrics are automatically:
// - Recorded in ads worker
// - Sent to analytics worker
// - Recorded in experiment worker (if part of experiment)
```

## Monitoring

Key metrics to track:

- Ad selection latency (p50, p95, p99)
- Frequency cap hit rate
- Experiment participation rate
- Quality score distribution
- Budget utilization
- API error rate

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Check health
curl https://ads.services.do/health
```

## Best Practices

1. **Use experiments** for all creative/targeting tests
2. **Monitor quality scores** and pause low-quality ads
3. **Set appropriate frequency caps** to avoid user fatigue
4. **Track viewability** to optimize ad placement
5. **Review daily budgets** to avoid overspend
6. **Analyze metrics** regularly to identify winners

## Related Workers

- **experiment** - Experimentation engine (tightly coupled)
- **analytics** - Event tracking and reporting
- **ads-campaigns** - Campaign management
- **ads-creatives** - Creative asset management
- **ads-audiences** - Audience targeting

---

**Last Updated:** 2025-10-04
**Status:** Production Ready
**Maintainer:** Engineering Team
