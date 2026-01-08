# datadog.do

> The $18B observability platform. Now open source. AI-native.

Datadog dominates modern observability. But at $15-34/host/month for infrastructure, $1.27/GB for logs, and custom metrics that can cost $100k+/year, bills that regularly hit 7 figures, it's time for a new approach.

**datadog.do** reimagines observability for the AI era. Full APM. Unlimited logs. Zero per-host pricing.

## AI-Native API

```typescript
import { datadog } from 'datadog.do'           // Full SDK
import { datadog } from 'datadog.do/tiny'      // Minimal client
import { datadog } from 'datadog.do/metrics'   // Metrics-only operations
```

Natural language for observability:

```typescript
import { datadog } from 'datadog.do'

// Talk to it like an SRE
const health = await datadog`production health right now`
const errors = await datadog`errors in production last hour`
const slow = await datadog`slowest endpoints this week`

// Chain like sentences
await datadog`services with high error rate`
  .map(service => datadog`root cause for ${service}`)
  .map(cause => datadog`recommended fix for ${cause}`)

// Incidents that investigate themselves
await datadog`investigate the 3am outage`
  .correlate()      // cross-reference logs, traces, metrics
  .timeline()       // build incident timeline
  .report()         // generate post-mortem
```

## The Problem

Datadog built an observability empire on:

| What Datadog Charges | The Reality |
|----------------------|-------------|
| **Per-host pricing** | $15/host (Infra), $31/host (APM) |
| **Per-GB logs** | $0.10/GB ingested, $1.27/GB indexed |
| **Custom metrics** | $0.05/metric/month, scales to $100k+ |
| **Retention** | Historical data requires expensive plans |
| **Fragmentation** | APM, Logs, Metrics, RUM all priced separately |
| **Unpredictable** | Usage spikes = surprise invoices |

### The Observability Tax

A 500-host infrastructure with logs and APM? **$300k+/year**. With custom metrics and long retention? **$500k+**.

### The Dashboard Maze

When production is down:
- Navigate five dashboards
- Write three queries
- Correlate manually
- Every minute costs money

### The Alert Fatigue

- Too many alerts = ignored alerts
- Too few alerts = missed incidents
- Threshold tuning is a full-time job
- AI "assistants" add complexity, not clarity

## The Solution

**datadog.do** reimagines observability:

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

```typescript
import { Datadog } from 'datadog.do'

export default Datadog({
  name: 'acme-observability',
  domain: 'monitor.acme.io',
  retention: {
    metrics: '90d',
    logs: '365d',
    traces: '30d',
  },
})
```

## Features

### Metrics

```typescript
// Query metrics naturally
await datadog`CPU usage for web servers last 24 hours`
await datadog`memory trend for api-gateway this week`
await datadog`disk usage above 80%`

// AI infers what you need
await datadog`web servers`                    // returns host list
await datadog`web servers CPU`                // returns metrics
await datadog`web servers CPU trending up`    // returns analysis
```

### Logs

```typescript
// Search logs naturally
await datadog`logs containing "timeout" in production`
await datadog`errors from api-gateway last hour`
await datadog`payment failures today`

// Chain for investigation
await datadog`errors spiking in checkout`
  .each(error => error.trace())    // get related traces
```

### Traces

```typescript
// Distributed tracing in plain English
await datadog`slow requests to /api/users`
await datadog`traces with errors in payment-service`
await datadog`p99 latency for checkout flow`

// Follow the request path
await datadog`trace the slow request from user-123`
  .visualize()   // flame graph
```

### Alerting

```typescript
// Alerts as sentences
await datadog`alert when CPU > 90% for 5 minutes`
await datadog`alert when error rate > 5% for 5 minutes`
await datadog`alert when p99 latency > 2 seconds`
await datadog`alert when disk usage > 80%`

// Smart alerts
await datadog`alert when traffic is anomalous`
await datadog`alert when checkout errors spike`

// Composite alerts
await datadog`alert when high CPU and high error rate together`
```

### Dashboards

```typescript
// Create dashboards naturally
await datadog`dashboard for production infrastructure`
await datadog`dashboard for api-gateway performance`
await datadog`dashboard for checkout flow`

// Query dashboards
await datadog`show me the infrastructure dashboard`
```

### Infrastructure

```typescript
// Host and container monitoring
await datadog`hosts with high CPU`
await datadog`containers in production namespace`
await datadog`pods restarting in kubernetes`

// Cloud resources
await datadog`cloudflare workers by region`
await datadog`r2 buckets by size`
await datadog`d1 databases by query count`
```

### APM

```typescript
// Application performance in plain English
await datadog`services with highest error rate`
await datadog`slowest database queries`
await datadog`api-gateway dependencies`

// Service health
await datadog`is checkout service healthy?`
await datadog`what's blocking payment-service?`
```

### RUM

```typescript
// Real user monitoring
await datadog`page load times this week`
await datadog`javascript errors on checkout page`
await datadog`users affected by slow performance`

// User journeys
await datadog`users dropping off at checkout`
await datadog`conversion rate by browser`
```

### Synthetic Monitoring

```typescript
// Proactive testing as sentences
await datadog`check api.acme.com/health every minute`
await datadog`test login flow from all regions`
await datadog`verify checkout completes under 3 seconds`
```

## AI-Native Observability

### Incident Response

```typescript
// Ask questions about your infrastructure
await datadog`what's wrong with production right now?`
await datadog`why is the API slow?`
await datadog`what changed before the errors started?`

// Diagnostic questions
await datadog`root cause of the 3am outage`
await datadog`how does this week compare to last week?`
await datadog`what's different about the slow requests?`
```

### Watchdog (AI Detection)

```typescript
// AI finds anomalies automatically
await datadog`enable watchdog for production services`
await datadog`watchdog alerts last 24 hours`
await datadog`explain the latency anomaly in api-gateway`

// AI correlates across signals
await datadog`correlate error spike with recent deployments`
await datadog`what else changed when checkout broke?`
```

### AI Agents as SREs

```typescript
import { tom, quinn } from 'agents.do'
import { datadog } from 'datadog.do'

// Tech lead investigates incident
await tom`investigate the elevated error rate in production`
  .using(datadog)
  .report()

// QA validates fix
await quinn`verify the deployment fixed the issue`
  .compare('error rate before and after')

// Chain investigation into resolution
await datadog`services with errors right now`
  .map(service => tom`diagnose ${service} and suggest fix`)
  .map(fix => quinn`test that ${fix} resolves the issue`)
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
// Natural language queries compile to DQL
await datadog`average CPU across web servers`
// -> avg:system.cpu.user{role:web} by {host}

await datadog`requests per second in production`
// -> sum:app.requests{env:prod}.as_count().rollup(sum, 60)

await datadog`slowest 10 endpoints`
// -> top(avg:app.latency{*} by {endpoint}, 10, mean)
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
import { datadog } from 'datadog.do'

// Auto-instrumentation - just wrap your worker
export default datadog.instrument({
  async fetch(request, env, ctx) {
    // Your worker code
    // Traces, logs, metrics collected automatically
  },
})
```

## Migration from Datadog

### Agent Compatibility

Point your existing agent to datadog.do:

```bash
DD_SITE=your-org.datadog.do DD_API_KEY=your-key datadog-agent run
```

### Dashboard Migration

```typescript
// Migrate dashboards with one command
await datadog`import dashboards from datadog`
await datadog`import monitors from datadog`
await datadog`import synthetic tests from datadog`
```

Or use the CLI:

```bash
npx datadog-migrate import --from-datadog --all
```

## Integrations

```typescript
// Enable integrations naturally
await datadog`connect to AWS`
await datadog`connect to Cloudflare`
await datadog`connect to PostgreSQL`

// Or specify details
await datadog`monitor kubernetes cluster production`
await datadog`track GitHub Actions deployments`
```

Pre-built integrations for common services:

| Category | Integrations |
|----------|-----------|
| **Cloud** | AWS, GCP, Azure, Cloudflare |
| **Containers** | Docker, Kubernetes, ECS |
| **Databases** | PostgreSQL, MySQL, Redis, MongoDB |
| **Web** | Nginx, Apache, HAProxy |
| **Languages** | Node.js, Python, Go, Java, Ruby |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins |

## vs Datadog

| Feature | Datadog | datadog.do |
|---------|---------|------------|
| **Infrastructure** | $15/host/month | $0 - run your own |
| **APM** | $31/host/month | $0 - run your own |
| **Logs** | $1.27/GB indexed | Unlimited (R2 storage) |
| **Custom metrics** | $0.05/metric/month | Unlimited |
| **Retention** | 15 days (logs) | Unlimited |
| **Data location** | Datadog's cloud | Your Cloudflare account |
| **Query language** | DQL | Natural language + DQL |
| **AI features** | Watchdog | AI-native from day one |
| **Lock-in** | Proprietary | MIT licensed |

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

## Contributing

datadog.do is open source under the MIT license.

We especially welcome contributions from:
- SREs and DevOps engineers
- Observability experts
- AI/ML engineers
- Infrastructure engineers

```bash
git clone https://github.com/dotdo/datadog.do
cd datadog.do
pnpm install
pnpm test
```

## License

MIT License - Monitor everything. Alert on anything. Pay for storage, not seats.

---

<p align="center">
  <strong>The $18B valuation ends here.</strong>
  <br />
  AI-native. Open source. Your data.
  <br /><br />
  <a href="https://datadog.do">Website</a> |
  <a href="https://docs.datadog.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/datadog.do">GitHub</a>
</p>
