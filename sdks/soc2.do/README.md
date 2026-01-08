# soc2.do - SOC 2 Compliance SDK

Strongly-typed SDK for the soc2.do compliance platform. Provides automated evidence collection, vendor risk assessment, control framework management, and audit support.

## Installation

```bash
npm install soc2.do
```

## Quick Start

```typescript
import { soc2 } from 'soc2.do'

// Assess vendor risk
const risk = await soc2.vendors.calculateRiskScore({
  id: 'vendor-1',
  name: 'AWS',
  dataAccess: 'sensitive',
  hasSoc2: true,
  lastAssessment: new Date('2025-06-01')
})

console.log(`Risk score: ${risk.overall}/100`)
console.log('Factors:', risk.factors)
```

## Features

### Vendor Risk Assessment

Comprehensive vendor risk management with automated scoring, SOC 2 report verification, security questionnaires, and continuous monitoring.

#### Risk Scoring

Calculate risk scores based on multiple factors:
- Data access level (none, limited, sensitive, critical)
- SOC 2 compliance status
- Assessment recency

```typescript
const score = await soc2.vendors.calculateRiskScore({
  id: 'vendor-1',
  name: 'Cloud Provider',
  dataAccess: 'sensitive',
  hasSoc2: true,
  lastAssessment: new Date('2025-06-01'),
  criticalityLevel: 'high'
})

// Returns: { overall: 30, factors: { dataAccess: 25, compliance: 5, assessmentRecency: 0 } }
```

#### SOC 2 Report Verification

Verify and track vendor SOC 2 reports:

```typescript
// Verify a SOC 2 report
const result = await soc2.vendors.verifyReport({
  vendorId: 'vendor-1',
  reportType: 'Type II',
  reportDate: new Date('2025-12-31'),
  auditPeriod: {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
  },
  auditor: 'Big Audit Firm',
  opinionType: 'unqualified',
  trustServiceCategories: ['Security', 'Availability', 'Confidentiality']
})

// Check report status
const status = await soc2.vendors.getReportStatus('vendor-1')
console.log('Has report:', status.hasReport)
console.log('Is expired:', status.isExpired)
```

#### Security Questionnaires

Create and manage vendor security questionnaires:

```typescript
// Create a questionnaire
const questionnaire = await soc2.vendors.createQuestionnaire({
  vendorId: 'vendor-1',
  template: 'standard',
  dueDate: new Date('2026-02-01')
})

// Submit responses
await soc2.vendors.submitResponses(questionnaire.id, [
  { questionId: 'q1', answer: 'Yes', evidence: 'policy-doc.pdf' },
  { questionId: 'q2', answer: 'No', explanation: 'Not applicable' }
])

// Check completeness
const completeness = await soc2.vendors.getQuestionnaireCompleteness(questionnaire.id)
console.log(`${completeness.percentage}% complete`)
```

#### Review Scheduling

Schedule periodic vendor reviews:

```typescript
// Schedule annual review
const schedule = await soc2.vendors.scheduleReview({
  vendorId: 'vendor-1',
  frequency: 'annual',
  nextReview: new Date('2026-06-01'),
  assignee: 'security-team@example.com'
})

// Get upcoming reviews
const reviews = await soc2.vendors.getUpcomingReviews({ daysAhead: 30 })
reviews.forEach(review => {
  console.log(`${review.vendorName}: due in ${review.daysUntilDue} days`)
})
```

#### Risk Mitigation

Track risk mitigation plans:

```typescript
// Create mitigation plan
const plan = await soc2.vendors.createMitigationPlan({
  vendorId: 'vendor-1',
  riskId: 'risk-1',
  description: 'Outdated encryption protocols',
  severity: 'high',
  mitigationSteps: [
    'Request TLS 1.3 upgrade timeline',
    'Set deadline for compliance',
    'Review alternative vendors'
  ],
  owner: 'security-lead@example.com',
  targetDate: new Date('2026-03-01')
})

// Track progress
const progress = await soc2.vendors.getMitigationProgress(plan.id)
console.log(`${progress.percentage}% complete`)

// Update status
await soc2.vendors.updateMitigationStatus(plan.id, {
  status: 'in-progress',
  completedSteps: ['step-1'],
  notes: 'Vendor has committed to upgrade by March'
})
```

#### Risk History

Track vendor risk over time:

```typescript
// Get risk history
const history = await soc2.vendors.getRiskHistory('vendor-1', {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
})

// Analyze trend
const trend = await soc2.vendors.getRiskTrend('vendor-1')
console.log(`Risk is ${trend.direction} by ${trend.changePercent}%`)

// Log events
await soc2.vendors.logRiskEvent({
  vendorId: 'vendor-1',
  eventType: 'assessment_completed',
  score: 45,
  notes: 'Annual review completed',
  assessedBy: 'reviewer@example.com'
})
```

#### Risk Alerts

Configure risk thresholds and alerts:

```typescript
// Set thresholds
await soc2.vendors.setRiskThreshold('vendor-1', {
  low: 30,
  medium: 60,
  high: 80,
  critical: 95
})

// Check threshold
const alert = await soc2.vendors.checkRiskThreshold({
  vendorId: 'vendor-1',
  currentScore: 85,
  threshold: 70
})

if (alert.triggered) {
  console.log(`Alert: ${alert.message} (severity: ${alert.severity})`)
}

// Get high-risk vendors
const highRisk = await soc2.vendors.getVendorsAboveThreshold(70)
highRisk.forEach(vendor => {
  console.log(`${vendor.name}: ${vendor.riskScore}/100`)
})
```

## Configuration

### API Key

For Workers, import `rpc.do/env` first to enable automatic API key resolution from environment variables:

```typescript
import 'rpc.do/env'
import { soc2 } from 'soc2.do'

// API key automatically resolved from SOC2_DO_API_KEY environment variable
```

For Node.js or custom configurations:

```typescript
import { SOC2 } from 'soc2.do'

const soc2 = SOC2({
  apiKey: process.env.SOC2_DO_API_KEY
})
```

## API Reference

### Vendor Risk Client

- `calculateRiskScore(vendor)` - Calculate vendor risk score
- `verifyReport(report)` - Verify SOC 2 report
- `getReportStatus(vendorId)` - Get report status
- `createQuestionnaire(options)` - Create security questionnaire
- `submitResponses(id, responses)` - Submit questionnaire responses
- `getQuestionnaireCompleteness(id)` - Get questionnaire completeness
- `scheduleReview(options)` - Schedule vendor review
- `getUpcomingReviews(options)` - Get upcoming reviews
- `createMitigationPlan(options)` - Create mitigation plan
- `getMitigationProgress(planId)` - Get mitigation progress
- `updateMitigationStatus(planId, update)` - Update mitigation status
- `getRiskHistory(vendorId, options)` - Get risk history
- `getRiskTrend(vendorId)` - Get risk trend
- `logRiskEvent(event)` - Log risk event
- `checkRiskThreshold(options)` - Check risk threshold
- `setRiskThreshold(vendorId, thresholds)` - Set risk thresholds
- `getLatestNotification(vendorId)` - Get latest notification
- `getVendorsAboveThreshold(threshold)` - Get high-risk vendors

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## License

MIT

## Links

- [Homepage](https://soc2.do)
- [Documentation](https://docs.soc2.do)
- [GitHub](https://github.com/dot-do/workers)
- [Issues](https://github.com/dot-do/workers/issues)
