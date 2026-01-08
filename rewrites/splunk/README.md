# splunk.do

> The $28B log analytics giant. Now open source. AI-native.

Splunk dominates enterprise log analytics and SIEM. But at $150/GB/day for cloud, with SPL complexity requiring specialized engineers, and Cisco's acquisition promising even more enterprise pricing, it's time for a new approach.

**splunk.do** reimagines log analytics for the AI era. Full SPL compatibility. Unlimited data. Zero per-GB pricing.

## AI-Native API

```typescript
import { splunk } from 'splunk.do'           // Full SDK
import { splunk } from 'splunk.do/tiny'      // Minimal client
import { splunk } from 'splunk.do/spl'       // SPL-only operations
```

Natural language for log analytics:

```typescript
import { splunk } from 'splunk.do'

// Talk to it like a colleague
const errors = await splunk`errors in checkout last hour`
const attacks = await splunk`brute force attempts today`
const anomalies = await splunk`what's unusual in network traffic?`

// Chain like sentences
await splunk`failed logins followed by success`
  .map(events => splunk`correlate with data exfiltration`)
  .alert(`Potential account compromise detected`)

// Ingestion that documents itself
await splunk`ingest nginx access_combined into main`
await splunk`stream kafka logs from events topic`
await splunk`tail /var/log/*.log as syslog`
```

## The Problem

Cisco acquired Splunk for $28B and built a data empire on:

- **Per-GB pricing** - $150/GB/day for Splunk Cloud (indexed data)
- **Capacity licensing** - Or pay upfront for capacity that you might not use
- **SPL complexity** - Search Processing Language requires specialized skills
- **Hardware costs** - Self-hosted Splunk requires massive infrastructure
- **Add-on pricing** - SOAR, UBA, ITSI all extra
- **Retention costs** - Long-term data storage is expensive

100 GB/day? **$15,000/day**. That's **$5.5 million/year**. Just for logs.

## The Solution

**splunk.do** is Splunk reimagined:

```
Traditional Splunk              splunk.do
-----------------------------------------------------------------
$150/GB/day                    $0 - run your own
SPL expertise required         SPL + natural language
Massive infrastructure         Cloudflare Workers + R2
Retention extra                Unlimited retention (R2 storage)
SOAR/UBA premium               Included
Cisco lock-in                  Open source
```

## One-Click Deploy

```bash
npx create-dotdo splunk
```

Your own Splunk instance. Running on Cloudflare. Zero per-GB fees.

```typescript
import { Splunk } from 'splunk.do'

export default Splunk({
  name: 'acme-soc',
  domain: 'logs.acme.com',
  retention: {
    hot: '7d',
    warm: '30d',
    cold: '365d',
  },
})
```

## Features

### Log Ingestion

```typescript
// Ingest in plain English
await splunk`ingest nginx access_combined into main`
await splunk`stream cloudflare logs into web`
await splunk`tail /var/log/auth.log as linux:auth`

// AI infers what you need
await splunk`ingest these events`          // auto-detects format
await splunk`ingest from S3 bucket logs/`  // configures input
await splunk`ingest kafka events topic`    // sets up consumer
```

### Search

```typescript
// Just ask
await splunk`errors in checkout last hour`
await splunk`500 errors by endpoint today`
await splunk`slow queries over 500ms`

// AI generates SPL underneath
await splunk`errors in checkout` // -> index=main level=error source=checkout earliest=-1h
await splunk`top error sources`  // -> index=main level=error | stats count by source | sort -count
```

### Alerting

```typescript
// Natural as talking to a SOC analyst
await splunk`alert me when errors spike in production`
await splunk`page on-call if auth failures exceed 100/min`
await splunk`slack #security on brute force detection`

// Chain alerts into investigation
await splunk`failed logins > 10 per IP`
  .alert(`Brute force detected`)
  .block()   // auto-block the IP
```

### SPL Compatibility

Full SPL underneath - natural language generates it:

```typescript
// Your query
await splunk`errors in checkout last hour`

// Generated SPL
// index=main level=error source=checkout earliest=-1h

// Your query
await splunk`top 10 slowest endpoints today`

// Generated SPL
// index=main | stats avg(response_time) as avg_time by endpoint | sort -avg_time | head 10
```

All SPL commands work:

```spl
// Statistics
index=main | stats count, avg(response_time) by endpoint

// Time charts
index=main | timechart span=1h count by status

// Transactions
index=main | transaction session_id maxspan=30m

// Machine learning
index=main | fit DensityFunction response_time by endpoint
```

### Indexing

```typescript
// Create indexes naturally
await splunk`create index main frozen in 365d`
await splunk`create index security retention 90d`
await splunk`create index metrics with rollups hourly daily`

// Configure field extractions
await splunk`extract user_id from pattern user=(\w+)`
await splunk`extract duration_ms as number from duration=(\d+)ms`

// Source types are inferred
await splunk`ingest nginx`  // knows nginx format
await splunk`ingest json`   // knows JSON format
await splunk`ingest syslog` // knows syslog format
```

### Data Inputs

```typescript
// Just say where logs come from
await splunk`collect from HEC token abc123`
await splunk`collect from syslog port 514`
await splunk`collect from kafka brokers kafka:9092 topic logs`
await splunk`collect from S3 bucket my-logs prefix logs/`
await splunk`collect from cloudwatch log-group /aws/lambda/my-function`

// Forwarders
await splunk`forward /var/log/*.log to main`
await splunk`forward docker containers to containers index`
```

### Dashboards

```typescript
// Describe what you want to see
await splunk`dashboard security ops`
  .add(`critical alerts count`)
  .add(`security events over time`)
  .add(`attack sources on map`)
  .add(`recent alerts table`)
  .refresh(`5m`)

// Or one-liners
await splunk`dashboard api health: errors, latency p99, throughput`
await splunk`dashboard user activity: logins by hour, active users, failed attempts`
```

### Alerts

```typescript
// Natural alerting
await splunk`alert errors > 100 in 5 minutes email ops@company.com`
await splunk`alert brute force detected slack #security`
await splunk`alert payment failures page on-call`

// Chain detection into response
await splunk`failed logins > 10 from same IP`
  .alert(`Brute force detected`)
  .block()   // auto-block at firewall
  .notify()  // tell security team

// Correlation as a sentence
await splunk`alert failed login then successful from different IP`
  .severity(`high`)
  .investigate()  // open incident automatically
```

### Reports

```typescript
// Scheduled reports in plain English
await splunk`weekly security summary email security-team@company.com`
await splunk`daily error report to #engineering at 9am`
await splunk`monthly compliance export to S3 bucket reports/`

// Ad-hoc exports
await splunk`export last week errors as csv`
await splunk`export incidents since January as pdf`
```

## SIEM & Security

### Enterprise Security

```typescript
// Notable events - just describe the threat
await splunk`detect malware communication as critical`
await splunk`detect lateral movement as high severity`
await splunk`detect data exfiltration pattern`

// Risk scoring in plain English
await splunk`add risk 20 to users with 5+ failed logins`
await splunk`add risk 50 to IPs hitting honeypots`
await splunk`add risk 100 to known bad actors`

// Threat intelligence
await splunk`enrich firewall logs with threat intel`
await splunk`match traffic against IOC feeds`
await splunk`flag connections to known C2 servers`

// Investigation
await splunk`investigate IP 10.0.0.1 last 7 days`
  .expand(`dns, auth, proxy, firewall`)
  .timeline()
  .graph()
```

### User Behavior Analytics

```typescript
// Baseline in one line
await splunk`baseline user behavior over 30 days`

// Detect anomalies naturally
await splunk`anomalous user activity today`
await splunk`users behaving unusually this week`
await splunk`alice@company.com doing anything weird?`

// Threat models as sentences
await splunk`detect data exfiltration: downloads 5x normal, USB usage, after hours access`
await splunk`detect account takeover: login from new location then password change`
await splunk`detect insider threat: bulk file access before resignation`
```

### SOAR

```typescript
// Playbooks as workflows
await splunk`on phishing detected`
  .extract(`IOCs from email`)
  .check(`reputation via VirusTotal`)
  .block(`sender if malicious`)
  .notify(`SOC with ticket`)

// Response actions in natural language
await splunk`isolate host infected-laptop via CrowdStrike`
await splunk`block IP 1.2.3.4 at firewall`
await splunk`disable user alice@company.com`
await splunk`quarantine email from attacker@evil.com`

// Chain detection to response
await splunk`ransomware indicators detected`
  .isolate()      // contain the host
  .snapshot()     // preserve evidence
  .escalate()     // page security team
```

## AI-Native Features

### Natural Language Search

```typescript
// Just ask - no SPL required
await splunk`errors in the last hour`
await splunk`failed logins followed by success from different IP`
await splunk`top sources of 500 errors today`
await splunk`why is the API slow right now?`

// AI infers the right query
await splunk`errors in checkout`
// -> index=main level=error source=checkout

await splunk`users logging in from multiple countries`
// -> index=auth | iplocation src_ip | stats dc(Country) by user | where dc > 1
```

### SPL Assistant

```typescript
// Explain SPL in plain English
await splunk`explain: index=main | tstats count by _time span=1h | timewrap 1d`

// Optimize SPL automatically
await splunk`optimize: index=main | search status=500 | stats count`
// Returns: index=main status=500 | stats count
// "Moved filter before search for 10x speedup"

// Generate SPL from description
await splunk`SPL for: users with login from new device after password reset`
```

### Anomaly Detection

```typescript
// Detect anomalies naturally
await splunk`anomalies in API latency this week`
await splunk`unusual traffic patterns today`
await splunk`outliers in request volume by IP`

// Forecast
await splunk`predict error rate next 24 hours`
await splunk`forecast disk usage next week`

// Cluster similar events
await splunk`group similar error messages`
await splunk`cluster security events by pattern`
```

### AI Agents for Security

```typescript
import { tom, quinn } from 'agents.do'
import { splunk } from 'splunk.do'

// Chain investigation with agents
await splunk`security incident alert 12345`
  .map(events => tom`correlate and build attack timeline`)
  .map(timeline => tom`identify root cause and impact`)
  .map(analysis => quinn`validate findings and check for gaps`)

// Tune detection rules
await splunk`brute force detections last month`
  .map(detections => quinn`identify false positives`)
  .map(fps => tom`suggest rule improvements`)
```

## Architecture

### Durable Objects

```
 SplunkDO (config, users, roles, inputs)
   |
   +-- IndexerDO (hot storage, real-time search)
   |     |-- SQLite: Hot buckets (encrypted)
   |     +-- R2: Warm/Cold buckets (compressed)
   |
   +-- SearchHeadDO (distributed search, federation)
   |     |-- SQLite: Job state, saved searches
   |     +-- Query optimization
   |
   +-- ForwarderDO (collection, parsing)
   |     |-- SQLite: Input state, checkpoints
   |     +-- R2: Raw data staging
   |
   +-- AlertDO (detection, response)
         |-- SQLite: Alert state, throttling
         +-- Webhook integration
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Real-time, last 7 days | <10ms |
| **Warm** | R2 Standard | Historical, 30-90 days | <100ms |
| **Cold** | R2 IA | Compliance, 1+ years | <1s |

### Distributed Search

Queries automatically fan out and merge:

```typescript
// Your query
await splunk`errors in checkout last week`

// Under the hood
// SearchHead -> IndexerDO[US-East, US-West, EU-West]
// Parallel execution, results merge, dedupe, sort
```

## Data Onboarding

```bash
# Install forwarder
curl -sL https://splunk.do/forwarder | bash

# One-line setup
splunk forward /var/log/*.log to main at logs.acme.com
```

```typescript
// Or configure in code
await splunk`forward syslog port 514 to syslog index`
await splunk`forward kafka events topic to main`
await splunk`forward S3 bucket logs/ to archive`
```

## Migration from Splunk

### One-Line Migration

```bash
npx splunk-migrate from splunk.company.com
```

Migrates:
- Saved searches
- Dashboards
- Alerts
- Inputs configuration
- Field extractions

### SPL Compatibility

Full SPL command support. All existing queries work unchanged:

| Category | Commands |
|----------|----------|
| **Search** | search, where, regex, rex |
| **Stats** | stats, eventstats, streamstats, chart, timechart |
| **Transform** | top, rare, contingency, cluster |
| **Report** | table, fields, rename, convert |
| **Join** | join, append, union, multisearch |
| **ML** | anomalydetection, predict, fit |

### API Compatibility

All Splunk REST endpoints supported:

```
POST /services/search/jobs
GET  /services/search/jobs/{id}
POST /services/receivers/simple
POST /services/collector/event  (HEC)
GET  /services/data/indexes
```

## vs Splunk Enterprise / Splunk Cloud

| Feature | Splunk | splunk.do |
|---------|--------|-----------|
| **Pricing** | $150/GB/day | $0 - run your own |
| **Implementation** | Weeks to months | Deploy in minutes |
| **Annual Cost** | $5M+ at scale | ~$100/month |
| **Architecture** | On-prem/Cloud | Edge-native, global |
| **Query Language** | SPL only | SPL + natural language |
| **AI** | Splunk AI Assistant | AI-first design |
| **SIEM** | Enterprise Security ($$$) | Included |
| **SOAR** | Splunk SOAR ($$$) | Included |
| **UBA** | Splunk UBA ($$$) | Included |
| **Lock-in** | Cisco lock-in | MIT licensed |

## Use Cases

### Security Operations

```typescript
// SOC in a few lines
await splunk`detect threats across all sources`
await splunk`alert on brute force, malware, exfiltration`
await splunk`investigate incidents automatically`
  .correlate()
  .timeline()
  .respond()
```

### DevOps Observability

```typescript
// Full observability
await splunk`errors in production with stack traces`
await splunk`latency p99 by service`
await splunk`deployment impact on error rate`
```

### Compliance

```typescript
// Audit and retain
await splunk`retain security logs 7 years`
await splunk`export SOC 2 evidence for Q4`
await splunk`PCI audit trail for card transactions`
```

## Roadmap

### Core Platform
- [x] SPL search engine
- [x] Indexing and storage (hot/warm/cold)
- [x] Dashboards and visualizations
- [x] Alerting (scheduled + real-time)
- [x] Natural language search
- [x] HEC data collection
- [ ] Metrics store
- [ ] Trace ingestion

### Security
- [x] Enterprise Security (ES)
- [x] SOAR integration
- [x] User Behavior Analytics
- [ ] Threat intelligence platform
- [ ] Automated response actions
- [ ] Compliance reporting

### AI
- [x] Natural language queries
- [x] Anomaly detection
- [x] Agent integration
- [ ] Predictive alerting
- [ ] Automated investigation
- [ ] Root cause analysis

## Why Open Source?

### 1. Cost Liberation

$150/GB/day is a tax on observability. Open source means:
- Zero per-GB fees
- No capacity licensing
- No add-on pricing
- Run on your infrastructure

### 2. No Lock-in

Your logs, your SPL, your dashboards. Open source enables:
- Export everything, anytime
- Switch providers freely
- Customize without consultants
- Integrate with anything

### 3. AI Enablement

Closed platforms control your AI options. Open source means:
- Integrate any LLM
- Build custom detection
- Train on your data
- Natural language everything

### 4. Community Innovation

Security moves faster than vendor roadmaps. Open source enables:
- Detection rules from the community
- Shared threat intelligence
- Faster vulnerability response
- Collective defense

## Contributing

splunk.do is open source under the MIT license.

We especially welcome contributions from:
- Security engineers and SOC analysts
- DevOps and SRE teams
- Detection engineers
- Data engineers

```bash
git clone https://github.com/dotdo/splunk.do
cd splunk.do
pnpm install
pnpm test
```

## License

MIT License - Ingest everything. Search anything. Detect all threats.

---

<p align="center">
  <strong>The $28B acquisition ends here.</strong>
  <br />
  SPL-compatible. AI-native. Zero per-GB fees.
  <br /><br />
  <a href="https://splunk.do">Website</a> |
  <a href="https://docs.splunk.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/splunk.do">GitHub</a>
</p>
