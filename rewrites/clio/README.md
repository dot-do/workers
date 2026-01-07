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

## Talk to Your Practice

```typescript
import clio from 'clio.do'

// That's it. No config. No auth setup.
// Context flows naturally - like talking to your paralegal.

await clio`bill Smith for January`
// → Finds matters, pulls unbilled time, reviews for block billing,
//   generates invoice, sends to client. One sentence.

await clio`what's overdue?`
// → Shows past-due invoices with aging.

await clio`reconstruct my time today`
// → AI reviews emails, docs, calls, calendar.
//   Creates draft entries. You approve.

// Chain like conversation:
await clio`open matters`
  .bill()
  .send()

await clio`Smith deposition`
  .prep()       // Gathers exhibits, drafts outline
  .schedule()   // Finds available times, books court reporter

// Research happens naturally:
await clio`research negligence for Johnson v. Acme`
// → Finds the matter, researches the issue, attaches memo.

// Intake is one line:
await clio`intake Sarah Connor, dog bite case`
// → Conflicts check, engagement letter, fee agreement, e-sign. Done.
```

**The test:** Can you dictate this walking to court? If not, we simplified it.

### When You Need More

```typescript
// Default: Just works
import clio from 'clio.do'

// Need the AI team explicitly?
import { clio, tom, priya } from 'clio.do'
await tom`review ${brief}`

// Cloudflare Workers service binding?
import clio from 'clio.do/rpc'
```

## Before & After

### Matters

```typescript
// Old way (other software)
await clio.matters.create({
  client: 'CL-001',
  name: 'Smith v. Johnson - Personal Injury',
  practiceArea: 'Personal Injury',
  responsibleAttorney: 'atty-001',
  billingMethod: 'contingency',
  // ... 15 more fields
})

// clio.do
await clio`new PI matter for John Smith, rear-end collision`
// → Creates matter, sets practice area, assigns you, detects billing type.

await clio`add opposing counsel Big Defense LLP`
// → Context: knows you mean the current matter.
```

### Time

```typescript
// Old way
await clio.time.create({
  matter: 'MAT-001',
  user: 'atty-001',
  duration: 1.5,
  date: new Date(),
  description: 'Draft motion for summary judgment; review case law',
  activityType: 'Drafting',
  billable: true,
  rate: 350,
})

// clio.do
await clio`1.5 hours drafting MSJ for Smith`
// → Finds matter, knows your rate, marks billable. Done.

// Or just let AI handle it:
await clio`what did I miss today?`
// → Reviews your emails, docs, calendar. Suggests entries.
// → You approve with one tap.
```

### Billing

```typescript
// Old way
const invoice = await clio.invoices.create({
  matter: 'MAT-001', client: 'CL-001', billTo: 'contact-001',
  dateFrom: new Date('2025-01-01'), dateTo: new Date('2025-01-31'),
  includeUnbilled: true
})
await invoice.finalize()
await invoice.send({ method: 'email', includeStatement: true })

// clio.do
await clio`bill Smith for January`
// → Everything above, plus block billing review. One sentence.
```

### Trust

```typescript
// Old way: 30 lines of trust deposit, transfer, reconciliation code

// clio.do
await clio`deposit $10k retainer from Smith`
// → Creates trust deposit, assigns to matter, compliant ledger entry.

await clio`transfer earned fees for Smith invoice 1234`
// → Validates against invoice, transfers to operating, updates ledger.

await clio`reconcile trust`
// → Three-way reconciliation. Alerts on discrepancies.
```

### Documents

```typescript
// Old way: 20 lines with buffers, categories, metadata

// clio.do
await clio`file the MSJ draft`
// → Knows the current matter, categorizes as pleading, versions it.

await clio`engagement letter for new client Sarah Connor`
// → Generates from template, fills variables, sends for e-sign.
```

### Calendar

```typescript
// Old way
await clio.calendar.create({
  matter: 'MAT-001',
  title: 'Deposition - Jane Doe',
  start: new Date('2025-02-15T09:00:00'),
  end: new Date('2025-02-15T12:00:00'),
  location: 'Court Reporter Services, 456 Legal Ave',
  attendees: ['atty-001', 'paralegal-001'],
  reminders: [{ type: 'email', before: '1 day' }]
})

// clio.do
await clio`schedule Jane Doe depo next Tuesday morning`
// → Finds available time, books court reporter, adds to matter, sets reminders.

await clio`opposition due March 1`
// → Adds deadline, auto-calculates warning dates per California rules.
```

## Workflows That Flow

Complex pipelines become simple chains. Say what you want to happen.

```typescript
// Discovery → Review → Meet-and-confer → File
// OLD: 50 lines of .map() chains with explicit agent calls

// NEW:
await clio`review discovery responses for Smith`
  .meetAndConfer()
  .send()
// → AI identifies evasive answers, drafts letter, reviews tone, files, sends.

// Research → Verify → Attach
// OLD: 20 lines with tom, quinn, explicit matter IDs

// NEW:
await clio`research rear-end presumption for Smith`
// → Researches, verifies citations, attaches memo to matter. One line.

// Depo prep
await clio`prep for Jane Doe deposition`
// → Gathers docs, identifies exhibits, creates outline, builds binder.
```

### Time Capture

```typescript
// End of day - one sentence
await clio`capture my time today`
// → Reviews emails, docs, calls, calendar.
// → Creates draft entries. You approve what's right.

// Weekly audit
await clio`audit this week's time`
// → Flags block billing, vague descriptions, duplicates.
// → You fix what needs fixing.
```

### Billing Pipeline

```typescript
// The entire billing cycle
await clio`bill all open matters`
  .review()    // Block billing, write-downs, ethical check
  .send()      // Emails with narrative
  .collect()   // Tracks until paid

// Or matter by matter
await clio`bill Smith`.send()
```

### Trust Accounting

```typescript
// Transfer earned fees
await clio`transfer Smith earned fees`
// → Checks against invoice, moves funds, updates ledger, sends statement.

// Reconciliation
await clio`reconcile trust`
// → Three-way reconciliation. Alerts on issues.
```

### Client Communication

```typescript
// Status update
await clio`update Smith on case progress`
// → Drafts email with recent work, next steps. Sends after you approve.

// Full intake
await clio`intake new client, dog bite`
// → Conflicts, engagement letter, questionnaire, fee agreement, e-sign.
// All triggered by seven words.
```

## Drop-In Migration

Already on Clio? One command to switch:

```bash
npx clio-do migrate
# → Exports from Clio, imports to your instance.
# → Matters, contacts, time, invoices, documents, trust. Everything.
```

Existing integrations keep working. Same API, better address:

```typescript
// Change one line
baseUrl: 'https://your-firm.clio.do'
```

## Under the Hood

Each firm gets a Durable Object - a dedicated SQLite database at the edge:

- **Your matters stay together** - Transactional consistency for trust accounting
- **Your data stays separate** - Complete isolation from other firms
- **Your practice stays fast** - Edge locations near every courthouse
- **Documents on R2** - Unlimited storage, 7-year retention
- **Search via Vectorize** - Find anything instantly

Security is automatic: encryption at rest, audit logs, MFA. Configure SSO if you want it.

## For Every Practice

**Solo:** Stop paying $50/month. Voice-first time tracking. ~$5/month on Cloudflare.

**Small Firm:** Unlimited attorneys. No per-seat scaling. Full trust accounting.

**Legal Aid:** Professional tools at zero cost. Grant tracking. Pro bono metrics.

**Virtual:** Multi-jurisdiction. Work from anywhere. E-signature built in.

## Get Started

```bash
npx create-dotdo clio
```

That's it. AI features are on by default. Add your firm name when prompted.

First time you talk to it:

```typescript
await clio`I'm Jane, $350/hour, California bar`
// → Creates your profile. Ready to practice.
```

## Why

Your billable hour shouldn't be spent fighting with software.

Every solo deserves Big Law tools. Every legal aid org deserves professional practice management. Every small firm should compete on service, not software budgets.

**Your data. Your workflow. Your economics. Your AI.**

## Open Source

MIT license. Your practice, your data, your terms.

```bash
git clone https://github.com/dotdo/clio.do && cd clio.do && npm install && npm test
```

---

<p align="center">
  <a href="https://clio.do">clio.do</a> | <a href="https://docs.clio.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
