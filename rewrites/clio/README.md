# clio.do

> Legal Practice Management. AI-powered. Open source.

Clio built a $3B+ company charging $39-149 per user per month for legal practice management. 150,000+ law firms pay for the privilege of tracking their own time, managing their own documents, and billing their own clients.

**clio.do** is the open-source alternative. Your own legal practice management system. AI that captures billable time automatically. Deploy in one click.

## The Problem

Legal practice management software has a dirty secret: it creates more administrative burden than it solves.

- **$39-149/user/month** - A 10-attorney firm pays $4,680-$17,880/year just for software
- **Billable hour leakage** - Attorneys forget to track 10-30% of billable time
- **Document chaos** - Files scattered across email, drives, portals, desks
- **Time tracking friction** - Context-switching to log time interrupts legal work
- **Per-seat scaling** - Growing your firm means growing your software costs linearly
- **Data hostage** - Client matters, billing history, documents - all locked in their system

Meanwhile, solo practitioners and small firms are priced out of professional tools. Legal aid organizations run on spreadsheets. Access to justice suffers because practice management is a profit center.

## The Solution

**clio.do** reimagines legal practice management for the AI era:

```
Clio                             clio.do
-----------------------------------------------------------------
$39-149/user/month               $0 - run your own
Per-seat licensing               Unlimited attorneys
Manual time tracking             AI captures time automatically
Document silos                   Unified matter workspace
Their servers, their rules       Your infrastructure, your data
Billable hour leakage            AI reconstructs missed time
API access costs extra           Full API included
```

## AI-Native API

```typescript
import { clio, tom, priya, ralph } from 'clio.do'

// Natural language legal queries
const matters = await clio`open matters for client Smith`
const unbilled = await clio`unbilled time entries this week`
const overdue = await clio`invoices past due more than 30 days`

// Promise pipelining for billing workflow
const invoiced = await clio`all open matters needing invoices`
  .map(m => clio`generate invoice for ${m}`)
  .map(inv => priya`review billing for appropriateness`)
  .map(inv => tom`check for block billing issues`)
  .map(inv => clio`send to client`)

// Legal research with AI
const research = await tom`
  Research California case law on:
  - ${legalIssue}
  Return citations and summaries
`.map(findings => clio`attach to matter ${matterId}`)

// End-of-day time reconstruction
const timeEntries = await ralph`
  Review my activity today and reconstruct billable time from:
  - Emails sent and received
  - Documents edited
  - Calendar events
  - Court filings
`.map(entries => clio`create time entries ${entries}`)
  .map(() => priya`review for billing accuracy`)

// Client intake pipeline
const newMatter = await clio`new client intake for ${clientName}`
  .map(intake => tom`run conflicts check against ${intake}`)
  .map(cleared => priya`prepare engagement letter`)
  .map(letter => clio`send for e-signature`)
```

### Tree-Shakable Imports

```typescript
// Full featured - all AI capabilities
import { clio, tom, priya, ralph, quinn } from 'clio.do'

// Lightweight - just the client, no AI agents
import { clio } from 'clio.do/client'

// RPC only - for Workers service bindings
import { createClioRpc } from 'clio.do/rpc'
const clio = createClioRpc(env.CLIO)

// Types only - for external integrations
import type { Matter, TimeEntry, Invoice } from 'clio.do/types'
```

## One-Click Deploy

```bash
npx create-dotdo clio
```

Your own legal practice management platform. Running on Cloudflare's global edge. Ready for matters.

```bash
# Or add to existing workers.do project
npx dotdo add clio
```

## Features

### Matters

The complete client matter lifecycle:

```typescript
import { clio } from 'clio.do'

// Create a matter
const matter = await clio.matters.create({
  client: 'CL-001',
  name: 'Smith v. Johnson - Personal Injury',
  practiceArea: 'Personal Injury',
  responsibleAttorney: 'atty-001',
  billingMethod: 'contingency',
  status: 'open',
  openDate: new Date(),
  description: 'Auto accident, rear-end collision, soft tissue injuries',
  customFields: {
    caseNumber: '2025-CV-12345',
    jurisdiction: 'Superior Court of California',
    opposingCounsel: 'Big Defense LLP',
  },
})

// Add matter participants
await matter.addParticipant({
  contact: 'contact-001',
  role: 'client',
  relationship: 'plaintiff',
})

await matter.addParticipant({
  contact: 'contact-002',
  role: 'opposing_party',
  relationship: 'defendant',
})
```

### Time Tracking

Frictionless time capture:

```typescript
// Quick time entry
await clio.time.create({
  matter: 'MAT-001',
  user: 'atty-001',
  duration: 1.5, // hours
  date: new Date(),
  description: 'Draft motion for summary judgment; review case law',
  activityType: 'Drafting',
  billable: true,
  rate: 350,
})

// Timer-based tracking
const timer = await clio.time.startTimer({
  matter: 'MAT-001',
  description: 'Client call re: settlement offer',
})

// Later...
await timer.stop() // Automatically calculates duration

// Bulk time entry
await clio.time.createBulk([
  { matter: 'MAT-001', duration: 0.5, description: 'Review correspondence' },
  { matter: 'MAT-002', duration: 2.0, description: 'Deposition preparation' },
  { matter: 'MAT-003', duration: 0.3, description: 'Scheduling call with court' },
])
```

### AI Time Capture

This is where clio.do transforms practice management:

```typescript
import { clio } from 'clio.do'

// AI reconstructs time from activity
await clio.ai.reconstructTime({
  user: 'atty-001',
  date: new Date(),
  sources: [
    'email', // Analyze sent emails
    'documents', // Document edit history
    'calendar', // Meeting durations
    'calls', // Phone/video calls
  ],
})

// AI suggests: "Based on your activity, you may have missed:
// - 0.5h email correspondence on Smith v. Johnson
// - 1.2h document review on Garcia Estate
// - 0.3h scheduling coordination on Williams Matter"

// AI captures time as you work
await clio.ai.autoCapture({
  enabled: true,
  confidence: 0.85, // Only auto-log when confident
  review: 'daily', // Attorney reviews AI-captured time daily
  sources: ['email', 'documents', 'calendar'],
})
```

### Contacts

Unified contact management:

```typescript
// Create contact
const client = await clio.contacts.create({
  type: 'person',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@email.com',
  phone: '+1-555-0123',
  address: {
    street: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
  },
})

// Create organization
const company = await clio.contacts.create({
  type: 'company',
  name: 'Acme Corporation',
  website: 'https://acme.com',
  industry: 'Manufacturing',
})

// Link contacts
await client.linkTo(company, { relationship: 'employee', title: 'CEO' })

// Search contacts
const results = await clio.contacts.search({
  query: 'smith',
  type: 'person',
  hasOpenMatters: true,
})
```

### Billing & Invoices

Complete billing workflow:

```typescript
// Generate invoice
const invoice = await clio.invoices.create({
  matter: 'MAT-001',
  client: 'CL-001',
  billTo: 'contact-001',
  dateFrom: new Date('2025-01-01'),
  dateTo: new Date('2025-01-31'),
  includeUnbilled: true, // Pull all unbilled time and expenses
})

// Review and adjust
await invoice.adjustLine({
  line: 'LINE-001',
  originalHours: 2.5,
  billedHours: 2.0, // Write down
  reason: 'Efficiency adjustment',
})

// Add expense
await invoice.addExpense({
  description: 'Filing fees',
  amount: 450,
  billable: true,
})

// Finalize and send
await invoice.finalize()
await invoice.send({
  method: 'email',
  includeStatement: true,
  includeTimeDetail: true,
})

// Track payment
await clio.payments.record({
  invoice: invoice.id,
  amount: 5250,
  method: 'check',
  checkNumber: '1234',
  date: new Date(),
})
```

### Trust Accounting (IOLTA)

Compliant trust accounting:

```typescript
// Create trust account
const trustAccount = await clio.trust.createAccount({
  name: 'Client Trust Account',
  bank: 'First National Bank',
  accountNumber: '****1234',
  type: 'IOLTA',
})

// Record deposit
await clio.trust.deposit({
  account: trustAccount.id,
  matter: 'MAT-001',
  amount: 10000,
  source: 'Client retainer',
  date: new Date(),
})

// Transfer to operating (after earned)
await clio.trust.transfer({
  fromAccount: trustAccount.id,
  toAccount: 'OPERATING',
  matter: 'MAT-001',
  amount: 2500,
  reason: 'Transfer earned fees per Invoice #1234',
  invoice: 'INV-001',
})

// Three-way reconciliation
const reconciliation = await clio.trust.reconcile({
  account: trustAccount.id,
  date: new Date(),
})
// {
//   bankBalance: 150000,
//   bookBalance: 150000,
//   clientLedgerTotal: 150000,
//   status: 'reconciled',
//   discrepancies: []
// }
```

### Documents

Unified document management:

```typescript
// Upload document
const doc = await clio.documents.upload({
  matter: 'MAT-001',
  file: documentBuffer,
  name: 'Motion for Summary Judgment.docx',
  category: 'Pleadings',
  description: 'Draft MSJ - v3',
})

// Document versioning
const newVersion = await doc.uploadVersion({
  file: revisedBuffer,
  comment: 'Incorporated partner edits',
})

// Search documents
const results = await clio.documents.search({
  query: 'summary judgment motion',
  matter: 'MAT-001',
  category: 'Pleadings',
  dateRange: { from: new Date('2025-01-01') },
})

// Document automation
await clio.documents.generateFromTemplate({
  template: 'engagement-letter',
  matter: 'MAT-001',
  variables: {
    clientName: 'John Smith',
    matterDescription: 'Personal injury representation',
    hourlyRate: 350,
    retainer: 5000,
  },
})
```

### Calendar & Tasks

Integrated calendaring:

```typescript
// Create calendar event
await clio.calendar.create({
  matter: 'MAT-001',
  title: 'Deposition - Jane Doe',
  start: new Date('2025-02-15T09:00:00'),
  end: new Date('2025-02-15T12:00:00'),
  location: 'Court Reporter Services, 456 Legal Ave',
  attendees: ['atty-001', 'paralegal-001'],
  reminders: [
    { type: 'email', before: '1 day' },
    { type: 'email', before: '1 hour' },
  ],
})

// Court deadlines with rules
await clio.calendar.createDeadline({
  matter: 'MAT-001',
  type: 'court_deadline',
  description: 'Opposition to MSJ due',
  dueDate: new Date('2025-03-01'),
  rule: 'california_civil', // Auto-calculates related dates
})

// Task management
await clio.tasks.create({
  matter: 'MAT-001',
  assignee: 'paralegal-001',
  title: 'Prepare exhibit binders for trial',
  dueDate: new Date('2025-02-28'),
  priority: 'high',
  checklist: [
    'Gather all marked exhibits',
    'Create index',
    'Prepare 5 copies',
    'Deliver to courthouse',
  ],
})
```

## AI-Native Practice Management

### Pipelined Litigation Workflow

```typescript
import { clio, tom, priya, ralph, quinn, mark } from 'clio.do'

// Discovery to trial preparation - one pipeline
const trialReady = await clio`discovery responses for ${matter}`
  .map(responses => tom`
    Review discovery responses, identify:
    - Incomplete or evasive answers
    - Potential privilege issues
    - Follow-up questions needed
  `)
  .map(issues => tom`draft meet and confer letter for ${issues}`)
  .map(letter => priya`review for professional tone`)
  .map(letter => clio`file to matter and send to opposing counsel`)

// Legal research pipeline
const research = await tom`
  Research California case law on:
  - Rear-end collision presumption of negligence
  - Soft tissue injury damages in LA County
  - Recent verdicts for similar cases
`.map(findings => quinn`verify all citations are current`)
  .map(verified => clio`attach research memo to ${matter}`)

// Deposition preparation pipeline
const depPrep = await clio`all documents for witness ${witness}`
  .map(docs => tom`identify key exhibits for deposition`)
  .map(exhibits => priya`prepare examination outline`)
  .map(outline => clio`create deposition prep binder`)
```

### AI Time Reconstruction

```typescript
import { clio, ralph, priya } from 'clio.do'

// End of day - reconstructs billable time automatically
const captured = await ralph`
  Review my activity today and reconstruct billable time:
  - Emails sent and received
  - Documents edited (version history)
  - Calendar events and calls
  - Court filings submitted
`.map(entries => clio`create draft time entries`)
  .map(drafts => priya`review for billing accuracy and block billing`)

// Weekly time audit pipeline
const weeklyAudit = await clio`all time entries this week`
  .map(entries => priya`
    Audit for:
    - Block billing violations
    - Vague descriptions ("review file", "correspondence")
    - Potential write-downs
    - Duplicate entries
  `)
  .map(issues => clio`flag entries needing attorney review`)
```

### AI Billing Workflow

```typescript
import { clio, tom, priya, mark } from 'clio.do'

// Full billing pipeline - from unbilled time to paid invoice
const collected = await clio`unbilled time for ${matter}`
  .map(time => clio`generate draft invoice`)
  .map(draft => priya`
    Review invoice for:
    - Client-appropriate descriptions
    - Block billing separation
    - Appropriate write-downs
  `)
  .map(reviewed => tom`check for ethical billing issues`)
  .map(approved => mark`
    Write billing narrative:
    - Work performed this period
    - Key accomplishments
    - Upcoming milestones
  `)
  .map(final => clio`send invoice to client`)
  .map(sent => clio`track until payment received`)

// Trust accounting pipeline
const trustTransfer = await clio`earned fees for ${matter}`
  .map(earned => priya`verify fees earned per engagement letter`)
  .map(verified => clio`transfer from trust to operating`)
  .map(transfer => clio`send trust account statement to client`)
```

### AI Client Communication

```typescript
import { clio, mark, priya } from 'clio.do'

// Client update pipeline
const clientUpdate = await clio`recent activity on ${matter}`
  .map(activity => mark`
    Draft status update email:
    - Recent progress
    - Next steps
    - Timeline expectations
    Tone: Reassuring, accessible to non-lawyers
  `)
  .map(draft => priya`review for accuracy and professionalism`)
  .map(approved => clio`send to client`)

// New client intake pipeline
const intake = await clio`consultation notes for ${prospect}`
  .map(notes => tom`run conflicts check against all matters`)
  .map(cleared => mark`
    Prepare intake package:
    - Engagement letter
    - Client questionnaire
    - Document request list
    - Fee agreement
  `)
  .map(pkg => priya`review for California RPC compliance`)
  .map(compliant => clio`send for e-signature`)
```

## Comparison: Clio vs clio.do

| Feature | Clio | clio.do |
|---------|------|---------|
| **Pricing** | $39-149/user/month | Free (open source) |
| **Users** | Per-seat licensing | Unlimited |
| **Time Tracking** | Manual entry | AI-powered capture |
| **Document Storage** | Limited by plan | Unlimited (R2) |
| **Trust Accounting** | Premium plans only | Included |
| **API Access** | Extra cost | Full API included |
| **Data Location** | Their cloud | Your infrastructure |
| **AI Features** | "Clio Duo" add-on | Native, included |
| **Customization** | Limited | Full source access |
| **Integrations** | App marketplace | Build your own |
| **Offline Access** | Limited | Edge-native |

## API Compatibility

clio.do implements Clio's API patterns. Your existing integrations work:

```typescript
// Clio API-compatible endpoints
GET    /api/v4/matters
POST   /api/v4/matters
GET    /api/v4/matters/{id}
PATCH  /api/v4/matters/{id}
DELETE /api/v4/matters/{id}

GET    /api/v4/contacts
GET    /api/v4/activities
GET    /api/v4/bills
GET    /api/v4/calendar_entries
GET    /api/v4/documents
GET    /api/v4/tasks
GET    /api/v4/trust_requests
```

### Drop-In Replacement

```typescript
// Before: Clio API
const clio = new ClioClient({
  accessToken: process.env.CLIO_ACCESS_TOKEN,
})

// After: clio.do (same code, different URL)
const clio = new ClioClient({
  accessToken: process.env.CLIO_ACCESS_TOKEN,
  baseUrl: 'https://your-firm.clio.do',
})

// Everything works the same
const matters = await clio.matters.list({ status: 'open' })
```

### Migration

```bash
# Export from Clio
npx clio-do migrate export --source=clio

# Import to your instance
npx clio-do migrate import --target=https://your-firm.clio.do
```

Migrates: Matters, contacts, time entries, invoices, documents, trust transactions.

## Architecture

Built on Cloudflare Durable Objects for security, consistency, and global performance:

```
                    Cloudflare Edge
                          |
          +---------------+---------------+
          |               |               |
    +-----------+   +-----------+   +-----------+
    | Auth      |   | Routing   |   | API       |
    | (WorkOS)  |   | Snippet   |   | Gateway   |
    +-----------+   +-----------+   +-----------+
          |               |               |
          +---------------+---------------+
                          |
                  +---------------+
                  |   Firm DO     |
                  | (per law firm)|
                  +---------------+
                    |    |    |
        +-----------+    |    +-----------+
        |                |                |
  +-----------+   +-----------+   +-----------+
  | SQLite    |   | R2        |   | Vectorize |
  | (matters, |   | (documents|   | (search)  |
  | time, $)  |   | files)    |   |           |
  +-----------+   +-----------+   +-----------+
```

### Why Durable Objects?

1. **Strong consistency** - Trust accounting requires transactional integrity
2. **Data isolation** - Each firm is completely separate
3. **SQLite storage** - Real relational database for complex queries
4. **Global edge** - Fast access from any courthouse
5. **Automatic persistence** - No database administration

### Storage Tiers

| Tier | Storage | Use Case |
|------|---------|----------|
| **Hot** | SQLite | Active matters, recent time, open invoices |
| **Warm** | R2 | Documents, closed matter archives |
| **Cold** | R2 Archive | Retention compliance (7+ years) |

### Security & Compliance

```typescript
// Encryption at rest
await clio.security.configure({
  encryption: {
    atRest: true,
    algorithm: 'AES-256-GCM',
    keyManagement: 'customer-managed', // Bring your own keys
  },
  audit: {
    enabled: true,
    retention: '7 years',
    events: ['all'],
  },
  access: {
    mfa: 'required',
    sso: 'optional',
    ipWhitelist: ['office-network'],
  },
})
```

## Use Cases

### Solo Practitioners

Stop paying $50+/month for software you barely use:

```bash
npx create-dotdo clio --template=solo
```

- Simplified interface for one-attorney practice
- Mobile-first time tracking
- Basic billing and invoicing
- Client portal included
- $0/month (just Cloudflare costs ~$5/month)

### Small Firms (2-10 Attorneys)

Full practice management without per-seat scaling:

```bash
npx create-dotdo clio --template=small-firm
```

- Unlimited users
- Matter assignment and supervision
- Firm-wide reporting
- Trust accounting with three-way reconciliation
- AI time capture for entire firm

### Legal Aid & Non-Profits

Access to professional tools without the cost barrier:

```bash
npx create-dotdo clio --template=legal-aid
```

- Grant tracking and reporting
- Pro bono hour tracking
- Client outcome metrics
- Integration with legal aid portals
- Completely free

### Virtual Law Firms

Built for distributed teams:

```bash
npx create-dotdo clio --template=virtual
```

- Multi-jurisdiction support
- Secure client collaboration
- Video conferencing integration
- E-signature (via docusign.do)
- Works from anywhere

## Getting Started

### 1. Deploy

```bash
npx create-dotdo clio
```

### 2. Configure

```typescript
// wrangler.toml
[vars]
FIRM_NAME = "Smith & Associates"
DEFAULT_JURISDICTION = "California"
TRUST_ACCOUNT_REQUIRED = true

[env.production.vars]
SMTP_HOST = "smtp.your-email.com"
```

### 3. Create First User

```bash
curl -X POST https://your-firm.clio.do/api/v4/users \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "user": {
      "name": "Jane Attorney",
      "email": "jane@yourfirm.com",
      "role": "attorney",
      "rate": 350
    }
  }'
```

### 4. Enable AI Features

```typescript
// src/config.ts
export const config = {
  ai: {
    enabled: true,
    provider: 'llm.do',
    features: {
      timeCapture: true,
      documentAnalysis: true,
      billingReview: true,
      legalResearch: true,
    },
  },
}
```

## The Vision

Legal technology should democratize access to justice, not create another profit center extracting rent from lawyers.

Every solo practitioner deserves the same tools as Big Law. Every legal aid organization should have professional practice management. Every small firm should be able to compete on service, not software budgets.

**clio.do** is practice management that works for you:

- **Your data** - Client matters belong to you, not a SaaS vendor
- **Your workflow** - Customize everything, integrate anything
- **Your economics** - Stop paying per-seat taxes on your practice
- **Your AI** - Time capture, research, and billing that actually helps

The billable hour shouldn't be spent fighting with software.

## Roadmap

### Core Features
- [x] Matter Management
- [x] Contact Management
- [x] Time Tracking
- [x] Billing & Invoicing
- [x] Trust Accounting (IOLTA)
- [x] Document Management
- [x] Calendar & Tasks
- [ ] Client Portal
- [ ] Conflict Checking
- [ ] Court Rules Engine

### AI Features
- [x] AI Time Capture
- [x] Time Reconstruction
- [x] Billing Review
- [ ] Legal Research Assistant
- [ ] Document Drafting
- [ ] Case Outcome Prediction

### Integrations
- [x] Email Integration
- [x] Calendar Sync
- [ ] Court E-Filing
- [ ] Legal Research (Westlaw, LexisNexis)
- [ ] E-Signature (docusign.do)
- [ ] Accounting (QuickBooks, Xero)

## Contributing

clio.do is open source under the MIT license. We welcome contributions from:

- Legal technologists
- Practice management experts
- Bar association technology committees
- Access to justice advocates

```bash
git clone https://github.com/dotdo/clio.do
cd clio.do
npm install
npm test
```

## License

MIT - Practice freely.

---

<p align="center">
  <strong>Your practice. Your data. Your terms.</strong>
  <br /><br />
  <a href="https://clio.do">Website</a> | <a href="https://docs.clio.do">Documentation</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
