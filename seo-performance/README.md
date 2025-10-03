# SEO Performance Monitor Worker

Core Web Vitals tracking and performance monitoring for SEO optimization.

## Features

- **Core Web Vitals Tracking** - LCP, INP, CLS with 2025 thresholds
- **Performance History** - 90-day retention in KV
- **Aggregate Metrics** - P75 calculations over 28 days
- **Performance Budgets** - Budget violation detection
- **Monitoring Configuration** - Per-URL monitoring setup
- **Performance Alerts** - Threshold-based alerting (warning/critical)
- **Snapshots** - R2-based performance snapshots
- **Multi-Device** - Desktop and mobile tracking

## API Endpoints

### HTTP API (Hono)

```bash
# Record Core Web Vitals
POST /vitals
{
  "url": "https://example.com",
  "timestamp": "2025-01-01T00:00:00Z",
  "deviceType": "desktop",
  "metrics": {
    "lcp": { "metric": "LCP", "value": 2100, "rating": "good", ... },
    "inp": { "metric": "INP", "value": 150, "rating": "good", ... },
    "cls": { "metric": "CLS", "value": 0.08, "rating": "good", ... }
  },
  "overallRating": "good",
  "passedCoreWebVitals": true
}

# Get vitals history
GET /vitals/:url?device=desktop&days=7

# Get aggregate metrics (p75)
GET /aggregate/:url?days=28

# Check if passes Core Web Vitals
GET /check/:url

# Set monitoring config
POST /config
{
  "url": "https://example.com",
  "deviceTypes": ["desktop", "mobile"],
  "frequency": "hourly",
  "alerts": {
    "enabled": true,
    "thresholds": { "lcp": 2500, "inp": 200, "cls": 0.1 },
    "recipients": ["alerts@example.com"]
  }
}

# Get monitoring config
GET /config/:url

# Check performance budget
POST /budget
{
  "url": "https://example.com",
  "budget": {
    "lcp": 2500,
    "inp": 200,
    "cls": 0.1,
    "ttfb": 800,
    "fcp": 1800
  }
}

# Generate performance snapshot (R2)
POST /snapshot/:url
```

### RPC Methods (Service Bindings)

```typescript
// Record vitals
await env.SEO_PERFORMANCE.recordVitals(report)

// Get history
await env.SEO_PERFORMANCE.getHistory(url, deviceType, days)

// Get aggregate metrics
await env.SEO_PERFORMANCE.getAggregateMetrics(url, days)

// Check Core Web Vitals
await env.SEO_PERFORMANCE.checkCoreWebVitals(url)

// Monitoring config
await env.SEO_PERFORMANCE.setMonitoringConfig(config)
await env.SEO_PERFORMANCE.getMonitoringConfig(url)

// Check budget
await env.SEO_PERFORMANCE.checkBudget(url, budget)

// Generate snapshot
await env.SEO_PERFORMANCE.generateSnapshot(url)
```

## Core Web Vitals (2025 Thresholds)

### LCP (Largest Contentful Paint)
- **Good:** < 2.5s
- **Needs Improvement:** 2.5s - 4.0s
- **Poor:** > 4.0s

Measures loading performance. The LCP should occur within the first 2.5 seconds of the page starting to load.

### INP (Interaction to Next Paint)
- **Good:** < 200ms
- **Needs Improvement:** 200ms - 500ms
- **Poor:** > 500ms

Measures interactivity. Replaces FID (First Input Delay) as of March 2024.

### CLS (Cumulative Layout Shift)
- **Good:** < 0.1
- **Needs Improvement:** 0.1 - 0.25
- **Poor:** > 0.25

Measures visual stability. Pages should maintain a CLS of less than 0.1.

### Additional Metrics

**TTFB (Time to First Byte)**
- **Good:** < 800ms
- **Poor:** > 1800ms

**FCP (First Contentful Paint)**
- **Good:** < 1.8s
- **Poor:** > 3.0s

## Performance Ratings

```typescript
enum PerformanceRating {
  Good = 'good',
  NeedsImprovement = 'needs-improvement',
  Poor = 'poor'
}
```

## Core Web Vitals Report

```typescript
interface CoreWebVitalsReport {
  url: string
  timestamp: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  metrics: {
    lcp: WebVitalMeasurement
    inp: WebVitalMeasurement
    cls: WebVitalMeasurement
    ttfb?: WebVitalMeasurement
    fcp?: WebVitalMeasurement
  }
  overallRating: PerformanceRating
  passedCoreWebVitals: boolean
}
```

## Performance Monitoring

**Monitoring Configuration:**
```typescript
interface PerformanceMonitoringConfig {
  url: string
  deviceTypes: ('desktop' | 'mobile' | 'tablet')[]
  locations: string[] // Geographic locations
  frequency: 'hourly' | 'daily' | 'weekly'
  alerts: {
    enabled: boolean
    thresholds: {
      lcp?: number
      inp?: number
      cls?: number
    }
    recipients: string[]
  }
  budget?: PerformanceBudget
}
```

**Performance Budget:**
```typescript
interface PerformanceBudget {
  lcp: number // milliseconds
  inp: number // milliseconds
  cls: number // score
  ttfb: number // milliseconds
  fcp: number // milliseconds
  totalPageSize: number // bytes
  totalRequests: number
  imageSize: number // bytes
  scriptSize: number // bytes
  styleSize: number // bytes
}
```

## Performance Alerts

Alerts are triggered when metrics exceed configured thresholds:

```typescript
interface PerformanceAlert {
  id: string
  timestamp: string
  url: string
  metric: WebVitalMetric
  value: number
  threshold: number
  severity: 'warning' | 'critical'
  message: string
}
```

**Severity Levels:**
- **Warning:** Metric exceeds threshold but not "poor" threshold
- **Critical:** Metric exceeds "poor" threshold

Alerts are stored in KV with 7-day TTL and can trigger notifications to configured recipients.

## Data Storage

**KV Namespaces:**
- `VITALS_CACHE` - Monitoring configs and recent data
- `VITALS_HISTORY` - 90-day history by URL/device/date

**Analytics Engine:**
- `VITALS_ANALYTICS` - Real-time metrics tracking

**R2 Bucket:**
- `VITALS_BUCKET` - Long-term performance snapshots

**Queue:**
- `VITALS_QUEUE` - Async processing of vitals reports

## Configuration

**wrangler.jsonc:**
```jsonc
{
  "kv_namespaces": [
    { "binding": "VITALS_CACHE" },
    { "binding": "VITALS_HISTORY" }
  ],
  "analytics_engine_datasets": [
    { "binding": "VITALS_ANALYTICS" }
  ],
  "r2_buckets": [
    { "binding": "VITALS_BUCKET", "bucket_name": "vitals-snapshots" }
  ],
  "queues": {
    "producers": [{ "binding": "VITALS_QUEUE", "queue": "vitals-monitoring" }],
    "consumers": [{ "queue": "vitals-monitoring", "max_batch_size": 10 }]
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Integration

**Service Binding:**
```jsonc
{
  "services": [
    { "binding": "SEO_PERFORMANCE", "service": "seo-performance" }
  ]
}
```

**Client-Side Integration:**
```html
<script type="module">
  import { onLCP, onINP, onCLS } from 'web-vitals'

  // Record Core Web Vitals
  function sendToAnalytics(metric) {
    const report = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      metrics: {},
      overallRating: 'good',
      passedCoreWebVitals: true
    }

    // Add metric
    report.metrics[metric.name.toLowerCase()] = {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      deviceType: report.deviceType,
      connection: navigator.connection?.effectiveType || 'unknown',
      navigationType: 'navigate'
    }

    // Send to worker
    fetch('/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    })
  }

  onLCP(sendToAnalytics)
  onINP(sendToAnalytics)
  onCLS(sendToAnalytics)
</script>
```

**Server-Side Integration:**
```typescript
// Record vitals from synthetic monitoring
const report: CoreWebVitalsReport = {
  url: 'https://example.com',
  timestamp: new Date().toISOString(),
  deviceType: 'desktop',
  metrics: {
    lcp: { metric: 'LCP', value: 2100, rating: 'good', ... },
    inp: { metric: 'INP', value: 150, rating: 'good', ... },
    cls: { metric: 'CLS', value: 0.08, rating: 'good', ... }
  },
  overallRating: 'good',
  passedCoreWebVitals: true
}

await env.SEO_PERFORMANCE.recordVitals(report)

// Check if site passes Core Web Vitals
const result = await env.SEO_PERFORMANCE.checkCoreWebVitals('https://example.com')

if (result.passed) {
  console.log('✅ Passes Core Web Vitals!')
} else {
  console.log('❌ Fails Core Web Vitals')
  console.log('LCP:', result.metrics.lcp, 'ms')
  console.log('INP:', result.metrics.inp, 'ms')
  console.log('CLS:', result.metrics.cls)
}
```

## Related

- **Types:** `@dot-do/seo-types` package
- **Issue:** #35
- **Cloudflare Web Analytics:** Free Core Web Vitals tracking
