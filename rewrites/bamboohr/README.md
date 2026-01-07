# bamboohr.do

> Simple HR for growing teams. AI-powered. Zero per-employee fees.

## The Problem

BambooHR built a great product for SMBs. But then they adopted enterprise pricing.

**$6-8 per employee per month** sounds reasonable until:

- Your 50-person startup pays $4,800/year for employee records
- Your 200-person company pays $19,200/year for spreadsheet replacement
- The "affordable" HR system costs more than your CRM

What you actually need:
- Store employee info (spreadsheet could do this)
- Track time off (spreadsheet could do this)
- Onboard new hires (checklist could do this)
- Run performance reviews (Google Forms could do this)

What you're paying for:
- Per-employee pricing that scales against you
- "Integrations" to connect to your other tools
- A nice UI around basic CRUD operations

**bamboohr.do** gives you everything BambooHR does, running on your infrastructure, with AI that actually helps.

## One-Click Deploy

```bash
npx create-dotdo bamboohr
```

Your SMB-grade HR system is live. No per-employee fees. Ever.

```typescript
import { hr } from 'bamboohr.do'

// Add your first employee
await hr.employees.add({
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah@startup.com',
  department: 'Engineering',
  startDate: '2025-01-15',
  manager: 'alex-kim'
})
```

## Features

### Employee Directory

The heart of any HR system. Everyone in one place.

```typescript
// Full employee profiles
const sarah = await hr.employees.get('sarah-chen')

sarah.firstName        // Sarah
sarah.department       // Engineering
sarah.manager          // Alex Kim
sarah.location         // San Francisco
sarah.startDate        // 2025-01-15
sarah.tenure           // "2 months" (computed)

// Org chart built-in
const engineering = await hr.directory.team('engineering')
// Returns hierarchy: manager -> reports -> their reports

// Search across all fields
await hr.directory.search('san francisco engineering')
```

### Time Off

Request, approve, track. No spreadsheets.

```typescript
// Check balances
const balance = await hr.timeOff.balance('sarah-chen')
// {
//   vacation: { available: 80, accrued: 96, used: 16, unit: 'hours' },
//   sick: { available: 40, accrued: 40, used: 0, unit: 'hours' },
//   personal: { available: 16, accrued: 16, used: 0, unit: 'hours' }
// }

// Request time off
await hr.timeOff.request({
  employee: 'sarah-chen',
  type: 'vacation',
  start: '2025-03-17',
  end: '2025-03-21',
  hours: 40,
  notes: 'Spring break trip'
})
// Auto-routes to manager for approval

// Manager approves
await hr.timeOff.approve('request-123', {
  approver: 'alex-kim',
  notes: 'Enjoy your trip!'
})

// Calendar view
await hr.timeOff.calendar('2025-03')
// Shows who's out when
```

### Onboarding

New hire checklists that actually get completed.

```typescript
// Create onboarding workflow
await hr.onboarding.createWorkflow('engineering-new-hire', {
  tasks: [
    // Before day 1
    { task: 'Send welcome email', due: -7, assignee: 'hr' },
    { task: 'Order laptop', due: -7, assignee: 'it' },
    { task: 'Set up accounts', due: -3, assignee: 'it' },
    { task: 'Assign buddy', due: -3, assignee: 'manager' },

    // Day 1
    { task: 'Complete I-9', due: 0, assignee: 'employee' },
    { task: 'Review handbook', due: 0, assignee: 'employee' },
    { task: 'Team introductions', due: 0, assignee: 'manager' },

    // First week
    { task: 'Set up dev environment', due: 3, assignee: 'employee' },
    { task: '1:1 with manager', due: 5, assignee: 'manager' },
    { task: 'First project assignment', due: 5, assignee: 'manager' },

    // First month
    { task: '30-day check-in', due: 30, assignee: 'hr' },
  ]
})

// Start onboarding for new hire
await hr.onboarding.start('sarah-chen', 'engineering-new-hire')

// Track progress
const status = await hr.onboarding.status('sarah-chen')
// { completed: 5, total: 11, nextTask: 'Set up dev environment', dueIn: '2 days' }
```

### Performance Management

Goal setting, reviews, feedback. Lightweight but effective.

```typescript
// Set goals
await hr.performance.setGoals('sarah-chen', {
  period: '2025-Q1',
  goals: [
    {
      title: 'Ship authentication service',
      description: 'Design and implement OAuth2 + SAML support',
      weight: 40,
      keyResults: [
        'OAuth2 provider integration complete',
        'SAML SSO working with 3+ IdPs',
        '< 100ms auth latency'
      ]
    },
    {
      title: 'Reduce API errors by 50%',
      description: 'Improve error handling and monitoring',
      weight: 30,
      keyResults: [
        'Error rate < 0.1%',
        'All errors properly categorized',
        'Alerting in place for anomalies'
      ]
    },
    {
      title: 'Mentor junior developer',
      description: 'Help Jamie ramp up on the codebase',
      weight: 30,
      keyResults: [
        'Weekly 1:1s scheduled',
        'Code review feedback provided',
        'Jamie shipping independently by end of Q1'
      ]
    }
  ]
})

// Request feedback
await hr.performance.requestFeedback('sarah-chen', {
  from: ['alex-kim', 'jamie-wong', 'chris-taylor'],
  questions: [
    'What should Sarah keep doing?',
    'What could Sarah improve?',
    'Any other feedback?'
  ],
  due: '2025-03-15'
})

// Conduct review
await hr.performance.createReview('sarah-chen', {
  reviewer: 'alex-kim',
  period: '2025-Q1',
  rating: 'exceeds-expectations',
  summary: 'Sarah has been exceptional...',
  goalAssessments: [
    { goal: 'Ship authentication service', rating: 'met', notes: '...' },
    // ...
  ]
})
```

### Document Storage

Employee documents in one place.

```typescript
// Store documents
await hr.documents.upload('sarah-chen', {
  type: 'offer-letter',
  file: offerLetterPdf,
  visibility: 'employee-and-hr'
})

// Organize by type
await hr.documents.list('sarah-chen')
// [
//   { type: 'offer-letter', uploaded: '2025-01-01' },
//   { type: 'i9', uploaded: '2025-01-15' },
//   { type: 'w4', uploaded: '2025-01-15' },
//   { type: 'direct-deposit', uploaded: '2025-01-15' }
// ]

// E-signature integration
await hr.documents.requestSignature('sarah-chen', {
  document: 'policy-update-2025',
  due: '2025-02-01'
})
```

### Reporting

See your workforce data clearly.

```typescript
// Headcount over time
await hr.reports.headcount({
  from: '2024-01-01',
  to: '2025-01-01',
  groupBy: 'department'
})

// Turnover analysis
await hr.reports.turnover({
  period: '2024',
  groupBy: 'department'
})
// { engineering: 8%, sales: 22%, support: 15% }

// Time off utilization
await hr.reports.timeOffUtilization({
  period: '2024',
  type: 'vacation'
})

// Tenure distribution
await hr.reports.tenure()
// { '<1 year': 35%, '1-2 years': 25%, '2-5 years': 30%, '5+ years': 10% }

// Custom reports
await hr.reports.custom({
  select: ['department', 'location', 'count(*)'],
  groupBy: ['department', 'location'],
  where: { status: 'active' }
})
```

## AI Assistant

**Olive** is your AI HR assistant. Named after the olive branch - extending help to everyone.

```typescript
import { olive } from 'bamboohr.do/agents'

// Employees get instant answers
await olive`How much PTO do I have?`
// "You have 80 hours of vacation, 40 hours of sick leave, and 16 hours of personal time available."

await olive`I need to take next Friday off`
// "I've created a vacation request for Friday, March 21st (8 hours).
//  I've sent this to Alex Kim for approval. You'll be notified when approved."

await olive`What's the policy on remote work?`
// "According to our Employee Handbook (last updated January 2025):
//  - Engineering can work remotely up to 3 days per week
//  - Remote work requires manager approval for more than 3 consecutive days
//  - International remote work requires HR approval
//  Would you like me to submit a remote work request?"

await olive`Who's out this week?`
// "This week in Engineering:
//  - Jamie Wong: Out Monday (sick)
//  - Chris Taylor: Out Thursday-Friday (vacation)
//  - Maria Garcia: Working remotely Tuesday-Thursday"
```

### AI-Powered Onboarding

Olive guides new hires through their first days:

```typescript
// New hire asks Olive for help
await olive`Hi, I'm new here. What should I do first?`
// "Welcome to the team, Sarah! I'm Olive, your HR assistant.
//
// For today, here's what you need to complete:
// 1. Complete your I-9 form (I can help you with this)
// 2. Review the employee handbook
// 3. Your team intro meeting is at 2pm in Conf Room A
//
// Would you like to start with the I-9? I can walk you through it."

await olive`Yes, let's do the I-9`
// "Great! The I-9 verifies your identity and work authorization.
//
// I've pulled up the form. For Section 1, I'll need:
// - Full legal name (I have Sarah Chen from your profile)
// - Address (I have 123 Main St, San Francisco)
// - Date of birth
// - Social Security Number
// - Citizenship status
//
// Does 'Sarah Chen' at '123 Main St' look correct?"
```

### AI-Assisted Performance Reviews

```typescript
// Manager asks for help writing reviews
await olive`Help me write Sarah's performance review`
// "Based on Sarah's goals and activity this quarter:
//
// GOALS ACHIEVED:
// - Authentication service shipped 2 weeks early
// - API errors reduced by 62% (exceeded 50% target)
// - Weekly mentoring sessions with Jamie documented
//
// FEEDBACK RECEIVED:
// - Peers praised her code review thoroughness
// - Jamie mentioned her patience and clear explanations
//
// DRAFT SUMMARY:
// 'Sarah exceeded expectations in Q1. She delivered the critical
// authentication service ahead of schedule while significantly
// improving system reliability. Her mentorship of Jamie has
// accelerated his onboarding and demonstrates leadership potential.'
//
// Would you like me to draft the full review based on this?"
```

### AI for HR Operations

```typescript
// HR asks for insights
await olive`Show me onboarding completion rates by department`
// "Onboarding completion rates (last 12 months):
//
// Engineering: 94% completed within 30 days
// Sales: 87% completed within 30 days
// Marketing: 91% completed within 30 days
// Support: 78% completed within 30 days (below target)
//
// Support has the most 'buddy assignment' task failures.
// Recommend: Review Support buddy program capacity."

await olive`Draft an announcement for the new PTO policy`
// "Here's a draft announcement:
//
// Subject: Updated PTO Policy - More Flexibility in 2025
//
// Team,
//
// We're excited to announce updates to our PTO policy, effective March 1st:
//
// - Vacation increases from 15 to 20 days annually
// - Unused PTO now rolls over (up to 5 days)
// - New 'floating holidays' - 3 days for personal observances
//
// Full details in the updated handbook. Questions? Ask me or Olive.
//
// - HR Team
//
// Want me to adjust the tone or add anything?"
```

## Self-Service

Employees handle their own HR tasks. No tickets required.

```typescript
// Employee updates their own info
await hr.self.updateAddress('sarah-chen', {
  street: '456 Oak Ave',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102'
})

// Emergency contact
await hr.self.updateEmergencyContact('sarah-chen', {
  name: 'John Chen',
  relationship: 'Spouse',
  phone: '415-555-1234'
})

// Direct deposit
await hr.self.updateBankAccount('sarah-chen', {
  routingNumber: '******456',
  accountNumber: '******7890',
  accountType: 'checking'
})

// View pay stubs (if using payroll integration)
await hr.self.payStubs('sarah-chen')

// Update profile photo
await hr.self.updatePhoto('sarah-chen', photoBlob)
```

## Architecture

bamboohr.do runs on Cloudflare Workers + Durable Objects.

```
EmployeeDO               - Individual employee record
  |                        Profile, history, documents
  |
OrganizationDO           - Company structure
  |                        Departments, teams, hierarchy
  |
TimeOffDO                - Leave management
  |                        Balances, requests, policies
  |
OnboardingDO             - New hire workflows
  |                        Checklists, progress, tasks
  |
PerformanceDO            - Goals and reviews
  |                        OKRs, feedback, ratings
  |
DocumentDO               - Employee documents
                           Storage in R2, metadata in SQLite
```

**Storage:**
- **SQLite (in DO)** - Active employees, current data
- **R2** - Documents, photos, attachments
- **R2 Archive** - Terminated employees, historical data

## Integrations

### Payroll (Optional)

Connect to your payroll provider:

```typescript
await hr.integrations.connect('gusto', {
  apiKey: process.env.GUSTO_API_KEY
})

// Or use gusto.do for fully integrated payroll
await hr.integrations.connect('gusto.do', {
  // Same account - seamless integration
})
```

### SSO

```typescript
await hr.integrations.connect('okta', {
  clientId: process.env.OKTA_CLIENT_ID,
  clientSecret: process.env.OKTA_CLIENT_SECRET
})

// Employees sign in with company SSO
```

### Slack

```typescript
await hr.integrations.connect('slack', {
  botToken: process.env.SLACK_BOT_TOKEN
})

// Notifications in Slack
// - "Sarah Chen joined the team!"
// - "Time off request approved"
// - "New company announcement"

// Ask Olive in Slack
// @Olive how much PTO do I have?
```

### Calendar

```typescript
await hr.integrations.connect('google-calendar', {
  // Syncs time-off to team calendars
})
```

## Pricing

| Plan | Price | What You Get |
|------|-------|--------------|
| **Self-Hosted** | $0 | Run it yourself, unlimited employees |
| **Managed** | $99/mo | Hosted, automatic updates, support |
| **Enterprise** | Custom | SLA, dedicated support, customization |

**No per-employee fees. Ever.**

A 200-person company on BambooHR: ~$19,200/year
Same company on bamboohr.do Managed: $1,188/year

## Migration

Import from BambooHR:

```typescript
import { migrate } from 'bamboohr.do/migrate'

await migrate.fromBambooHR({
  apiKey: process.env.BAMBOOHR_API_KEY,
  subdomain: 'your-company'
})

// Imports:
// - All employee records
// - Time off balances and history
// - Documents
// - Org structure
```

## Why This Exists

BambooHR was founded to be simpler than enterprise HR. They succeeded. Then they adopted per-employee pricing and became what they replaced - software that costs more as you grow.

HR shouldn't be a tax on headcount. Your employee records aren't more expensive because you have more employees. The marginal cost of row 51 vs row 50 in a database is zero.

**bamboohr.do** returns to the original promise: simple HR for growing teams. Now with AI that actually helps.

## Contributing

bamboohr.do is open source under MIT license.

```bash
git clone https://github.com/dotdo/bamboohr.do
cd bamboohr.do
npm install
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Build on it, sell it, make it yours.

---

**Simple HR. Smart AI. Zero per-employee fees.**
