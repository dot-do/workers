# docusign.do

> E-Signatures + Contract Lifecycle Management. AI-native. Legally binding.

DocuSign turned "send a PDF for signature" into a $15B company charging $10-60 per user per month. Contract lifecycle management costs 10x more. Meanwhile, ESIGN Act made e-signatures legally valid in 2000 - 25 years ago.

**docusign.do** is the open-source alternative. Send documents for signature. Full contract lifecycle management. AI that actually reads and negotiates contracts.

## AI-Native API

```typescript
import { docusign } from 'docusign.do'           // Full SDK
import { docusign } from 'docusign.do/tiny'      // Minimal client
import { docusign } from 'docusign.do/clm'       // CLM-only operations
```

Natural language for agreements:

```typescript
import { docusign } from 'docusign.do'

// Talk to it like an assistant
const nda = await docusign`send NDA to alice@acme.com`
const pending = await docusign`envelopes pending signature`
const expiring = await docusign`contracts expiring in 90 days`

// Chain like sentences
await docusign`envelopes pending over 7 days`
  .map(env => docusign`remind ${env.recipient}`)

// Proposal to signed deal
await docusign`generate MSA for Acme Corp`
  .map(contract => docusign`apply standard negotiation playbook`)
  .map(redlined => docusign`send to legal@acme.com for signature`)
  .notify(`Deal closed with Acme`)
```

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
// Send documents for signature
await docusign`send service agreement to john@acme.com`
await docusign`send NDA to alice@startup.com and bob@startup.com`
await docusign`send offer letter to candidate@email.com cc hr@company.com`

// Check status naturally
await docusign`status of Acme agreement`
await docusign`who hasn't signed the NDA yet?`
await docusign`envelopes sent this week`
```

### Signing Workflows

```typescript
// Sequential signing
await docusign`send contract to cfo@acme.com then ceo@acme.com`

// Parallel signing
await docusign`send NDA to all founders at once`

// In-person signing
await docusign`start in-person signing for John Smith hosted by reception`

// Embedded in your app
const url = await docusign`signing link for john@acme.com`
```

### Templates

```typescript
// Use templates naturally
await docusign`send standard NDA to alice@acme.com`
await docusign`send employee offer to candidate using senior-engineer template`

// Create templates from examples
await docusign`save this as our standard MSA template`

// List available templates
await docusign`our templates`
await docusign`NDA templates`
```

### Bulk Send

Thousands of agreements, one line:

```typescript
// Bulk send to a list
await docusign`send annual NDA renewal to all vendors`
await docusign`send policy update to all employees`

// With tracking
await docusign`send Q1 agreements to all customers`
  .track()
  .notify(`Q1 agreements complete`)
```

## Contract Lifecycle Management

Full CLM, not an afterthought:

### Contract Repository

All your agreements, searchable:

```typescript
// Search contracts naturally
await docusign`contracts with auto-renewal`
await docusign`active contracts expiring in 90 days`
await docusign`contracts worth over $100k`
await docusign`all Acme Corp agreements`

// Import existing contracts
await docusign`import contracts from /contracts folder`

// AI extracts parties, dates, values, key terms automatically
```

### Contract Requests

Intake and approval workflows:

```typescript
// Request new contracts naturally
await docusign`request vendor contract for CloudTech $50k/year for Engineering`

// Approvals flow automatically based on value
// - Department head reviews all
// - Legal reviews all
// - Finance approves > $25k
// - CFO approves > $100k

// Check approval status
await docusign`status of CloudTech contract request`
await docusign`pending approvals for Engineering`
```

### Clause Library

Standard clauses, consistent language:

```typescript
// Query your clause library
await docusign`our standard liability clause`
await docusign`indemnification alternatives`
await docusign`confidentiality clauses`

// Author contracts from clauses
await docusign`draft MSA for CloudTech using standard clauses`

// Compare against standards
await docusign`how does this liability cap compare to our standard?`
```

### Obligations Tracking

Never miss a deadline:

```typescript
// Track upcoming obligations
await docusign`obligations due in 30 days`
await docusign`renewal notices needed this quarter`
await docusign`insurance certificates expiring`

// AI extracts obligations from contracts automatically
await docusign`extract obligations from Acme MSA`

// Set up alerts naturally
await docusign`alert me 30 days before any renewal deadline`
await docusign`notify legal 7 days before compliance deadlines`
```

### Amendment Management

Track changes over time:

```typescript
// Create amendments naturally
await docusign`amend Acme contract: increase annual fee to $55k effective July 1`

// View full history
await docusign`Acme contract with all amendments`
await docusign`what changed in the Acme contract?`

// Send amendment for signature
await docusign`send price increase amendment to Acme for signature`
```

## AI-Native Agreements

### Contract Analysis

```typescript
// Analyze any contract
await docusign`analyze vendor contract for risks`
await docusign`review ${contract} against our standard positions`
await docusign`risk score for Acme MSA`

// AI identifies automatically:
// - Terms deviating from standards
// - Missing protective clauses
// - Unusual risk allocations
// - Hidden fees or escalators
// - Auto-renewal traps
```

### Contract Negotiation

```typescript
// Generate redlines
await docusign`redline vendor contract using our playbook`
await docusign`propose our standard liability language`

// Draft negotiation responses
await docusign`draft response to vendor redlines - protect our interests`
await docusign`email to vendor legal: accept their indemnity, counter on liability`

// AI maintains professional, collaborative tone
```

### Contract Generation

```typescript
// Generate from term sheets
await docusign`draft MSA for CloudTech: 3 years, $120k/year, 99.9% SLA`

// AI uses clause library and standard positions automatically

// Or from natural descriptions
await docusign`create NDA for discussing potential acquisition with Acme`
await docusign`draft consulting agreement for Jane Doe $200/hr`
```

### Clause Comparison

```typescript
// Compare across contracts
await docusign`compare indemnification in Microsoft vs AWS vs Google contracts`
await docusign`which vendor has the best liability terms?`
await docusign`market standard for data processing agreements`
```

### Obligation Extraction

```typescript
// Extract obligations automatically
await docusign`extract obligations from Acme MSA`

// Returns structured data:
// - Who is obligated (us or them)
// - What the obligation is
// - When it's due
// - Consequences of non-compliance
```

## Legal Validity

E-signatures are legally binding:

### Compliance Built In

ESIGN Act (US), UETA (all states), eIDAS (EU) - all supported automatically. Consumer consent, record retention, tamper-evident timestamps, comprehensive audit trails.

```typescript
// Check compliance status
await docusign`compliance status for Acme agreement`
await docusign`audit trail for ENV-001`

// Get certificate of completion
await docusign`certificate for Acme NDA`
// Includes: All parties, timestamps, IP addresses, signature images, document hash
```

### Audit Trail

Every action recorded automatically:

```typescript
// View audit history
await docusign`audit trail for Acme agreement`

// Returns complete history:
// - Created, sent, viewed, signed, completed
// - Timestamps, IP addresses, devices
// - Tamper-evident, legally admissible
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

Every document is SHA-256 hashed. Signatures bind to document hash. Any tampering is detectable. RFC 3161 timestamping. PDF/A-3 archival format. 10-year retention. All automatic.

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

## vs DocuSign

| Feature | DocuSign | docusign.do |
|---------|----------|-------------|
| **Pricing** | $10-60/user/month | $0 - run your own |
| **Per-Envelope Fees** | Yes, beyond limits | Unlimited |
| **CLM** | Expensive add-on | Included |
| **AI** | Premium tier | AI-native from day one |
| **Templates** | Proprietary | Open formats, portable |
| **Data Location** | Their servers | Your infrastructure |
| **Customization** | Configuration UI | Code it yourself |
| **Lock-in** | Years of migration | MIT licensed |

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

Edge for signing (fast worldwide), origin for CLM and bulk operations. Configure via environment or natural language.

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
  <strong>The $15B toll booth ends here.</strong>
  <br />
  AI-native. Legally binding. Open source.
  <br /><br />
  <a href="https://docusign.do">Website</a> |
  <a href="https://docs.docusign.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/docusign.do">GitHub</a>
</p>
