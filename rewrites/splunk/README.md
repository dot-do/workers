# splunk.do

> The $28B log analytics giant. Now open source. AI-native.

Splunk dominates enterprise log analytics and SIEM. But at $150/GB/day for cloud, with SPL complexity requiring specialized engineers, and Cisco's acquisition promising even more enterprise pricing, it's time for a new approach.

**splunk.do** reimagines log analytics for the AI era. Full SPL compatibility. Unlimited data. Zero per-GB pricing.

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

## Log Analytics Without Limits

Ingest, search, and analyze unlimited log data:

```typescript
import { splunk } from 'splunk.do'

// Ingest logs
await splunk.ingest({
  source: 'nginx',
  sourcetype: 'access_combined',
  index: 'main',
  events: [
    { _raw: '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234' },
  ],
})

// Search with SPL
const results = await splunk.search({
  query: 'index=main sourcetype=access_combined status>=500 | stats count by status',
  earliest: '-24h',
  latest: 'now',
})

// Natural language search
const insights = await splunk`show me all errors in the last hour with their root causes`
```

## Features

### SPL (Search Processing Language)

Full SPL compatibility:

```spl
// Basic search
index=main sourcetype=access_combined status>=400

// Field extraction
index=main | rex field=_raw "user=(?<username>\w+)"

// Statistics
index=main | stats count, avg(response_time) by endpoint

// Time charts
index=main | timechart span=1h count by status

// Transactions
index=main | transaction session_id maxspan=30m

// Lookups
index=main | lookup users.csv user_id OUTPUT user_name, department

// Subsearches
index=main [search index=alerts level=critical | fields src_ip]

// Eval expressions
index=main | eval response_category=case(
    status<300, "success",
    status<400, "redirect",
    status<500, "client_error",
    true(), "server_error"
)

// Join
index=main | join user_id [search index=users | fields user_id, email]

// Machine learning (MLTK equivalent)
index=main | fit DensityFunction response_time by endpoint
```

### Indexing

High-performance log indexing:

```typescript
import { Index } from 'splunk.do/indexing'

// Create index with configuration
const mainIndex = Index({
  name: 'main',
  maxDataSize: 'auto',
  frozenTimePeriod: '365d',
  homePath: 'r2://indexes/main/hot',
  coldPath: 'r2://indexes/main/cold',
  frozenPath: 'r2://indexes/main/frozen',
})

// Configure field extractions
mainIndex.props({
  TRANSFORMS: [
    { regex: /user_id=(\w+)/, field: 'user_id' },
    { regex: /duration=(\d+)ms/, field: 'duration_ms', type: 'number' },
  ],
  TIME_FORMAT: '%Y-%m-%dT%H:%M:%S.%f%z',
  TZ: 'UTC',
})

// Source types
const nginxSourcetype = Sourcetype({
  name: 'nginx:access',
  EXTRACT: [
    { regex: /"(?<method>\w+)\s+(?<uri>[^\s]+)\s+(?<protocol>[^"]+)"/, format: 'fields' },
    { regex: /(?<status>\d{3})/, format: 'number' },
  ],
  TIME_PREFIX: '\\[',
  TIME_FORMAT: '%d/%b/%Y:%H:%M:%S %z',
})
```

### Data Inputs

Multiple ingestion methods:

```typescript
import { Inputs } from 'splunk.do/inputs'

// HTTP Event Collector (HEC)
const hec = Inputs.hec({
  token: 'your-token',
  ssl: true,
  acknowledgement: true,
})

// Send events via HEC
await hec.send({
  event: { message: 'User logged in', user: 'alice' },
  sourcetype: 'app:auth',
  index: 'main',
})

// Syslog
const syslog = Inputs.syslog({
  port: 514,
  protocol: 'tcp',
  sourcetype: 'syslog',
})

// File monitoring (via forwarder)
const files = Inputs.monitor({
  path: '/var/log/*.log',
  sourcetype: 'linux:syslog',
  recursive: true,
})

// Kafka integration
const kafka = Inputs.kafka({
  brokers: ['kafka:9092'],
  topics: ['logs', 'events'],
  consumerGroup: 'splunk-consumer',
})

// AWS (S3, CloudWatch, etc.)
const s3 = Inputs.s3({
  bucket: 'my-logs-bucket',
  region: 'us-east-1',
  prefix: 'logs/',
  sourcetype: 'aws:s3:accesslogs',
})
```

### Dashboards

Build operational dashboards:

```typescript
import { Dashboard, Panel } from 'splunk.do/dashboard'

const securityDashboard = Dashboard({
  title: 'Security Operations Center',
  refresh: '5m',
  panels: [
    Panel.singleValue({
      title: 'Critical Alerts',
      search: 'index=alerts level=critical | stats count',
      colorBy: 'value',
      thresholds: { warn: 10, critical: 50 },
    }),
    Panel.timechart({
      title: 'Security Events Over Time',
      search: 'index=security | timechart span=1h count by event_type',
      stackMode: 'stacked',
    }),
    Panel.map({
      title: 'Attack Sources',
      search: 'index=security event_type=attack | iplocation src_ip | geostats count by Country',
    }),
    Panel.table({
      title: 'Recent Alerts',
      search: 'index=alerts | head 100 | table _time, level, message, src_ip',
      drilldown: {
        search: 'index=alerts src_ip=$row.src_ip$',
      },
    }),
    Panel.choropleth({
      title: 'Events by Country',
      search: 'index=security | iplocation src_ip | stats count by Country',
    }),
  ],
  inputs: [
    { type: 'time', token: 'time', default: '-24h' },
    { type: 'dropdown', token: 'severity', options: ['critical', 'high', 'medium', 'low'] },
  ],
})
```

### Alerts

Proactive monitoring:

```typescript
import { Alert } from 'splunk.do/alerts'

// Scheduled alert
const errorSpike = Alert({
  name: 'Error Rate Spike',
  search: 'index=main level=error | stats count | where count > 100',
  schedule: '*/5 * * * *',
  trigger: {
    condition: 'number of results > 0',
    throttle: '10m',
  },
  actions: [
    { type: 'email', to: 'ops@company.com' },
    { type: 'slack', channel: '#alerts' },
    { type: 'webhook', url: 'https://api.pagerduty.com/events' },
  ],
})

// Real-time alert
const securityAlert = Alert({
  name: 'Brute Force Detection',
  search: 'index=auth event_type=login_failed | stats count by src_ip | where count > 10',
  type: 'realtime',
  window: '5m',
  trigger: {
    condition: 'number of results > 0',
  },
  actions: [
    { type: 'notable', severity: 'high' },
    { type: 'risk', score: 50, object: 'src_ip' },
  ],
})

// Correlation search
const correlationAlert = Alert({
  name: 'Multi-Stage Attack',
  search: `
    | from datamodel:Network_Traffic
    | tstats count from datamodel:Authentication where Authentication.action=failure
    | join src_ip [| from datamodel:Malware]
  `,
  trigger: {
    condition: 'number of results > 0',
  },
})
```

### Reports

Scheduled reports and exports:

```typescript
import { Report } from 'splunk.do/reports'

const weeklyReport = Report({
  name: 'Weekly Security Summary',
  search: `
    index=security earliest=-7d
    | stats count by event_type, severity
    | sort -count
  `,
  schedule: '0 9 * * MON',
  export: {
    format: 'pdf',
    recipients: ['security-team@company.com'],
    subject: 'Weekly Security Report - ${now}',
  },
})

// Pivot reports
const pivotReport = Report({
  name: 'Traffic Analysis',
  datamodel: 'Network_Traffic',
  pivot: {
    rows: ['src_ip', 'dest_port'],
    columns: ['action'],
    values: [{ field: 'bytes', aggregation: 'sum' }],
  },
})
```

## SIEM & Security

### Enterprise Security

Full SIEM capabilities:

```typescript
import { ES } from 'splunk.do/security'

// Notable events
const notable = ES.notable({
  search: 'index=proxy dest_category=malware',
  severity: 'critical',
  rule_name: 'Malware Communication Detected',
  drilldown: 'index=proxy src_ip=$src_ip$ earliest=-24h',
})

// Risk scoring
const riskRule = ES.risk({
  search: 'index=auth event_type=login_failed | stats count by user | where count > 5',
  risk_object_field: 'user',
  risk_object_type: 'user',
  risk_score: 20,
  risk_message: 'Multiple failed logins for user $user$',
})

// Threat intelligence
const threatIntel = ES.threatIntel({
  search: 'index=firewall | lookup threat_intel.csv dest_ip OUTPUT threat_type, confidence',
  feed: 'custom_threat_feed',
})

// Investigation workbench
const investigation = await ES.investigate({
  startingPoint: { type: 'ip', value: '10.0.0.1' },
  timeRange: '-7d',
  expand: ['dns', 'auth', 'proxy', 'firewall'],
})
```

### User Behavior Analytics (UBA)

Detect anomalous behavior:

```typescript
import { UBA } from 'splunk.do/uba'

// Baseline user behavior
await UBA.baseline({
  entity: 'user',
  activities: ['login', 'file_access', 'email_send', 'web_browse'],
  timeframe: '30d',
})

// Detect anomalies
const anomalies = await UBA.detect({
  entity: 'user',
  sensitivity: 'medium',
  timeRange: '-24h',
})

for (const anomaly of anomalies) {
  console.log(anomaly.entity)      // 'alice@company.com'
  console.log(anomaly.activity)    // 'file_access'
  console.log(anomaly.deviation)   // 3.5 standard deviations
  console.log(anomaly.explanation) // 'Accessed 10x more files than usual'
}

// Threat models
const insiderThreat = UBA.threatModel({
  name: 'Data Exfiltration',
  indicators: [
    { activity: 'file_download', threshold: '5x baseline' },
    { activity: 'usb_insert', weight: 2 },
    { activity: 'after_hours_access', weight: 1.5 },
  ],
  threshold: 75,
})
```

### SOAR Integration

Security orchestration and response:

```typescript
import { SOAR } from 'splunk.do/soar'

// Playbook
const phishingPlaybook = SOAR.playbook({
  name: 'Phishing Response',
  trigger: {
    type: 'notable',
    rule: 'Phishing Email Detected',
  },
  steps: [
    {
      name: 'Extract Indicators',
      action: 'extract_iocs',
      input: { email: '$notable.email$' },
    },
    {
      name: 'Check Reputation',
      action: 'virustotal_lookup',
      input: { url: '$indicators.urls$' },
    },
    {
      name: 'Block Sender',
      action: 'block_email_sender',
      condition: '$reputation.malicious$',
      input: { sender: '$notable.sender$' },
    },
    {
      name: 'Notify SOC',
      action: 'create_ticket',
      input: {
        title: 'Phishing Incident - $notable.subject$',
        severity: '$notable.severity$',
      },
    },
  ],
})

// Custom actions
SOAR.action({
  name: 'isolate_host',
  parameters: ['hostname'],
  script: async ({ hostname }) => {
    await crowdstrike.containHost(hostname)
    return { status: 'isolated', hostname }
  },
})
```

## AI-Native Features

### Natural Language Search

Skip SPL complexity:

```typescript
import { ask } from 'splunk.do'

// Simple questions
const q1 = await ask('show me all errors in the last hour')
// Generates: index=main level=error earliest=-1h

// Complex queries
const q2 = await ask('find all failed logins followed by successful login from different IP')
// Generates: complex transaction/correlation SPL

// Analytical questions
const q3 = await ask('what are the top sources of 500 errors today?')
// Generates: index=main status=500 | stats count by source | sort -count | head 10

// Diagnostic questions
const q4 = await ask('why is the API slow right now?')
// Returns: analysis with correlated logs, traces, and metrics
```

### SPL Assistant

AI helps write and optimize SPL:

```typescript
import { spl } from 'splunk.do'

// Generate SPL from description
const query = await spl.generate({
  description: 'Find users who logged in from multiple countries in the last 24 hours',
  index: 'auth',
})
// Returns: index=auth event_type=login | iplocation src_ip | stats dc(Country) as countries values(Country) by user | where countries > 1

// Optimize existing SPL
const optimized = await spl.optimize({
  query: 'index=main | search status=500 | stats count by endpoint',
})
// Returns: index=main status=500 | stats count by endpoint
// Explanation: "Moved status filter before search command for better performance"

// Explain SPL
const explanation = await spl.explain({
  query: 'index=main | tstats count where index=main by _time span=1h | timewrap 1d',
})
// Returns: detailed explanation of each command
```

### Anomaly Detection

AI-powered anomaly detection:

```typescript
import { ML } from 'splunk.do/ml'

// Anomaly detection
const anomalies = await ML.detectAnomalies({
  search: 'index=main | timechart span=1h count by endpoint',
  sensitivity: 0.8,
  timeRange: '-7d',
})

// Forecasting
const forecast = await ML.forecast({
  search: 'index=main | timechart span=1h count',
  horizon: '24h',
  confidence: 0.95,
})

// Clustering
const clusters = await ML.cluster({
  search: 'index=main level=error | table message',
  algorithm: 'kmeans',
  k: 10,
})
// Groups similar error messages together

// Outlier detection
const outliers = await ML.outliers({
  search: 'index=main | stats count by src_ip',
  field: 'count',
  method: 'mad', // median absolute deviation
})
```

### AI Agents for Security

AI agents for SOC operations:

```typescript
import { tom, quinn } from 'agents.do'
import { splunk } from 'splunk.do'

// Tech lead investigates incident
const investigation = await tom`
  investigate the security incident from alert ID 12345
  correlate all related events and identify attack timeline
`

// QA validates detection rules
const validation = await quinn`
  test the brute force detection rule against last month's data
  identify false positives and suggest tuning
`
```

## Architecture

### Indexing Pipeline

```
Log Sources  -->  Universal Forwarder  -->  Heavy Forwarder  -->  Indexer
                         |                        |                  |
                    Raw Data              Parsing/Routing        Indexing
                    Compression           Field Extraction      Storage
```

### Durable Objects

```
                    +------------------------+
                    |   splunk.do Worker     |
                    |   (API + Search Head)  |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | IndexerDO        | | SearchHeadDO     | | ForwarderDO      |
    | (Index + Search) | | (Distributed)    | | (Collection)     |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       |     R2    |        | Analytics  |
    | (Meta)   |       | (Buckets) |        | Engine     |
    +----------+       +-----------+        +------------+
```

### Storage Tiers

Splunk's bucket-based storage model:

```
Hot Buckets (SQLite)      Warm Buckets (R2)      Cold Buckets (R2 IA)
     |                          |                       |
Real-time search         Recent historical         Long-term archive
High write rate          Read-optimized            Cost-optimized
Edge locations           Regional R2               Archive R2
```

### Distributed Search

```typescript
// Search head distributes to indexers
SearchHead
    |
    +-- IndexerDO[0] (US-East)
    +-- IndexerDO[1] (US-West)
    +-- IndexerDO[2] (EU-West)
    |
Merge Results
    |
Return to Client
```

## Data Onboarding

### Universal Forwarder

```bash
# Install forwarder
curl -sL https://splunk.do/forwarder | bash

# Configure outputs
splunk set deploy-poll your-org.splunk.do:8089

# Add inputs
splunk add monitor /var/log/syslog -sourcetype syslog
splunk add monitor /var/log/nginx/*.log -sourcetype nginx
```

### Heavy Forwarder

For parsing and routing:

```typescript
// Heavy forwarder configuration
HeavyForwarder({
  inputs: [
    { type: 'tcp', port: 514, sourcetype: 'syslog' },
    { type: 'udp', port: 514, sourcetype: 'syslog' },
  ],
  outputs: [
    { server: 'indexer1.splunk.do:9997' },
    { server: 'indexer2.splunk.do:9997' },
  ],
  routing: {
    'sourcetype=syslog': 'index=syslog',
    'sourcetype=nginx': 'index=web',
    'default': 'index=main',
  },
})
```

## Migration from Splunk

### SPL Compatibility

Full SPL command support:

```
Category               Commands
-----------------------------------------------------------------
Search                 search, where, regex, rex
Stats                  stats, eventstats, streamstats, chart, timechart
Transforming           top, rare, contingency, cluster
Reporting              table, fields, rename, convert
Join                   join, append, union, multisearch
Transaction            transaction, associate
Machine Learning       anomalydetection, predict, fit
```

### Configuration Migration

```bash
# Export Splunk configuration
splunk export server-config --output ./config

# Import to splunk.do
npx splunk-migrate import ./config

# Migrate saved searches
npx splunk-migrate searches --source splunk.company.com

# Migrate dashboards
npx splunk-migrate dashboards --source splunk.company.com
```

### API Compatibility

```
Endpoint                        Status
-----------------------------------------------------------------
POST /services/search/jobs      Supported
GET  /services/search/jobs/{id} Supported
POST /services/receivers/simple Supported
POST /services/collector/event  Supported (HEC)
GET  /services/data/indexes     Supported
```

## Roadmap

- [x] SPL search engine
- [x] Indexing and storage
- [x] Dashboards and visualizations
- [x] Alerting
- [x] Natural language search
- [x] HEC data collection
- [ ] Enterprise Security (ES)
- [ ] SOAR integration
- [ ] User Behavior Analytics
- [ ] ITSI
- [ ] Data models
- [ ] Pivot

## Why Open Source?

Log analytics shouldn't cost $5M/year:

1. **Your logs** - Machine data is critical operational intelligence
2. **Your searches** - SPL knowledge shouldn't be vendor-locked
3. **Your security** - SIEM capabilities shouldn't require enterprise pricing
4. **Your retention** - Historical data shouldn't cost per-GB forever

Splunk showed the world what log analytics could be. **splunk.do** makes it accessible to everyone.

## License

MIT License - Ingest everything. Search anything. Detect all threats.

---

<p align="center">
  <strong>splunk.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://splunk.do">Website</a> | <a href="https://docs.splunk.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
