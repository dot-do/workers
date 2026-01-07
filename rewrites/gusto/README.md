# gusto.do

> Payroll that runs itself. Benefits that make sense. Compliance on autopilot.

You're a startup founder. You just made your first hires. Payroll software wants $40/employee/month - that's $9,600/year for a 20-person team. To do math. And send ACH transfers. Your payroll cost shouldn't scale with your headcount.

## AI-Native API

```typescript
import { gusto, penny, employee, payroll } from 'gusto.do'

// Natural language payroll
const sarah = await employee`add Sarah Chen, $120k semi-monthly, CA single filer`
const delinquent = await gusto`employees missing W-4 updates`

// Promise pipelining for payroll
const processed = await payroll`calculate for Jan 15`
  .map(run => penny`review for anomalies`)
  .map(reviewed => gusto`show detailed breakdown`)
  .map(breakdown => payroll`submit for payment`)

// Benefits enrollment with AI
const enrolled = await gusto`set up benefits: Gold PPO, 401k 4% match, HSA`
  .map(plans => employee`enroll ${sarah} in Gold PPO, 401k 10%`)
  .map(enrolled => penny`explain coverage to employee`)

// Compensation changes in one chain
const promoted = await penny`promote Sarah to Senior Engineer`
  .map(emp => employee`update salary to $145k`)
  .map(emp => gusto`recalculate withholdings`)
  .map(emp => penny`send compensation change letter`)
```

One API call. Natural language. AI handles the complexity. Record-replay pipelining.

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
import { employee, penny } from 'gusto.do'

// Natural language employee onboarding
const sarah = await employee`add Sarah Chen, $120k semi-monthly, CA single filer`
await employee`${sarah} direct deposit to Chase checking ending 7890`

// Penny handles the complexity
await penny`onboard Sarah with standard W-4 defaults`
// "I've set up Sarah Chen with:
//  - Salary: $120,000/year ($5,000/pay period)
//  - Pay schedule: Semi-monthly (1st and 15th)
//  - Tax filing: Single, CA resident
//  - W-4: Standard withholding (no adjustments)
//  - Direct deposit: Chase checking ***7890
//
//  Ready to include in next payroll?"
```

## Features

### Payroll Calculation

The heart of the system. Accurate, auditable, transparent.

```typescript
import { payroll, penny, gusto } from 'gusto.do'

// Natural language payroll run
const jan15 = await payroll`calculate for January 15th`
// Returns full breakdown for all employees

// AI review catches anomalies
await penny`review ${jan15} for anomalies`
// "Payroll looks good. One note: Sarah's overtime pushed her into
//  a higher federal bracket this period. Want me to explain?"

// Get detailed breakdown
await gusto`show ${jan15} breakdown for Sarah`
// "Sarah Chen - January 15, 2025:
//  Gross: $5,000 | Taxes: $1,548.50 | Deductions: $850 | Net: $2,601.50"

// Submit when ready
await payroll`submit ${jan15} for payment`
```

### Tax Calculation Engine

Up-to-date federal, state, and local tax tables.

```typescript
import { gusto, penny, taxes } from 'gusto.do'

// Natural language tax queries
await gusto`what's our Q1 tax liability?`
// "Q1 2025 Tax Liability: $45,230
//  Federal: $28,400 | CA State: $12,830 | FICA: $4,000"

// AI explains complex scenarios
await penny`explain Sarah's tax withholding`
// "Sarah's federal withholding ($847/period) is based on:
//  - $120k annual salary → 22% marginal bracket
//  - Single filer, standard W-4
//  - No additional withholding requested
//  She'll owe approximately $800 at tax time. Want me to adjust?"

// Pipelined tax projections
const projection = await taxes`project year-end for all employees`
  .map(proj => penny`flag anyone who'll owe more than $1000`)
  .map(flagged => gusto`suggest W-4 adjustments`)
```

### Payment Processing

Send money via ACH. Track every transaction.

```typescript
import { payroll, penny, payments } from 'gusto.do'

// Submit payroll for payment
const paid = await payroll`submit January 15th for payment`
// Validates accounts → Creates ACH batch → Submits to bank → Records transactions

// Natural language status checks
await payments`status for January 15th payroll`
// "Submitted Jan 14 at 4:30pm. Settlement expected Jan 17."

// Pipelined payment with notifications
await payroll`submit ${jan15}`
  .map(paid => penny`send pay stubs to all employees`)
  .map(sent => penny`notify finance team of settlement date`)
```

### Tax Filing

Generate and track tax filings.

```typescript
import { taxes, penny, gusto } from 'gusto.do'

// Natural language tax filings
await taxes`generate Q1 941`
await taxes`prepare state filings for CA, NY, WA`
await taxes`generate 2024 W-2s for all employees`

// AI-assisted filing review
const q1 = await taxes`prepare all Q1 filings`
  .map(filings => penny`review for accuracy`)
  .map(reviewed => taxes`submit to agencies`)
  .map(submitted => penny`notify finance of confirmation numbers`)

// Deadline tracking with AI
await gusto`what tax deadlines are coming up?`
// "Upcoming deadlines:
//  - Form 941 Q1: Due April 30 (pending)
//  - CA DE 9: Due April 30 (pending)
//  - All W-2s: Filed January 28 ✓"
```

### Benefits Administration

Health insurance, 401k, HSA - all in one place.

```typescript
import { benefits, employee, penny } from 'gusto.do'

// Natural language benefits setup
await benefits`create Gold PPO: $250/employee, $450/family, 30-day waiting period`
await benefits`create 401k: Vanguard, 100% match up to 4%, immediate vesting`
await benefits`create HSA: Lively, $500 employer contribution`

// AI-guided enrollment
const enrolled = await penny`help Sarah pick her benefits`
  .map(choices => employee`enroll Sarah in ${choices}`)
  .map(enrolled => penny`explain her coverage and payroll impact`)

// Bulk enrollment with AI review
await benefits`open enrollment for January`
  .map(window => penny`remind all employees to enroll`)
  .map(enrolled => penny`flag anyone who missed enrollment`)
  .map(flagged => penny`send final reminders`)
```

### Contractor Payments

Not just employees. Contractors too.

```typescript
import { contractor, payments, taxes } from 'gusto.do'

// Natural language contractor management
const studio = await contractor`add Design Studio LLC, EIN 98-7654321`
await contractor`${studio} direct deposit to Mercury checking ending 4567`

// Pay contractors naturally
await payments`pay Design Studio $5000 for website redesign Phase 1`

// 1099 generation with AI review
await taxes`generate 2024 1099s`
  .map(forms => penny`review for accuracy and missing info`)
  .map(reviewed => taxes`file with IRS`)
```

### Time Tracking Integration

For hourly employees.

```typescript
import { time, payroll, penny } from 'gusto.do'

// Natural language time entry
await time`Jamie worked 8 hours Monday, 10 hours + 2 OT Tuesday`

// Sync from external systems
await time`sync hours from Clockify`

// AI-reviewed payroll with time data
await payroll`calculate for January 15th`
  .map(run => penny`verify overtime calculations for hourly employees`)
  .map(verified => penny`flag any unusual patterns`)
```

## AI Payroll Assistant

**Penny** handles the complexity so you don't have to.

```typescript
import { penny, payroll, employee } from 'gusto.do'

// Full payroll workflow with AI
await penny`run payroll for January 15th`
// "I've calculated payroll for 12 employees:
//  - Total gross: $72,500
//  - Total taxes: $18,240
//  - Total deductions: $8,420
//  - Total net: $45,840
//
//  Ready to submit for payment?
//  [Approve] [Review Details] [Make Changes]"

// Compensation changes with automatic recalculation
await penny`give Sarah a raise to $130k starting February 1st`
// "Done! Sarah's new semi-monthly gross: $5,416.67
//  Federal withholding increases ~$95/period.
//  Want me to recalculate her YTD tax projections?"

// Intelligent cost analysis
await penny`what's our total payroll cost this year?`
// "2025 YTD: $385,625 (gross + taxes + benefits)
//  Projected annual: $925,000 (+12% vs 2024, 3 new hires)"
```

### AI Tax Assistant

```typescript
import { penny, taxes } from 'gusto.do'

// Filing readiness check with AI
await penny`are we ready for Q1 tax filing?`
// "Ready: Form 941, CA DE 9, WA Quarterly
//  Action needed: Alex and Jamie missing 2025 W-4 updates
//  Deadline: April 30. Want me to send reminders?"

// Paycheck explanations for employees
await penny`explain Sarah's last paycheck`
// "Sarah's Jan 15 paycheck:
//  Gross $5,000 → Taxes $1,548.50 → Deductions $850 → Net $2,601.50
//  Deposited to Chase ***7890"

// Proactive tax optimization
await taxes`analyze withholdings for all employees`
  .map(analysis => penny`recommend adjustments to minimize year-end surprises`)
```

### AI Benefits Advisor

```typescript
import { penny, benefits, employee } from 'gusto.do'

// Personalized benefits guidance
await penny`help Jamie choose health insurance`
// "Based on your profile (single, 28, low healthcare usage):
//  Bronze HDHP + HSA saves $2,100/year vs Gold, builds tax-free savings.
//  Want details on any plan?"

// Full enrollment workflow
const jamie = await employee`get Jamie Wong`
await penny`guide ${jamie} through benefits enrollment`
  .map(choices => employee`enroll ${jamie} in ${choices}`)
  .map(enrolled => penny`send confirmation with coverage summary`)
  .map(confirmed => penny`schedule 30-day check-in`)
```

## Compliance Engine

Payroll compliance is complex. gusto.do tracks it for you.

```typescript
import { compliance, penny, gusto } from 'gusto.do'

// Natural language compliance checks
await compliance`what needs attention?`
// "Action needed:
//  - Form 941 Q4 due Jan 31
//  - Alex Kim missing W-4 update
//  - CA minimum wage increase affects 2 hourly employees"

// AI-managed compliance with notifications
await penny`set up compliance alerts for Slack and email`
await penny`notify me of tax rate changes and deadlines`

// New hire reporting (required in most states)
await compliance`report Sarah Chen as new hire in CA`
// Files with CA EDD within 20 days as required

// Workers' comp management
await compliance`classify Sarah as clerical (8810)`
await gusto`what's our Q1 workers comp premium?`
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
// View access logs
const logs = await payroll.audit.logs({
  from: '2025-01-01',
  filter: { dataType: 'ssn' }
})
// Shows who accessed SSN data and when
```

## Integrations

```typescript
import { gusto, penny } from 'gusto.do'

// Natural language integrations
await gusto`connect to Mercury for ACH payments`
await gusto`sync with QuickBooks for journal entries`
await gusto`connect to bamboohr.do for employee data`

// AI-managed sync
await penny`after each payroll, sync to QuickBooks and notify finance`
await penny`when new employees are added in BambooHR, set them up in payroll`
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
// Check for updates
const updates = await payroll.taxes.checkUpdates()
// [
//   { type: 'federal', effective: '2025-01-01', status: 'applied' },
//   { type: 'state', state: 'CA', effective: '2025-01-01', status: 'applied' },
//   { type: 'local', locality: 'SF', effective: '2025-07-01', status: 'scheduled' }
// ]

// Updates are applied automatically for Managed plan
// Self-hosted users run:
npx gusto-do update-taxes
```

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

Your payroll infrastructure in 60 seconds:

```bash
npx create-dotdo gusto
```

Then add your first employee:

```typescript
import { employee, penny, payroll } from 'gusto.do'

const sarah = await employee`add Sarah Chen, $120k semi-monthly, CA`
await penny`run payroll for the 15th`
```

That's it. Penny handles the rest.

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

**Stop paying $40/employee. Start running your own payroll.**

```typescript
import { penny } from 'gusto.do'

await penny`set up my company's payroll`
```
