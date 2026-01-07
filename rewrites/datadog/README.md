# datadog.do

> The $18B observability platform. Now open source. AI-native.

Datadog dominates modern observability. But at $15-34/host/month for infrastructure, $1.27/GB for logs, and custom metrics that can cost $100k+/year, bills that regularly hit 7 figures, it's time for a new approach.

**datadog.do** reimagines observability for the AI era. Full APM. Unlimited logs. Zero per-host pricing.

## The Problem

Datadog built an observability empire on:

- **Per-host pricing** - $15/host/month (Infrastructure), $31/host/month (APM)
- **Per-GB log pricing** - $0.10/GB ingested, $1.27/GB indexed (15-day retention)
- **Custom metrics explosion** - $0.05/metric/month, scales to $100k+ easily
- **Data retention costs** - Historical data requires expensive plans
- **Feature fragmentation** - APM, Logs, Metrics, RUM, Security all priced separately
- **Unpredictable bills** - Usage spikes = surprise invoices

A 500-host infrastructure with logs and APM? **$300k+/year**. With custom metrics and long retention? **$500k+**.

## The Solution

**datadog.do** is Datadog reimagined:

```
Traditional Datadog             datadog.do
-----------------------------------------------------------------
$15-34/host/month              $0 - run your own
$1.27/GB logs                  Unlimited (R2 storage costs)
$0.05/custom metric            Unlimited metrics
15-day log retention           Unlimited retention
Unpredictable bills            Predictable costs
Vendor lock-in                 Open source, your data
```

## One-Click Deploy

```bash
npx create-dotdo datadog
```

Your own Datadog. Running on Cloudflare. No per-host fees.

## Full-Stack Observability

Everything you need to monitor your infrastructure:

```typescript
import { datadog } from 'datadog.do'

// Metrics
datadog.gauge('app.queue.size', 42, { queue: 'main' })
datadog.count('app.requests.count', 1, { endpoint: '/api/users' })
datadog.histogram('app.request.duration', 0.234, { endpoint: '/api/users' })

// Logs
datadog.log.info('User signed up', {
  userId: 'user-123',
  plan: 'pro',
  source: 'auth-service',
})

// Traces
const span = datadog.trace.startSpan('http.request', {
  service: 'api-gateway',
  resource: '/api/users',
})

// Events
datadog.event({
  title: 'Deployment completed',
  text: 'Version 2.3.1 deployed to production',
  tags: ['environment:production', 'service:api'],
})
```

## Features

### Infrastructure Monitoring

Monitor hosts, containers, and services:

```typescript
import { Infrastructure } from 'datadog.do/infra'

// Host metrics (auto-collected with agent)
// CPU, memory, disk, network, processes

// Container metrics
const containers = await Infrastructure.containers({
  filter: 'kube_namespace:production',
})

// Kubernetes
const k8s = await Infrastructure.kubernetes({
  cluster: 'production',
  metrics: ['pods', 'deployments', 'nodes'],
})

// Cloud integrations
await Infrastructure.integrate({
  provider: 'cloudflare',
  metrics: ['workers', 'r2', 'd1'],
})
```

### Application Performance Monitoring (APM)

End-to-end distributed tracing:

```typescript
import { tracer } from 'datadog.do/apm'

// Auto-instrument common libraries
tracer.use('http')
tracer.use('pg')
tracer.use('redis')
tracer.use('fetch')

// Manual instrumentation
app.get('/api/users', async (c) => {
  const span = tracer.startSpan('get_users')

  try {
    const users = await span.trace('db.query', async () => {
      return db.query('SELECT * FROM users')
    })

    span.setTag('user.count', users.length)
    return c.json(users)
  } catch (error) {
    span.setError(error)
    throw error
  } finally {
    span.finish()
  }
})

// Service map auto-generated from traces
// Latency distributions, error rates, throughput
```

### Log Management

Unlimited log ingestion and analysis:

```typescript
import { logs } from 'datadog.do/logs'

// Structured logging
logs.info('Order processed', {
  orderId: 'order-123',
  amount: 99.99,
  customer: 'user-456',
})

// Log parsing pipelines
const pipeline = logs.pipeline({
  name: 'Nginx Access Logs',
  source: 'nginx',
  processors: [
    { type: 'grok', pattern: '%{COMBINEDAPACHELOG}' },
    { type: 'date', source: 'timestamp', target: '@timestamp' },
    { type: 'geo', source: 'client_ip', target: 'geo' },
    { type: 'useragent', source: 'agent', target: 'browser' },
  ],
})

// Log queries
const results = await logs.query({
  query: 'service:api-gateway status:error',
  from: '-15m',
  to: 'now',
  facets: ['@http.status_code', '@error.type'],
})

// Log archives (to R2)
logs.archive({
  query: '*',
  destination: 'r2://logs-archive',
  retention: '365d',
})
```

### Metrics

Custom metrics without the per-metric cost:

```typescript
import { metrics } from 'datadog.do/metrics'

// Gauge (current value)
metrics.gauge('app.connections.active', 42, {
  service: 'api',
  region: 'us-east',
})

// Count (increments)
metrics.count('app.requests', 1, {
  endpoint: '/api/users',
  method: 'GET',
  status: '200',
})

// Histogram (distributions)
metrics.histogram('app.latency', 0.234, {
  endpoint: '/api/users',
  percentiles: [0.5, 0.95, 0.99],
})

// Distribution (global percentiles)
metrics.distribution('app.request.duration', 0.234, {
  service: 'api',
})

// Rate (per-second)
metrics.rate('app.throughput', eventCount, {
  service: 'api',
})

// Set (unique values)
metrics.set('app.users.unique', userId, {
  time_window: '1h',
})
```

### Dashboards

Build real-time dashboards:

```typescript
import { Dashboard, Widget } from 'datadog.do/dashboard'

const infraDashboard = Dashboard({
  title: 'Infrastructure Overview',
  layout: 'ordered',
  widgets: [
    Widget.timeseries({
      title: 'CPU Usage',
      query: 'avg:system.cpu.user{*} by {host}',
      display: 'line',
    }),
    Widget.topList({
      title: 'Top Hosts by Memory',
      query: 'top(avg:system.mem.used{*} by {host}, 10)',
    }),
    Widget.queryValue({
      title: 'Total Requests',
      query: 'sum:app.requests{*}.as_count()',
      precision: 0,
    }),
    Widget.heatmap({
      title: 'Request Latency',
      query: 'avg:app.latency{*} by {endpoint}',
    }),
    Widget.hostmap({
      title: 'Host Map',
      query: 'avg:system.cpu.user{*} by {host}',
      color: 'cpu',
      size: 'memory',
    }),
    Widget.logStream({
      title: 'Error Logs',
      query: 'status:error',
      columns: ['timestamp', 'service', 'message'],
    }),
  ],
})
```

### Alerting

Proactive monitoring with alerts:

```typescript
import { Monitor } from 'datadog.do/monitors'

// Metric alert
const cpuAlert = Monitor({
  name: 'High CPU Usage',
  type: 'metric',
  query: 'avg(last_5m):avg:system.cpu.user{*} by {host} > 90',
  message: `
    CPU usage is above 90% on {{host.name}}.

    Current value: {{value}}

    @slack-ops-alerts
  `,
  thresholds: {
    critical: 90,
    warning: 80,
  },
  renotify_interval: 300,
})

// Log alert
const errorAlert = Monitor({
  name: 'Error Rate Spike',
  type: 'log',
  query: 'logs("status:error").rollup("count").by("service").last("5m") > 100',
  message: 'Error rate spike in {{service.name}}',
})

// APM alert
const latencyAlert = Monitor({
  name: 'High Latency',
  type: 'apm',
  query: 'avg(last_5m):avg:trace.http.request.duration{service:api} > 1',
  message: 'API latency exceeds 1 second',
})

// Composite alert
const compositeAlert = Monitor({
  name: 'Service Degradation',
  type: 'composite',
  query: '${cpu_alert} && ${error_alert}',
  message: 'Service experiencing both high CPU and error spikes',
})

// Anomaly detection
const anomalyAlert = Monitor({
  name: 'Traffic Anomaly',
  type: 'metric',
  query: 'avg(last_4h):anomalies(avg:app.requests{*}, "basic", 2) >= 1',
  message: 'Unusual traffic pattern detected',
})
```

### Real User Monitoring (RUM)

Monitor frontend performance:

```typescript
import { RUM } from 'datadog.do/rum'

// Initialize RUM
RUM.init({
  applicationId: 'your-app-id',
  clientToken: 'your-token',
  site: 'your-org.datadog.do',
  service: 'my-web-app',
  trackInteractions: true,
  trackResources: true,
  trackLongTasks: true,
})

// Custom user actions
RUM.addAction('checkout_clicked', {
  cartValue: 99.99,
  itemCount: 3,
})

// Custom errors
RUM.addError(error, {
  context: { userId: 'user-123' },
})

// User identification
RUM.setUser({
  id: 'user-123',
  email: 'user@example.com',
  plan: 'pro',
})
```

### Synthetic Monitoring

Proactive testing:

```typescript
import { Synthetics } from 'datadog.do/synthetics'

// API test
const apiTest = Synthetics.api({
  name: 'Health Check',
  request: {
    method: 'GET',
    url: 'https://api.example.com/health',
  },
  assertions: [
    { type: 'statusCode', operator: 'is', target: 200 },
    { type: 'responseTime', operator: 'lessThan', target: 500 },
    { type: 'body', operator: 'contains', target: '"status":"healthy"' },
  ],
  locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  frequency: 60,
})

// Browser test
const browserTest = Synthetics.browser({
  name: 'Login Flow',
  startUrl: 'https://app.example.com/login',
  steps: [
    { type: 'typeText', selector: '#email', value: 'test@example.com' },
    { type: 'typeText', selector: '#password', value: 'password' },
    { type: 'click', selector: 'button[type="submit"]' },
    { type: 'assertText', selector: '.welcome', value: 'Welcome' },
  ],
  frequency: 300,
})
```

## AI-Native Features

### Natural Language Queries

Ask questions about your infrastructure:

```typescript
import { ask } from 'datadog.do'

// Simple questions
const q1 = await ask('what is the current CPU usage across all hosts?')
// { value: 45, unit: '%', trend: 'stable' }

// Diagnostic questions
const q2 = await ask('why is the API slow right now?')
// {
//   diagnosis: 'Database connection pool saturated',
//   evidence: [...],
//   recommendations: ['Increase pool size', 'Add read replicas']
// }

// Comparative questions
const q3 = await ask('how does this week compare to last week?')
// { comparison: {...}, anomalies: [...] }

// Root cause questions
const q4 = await ask('what caused the outage at 3pm?')
// { timeline: [...], rootCause: '...', impact: '...' }
```

### Watchdog (AI Detection)

AI-powered anomaly detection:

```typescript
import { Watchdog } from 'datadog.do'

// Enable AI monitoring
Watchdog.enable({
  services: ['api', 'web', 'worker'],
  sensitivity: 'medium',
})

// Get AI-detected issues
const issues = await Watchdog.issues({
  from: '-24h',
  severity: ['critical', 'high'],
})

for (const issue of issues) {
  console.log(issue.title)
  // "Latency spike in api-gateway"

  console.log(issue.impact)
  // "Affecting 15% of requests"

  console.log(issue.rootCause)
  // "Correlated with database connection spike"

  console.log(issue.relatedSpans)
  // Links to affected traces
}
```

### AI Agents as SREs

AI agents for incident response:

```typescript
import { tom, quinn } from 'agents.do'
import { datadog } from 'datadog.do'

// Tech lead investigates incident
const investigation = await tom`
  investigate the current elevated error rate in production
  correlate logs, traces, and metrics to find the root cause
`

// QA validates fix
const validation = await quinn`
  verify that the deployment fixed the issue
  compare error rates before and after
`
```

## Architecture

### Data Collection

```
Applications/Hosts
       |
       v
+---------------+
|   dd-agent    |  (Open-source agent)
|   Worker      |
+---------------+
       |
       v
+---------------+
|  Edge Worker  |  (Ingest + Route)
+---------------+
       |
   +---+---+---+
   |   |   |   |
   v   v   v   v
Metrics Logs Traces Events
```

### Durable Objects

```
                    +------------------------+
                    |   datadog.do Worker    |
                    |   (API + Ingest)       |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | MetricsDO        | | LogsDO           | | TracesDO         |
    | (Time Series)    | | (Log Store)      | | (Span Store)     |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    | Analytics|       |     R2    |        |     D1     |
    | Engine   |       | (Archive) |        | (Metadata) |
    +----------+       +-----------+        +------------+
```

### Storage Tiers

- **Hot (Analytics Engine)** - Real-time metrics, last 24h of logs
- **Warm (SQLite/D1)** - Indexed logs, trace metadata, dashboards
- **Cold (R2)** - Log archives, trace archives, long-term metrics

### Query Engine

```typescript
// Metrics queries (Datadog Query Language compatible)
query('avg:system.cpu.user{*} by {host}')
query('sum:app.requests{env:prod}.as_count().rollup(sum, 60)')
query('top(avg:app.latency{*} by {endpoint}, 10, mean)')

// Log queries
query('service:api status:error @http.status_code:500')
query('service:api @duration:>1000')

// Trace queries
query('service:api operation:http.request @duration:>1s')
```

## Agent Installation

### Docker

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -e DD_API_KEY=your-api-key \
  -e DD_SITE=your-org.datadog.do \
  datadog.do/agent:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
spec:
  template:
    spec:
      containers:
        - name: agent
          image: datadog.do/agent:latest
          env:
            - name: DD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: datadog
                  key: api-key
            - name: DD_SITE
              value: your-org.datadog.do
```

### Cloudflare Workers

```typescript
import { instrument } from 'datadog.do/worker'

export default instrument({
  async fetch(request, env, ctx) {
    // Your worker code
    // Automatically captures traces, logs, metrics
  },
}, {
  service: 'my-worker',
  env: 'production',
})
```

## Migration from Datadog

### Agent Compatibility

The datadog.do agent is compatible with Datadog's agent protocol:

```bash
# Switch site to your datadog.do instance
DD_SITE=your-org.datadog.do DD_API_KEY=your-key \
  datadog-agent run
```

### API Compatibility

Drop-in replacement for Datadog API:

```
Endpoint                        Status
-----------------------------------------------------------------
POST /api/v1/series             Supported
POST /api/v1/distribution_points Supported
POST /api/v1/check_run          Supported
POST /api/v1/events             Supported
POST /api/v1/logs               Supported (v2 also)
POST /api/v1/intake             Supported
GET  /api/v1/query              Supported
```

### Dashboard Migration

```bash
# Export from Datadog
datadog-export dashboards --output ./dashboards

# Import to datadog.do
npx datadog-migrate import ./dashboards
```

## Integrations

Pre-built integrations for common services:

| Category | Integrations |
|----------|-------------|
| **Cloud** | AWS, GCP, Azure, Cloudflare |
| **Containers** | Docker, Kubernetes, ECS |
| **Databases** | PostgreSQL, MySQL, Redis, MongoDB |
| **Web** | Nginx, Apache, HAProxy |
| **Languages** | Node.js, Python, Go, Java, Ruby |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins |

## Roadmap

- [x] Metrics collection (agent)
- [x] Log management
- [x] APM (distributed tracing)
- [x] Dashboards
- [x] Alerting (monitors)
- [x] AI anomaly detection (Watchdog)
- [ ] RUM (browser SDK)
- [ ] Synthetic monitoring
- [ ] Security monitoring
- [ ] Network monitoring
- [ ] Database monitoring
- [ ] CI visibility

## Why Open Source?

Observability shouldn't cost millions:

1. **Your metrics** - Infrastructure data is critical for operations
2. **Your logs** - Log data retention shouldn't cost per-GB
3. **Your traces** - APM shouldn't require per-host licensing
4. **Your alerts** - Monitoring is too important to be vendor-locked

Datadog showed the world what modern observability could be. **datadog.do** makes it accessible to everyone.

## License

MIT License - Monitor everything. Alert on anything. Pay for storage, not seats.

---

<p align="center">
  <strong>datadog.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://datadog.do">Website</a> | <a href="https://docs.datadog.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
