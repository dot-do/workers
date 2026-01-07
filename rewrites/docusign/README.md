# docusign.do

> E-Signatures + Contract Lifecycle Management. AI-native. Legally binding.

DocuSign turned "send a PDF for signature" into a $15B company charging $10-60 per user per month. Contract lifecycle management costs 10x more. Meanwhile, ESIGN Act made e-signatures legally valid in 2000 - 25 years ago.

**docusign.do** is the open-source alternative. Send documents for signature. Full contract lifecycle management. AI that actually reads and negotiates contracts.

## The Problem

DocuSign built a toll booth on a public road:

- **$10-60/user/month** - For what is essentially PDF + signature capture
- **Per-envelope pricing** - Additional fees beyond user limits
- **CLM as premium upsell** - Contract management starts at $40/user/month
- **AI as marketing** - "Insight" and "Analyzer" require expensive add-ons
- **Vendor lock-in** - Templates, workflows, integrations all proprietary
- **Embedded transaction fees** - Notarization, ID verification, SMS delivery all cost extra

A company sending 10,000 agreements/year? **$50K-200K annually** for what should be commodity software.

## The Solution

**docusign.do** liberates the agreement:

```
DocuSign                        docusign.do
-----------------------------------------------------------------
$10-60/user/month               $0 - run your own
Per-envelope fees               Unlimited envelopes
CLM = expensive add-on          CLM included
AI = premium tier               AI-native from day one
Proprietary templates           Open formats, portable
Their servers, their rules      Your infrastructure
```

## One-Click Deploy

```bash
npx create-dotdo docusign
```

Your own e-signature and CLM platform. Legally binding. AI-powered.

## Features

### E-Signatures

Send, sign, done:

```typescript
import { sign } from 'docusign.do'

// Create envelope
const envelope = await sign.envelopes.create({
  name: 'Service Agreement - Acme Corp',
  documents: [
    {
      name: 'Service Agreement',
      file: agreementPdf,
      fileType: 'pdf',
    },
  ],
  recipients: [
    {
      role: 'signer',
      name: 'John Smith',
      email: 'john@acme.com',
      order: 1,
      fields: [
        { type: 'signature', page: 5, x: 100, y: 600, required: true },
        { type: 'date', page: 5, x: 300, y: 600, required: true },
        { type: 'initial', page: 2, x: 450, y: 700, required: true },
        { type: 'initial', page: 3, x: 450, y: 700, required: true },
      ],
    },
    {
      role: 'signer',
      name: 'Jane Doe',
      email: 'jane@vendor.com',
      order: 2,
      fields: [
        { type: 'signature', page: 5, x: 100, y: 650, required: true },
        { type: 'date', page: 5, x: 300, y: 650, required: true },
      ],
    },
    {
      role: 'cc',
      name: 'Legal Team',
      email: 'legal@acme.com',
    },
  ],
  message: {
    subject: 'Please sign: Service Agreement',
    body: 'Please review and sign the attached service agreement.',
  },
  options: {
    reminderDays: 3,
    expireDays: 30,
  },
})

// Send for signature
await envelope.send()
```

### Signing Experience

Beautiful, mobile-friendly:

```typescript
// Customize signing experience
await sign.branding.configure({
  logo: 'https://...',
  primaryColor: '#0066CC',
  buttonText: 'Sign Document',
  signatureOptions: ['draw', 'type', 'upload'],
  languageOptions: ['en', 'es', 'fr', 'de', 'zh'],
})

// In-person signing
await sign.envelopes.signInPerson({
  envelope: 'ENV-001',
  hostEmail: 'host@company.com',
  signerName: 'John Smith',
  signerEmail: 'john@acme.com',
})

// Embedded signing (in your app)
const signingUrl = await sign.envelopes.embeddedSigningUrl({
  envelope: 'ENV-001',
  signer: 'john@acme.com',
  returnUrl: 'https://yourapp.com/signed',
})
```

### Templates

Reusable agreement templates:

```typescript
// Create template
const template = await sign.templates.create({
  name: 'Standard NDA',
  documents: [
    {
      name: 'Non-Disclosure Agreement',
      file: ndaTemplate,
    },
  ],
  roles: [
    {
      name: 'Disclosing Party',
      fields: [
        { type: 'text', label: 'Company Name', page: 1, x: 200, y: 150 },
        { type: 'signature', page: 3, x: 100, y: 500 },
        { type: 'date', page: 3, x: 300, y: 500 },
      ],
    },
    {
      name: 'Receiving Party',
      fields: [
        { type: 'text', label: 'Company Name', page: 1, x: 200, y: 200 },
        { type: 'signature', page: 3, x: 100, y: 600 },
        { type: 'date', page: 3, x: 300, y: 600 },
      ],
    },
  ],
  defaultMessage: {
    subject: 'NDA for your signature',
    body: 'Please review and sign the attached NDA.',
  },
})

// Use template
await sign.envelopes.createFromTemplate({
  template: template.id,
  recipients: {
    'Disclosing Party': { name: 'Acme Corp', email: 'legal@acme.com' },
    'Receiving Party': { name: 'Vendor Inc', email: 'contracts@vendor.com' },
  },
  prefillData: {
    'Company Name': { 'Disclosing Party': 'Acme Corporation' },
  },
})
```

### Bulk Send

Thousands of agreements, one click:

```typescript
// Send same agreement to many recipients
await sign.bulk.send({
  template: 'standard-nda',
  recipients: [
    { name: 'John Smith', email: 'john@company1.com', data: { company: 'Company 1' } },
    { name: 'Jane Doe', email: 'jane@company2.com', data: { company: 'Company 2' } },
    { name: 'Bob Wilson', email: 'bob@company3.com', data: { company: 'Company 3' } },
    // ...thousands more
  ],
  options: {
    batchSize: 100,
    delayBetweenBatches: '1 minute',
    notifyOnComplete: 'admin@company.com',
  },
})
```

## Contract Lifecycle Management

Full CLM, not an afterthought:

### Contract Repository

All your agreements, searchable:

```typescript
import { clm } from 'docusign.do'

// Import existing contracts
await clm.contracts.import({
  source: 'folder',
  path: '/contracts',
  extract: {
    parties: true,
    dates: true,
    values: true,
    terms: true,
  },
})

// Search contracts
const results = await clm.contracts.search({
  query: 'auto-renewal',
  filters: {
    status: 'active',
    expiresWithin: '90 days',
    value: { min: 100000 },
  },
})

// Get contract details
const contract = await clm.contracts.get('CTR-001')
// {
//   id: 'CTR-001',
//   title: 'Master Service Agreement',
//   parties: ['Acme Corp', 'Vendor Inc'],
//   effectiveDate: '2024-01-15',
//   expirationDate: '2027-01-14',
//   value: 500000,
//   renewalType: 'auto',
//   noticePeriod: 90,
//   keyTerms: [...],
//   documents: [...],
//   amendments: [...],
// }
```

### Contract Requests

Intake and approval workflows:

```typescript
// Create contract request
await clm.requests.create({
  type: 'new-vendor',
  requestor: 'user-001',
  details: {
    vendorName: 'New Vendor Inc',
    contractType: 'SaaS Subscription',
    annualValue: 50000,
    department: 'Engineering',
    businessJustification: 'Required for CI/CD pipeline',
  },
  attachments: ['vendor-proposal.pdf'],
})

// Approval workflow
await clm.workflows.define({
  name: 'Vendor Contract Approval',
  trigger: { type: 'new-vendor' },
  steps: [
    {
      name: 'Department Review',
      approvers: ['department-head'],
      condition: 'all',
    },
    {
      name: 'Legal Review',
      approvers: ['legal-team'],
      condition: 'any',
      required: true,
    },
    {
      name: 'Finance Approval',
      approvers: ['finance'],
      condition: 'value > 25000',
    },
    {
      name: 'Executive Approval',
      approvers: ['cfo'],
      condition: 'value > 100000',
    },
  ],
})
```

### Clause Library

Standard clauses, consistent language:

```typescript
// Define clause library
await clm.clauses.create({
  name: 'Standard Limitation of Liability',
  category: 'Liability',
  text: `
    IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY
    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
    REGARDLESS OF THE CAUSE OF ACTION OR THE FORM OF ACTION.

    THE TOTAL LIABILITY OF EITHER PARTY SHALL NOT EXCEED [AMOUNT].
  `,
  variables: [
    { name: 'AMOUNT', type: 'currency', default: 'fees paid in prior 12 months' },
  ],
  alternatives: [
    {
      name: 'Mutual Cap',
      text: '...total liability shall not exceed the greater of $[CAP] or...',
    },
    {
      name: 'Unlimited for IP',
      text: '...except for claims arising from intellectual property infringement...',
    },
  ],
  fallbackPosition: 'mutual-cap',
})

// Use in contract authoring
await clm.contracts.author({
  template: 'msa-template',
  clauses: [
    { id: 'standard-limitation-of-liability', variables: { AMOUNT: '$1,000,000' } },
    { id: 'standard-indemnification' },
    { id: 'standard-confidentiality' },
  ],
})
```

### Obligations Tracking

Never miss a deadline:

```typescript
// Extract obligations from contract
await clm.obligations.extract('CTR-001')

// Track obligations
const obligations = await clm.obligations.list({
  contract: 'CTR-001',
  upcoming: '30 days',
})
// [
//   { type: 'renewal-notice', dueDate: '2025-10-15', action: 'Send 90-day notice' },
//   { type: 'audit-rights', dueDate: '2025-06-01', action: 'Annual audit window opens' },
//   { type: 'insurance', dueDate: '2025-12-31', action: 'Provide certificate renewal' },
// ]

// Set up alerts
await clm.obligations.alerts({
  contract: 'CTR-001',
  notifications: [
    { daysBefore: 30, recipients: ['contract-owner'] },
    { daysBefore: 7, recipients: ['contract-owner', 'legal'] },
    { daysBefore: 1, recipients: ['contract-owner', 'legal', 'executive'] },
  ],
})
```

### Amendment Management

Track changes over time:

```typescript
// Create amendment
await clm.amendments.create({
  contract: 'CTR-001',
  title: 'First Amendment - Price Increase',
  effectiveDate: '2025-07-01',
  changes: [
    {
      section: '4.1',
      original: 'Annual fee: $50,000',
      amended: 'Annual fee: $55,000',
      reason: 'Annual price adjustment per Section 4.3',
    },
  ],
  signatories: [
    { party: 'Acme Corp', signer: 'legal@acme.com' },
    { party: 'Vendor Inc', signer: 'contracts@vendor.com' },
  ],
})

// View contract with all amendments
const consolidatedContract = await clm.contracts.consolidated('CTR-001')
```

## AI-Native Agreements

### AI Contract Analysis

```typescript
import { tom } from 'agents.do'

// Analyze contract
await tom`
  Review this vendor contract and identify:
  1. Terms that deviate from our standard positions
  2. Missing protective clauses
  3. Unusual risk allocations
  4. Auto-renewal and termination provisions
  5. Hidden fees or escalation clauses

  Provide risk score and negotiation recommendations.
`

// Tom analyzes and returns:
// "RISK SCORE: 7/10 (Elevated)
//
// Key Issues:
// 1. Liability cap is only $50K vs our standard of fees paid
// 2. Missing mutual confidentiality - only one-way
// 3. 60-day auto-renewal notice (our standard is 30)
// 4. Includes 5% annual escalator not discussed in proposal
// 5. Change of control provision is vendor-favorable
//
// Recommended Actions:
// 1. Request mutual liability cap at 12-month fees
// 2. Add mutual confidentiality provision
// 3. Negotiate 30-day notice period
// 4. Remove or cap annual escalator
// 5. Add mutual change of control rights"
```

### AI Contract Negotiation

```typescript
import { sally } from 'agents.do'

// Generate redline
await sally`
  Based on the contract analysis, generate a redline that:
  1. Proposes our standard liability language
  2. Adds mutual confidentiality
  3. Adjusts notice periods
  4. Removes the escalator clause
  5. Includes brief explanatory comments

  Tone: Professional, collaborative, focused on fairness
`

// Auto-generate negotiation email
await sally`
  Draft an email to the vendor's legal team:
  - Acknowledge receipt of the contract
  - Express interest in moving forward
  - Summarize our proposed changes (high-level)
  - Offer to discuss on a call

  Tone: Positive, business-focused, not adversarial
`
```

### AI Contract Generation

```typescript
import { ralph } from 'agents.do'

// Generate contract from term sheet
await ralph`
  Create a Master Service Agreement based on these terms:
  - Vendor: CloudTech Inc
  - Service: Cloud infrastructure management
  - Term: 3 years
  - Annual fee: $120,000
  - SLA: 99.9% uptime
  - Payment terms: Net 30
  - Both parties based in Delaware

  Use our standard MSA template.
  Include appropriate SaaS-specific provisions.
`

// Ralph generates complete contract
// Using clause library and standard positions
```

### AI Clause Comparison

```typescript
import { priya } from 'agents.do'

// Compare clauses across contracts
await priya`
  Compare the indemnification clauses in:
  - CTR-001 (Microsoft)
  - CTR-002 (AWS)
  - CTR-003 (Google Cloud)

  Which is most favorable to us?
  What's the market standard?
  Recommend our go-forward position.
`
```

### AI Obligation Extraction

```typescript
import { ada } from 'docusign.do/agents'

// Extract all obligations from contract
await ada`
  Read CTR-001 and extract ALL obligations for both parties:

  For each obligation:
  - Who is obligated (us or them)
  - What the obligation is
  - When it's due (one-time or recurring)
  - Consequences of non-compliance
  - Related contract section

  Format as structured data for our obligations tracker.
`
```

## Legal Validity

E-signatures are legally binding:

### ESIGN Act Compliance (US)

```typescript
// US federal e-signature law since 2000
await sign.compliance.esign({
  // Consumer consent
  consent: {
    required: true,
    withdrawable: true,
    recordRetention: true,
  },

  // Record retention
  retention: {
    duration: '7 years',
    format: 'original',
    accessible: true,
  },

  // Attribution
  attribution: {
    identity: 'email',
    timestamp: 'tamper-evident',
    auditTrail: 'comprehensive',
  },
})
```

### UETA Compliance

```typescript
// Uniform Electronic Transactions Act (all states except NY)
await sign.compliance.ueta({
  agreement: 'electronic-records',
  attribution: true,
  integrity: true,
})
```

### eIDAS Compliance (EU)

```typescript
// European e-signature regulation
await sign.compliance.eidas({
  signatureLevel: 'advanced', // or 'simple', 'qualified'
  timestamping: 'qualified-service',
  validation: 'long-term',
  // For qualified signatures
  qualifiedSignatureDevice: 'optional',
})
```

### Audit Trail

Every action recorded:

```typescript
const auditTrail = await sign.envelopes.auditTrail('ENV-001')
// [
//   { action: 'created', timestamp: '2025-01-15T10:00:00Z', actor: 'sender@company.com', ip: '...' },
//   { action: 'sent', timestamp: '2025-01-15T10:01:00Z', recipient: 'john@acme.com' },
//   { action: 'viewed', timestamp: '2025-01-15T14:30:00Z', actor: 'john@acme.com', ip: '...', device: '...' },
//   { action: 'signed', timestamp: '2025-01-15T14:35:00Z', actor: 'john@acme.com', ip: '...', signature: '...' },
//   { action: 'completed', timestamp: '2025-01-15T14:35:00Z' },
// ]

// Certificate of completion
const certificate = await sign.envelopes.certificate('ENV-001')
// Includes: All parties, timestamps, IP addresses, signature images, document hash
```

## Architecture

### Durable Object per Organization

```
OrgDO (config, users, branding)
  |
  +-- EnvelopesDO (e-signatures)
  |     |-- SQLite: Envelope metadata, routing
  |     +-- R2: Documents, signed copies
  |
  +-- TemplatesDO (reusable templates)
  |     |-- SQLite: Template definitions
  |     +-- R2: Template documents
  |
  +-- ContractsDO (CLM repository)
  |     |-- SQLite: Contract metadata, obligations
  |     +-- R2: Contract documents, amendments
  |
  +-- ClausesDO (clause library)
  |     |-- SQLite: Clause definitions, versions
  |
  +-- AuditDO (audit trails)
        |-- SQLite: Audit events (append-only)
```

### Document Integrity

```typescript
// Every document is hashed
const document = {
  content: documentBuffer,
  hash: await crypto.subtle.digest('SHA-256', documentBuffer),
  hashAlgorithm: 'SHA-256',
  timestamp: new Date().toISOString(),
}

// Signature binds to document hash
const signature = {
  documentHash: document.hash,
  signerIdentity: 'john@acme.com',
  signatureImage: signatureBlob,
  timestamp: signedAt,
  ip: signerIP,
  userAgent: signerUA,
}

// Any tampering detectable
const isValid = await verify(document.hash, signature.documentHash)
```

### Long-Term Validation

```typescript
// Signatures remain valid even after certificate expiry
await sign.validation.configure({
  timestamping: {
    provider: 'rfc3161-compliant',
    embed: true,
  },
  archival: {
    format: 'PDF/A-3',
    embedSignatures: true,
    embedAuditTrail: true,
  },
  retention: {
    duration: '10 years',
    format: 'unmodified',
  },
})
```

## Why Open Source for E-Signatures?

**1. E-Signatures Are Commodity**

The ESIGN Act passed in 2000. The technology is well-understood. There's no secret sauce - just regulatory compliance and good UX.

**2. Contract Data Is Sensitive**

Your agreements contain:
- Pricing and terms
- Customer information
- Intellectual property provisions
- Confidential business terms

This shouldn't live on someone else's servers.

**3. AI Requires Data Access**

To analyze your contracts, summarize terms, track obligations - AI needs access to your agreement data. With open source, you control that access.

**4. Integration Freedom**

Every company has different:
- CRM (need to attach signed contracts)
- ERP (need to trigger procurement)
- HRIS (need to process offers)

Open source means integrate with anything.

**5. Bulk Economics**

DocuSign charges per envelope/user. At scale:
- 10,000 envelopes/year = $30K-100K
- Open source = marginal cost approaches zero

## Deployment

### Cloudflare Workers

```bash
npx create-dotdo docusign
# Global edge deployment
# Fast signing experience worldwide
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/docusign

# Kubernetes
kubectl apply -f docusign-do-deployment.yaml
```

### Hybrid

```typescript
// Edge for signing, origin for CLM
await sign.config.hybrid({
  edge: ['signing', 'templates', 'branding'],
  origin: ['clm', 'analytics', 'bulk-operations'],
})
```

## Roadmap

### E-Signatures
- [x] Create and Send Envelopes
- [x] Multiple Recipients and Routing
- [x] Field Types (Signature, Initial, Date, Text)
- [x] Templates
- [x] Bulk Send
- [x] Embedded Signing
- [ ] SMS Delivery
- [ ] ID Verification
- [ ] Notarization

### CLM
- [x] Contract Repository
- [x] Contract Requests
- [x] Approval Workflows
- [x] Clause Library
- [x] Obligations Tracking
- [x] Amendment Management
- [ ] Playbook / Positions
- [ ] Counterparty Intelligence

### AI
- [x] Contract Analysis
- [x] Risk Identification
- [x] Redline Generation
- [x] Obligation Extraction
- [ ] Negotiation Assistance
- [ ] Market Benchmarking

### Compliance
- [x] ESIGN Act
- [x] UETA
- [x] eIDAS (Simple, Advanced)
- [x] Audit Trails
- [ ] eIDAS Qualified
- [ ] HIPAA BAA Support

## Contributing

docusign.do is open source under the MIT license.

We welcome contributions from:
- Legal technologists
- Contract professionals
- Security experts
- UX designers

```bash
git clone https://github.com/dotdo/docusign.do
cd docusign.do
npm install
npm test
```

## License

MIT License - Sign freely.

---

<p align="center">
  <strong>docusign.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://docusign.do">Website</a> | <a href="https://docs.docusign.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
