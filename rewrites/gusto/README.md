# gusto.do

> Payroll that runs itself. Benefits that make sense. Compliance on autopilot.

You're a startup founder. You just made your first hires. Payroll software wants $40/employee/month - that's $9,600/year for a 20-person team. To do math. And send ACH transfers. Your payroll cost shouldn't scale with your headcount.

## AI-Native API

```typescript
import { gusto } from 'gusto.do'

// Talk to it like your bookkeeper
await gusto`hire Sarah at $120k`
await gusto`run payroll`
await gusto`give Sarah a raise to $130k`

// That's it. Location, taxes, benefits, filings - all inferred.
```

One import. Talk naturally. Everything else is automatic.

## The Problem

Gusto made payroll approachable for startups. That was the innovation. But now:

- **$40+ per employee per month** - Your 20-person team costs $800/month for payroll
- **Benefits are extra** - Health, 401k, HSA all add fees
- **Still requires manual work** - "Approving" payroll you've already configured
- **Locked to their ecosystem** - Want to use a different benefits provider? Good luck.

The dirty secret of payroll: **it's math and API calls**.

Gross pay - taxes - deductions = net pay. Submit to tax agencies. ACH to bank accounts. That's it.

The hard parts (tax calculations, filing deadlines, compliance rules) can be codified. They can be AI-assisted. They don't require $40/employee/month.

**gusto.do** is open-source payroll and benefits that runs on your infrastructure, with AI handling the complexity.

## A Note on Payroll

Payroll is regulated. Taxes are serious. Let's be clear about what gusto.do is and isn't:

**gusto.do IS:**
- Open-source payroll calculation engine
- Tax calculation using up-to-date tax tables
- ACH payment processing via your bank API
- Benefits administration and enrollment
- Compliance tracking and deadline reminders
- AI-assisted tax form generation

**gusto.do IS NOT:**
- A registered payroll provider (you are the employer of record)
- Tax advice (consult a CPA for tax questions)
- A guarantee of compliance (you're responsible for your payroll)

Think of it as **payroll infrastructure** - the same engines that power payroll providers, but running in your control.

For companies that want a fully-managed solution with liability coverage, traditional payroll providers make sense. For companies that want control, transparency, and lower costs, gusto.do provides the tools.

## One-Click Deploy

```bash
npx create-dotdo gusto
```

Your payroll infrastructure is live. Add your first employee:

```typescript
import { gusto } from 'gusto.do'

await gusto`hire Sarah at $120k`
// "Done. Sarah Chen added:
//  $5,000/pay period, semi-monthly
//  CA resident, standard withholding
//  Ready for next payroll."
```

That's it. Pay schedule, tax filing, W-4 defaults - all inferred from context.

## Features

### Payroll Calculation

The heart of the system. Accurate, auditable, transparent.

```typescript
await gusto`run payroll`
// "Payroll ready for 12 employees:
//  Total: $45,840 net
//  One note: Sarah's OT bumped her bracket.
//  [Approve] [Details]"

await gusto`show Sarah's paycheck`
// "Sarah: $5,000 gross → $2,601.50 net"
```

### Tax Calculation Engine

Up-to-date federal, state, and local tax tables.

```typescript
await gusto`what do we owe in taxes?`
// "Q1: $45,230 (federal $28k, state $13k, FICA $4k)"

await gusto`will Sarah owe at tax time?`
// "~$800. Want me to adjust her withholding?"
```

### Payment Processing

Send money via ACH. Track every transaction.

```typescript
await gusto`pay everyone`
// "Submitted. Deposits hit Friday."

await gusto`when does payroll land?`
// "Friday, Jan 17."
```

### Tax Filing

Generate and track tax filings.

```typescript
await gusto`file Q1 taxes`
// "Filed 941 and CA DE 9. Confirmation: #482910"

await gusto`any deadlines coming up?`
// "April 30: Q1 filings (done). Next: Q2 July 31."
```

### Benefits Administration

Health insurance, 401k, HSA - all in one place.

```typescript
await gusto`set up health insurance and 401k`
// "Added Gold PPO ($250/mo) and 401k with 4% match."

await gusto`enroll Sarah in benefits`
// "Sarah enrolled in Gold PPO + 401k at 10%.
//  Her paycheck drops $350/period."
```

### Contractor Payments

Not just employees. Contractors too.

```typescript
await gusto`pay Design Studio $5k for the website`
// "Sent. 1099 tracking updated."

await gusto`file 1099s`
// "Filed 3 1099s with IRS."
```

### Time Tracking Integration

For hourly employees.

```typescript
await gusto`Jamie worked 40 hours plus 8 OT this week`
// "Logged. $1,840 gross for Jamie."

await gusto`sync hours from Clockify`
// "Imported 156 hours for 4 employees."
```

## Conversational Payroll

Talk to it like your bookkeeper. It figures out the rest.

```typescript
await gusto`give Sarah a 10% raise`
// "Sarah now at $132k. Withholding adjusted."

await gusto`how much are we spending on payroll?`
// "2025 YTD: $386k. Tracking to $925k (+12% vs last year)."

await gusto`anything I need to do before tax time?`
// "Alex and Jamie need W-4 updates. Want me to ping them?"

await gusto`help Jamie pick health insurance`
// "For Jamie's situation, HDHP + HSA saves $2k/year.
//  Want me to enroll her?"
```

## Compliance Engine

Payroll compliance is complex. gusto.do tracks it for you.

```typescript
await gusto`anything need my attention?`
// "Two things:
//  - 941 due Jan 31
//  - CA minimum wage went up, affects 2 people"

await gusto`alert me on Slack for deadlines`
// "Done. I'll ping you 7 days before anything's due."
```

## Architecture

gusto.do runs on Cloudflare Workers + Durable Objects with a focus on security.

```
PayrollDO                 - Payroll run calculation and history
  |                         Tax calculations, deductions, net pay
  |
EmployeeDO                - Employee payroll records
  |                         Salary, tax info, bank accounts (encrypted)
  |
TaxEngineDO               - Tax calculation engine
  |                         Federal, state, local tax tables
  |                         Updated automatically
  |
BenefitsDO                - Benefits plans and enrollment
  |                         Health, 401k, HSA, FSA
  |
PaymentsDO                - ACH processing and tracking
  |                         Bank API integration
  |
ComplianceDO              - Regulatory tracking
                           Deadlines, filings, audits
```

### Security

Payroll data is sensitive. gusto.do takes security seriously:

- **Encryption at rest** - All PII (SSN, bank accounts) encrypted
- **Encryption in transit** - TLS everywhere
- **Role-based access** - Payroll admins, managers, employees see different data
- **Audit logging** - Every access logged
- **No data export to us** - Your data stays on your infrastructure

```typescript
await gusto`who accessed SSN data this month?`
// "3 accesses: you (Jan 5), Sarah (Jan 12), accountant (Jan 15)"
```

## Integrations

```typescript
await gusto`connect to Mercury and QuickBooks`
// "Connected. Payroll syncs automatically."

await gusto`when I hire someone, add them to payroll`
// "Done. New BambooHR employees auto-onboard."
```

## Pricing

| Plan | Price | What You Get |
|------|-------|--------------|
| **Self-Hosted** | $0 | Run it yourself, you handle everything |
| **Managed** | $199/mo | Hosted, tax table updates, support |
| **Enterprise** | Custom | Dedicated support, SLA, customization |

**No per-employee fees.**

- 50 employees on Gusto: ~$2,400/month
- 50 employees on gusto.do Managed: $199/month

## Tax Table Updates

Tax rates change. gusto.do keeps up:

```typescript
await gusto`are my tax rates current?`
// "Yes. Federal and CA updated Jan 1. SF update scheduled July 1."
```

Updates are automatic on Managed. Self-hosted: `npx gusto-do update-taxes`

## Important Disclaimers

1. **You are the employer of record.** gusto.do provides tools, not payroll services. You're responsible for correct tax filing and payment.

2. **Consult professionals.** For tax questions, consult a CPA. For legal questions, consult an attorney. For benefits questions, consult a benefits broker.

3. **Test thoroughly.** Before running live payroll, test with sandbox data. Verify calculations against your accountant's expectations.

4. **Backup your data.** Payroll records are legally required for years. Maintain backups.

## Why This Exists

Payroll is math. Taxes are rules. Benefits are configuration.

None of this requires $40 per employee per month. None of this requires vendor lock-in. None of this should be opaque.

**gusto.do** opens the black box. You see exactly how every dollar is calculated. You run it on your infrastructure. You integrate with anything.

## Get Started

```bash
npx create-dotdo gusto
```

```typescript
import { gusto } from 'gusto.do'

await gusto`hire Sarah at $120k`
await gusto`run payroll`
```

That's it.

## Contributing

gusto.do is open source under MIT license.

```bash
git clone https://github.com/dotdo/gusto.do
cd gusto.do
npm install
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Use it, fork it, build on it.

---

**Stop paying $40/employee. Start talking to your payroll.**

```typescript
await gusto`set up payroll for my company`
```
