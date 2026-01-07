# veeva.do

> Life Sciences CRM + Vault. AI-native. Open source.

Veeva built a $50B+ empire on pharma's regulatory burden. 21 CFR Part 11 compliance, medical affairs CRM, clinical trial management - all wrapped in per-seat pricing that makes Salesforce look cheap.

**veeva.do** is the open-source alternative. Deploy your own compliant life sciences platform. AI-native from day one. Audit-ready out of the box.

## AI-Native API

```typescript
import { veeva, vault, tom, priya, quinn, ada } from 'veeva.do'

// Natural language Vault queries
const pending = await veeva`documents pending QA review`
const trials = await veeva`active Phase 3 trials for ${compound}`
const deviations = await veeva`protocol deviations in ${study} last 30 days`

// Promise pipelining for regulatory workflows - one network round trip
const submitted = await vault.documents.create({
  name: 'Protocol Amendment 3',
  type: 'Clinical Protocol',
  study: studyId,
  file: protocolPdf,
})
  .map(doc => tom`review for 21 CFR Part 11 compliance`)
  .map(doc => priya`check regulatory alignment`)
  .map(doc => quinn`verify test coverage`)
  .map(doc => vault`route for e-signature`)

// VQL with AI interpretation
const results = await veeva`
  SELECT name, version, lifecycle_status
  FROM documents
  WHERE lifecycle_status = 'approved'
  AND study = '${studyId}'
`.map(docs => ada`summarize regulatory status`)

// Clinical workflow with parallel review
const safetyReport = await veeva`find overdue safety reports for ${study}`
  .map(report => veeva`generate CIOMS narrative for ${report}`)
  .map(narrative => [priya, tom, quinn].map(r => r`review ${narrative}`))
  .map(approved => vault`submit to regulatory authority`)
```

### VQL (Vault Query Language)

Native VQL support for complex document queries:

```typescript
import { vql } from 'veeva.do'

// Type-safe VQL queries
const approved = await vql`
  SELECT id, name, version, created_date
  FROM documents
  WHERE lifecycle_status = 'approved'
  AND study__v = '${studyId}'
  ORDER BY created_date DESC
  LIMIT 50
`

// Cross-object queries
const submissionDocs = await vql`
  SELECT d.name, d.version, s.sequence_number
  FROM documents d
  JOIN submission_documents sd ON d.id = sd.document_id
  JOIN submissions s ON sd.submission_id = s.id
  WHERE s.application_number = '${ndaNumber}'
`

// AI-enhanced VQL with natural language fallback
const results = await veeva`
  find all stability protocols approved in 2024
  for products in ${therapeuticArea}
`
// Translates to VQL, executes, returns structured results
```

### Binders

Document collections with lifecycle management:

```typescript
import { vault } from 'veeva.do'

// Create regulatory binder
const binder = await vault.binders.create({
  name: 'NDA-123456 Submission Package',
  type: 'regulatory_submission',
  template: 'ectd_v4',
  study: studyId,
})

// Add documents to binder sections
await binder
  .section('m2.5', 'Clinical Overview')
  .add('DOC-001', 'DOC-002', 'DOC-003')

await binder
  .section('m2.7.4', 'Summary of Clinical Safety')
  .add(await veeva`safety documents for ${studyId}`)

// Binder workflows with pipelining
const published = await binder
  .map(b => tom`review completeness`)
  .map(b => priya`verify CTD structure`)
  .map(b => vault`publish as ${binder.name} v1.0`)

// Query binder contents
const contents = await vql`
  SELECT section, document_name, status
  FROM binder_contents
  WHERE binder_id = '${binder.id}'
  ORDER BY section
`
```

## The workers.do Way

You're a clinical operations lead who needs to move fast but can't afford compliance mistakes. Every day you juggle trial data, regulatory submissions, and medical affairs - while Veeva charges you per seat to access your own data.

**workers.do** gives you AI agents that speak life sciences:

```typescript
import { veeva, vault, priya, tom, quinn, ada } from 'veeva.do'

// Natural language for clinical operations
const trials = await veeva`active Phase 3 trials for ${compound}`
const pending = await vault`documents pending QA review`
const submissions = await veeva`pending eCTD documents for ${nda}`

// AI agents that understand 21 CFR Part 11
await priya`review FDA feedback on ${submission} and prioritize responses`
await tom`audit trail analysis for ${document} - flag compliance gaps`
await quinn`verify validation status of ${system}`
```

Promise pipelining for complex workflows - one network round trip:

```typescript
// Trial monitoring to regulatory submission
const submitted = await veeva`overdue safety reports for ${study}`
  .map(report => veeva`generate CIOMS narrative for ${report}`)
  .map(narrative => [tom, priya].map(r => r`review ${narrative}`))
  .map(narrative => veeva`attach to eCTD section 2.7.4`)
  .map(section => ada`notify regulatory team about ${section}`)
```

## The Problem

Life sciences companies are trapped:

- **$500-1000+ per user/month** - Veeva CRM + Vault costs more than any other vertical SaaS
- **Regulatory captivity** - 21 CFR Part 11 compliance creates massive switching costs
- **Validation tax** - Every change requires IQ/OQ/PQ cycles costing $50K-500K
- **AI as premium upsell** - "Veeva CRM AI" and "Vault AI" are additional SKUs
- **Vendor concentration risk** - One company controls your entire regulated operation

A 500-person pharma company? **$6M+ annually** for Veeva. And you still need consultants.

The irony: Veeva started as "Salesforce for life sciences." Now it's more expensive than building custom software - except FDA validation makes custom impossible.

## The Solution

**veeva.do** breaks the captivity:

```
Veeva                           veeva.do
-----------------------------------------------------------------
$500-1000+/user/month           $0 - run your own
Validation nightmare            Pre-validated, open audit trail
AI as premium upsell            AI-native from day one
Their cloud, their terms        Your infrastructure, your control
Proprietary integrations        Open APIs, MCP tools
Implementation: 12-24 months    Deploy in hours
```

## One-Click Deploy

```bash
npx create-dotdo veeva
```

That's it. A 21 CFR Part 11 compliant life sciences platform. Running on your infrastructure.

Or deploy with full customization:

```bash
git clone https://github.com/dotdo/veeva.do
cd veeva.do
npm install
npm run deploy
```

## Features

### Veeva CRM Compatible

Full medical affairs and commercial CRM with natural language:

```typescript
import { crm, ada, tom, mark } from 'veeva.do'

// Natural language HCP engagement
const hcps = await crm`oncologists in ${territory} interested in immunotherapy`
const kols = await crm`key opinion leaders for ${therapeuticArea}`

// MSL call with AI follow-up
const call = await crm.calls.create({
  account: 'DR-0012345',
  type: 'MSL',
  products: ['PRODUCT-A'],
  outcome: 'Requested Phase 3 data',
})
  .map(call => ada`draft follow-up email with clinical data`)
  .map(email => tom`review for compliance`)
  .map(email => mark`schedule send for ${call.account}`)

// Territory insights with pipelining
const insights = await crm`accounts in ${territory}`
  .map(accounts => ada`analyze engagement patterns`)
  .map(patterns => ada`recommend call priorities for next week`)
```

### Account Management

HCPs, HCOs, affiliations - the complex web of healthcare relationships:

```typescript
// Healthcare Provider
const hcp = await crm.accounts.create({
  type: 'HCP',
  firstName: 'Sarah',
  lastName: 'Chen',
  credentials: ['MD', 'PhD'],
  specialty: 'Oncology',
  npi: '1234567890',
  stateLicenses: [
    { state: 'CA', number: 'A12345', expiry: '2026-12-31' },
    { state: 'NY', number: 'B67890', expiry: '2027-06-30' },
  ],
  affiliations: [
    { hco: 'HCO-001', role: 'Attending Physician' },
    { hco: 'HCO-002', role: 'Clinical Researcher' },
  ],
})

// Healthcare Organization
await crm.accounts.create({
  type: 'HCO',
  name: 'Memorial Cancer Center',
  class: 'Hospital',
  beds: 450,
  address: { /* ... */ },
  parentOrg: 'HCO-000', // Health system parent
})
```

### Territory Management

Alignments that actually work:

```typescript
await crm.territories.define({
  name: 'West Region - Oncology',
  geography: ['CA', 'OR', 'WA', 'NV', 'AZ'],
  specialty: 'Oncology',
  productTeam: 'PRODUCT-A',
  accounts: await crm.accounts.query({
    type: 'HCP',
    specialty: 'Oncology',
    state: { in: ['CA', 'OR', 'WA', 'NV', 'AZ'] },
  }),
})

// Territory changes with effective dating
await crm.territories.realign({
  effectiveDate: '2025-07-01',
  changes: [
    { account: 'HCP-001', from: 'territory-a', to: 'territory-b' },
    { account: 'HCP-002', from: 'territory-b', to: 'territory-c' },
  ],
  reason: 'Q3 Realignment',
})
```

### Sample Management

DEA-compliant controlled substance tracking:

```typescript
// Receive samples from distribution
await crm.samples.receive({
  shipment: 'SHIP-2025-001',
  items: [
    { product: 'PRODUCT-A', lot: 'LOT-001', quantity: 100, expiry: '2026-06-01' },
    { product: 'PRODUCT-B', lot: 'LOT-002', quantity: 50, expiry: '2026-03-01' },
  ],
  rep: 'REP-001',
  receivedAt: new Date(),
})

// Dispense with signature capture
await crm.samples.dispense({
  rep: 'REP-001',
  hcp: 'HCP-001',
  items: [{ product: 'PRODUCT-A', lot: 'LOT-001', quantity: 5 }],
  signature: {
    captured: signatureBlob,
    timestamp: new Date(),
    deviceId: 'IPAD-001',
    geoLocation: { lat: 37.7749, lng: -122.4194 },
  },
})

// Reconciliation
const inventory = await crm.samples.reconcile('REP-001')
// Returns: { onHand: [...], dispensed: [...], expired: [...], lost: [...] }
```

### CLM (Closed Loop Marketing)

Approved content, tracked engagement:

```typescript
// Present approved content
await crm.clm.present({
  call: 'CALL-001',
  presentation: 'PRES-2025-Q1-ONCOLOGY',
  slides: [
    { id: 'slide-1', viewedSeconds: 45 },
    { id: 'slide-2', viewedSeconds: 120, interactions: ['expand-chart'] },
    { id: 'slide-3', skipped: true },
  ],
  hcpReaction: 'Interested in Phase 3 data',
})

// Track content effectiveness
const analytics = await crm.clm.analytics({
  presentation: 'PRES-2025-Q1-ONCOLOGY',
  metrics: ['viewTime', 'completion', 'hcpEngagement'],
  groupBy: 'slide',
})
```

## Vault Compatible

Document management with 21 CFR Part 11 compliance built in:

### Document Lifecycle

```typescript
import { vault, tom, priya, quinn } from 'veeva.do'

// Full document lifecycle with pipelining
const approved = await vault.documents.create({
  name: 'Protocol Amendment 3',
  type: 'Clinical Protocol',
  study: 'STUDY-001',
  phase: 'Phase 3',
  file: protocolPdf,
})
  .map(doc => tom`review for regulatory compliance`)
  .map(doc => priya`verify alignment with study objectives`)
  .map(doc => quinn`check formatting and cross-references`)
  .map(doc => vault.workflow('review_and_approve', {
    reviewers: [tom, priya],
    approvers: [cmo],
    dueDate: '2025-02-15',
  }))
  .map(doc => vault.sign({
    meaning: 'I approve this document for use in clinical trials',
  }))

// Natural language document queries
const protocols = await vault`active protocols for ${study}`
const pending = await vault`documents awaiting my signature`
const expired = await vault`documents expiring in the next 30 days`
```

### Audit Trail

Every action is logged, immutably:

```typescript
const history = await vault.audit.query({
  document: 'DOC-001',
  from: '2024-01-01',
})

// Returns complete history:
// [
//   { timestamp: '2024-01-15T10:00:00Z', action: 'Create', user: 'user-001', ... },
//   { timestamp: '2024-01-16T14:30:00Z', action: 'CheckOut', user: 'user-002', ... },
//   { timestamp: '2024-01-16T16:45:00Z', action: 'CheckIn', user: 'user-002', version: '0.2', ... },
//   { timestamp: '2024-01-20T09:00:00Z', action: 'eSignature', user: 'user-003', meaning: '...', ... },
// ]
```

### Regulatory Submissions

eCTD-ready document management with pipelining:

```typescript
import { vault, priya, tom, ada } from 'veeva.do'

// Build and validate submission in one pipeline
const submitted = await vault.submissions.create({
  type: 'NDA',
  application: 'NDA-123456',
  sequence: '0001',
  region: 'US',
})
  .map(sub => vault`add CTD section 2.5 documents for ${sub}`)
  .map(sub => vault`add CTD section 2.7.4 documents for ${sub}`)
  .map(sub => tom`validate eCTD structure`)
  .map(sub => priya`verify regulatory requirements`)
  .map(sub => vault.compile({ format: 'eCTD 4.0' }))

// Natural language submission queries
const gaps = await vault`missing documents for NDA-123456 by CTD section`
const timeline = await vault`submission timeline risks for ${nda}`

// AI-assisted submission planning
const plan = await priya`
  We're planning to submit ${nda} in Q3 2025.
  Identify missing documents, needed updates, and timeline risks.
`.map(analysis => ada`generate project timeline with milestones`)
```

### Quality Management

CAPA, deviations, change control with AI-assisted root cause analysis:

```typescript
import { vault, quinn, tom, ada } from 'veeva.do'

// Deviation with AI-assisted investigation
const resolved = await vault.quality.deviation({
  type: 'Manufacturing',
  description: 'Batch temperature exceeded limit by 2C for 15 minutes',
  batch: 'BATCH-2025-001',
})
  .map(dev => quinn`investigate root cause`)
  .map(dev => ada`analyze similar historical deviations`)
  .map(dev => tom`recommend corrective actions`)
  .map(dev => vault.quality.capa({
    deviation: dev.id,
    correctiveActions: dev.recommendations.corrective,
    preventiveActions: dev.recommendations.preventive,
  }))

// Natural language quality queries
const open = await vault`open deviations for ${facility}`
const trending = await vault`deviation trends by category last 6 months`
const overdue = await vault`overdue CAPA actions`

// Proactive quality monitoring
await quinn`
  monitor batch records for ${productLine}
  flag any patterns that might indicate quality issues
`.map(alerts => ada`prioritize by risk level`)
```

## 21 CFR Part 11 Compliance

Built for FDA compliance from the ground up:

### Electronic Signatures

```typescript
await vault.config.part11({
  signatures: {
    // Signature manifestations
    includeDate: true,
    includeMeaning: true,
    includeUsername: true,

    // Authentication
    requireReAuthentication: true,
    authenticationMethod: 'username_password', // or 'certificate', 'biometric'
    sessionTimeout: 300, // 5 minutes

    // Non-repudiation
    linkToRecord: true,
    preventAlteration: true,
  },

  auditTrail: {
    // All changes recorded
    captureFields: 'all',
    captureUser: true,
    captureTimestamp: true,
    captureReason: true, // Reason for change

    // Tamper-evident
    hashChain: true,
    immutable: true,
  },

  accessControl: {
    roleBasedAccess: true,
    uniqueUserIds: true,
    passwordPolicy: {
      minLength: 12,
      complexity: true,
      expiry: 90,
      history: 12,
    },
  },
})
```

### Computer System Validation

Pre-validated with documentation:

```typescript
// Generate validation package
const validation = await vault.validation.generate({
  system: 'veeva.do',
  version: '1.0.0',
  includes: [
    'User Requirements Specification (URS)',
    'Functional Requirements Specification (FRS)',
    'Design Specification (DS)',
    'Installation Qualification (IQ)',
    'Operational Qualification (OQ)',
    'Performance Qualification (PQ)',
    'Traceability Matrix',
    'Test Scripts',
    'Test Results',
  ],
})

// Your validation team reviews and approves
// Saves $50K-500K vs custom validation
```

## AI-Native

AI agents that understand life sciences, 21 CFR Part 11, and regulatory workflows:

```typescript
import { veeva, vault, crm, ada, priya, tom, quinn, ralph } from 'veeva.do'

// Medical Affairs - Information requests with compliance review
const response = await ada`
  Dr. Chen asked about ${product} efficacy in elderly patients
`.map(draft => tom`review for off-label compliance`)
  .map(response => crm`log medical inquiry response to ${hcp}`)

// Clinical Operations - Deviation detection and resolution
const deviations = await ralph`
  review clinical database for ${study}
  identify protocol deviations in last 30 days
`.map(findings => quinn`assess impact and severity`)
  .map(assessed => vault`create deviation records`)

// Regulatory Affairs - Submission with parallel review
const submitted = await priya`
  FDA sent CMC questions for ${nda}
  draft responses based on stability data
`.map(draft => [tom, quinn].map(r => r`review ${draft}`))
  .map(response => vault`attach to submission ${nda}`)

// Document comparison with AI interpretation
const changes = await vault`compare ${protocol} v3.0 with v2.0`
  .map(diff => priya`flag changes requiring IRB notification`)
  .map(flags => ada`draft re-consent notifications if needed`)

// Literature surveillance
await ada`
  monitor PubMed for publications about ${product}
  flag competitive or safety implications
`.map(alerts => priya`assess regulatory impact`)
```

### MCP Tools

AI assistants interact directly through the Model Context Protocol:

```typescript
// Every operation is an MCP tool
veeva`documents pending review`       // Natural language query
vault.documents.create(doc)           // Structured creation
crm.calls.create(call)                // CRM operations
vault.quality.deviation(data)         // Quality management
vault.submissions.compile(sub)        // Regulatory submissions
```

## Architecture

### Multi-Tenant Isolation

Each customer gets complete isolation:

```
customer-a.veeva.do     <- Pharma Company A
customer-b.veeva.do     <- Biotech Company B
customer-c.veeva.do     <- Medical Device Co C
```

Data never comingles. Audit trails are separate. Validation is independent.

### Durable Object Architecture

```
OrgDO (tenant metadata, users, permissions)
  |
  +-- CrmDO (accounts, calls, territory, samples)
  |     |-- SQLite: Hot data (last 2 years)
  |     +-- R2: Archive (full history)
  |
  +-- VaultDO (documents, workflows, audit)
  |     |-- SQLite: Metadata, audit trail
  |     +-- R2: Document storage (versioned)
  |
  +-- QualityDO (deviations, CAPA, change control)
  |     |-- SQLite: Active records
  |     +-- R2: Closed records (retention)
  |
  +-- ClinicalDO (studies, sites, subjects)
        |-- SQLite: Active trials
        +-- R2: Completed trials (archival)
```

### Compliance Architecture

```
Write Path (all mutations):
  |
  +-- Authentication (verify user identity)
  +-- Authorization (check permissions)
  +-- Validation (business rules)
  +-- Audit Log (immutable append)
  +-- Hash Chain (tamper evidence)
  +-- Persistence (SQLite + R2)
  +-- Replication (disaster recovery)

Read Path:
  |
  +-- Authentication
  +-- Authorization
  +-- Query (SQLite)
  +-- Audit Log (record access)
```

## Why Open Source for Life Sciences?

This seems counterintuitive. Pharma companies are conservative. FDA validation is expensive. Why would open source work?

**1. Transparency for Auditors**

Open source means FDA inspectors can review the code. No black boxes. No "trust our proprietary system." Complete transparency.

```typescript
// Auditor can verify signature implementation
// No hidden functionality
// No undocumented behavior
```

**2. Validation Cost Reduction**

Pre-validated open source means:
- Shared validation packages across the industry
- Community-maintained test scripts
- Reduced per-company validation burden

**3. No Vendor Lock-in**

When your vendor is a $50B monopoly, you have no negotiating power. Open source means:
- Fork and maintain if needed
- Community of contributors
- True ownership of your systems

**4. AI Integration Freedom**

Veeva controls what AI you can use. With veeva.do:
- Integrate any LLM
- Custom AI agents
- No premium AI SKUs

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo veeva
# Deploys to your Cloudflare account
# HIPAA BAA available through Cloudflare
```

### Private Cloud

```bash
# Deploy to your validated infrastructure
docker run -p 8787:8787 dotdo/veeva

# Or Kubernetes
kubectl apply -f veeva-do-deployment.yaml
```

### Air-Gapped

For the most sensitive applications:

```bash
# On-premises deployment
./veeva-do-install.sh --air-gapped
```

## Roadmap

### CRM
- [x] Account Management (HCP, HCO, Affiliations)
- [x] Call Reporting
- [x] Sample Management
- [x] Territory Management
- [x] CLM (Closed Loop Marketing)
- [ ] Events Management
- [ ] Medical Inquiries
- [ ] KOL Management

### Vault
- [x] Document Management
- [x] Workflows
- [x] Electronic Signatures
- [x] Audit Trail
- [x] eCTD Submissions
- [ ] Clinical Operations
- [ ] Quality Management (CAPA, Deviations)
- [ ] RIM (Regulatory Information Management)
- [ ] Safety (Pharmacovigilance)

### Compliance
- [x] 21 CFR Part 11
- [x] EU Annex 11
- [ ] GxP Validation Package
- [ ] SOC 2 Type II
- [ ] HIPAA

## Contributing

veeva.do is open source under the MIT license.

We especially welcome contributions from:
- Life sciences regulatory experts
- Clinical operations professionals
- Quality assurance specialists
- Validation engineers

```bash
git clone https://github.com/dotdo/veeva.do
cd veeva.do
npm install
npm test
```

## License

MIT License - Build your life sciences platform on it.

---

<p align="center">
  <strong>veeva.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://veeva.do">Website</a> | <a href="https://docs.veeva.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
