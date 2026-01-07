# gusto.do

> Payroll that runs itself. Benefits that make sense. Compliance on autopilot.

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
import { payroll } from 'gusto.do'

await payroll.employees.add({
  name: 'Sarah Chen',
  email: 'sarah@startup.com',
  ssn: '***-**-1234',           // Encrypted at rest
  salary: 120000,
  frequency: 'semi-monthly',
  federalFilingStatus: 'single',
  stateFilingStatus: 'CA-single',
  w4: {
    step2: false,
    step3: 0,
    step4a: 0,
    step4b: 0,
    step4c: 0
  },
  bankAccount: {
    routingNumber: '******456',
    accountNumber: '******7890',
    accountType: 'checking'
  }
})
```

## Features

### Payroll Calculation

The heart of the system. Accurate, auditable, transparent.

```typescript
// Calculate a pay period
const payrun = await payroll.calculate({
  payPeriod: '2025-01-01/2025-01-15',
  employees: ['sarah-chen', 'alex-kim', 'jamie-wong']
})

// See exactly what happened
payrun.employees[0]
// {
//   employee: 'sarah-chen',
//   grossPay: 5000.00,
//   federalWithholding: 847.00,
//   socialSecurity: 310.00,
//   medicare: 72.50,
//   stateWithholding: 264.00,
//   localWithholding: 0,
//   preTaxDeductions: {
//     health: 250.00,
//     hsa: 100.00,
//     401k: 500.00
//   },
//   postTaxDeductions: {
//     roth401k: 0,
//     other: 0
//   },
//   netPay: 2656.50,
//   employerCosts: {
//     socialSecurity: 310.00,
//     medicare: 72.50,
//     futa: 30.00,
//     suta: 125.00,
//     healthContribution: 500.00
//   }
// }
```

### Tax Calculation Engine

Up-to-date federal, state, and local tax tables.

```typescript
// Tax tables are automatically updated
const taxInfo = await payroll.taxes.info('2025')
// {
//   federal: {
//     incomeBrackets: [...],
//     socialSecurityRate: 6.2,
//     socialSecurityWageBase: 176100,
//     medicareRate: 1.45,
//     additionalMedicareThreshold: 200000
//   },
//   states: {
//     CA: { brackets: [...], sdi: 1.1, maxSdi: 1378.48 },
//     NY: { brackets: [...] },
//     // All 50 states + DC
//   },
//   local: {
//     NYC: { rate: 3.876 },
//     // Major localities
//   }
// }

// Calculate withholding for any scenario
const withholding = await payroll.taxes.calculate({
  grossPay: 5000,
  payFrequency: 'semi-monthly',
  filingStatus: 'single',
  state: 'CA',
  locality: null,
  w4: { step2: false, step3: 0, step4a: 0, step4b: 0, step4c: 0 },
  ytdGross: 60000
})
// Shows exactly how each tax was calculated
```

### Payment Processing

Send money via ACH. Track every transaction.

```typescript
// Initiate payroll payments
await payroll.pay({
  payrun: 'payrun-2025-01-15',
  payDate: '2025-01-15'
})

// This:
// 1. Validates all bank accounts
// 2. Creates ACH batch file
// 3. Submits to your bank API
// 4. Records all transactions
// 5. Sends pay stubs to employees

// Track payment status
const status = await payroll.payments.status('payrun-2025-01-15')
// { submitted: true, settled: false, estimatedSettlement: '2025-01-17' }
```

### Tax Filing

Generate and track tax filings.

```typescript
// Quarterly 941 filing
const form941 = await payroll.taxes.generate941({
  quarter: '2025-Q1',
  ein: '12-3456789'
})
// Returns completed Form 941 data

// State filings
const stateFilings = await payroll.taxes.generateStateFilings({
  quarter: '2025-Q1',
  states: ['CA', 'NY', 'WA']
})

// Annual W-2s
const w2s = await payroll.taxes.generateW2s({
  year: '2024'
})

// Track filing deadlines
const deadlines = await payroll.taxes.deadlines()
// [
//   { form: '941', due: '2025-04-30', status: 'pending' },
//   { form: 'CA DE 9', due: '2025-04-30', status: 'pending' },
//   { form: 'W-2', due: '2025-01-31', status: 'filed' }
// ]
```

### Benefits Administration

Health insurance, 401k, HSA - all in one place.

```typescript
// Set up benefit plans
await payroll.benefits.createPlan({
  type: 'health',
  name: 'Gold PPO',
  provider: 'Aetna',
  tiers: [
    { name: 'Employee Only', employeeCost: 250, employerCost: 500 },
    { name: 'Employee + Spouse', employeeCost: 450, employerCost: 800 },
    { name: 'Family', employeeCost: 650, employerCost: 1100 }
  ],
  eligibility: { waitingPeriod: 30, hoursPerWeek: 30 }
})

await payroll.benefits.createPlan({
  type: '401k',
  name: 'Company 401k',
  provider: 'Vanguard',
  employeeContributionLimit: 23000,  // 2024 limit
  employerMatch: {
    formula: '100% up to 4%',
    vestingSchedule: 'immediate'
  }
})

await payroll.benefits.createPlan({
  type: 'hsa',
  name: 'Health Savings Account',
  provider: 'Lively',
  employeeLimit: 4150,              // 2024 single limit
  familyLimit: 8300,
  employerContribution: 500
})

// Employee enrollment
await payroll.benefits.enroll('sarah-chen', {
  health: { plan: 'gold-ppo', tier: 'employee-only' },
  '401k': { contribution: 10 },      // 10% of salary
  hsa: { contribution: 100 }         // $100/month
})
```

### Contractor Payments

Not just employees. Contractors too.

```typescript
await payroll.contractors.add({
  name: 'Design Studio LLC',
  email: 'billing@designstudio.com',
  type: 'business',                  // or 'individual'
  ein: '98-7654321',                 // or SSN for individuals
  bankAccount: { ... }
})

// Pay contractors
await payroll.contractors.pay({
  contractor: 'design-studio-llc',
  amount: 5000,
  description: 'Website redesign - Phase 1',
  payDate: '2025-01-20'
})

// Generate 1099s
const form1099s = await payroll.taxes.generate1099s({
  year: '2024'
})
```

### Time Tracking Integration

For hourly employees.

```typescript
// Import hours from your time tracking system
await payroll.time.import({
  source: 'csv',
  data: `
    employee,date,hours,type
    jamie-wong,2025-01-13,8,regular
    jamie-wong,2025-01-14,10,regular
    jamie-wong,2025-01-14,2,overtime
  `
})

// Or connect to time tracking providers
await payroll.integrations.connect('clockify', {
  apiKey: process.env.CLOCKIFY_API_KEY
})

// Hours sync automatically before payroll
```

## AI Payroll Assistant

**Penny** handles the complexity so you don't have to.

```typescript
import { penny } from 'gusto.do/agents'

// Natural language payroll
await penny`Run payroll for January 15th`
// "I've calculated payroll for 12 employees:
//  - Total gross: $72,500
//  - Total taxes: $18,240
//  - Total deductions: $8,420
//  - Total net: $45,840
//
//  Ready to submit for payment on January 15th?
//  [Approve] [Review Details] [Make Changes]"

await penny`Sarah is getting a raise to $130k starting February 1st`
// "I've updated Sarah Chen's salary to $130,000 annually, effective February 1st.
//  This will change her semi-monthly gross from $5,000 to $5,416.67.
//  Federal withholding will increase by approximately $95/pay period.
//  Want me to recalculate her YTD tax projections?"

await penny`What's our total payroll cost this year?`
// "2025 Year-to-Date Payroll Summary:
//  - Gross wages: $312,500
//  - Employer taxes: $28,125
//  - Benefits costs: $45,000
//  - Total employer cost: $385,625
//
//  You're on track for approximately $925,000 total payroll cost in 2025.
//  This is 12% higher than 2024, primarily due to 3 new hires."
```

### AI Tax Assistant

```typescript
await penny`Are we ready for Q1 tax filing?`
// "Q1 2025 Tax Filing Status:
//
// READY TO FILE:
// - Form 941 (Federal): All data complete
// - CA DE 9/DE 9C: All data complete
// - WA Quarterly Report: All data complete
//
// ACTION NEEDED:
// - 2 employees are missing updated W-4s for 2025
//   - Alex Kim (last updated 2023)
//   - Jamie Wong (last updated 2022)
//
// DEADLINES:
// - All Q1 filings due April 30, 2025
//
// Want me to send W-4 update reminders to Alex and Jamie?"

await penny`Explain Sarah's last paycheck`
// "Sarah Chen's January 15, 2025 Paycheck:
//
// GROSS PAY: $5,000.00
//
// TAXES (32% of gross):
// - Federal income tax: $847.00 (based on $120k annual, single, W-4 defaults)
// - Social Security: $310.00 (6.2% of gross)
// - Medicare: $72.50 (1.45% of gross)
// - CA state tax: $264.00 (based on CA tax brackets)
// - CA SDI: $55.00 (1.1% of gross)
//
// PRE-TAX DEDUCTIONS: $850.00
// - Health insurance: $250.00 (Gold PPO, employee-only)
// - HSA: $100.00
// - 401k: $500.00 (10% contribution)
//
// NET PAY: $2,601.50
//
// This is deposited to her Chase checking account ending in 7890."
```

### AI Benefits Advisor

```typescript
await penny`Help Jamie choose health insurance`
// "Hi Jamie! I can help you compare our health plans.
//
// Based on your profile (single, 28 years old, no dependents):
//
// GOLD PPO ($250/month)
// - Low deductible ($500), low out-of-pocket max ($3,000)
// - See any doctor without referral
// - Best if you expect to use healthcare frequently
//
// SILVER HMO ($150/month)
// - Medium deductible ($1,500), medium out-of-pocket max ($5,000)
// - Need referrals for specialists
// - Best if you're generally healthy but want solid coverage
//
// BRONZE HDHP ($75/month)
// - High deductible ($3,000), but can pair with HSA
// - Company contributes $500/year to your HSA
// - Best if you're very healthy and want to save for future medical costs
//
// Based on your low healthcare usage last year, BRONZE HDHP + HSA
// would save you $2,100/year compared to Gold, while building tax-free savings.
//
// Want to explore any plan in detail?"
```

## Compliance Engine

Payroll compliance is complex. gusto.do tracks it for you.

```typescript
// Check compliance status
const compliance = await payroll.compliance.status()
// {
//   overall: 'attention-needed',
//   items: [
//     { type: 'filing', item: 'Form 941 Q4 2024', status: 'due', deadline: '2025-01-31' },
//     { type: 'form', item: 'W-4 updates', status: 'missing', employees: ['alex-kim'] },
//     { type: 'minimum-wage', item: 'CA minimum wage increase', status: 'action-needed',
//       description: 'CA minimum wage increased to $16.50 on Jan 1. 2 employees affected.' }
//   ]
// }

// Get notified of regulatory changes
await payroll.compliance.subscribe({
  notify: ['email', 'slack'],
  types: ['tax-rate-change', 'minimum-wage', 'new-form', 'deadline']
})
```

### New Hire Reporting

```typescript
// Automatically report new hires (required in most states)
await payroll.compliance.newHireReport({
  employee: 'sarah-chen',
  state: 'CA'
})
// Files with CA EDD within 20 days (as required)
```

### Workers' Comp

```typescript
// Track workers' comp classification
await payroll.workersComp.setClass('sarah-chen', {
  code: '8810',                      // Clerical
  rate: 0.15                         // Per $100 payroll
})

// Calculate premium
const wcPremium = await payroll.workersComp.calculatePremium({
  quarter: '2025-Q1'
})
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

### Banking

```typescript
// Connect to your bank for ACH
await payroll.banking.connect('mercury', {
  apiKey: process.env.MERCURY_API_KEY
})

// Or use traditional banks via Plaid
await payroll.banking.connect('plaid', {
  clientId: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET
})
```

### Accounting

```typescript
// Sync to QuickBooks
await payroll.integrations.connect('quickbooks', {
  // OAuth flow
})

// Automatic journal entries after each payroll
// - Wages expense
// - Tax liabilities
// - Benefits expense
```

### HR Systems

```typescript
// Sync with bamboohr.do
await payroll.integrations.connect('bamboohr.do', {
  // Seamless - same platform
})

// Or other HR systems
await payroll.integrations.connect('bamboohr', {
  apiKey: process.env.BAMBOOHR_API_KEY
})
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

gusto.do opens the black box. You can see exactly how every dollar is calculated. You can run it on your infrastructure. You can integrate with anything.

For companies that want simplicity and don't mind paying for it, traditional payroll providers are fine. For companies that want control and transparency, gusto.do provides the tools.

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

**Your payroll. Your infrastructure. Your control.**
