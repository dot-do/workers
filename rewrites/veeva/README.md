# veeva.do

> Life Sciences CRM + Vault. AI-native. Open source.

Veeva built a $50B+ empire on pharma's regulatory burden. 21 CFR Part 11 compliance, medical affairs CRM, clinical trial management - all wrapped in per-seat pricing that makes Salesforce look cheap.

**veeva.do** is the open-source alternative. Deploy your own compliant life sciences platform. AI-native from day one. Audit-ready out of the box.

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

Full medical affairs and commercial CRM:

```typescript
import { crm } from 'veeva.do'

// Medical Affairs - HCP Engagement
await crm.calls.create({
  account: 'DR-0012345',
  type: 'Medical Science Liaison',
  products: ['PRODUCT-A'],
  keyMessages: ['KM-001', 'KM-002'],
  samples: [], // MSLs don't sample
  outcome: 'Requested clinical data',
  followUp: 'Send Phase 3 results',
})

// Commercial - Sales Call
await crm.calls.create({
  account: 'HCP-0067890',
  type: 'Sales Rep',
  products: ['PRODUCT-B'],
  keyMessages: ['KM-003'],
  samples: [{ product: 'PRODUCT-B', quantity: 5, lot: 'LOT-2025-001' }],
  signatures: [{ type: 'sample_receipt', captured: true }],
})
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
import { vault } from 'veeva.do'

// Upload a new document
const doc = await vault.documents.create({
  name: 'Protocol Amendment 3',
  type: 'Clinical Protocol',
  lifecycle: 'clinical_document',
  properties: {
    study: 'STUDY-001',
    phase: 'Phase 3',
    therapeutic_area: 'Oncology',
  },
  file: protocolPdf,
})

// Route for review
await doc.startWorkflow('review_and_approve', {
  reviewers: ['user-001', 'user-002'],
  approvers: ['user-003'],
  dueDate: '2025-02-15',
})

// Electronic signature (21 CFR Part 11)
await doc.sign({
  user: 'user-003',
  meaning: 'I approve this document for use in clinical trials',
  credentials: { username: 'jsmith', password: '***' }, // Re-authentication
})
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

eCTD-ready document management:

```typescript
// Build submission
const submission = await vault.submissions.create({
  type: 'NDA',
  application: 'NDA-123456',
  sequence: '0001',
  region: 'US',
})

// Add documents to CTD structure
await submission.addDocument({
  document: 'DOC-001',
  ctdSection: 'm2-25', // 2.5 Clinical Overview
  operation: 'new',
})

// Generate eCTD package
const ectd = await submission.compile({
  format: 'eCTD 4.0',
  validate: true,
})
```

### Quality Management

CAPA, deviations, change control:

```typescript
// Create deviation
const deviation = await vault.quality.deviation({
  type: 'Manufacturing',
  description: 'Batch temperature exceeded limit by 2C for 15 minutes',
  batch: 'BATCH-2025-001',
  impact: 'potential',
  rootCause: 'pending',
})

// Escalate to CAPA if needed
if (deviation.requiresCapa) {
  await vault.quality.capa({
    deviation: deviation.id,
    correctiveActions: [
      { action: 'Calibrate temperature sensor', owner: 'user-001', due: '2025-02-01' },
    ],
    preventiveActions: [
      { action: 'Add redundant sensor', owner: 'user-002', due: '2025-03-01' },
    ],
  })
}
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

### AI for Medical Affairs

```typescript
import { ada } from 'veeva.do/agents'

// Medical information requests
await ada`
  Dr. Chen asked about PRODUCT-A efficacy in elderly patients.
  Search our medical information database and draft a response
  citing relevant clinical trial data.
`
// Ada searches approved content, drafts response with citations,
// routes to Medical Information for review before sending

// Literature surveillance
await ada`
  Monitor PubMed for new publications mentioning PRODUCT-A or
  our mechanism of action. Flag anything relevant to our
  competitive positioning or safety profile.
`
```

### AI for Clinical Operations

```typescript
import { ralph } from 'agents.do'
import { vault } from 'veeva.do'

// Protocol deviation detection
await ralph`
  Review the clinical database for Study STUDY-001.
  Identify any potential protocol deviations in the last 30 days.
  Cross-reference with site monitoring visit reports.
`

// Document comparison
await ralph`
  Compare Protocol v3.0 with v2.0.
  Summarize all changes and flag any that might require
  IRB notification or patient re-consent.
`
```

### AI for Regulatory Affairs

```typescript
import { priya } from 'agents.do'

// Submission planning
await priya`
  We're planning to submit NDA-123456 in Q3 2025.
  Based on our current document inventory, identify:
  1. Missing documents by CTD section
  2. Documents needing updates
  3. Timeline risks
`

// Health authority query response
await priya`
  FDA sent questions about our CMC section.
  Draft responses based on our stability data and
  manufacturing records. Flag any gaps.
`
```

### MCP Tools for Every Module

```typescript
// Auto-generated MCP tools
veeva.crm.calls.create(data)      // Log a call
veeva.crm.accounts.search(query)  // Find HCPs/HCOs
veeva.vault.documents.upload(doc) // Upload document
veeva.vault.workflows.start(flow) // Start review
veeva.quality.deviations.create() // Report deviation
```

AI assistants can directly interact with your life sciences platform through the Model Context Protocol.

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
