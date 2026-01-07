# rippling.do

> One system for people and devices. Unified IT + HR. AI-powered provisioning.

## The Problem

When Sarah joins your company, you need to:

**HR Side:**
- Create employee record
- Set up payroll
- Enroll in benefits
- Add to org chart
- Assign manager

**IT Side:**
- Create email account
- Set up Slack
- Provision GitHub
- Add to 1Password
- Ship laptop
- Configure MDM

**Two systems. Duplicate data entry. Manual processes. Things fall through cracks.**

Rippling solved this by unifying HR and IT. One employee record, everything provisions automatically.

But then:

- **$8-35 per employee per month** - Per-module pricing adds up fast
- **$8/device/month** - Your laptops cost more in software than electricity
- **Vendor lock-in** - Once you're in, you're in
- **Creeping complexity** - What started simple became enterprise

**rippling.do** is the same unified vision, but open source. One record for people and devices. AI handles the provisioning.

## One-Click Deploy

```bash
npx create-dotdo rippling
```

Your unified people + IT platform is live.

```typescript
import { rippling } from 'rippling.do'

// Add an employee - everything else happens automatically
await rippling.employees.hire({
  name: 'Sarah Chen',
  email: 'sarah@startup.com',
  role: 'Software Engineer',
  department: 'Engineering',
  startDate: '2025-01-15',
  manager: 'alex-kim',
  location: 'San Francisco'
})

// This triggers:
// - Email account creation (Google Workspace)
// - Slack invite
// - GitHub team addition
// - 1Password vault access
// - MDM enrollment email
// - Welcome email with all credentials
// - Onboarding checklist
```

## The Core Concept: One Record, Everything Flows

The magic is the **employee record as the source of truth**.

```typescript
// The employee record
const sarah = {
  id: 'sarah-chen',
  name: 'Sarah Chen',
  email: 'sarah@startup.com',
  department: 'Engineering',
  role: 'Software Engineer',
  manager: 'alex-kim',
  startDate: '2025-01-15',
  status: 'active'
}

// This drives EVERYTHING:

// Apps (what SaaS they can access)
sarah.apps = ['slack', 'github', 'notion', 'figma', 'linear']

// Devices (what hardware they have)
sarah.devices = ['macbook-pro-m3-sarah']

// Access (what permissions they have)
sarah.access = {
  github: { teams: ['engineering'], role: 'member' },
  slack: { channels: ['#engineering', '#all-hands'] },
  aws: { role: 'developer', accounts: ['staging'] }
}
```

When Sarah's record changes, everything updates:

```typescript
// Sarah gets promoted to Tech Lead
await rippling.employees.update('sarah-chen', {
  role: 'Tech Lead',
  level: 'L5'
})

// Automatically:
// - GitHub: Added to 'tech-leads' team
// - AWS: Role upgraded to 'tech-lead' with production access
// - Slack: Added to #tech-leads channel
// - Linear: Made team admin
// - Compensation: Flagged for review
```

When Sarah leaves:

```typescript
// Sarah leaves the company
await rippling.employees.terminate('sarah-chen', {
  lastDay: '2025-06-30',
  reason: 'resignation'
})

// Automatically:
// - All app access revoked within minutes
// - Devices flagged for return/wipe
// - Email forwarded to manager
// - Calendar cleared
// - Files transferred to manager
// - Final paycheck scheduled
// - COBRA notification prepared
```

## Features

### Unified Employee Record

Everything about a person in one place.

```typescript
const employee = await rippling.employees.get('sarah-chen')

// HR data
employee.name               // Sarah Chen
employee.department         // Engineering
employee.manager            // Alex Kim
employee.salary             // $150,000
employee.startDate          // 2025-01-15

// IT data
employee.email              // sarah@startup.com
employee.apps               // ['slack', 'github', 'notion', ...]
employee.devices            // ['macbook-pro-m3-sarah']
employee.accessLevel        // L3 (department-specific access)

// Computed
employee.tenure             // 2 months
employee.isFullyProvisioned // true
employee.complianceStatus   // 'green'
```

### App Provisioning

Connect your SaaS apps. Provisioning becomes automatic.

```typescript
// Connect apps
await rippling.apps.connect('google-workspace', {
  serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT,
  domain: 'startup.com'
})

await rippling.apps.connect('slack', {
  token: process.env.SLACK_ADMIN_TOKEN
})

await rippling.apps.connect('github', {
  appId: process.env.GITHUB_APP_ID,
  installationId: process.env.GITHUB_INSTALLATION_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY
})

// Define provisioning rules
await rippling.provisioning.rule({
  name: 'Engineering apps',
  when: { department: 'Engineering' },
  provision: [
    { app: 'github', team: 'engineering', role: 'member' },
    { app: 'linear', team: 'engineering' },
    { app: 'slack', channels: ['#engineering', '#dev'] },
    { app: 'notion', workspace: 'engineering' },
    { app: 'aws', role: 'developer', accounts: ['staging'] }
  ]
})

await rippling.provisioning.rule({
  name: 'Tech Lead apps',
  when: { role: 'Tech Lead' },
  provision: [
    { app: 'github', team: 'tech-leads', role: 'maintainer' },
    { app: 'slack', channels: ['#tech-leads', '#architecture'] },
    { app: 'aws', role: 'tech-lead', accounts: ['staging', 'production'] },
    { app: 'pagerduty', role: 'responder' }
  ]
})
```

### Device Management

Laptops, phones, monitors - tracked and managed.

```typescript
// Inventory management
await rippling.devices.add({
  type: 'laptop',
  model: 'MacBook Pro 14" M3',
  serialNumber: 'C02XX1234567',
  purchaseDate: '2025-01-01',
  cost: 2499,
  status: 'in-stock'
})

// Assign to employee
await rippling.devices.assign('macbook-C02XX1234567', {
  employee: 'sarah-chen',
  assignedDate: '2025-01-15'
})

// MDM integration
await rippling.devices.enroll('macbook-C02XX1234567', {
  mdm: 'jamf',
  profile: 'engineering-standard'
})

// Track all devices
const devices = await rippling.devices.list()
// [
//   { serial: 'C02XX1234567', type: 'laptop', assignee: 'sarah-chen', status: 'active' },
//   { serial: 'C02YY7654321', type: 'laptop', assignee: null, status: 'in-stock' },
//   { serial: 'MON123456', type: 'monitor', assignee: 'alex-kim', status: 'active' }
// ]

// Off-boarding device recovery
await rippling.devices.recover('macbook-C02XX1234567', {
  action: 'return',
  returnAddress: 'Office HQ',
  wipeAfterReturn: true
})
```

### Access Control

Manage who can access what.

```typescript
// Define access levels
await rippling.access.defineLevel('L1', {
  name: 'Basic Access',
  description: 'New employees, contractors',
  apps: {
    slack: { channels: ['#all-hands'] },
    notion: { pages: ['public-wiki'] },
    google: { drive: 'view-only' }
  }
})

await rippling.access.defineLevel('L2', {
  name: 'Team Access',
  inherits: 'L1',
  description: 'Full-time employees',
  apps: {
    slack: { channels: ['#team-${department}'] },
    notion: { pages: ['${department}-workspace'] },
    google: { drive: 'team-drive' }
  }
})

await rippling.access.defineLevel('L3', {
  name: 'Sensitive Access',
  inherits: 'L2',
  description: 'Senior employees',
  requires: { tenure: '6 months', review: 'manager' },
  apps: {
    aws: { accounts: ['staging'] },
    github: { repos: ['private-*'] }
  }
})

// Employees automatically get access based on role + tenure
// No manual provisioning needed
```

### IT Service Desk

Employees request, IT approves, system provisions.

```typescript
// Employee requests software
await rippling.requests.create({
  employee: 'sarah-chen',
  type: 'app-access',
  app: 'datadog',
  reason: 'Need to debug production issues',
  urgency: 'medium'
})

// IT approves
await rippling.requests.approve('request-123', {
  approver: 'it-admin',
  notes: 'Approved for 90 days'
})

// System automatically provisions
// - Datadog account created
// - SSO configured
// - Employee notified
// - Access logged

// Track all requests
const requests = await rippling.requests.list({
  status: 'pending'
})
```

### Compliance

Track software licenses, access reviews, security.

```typescript
// Software license tracking
const licenses = await rippling.compliance.licenses()
// {
//   slack: { type: 'per-seat', count: 45, used: 42, cost: '$12/seat/mo' },
//   figma: { type: 'per-seat', count: 20, used: 18, cost: '$15/seat/mo' },
//   github: { type: 'per-seat', count: 50, used: 35, cost: '$4/seat/mo' }
// }

// Access reviews
await rippling.compliance.accessReview({
  scope: 'all-employees',
  apps: ['aws', 'github', 'notion'],
  reviewers: ['department-managers'],
  due: '2025-03-01'
})

// Security posture
const security = await rippling.compliance.security()
// {
//   mfaEnrollment: '98%',
//   ssoAdoption: '100%',
//   deviceCompliance: '95%',
//   issues: [
//     { type: 'mfa-disabled', employees: ['jamie-wong'], risk: 'medium' },
//     { type: 'device-outdated', devices: ['macbook-C02ZZ123'], risk: 'low' }
//   ]
// }
```

## AI Assistant

**Rio** (Rippling Intelligence Operator) handles IT and HR together.

```typescript
import { rio } from 'rippling.do/agents'

// Onboarding
await rio`Sarah Chen starts Monday as a Software Engineer in Engineering`
// "I'll set up Sarah's onboarding:
//
// ACCOUNTS TO CREATE:
// - Google Workspace: sarah@startup.com
// - Slack: @sarah.chen
// - GitHub: Added to 'engineering' team
// - Linear: Added to Engineering workspace
// - Notion: Engineering workspace access
// - AWS: Developer role (staging only)
//
// HARDWARE:
// - MacBook Pro M3 assigned (shipping to SF office)
// - 27" monitor reserved for desk
//
// ONBOARDING:
// - IT setup guide prepared
// - Engineering onboarding checklist activated
// - 1:1 with manager (Alex Kim) scheduled for Day 1
//
// Total setup time: ~5 minutes.
// Ready to proceed?"

// Access requests
await rio`Jamie needs access to production AWS`
// "Jamie Wong is requesting AWS production access.
//
// CURRENT ACCESS:
// - AWS staging: Developer role
// - Tenure: 8 months
// - Department: Engineering
// - Manager: Alex Kim
//
// PRODUCTION ACCESS REQUIRES:
// - Manager approval
// - Security training (completed 2024-11)
// - Access review (last: 2024-12, passed)
//
// RECOMMENDATION: Approve with 90-day review
//
// [Send to Alex Kim for approval] [Deny] [Request more info]"

// Device management
await rio`What devices does the sales team have?`
// "Sales Team Devices (12 employees):
//
// LAPTOPS:
// - 10x MacBook Pro 14" (M2/M3)
// - 2x MacBook Air 13" (M2)
// - 0 Windows devices
//
// MONITORS:
// - 8 employees have external monitors
// - 4 employees laptop-only (remote)
//
// MOBILE:
// - 5 employees have company phones
// - 7 employees BYOD with MDM
//
// ISSUES:
// - 1 laptop battery recall affected (sarah-sales)
// - 2 laptops approaching 3-year refresh (Q2 2025)
//
// Total device cost: $32,500
// Monthly MDM cost: $96"

// Compliance
await rio`Run an access review for AWS`
// "I'll set up an AWS access review.
//
// CURRENT AWS ACCESS:
// - 35 employees have AWS access
// - 8 have production access
// - 27 have staging-only access
//
// REVIEW SCOPE:
// - All production access holders
// - Anyone with staging access unused in 90+ days
//
// REVIEWERS:
// - Engineering: Alex Kim (15 reports)
// - DevOps: Maria Garcia (5 reports)
// - Data: Chris Taylor (8 reports)
//
// TIMELINE:
// - Review period: 2 weeks
// - Auto-revoke if not reviewed: Yes
//
// [Start Review] [Customize Scope] [Cancel]"
```

### AI-Powered Offboarding

```typescript
await rio`Jamie Wong's last day is Friday`
// "I'll prepare Jamie's offboarding for Friday, January 17th.
//
// IMMEDIATE (on last day):
// - Google Workspace: Suspend account, forward email to manager
// - Slack: Deactivate
// - GitHub: Remove from all teams
// - AWS: Revoke all access
// - All other apps: Deactivate
//
// DEVICE RECOVERY:
// - MacBook Pro (C02XX7654321): Shipping label sent
// - Monitor: Office pickup scheduled
// - Return deadline: January 24th
// - Remote wipe: Scheduled for January 25th if not returned
//
// DATA TRANSFER:
// - Google Drive: Transfer ownership to manager
// - GitHub repos: Reassign issues/PRs
// - Notion: Archive personal pages
//
// HR:
// - Final paycheck: Calculated and scheduled
// - Benefits: COBRA info prepared
// - Exit interview: Scheduled Thursday 3pm
//
// Total offboarding tasks: 23
// Estimated auto-completion: 95%
// Manual tasks: Return device, exit interview
//
// [Execute Offboarding Plan] [Review Details] [Delay]"
```

### AI Security Operations

```typescript
await rio`Check for security issues`
// "Security Posture Report:
//
// CRITICAL (0):
// No critical issues
//
// HIGH (2):
// - Jamie Wong: MFA disabled 3 days ago
//   Action: Re-enable required, sent reminder
// - Unused admin account: 'old-cto@startup.com'
//   Action: Recommend immediate deactivation
//
// MEDIUM (5):
// - 3 employees on outdated macOS
// - 2 GitHub personal tokens older than 1 year
//
// LOW (12):
// - Various minor compliance items
//
// POSITIVE:
// - SSO adoption: 100%
// - Device encryption: 100%
// - Password manager: 95%
// - Security training: 92% current
//
// [Fix Critical/High Issues] [Generate Full Report] [Schedule Review]"
```

## Architecture

rippling.do unifies HR and IT in a single data model.

```
EmployeeDO               - The source of truth
  |                        Personal info, role, department, status
  |
  +-- AppAccessDO        - What SaaS they can use
  |                        Provisioning rules, current access
  |
  +-- DeviceDO           - What hardware they have
  |                        Laptops, phones, peripherals
  |
  +-- AccessLevelDO      - What permissions they have
                           L1/L2/L3, custom grants

ProvisioningDO           - Rules engine
  |                        When X, provision Y
  |
ConnectorDO              - App integrations
  |                        Google, Slack, GitHub, AWS, etc.
  |
ComplianceDO             - Tracking and audits
                           Licenses, reviews, security
```

### Connectors

Pre-built integrations for common apps:

| Category | Apps |
|----------|------|
| **Identity** | Google Workspace, Microsoft 365, Okta, OneLogin |
| **Communication** | Slack, Microsoft Teams, Zoom, Discord |
| **Development** | GitHub, GitLab, Bitbucket, Linear, Jira |
| **Cloud** | AWS, GCP, Azure, Vercel, Cloudflare |
| **Productivity** | Notion, Confluence, Asana, Monday |
| **Design** | Figma, Canva, Adobe CC |
| **Security** | 1Password, Dashlane, CrowdStrike |
| **MDM** | Jamf, Kandji, Mosyle, Intune |
| **HR/Payroll** | bamboohr.do, gusto.do, workday.do |

Building a connector:

```typescript
import { Connector } from 'rippling.do'

export const MyAppConnector = Connector({
  name: 'my-app',
  auth: 'oauth2',

  provision: async (employee, config) => {
    // Create account in my-app
    await myAppApi.createUser({
      email: employee.email,
      name: employee.name,
      role: config.role
    })
  },

  deprovision: async (employee) => {
    // Remove account
    await myAppApi.deleteUser(employee.email)
  },

  sync: async () => {
    // Reconcile state
    const users = await myAppApi.listUsers()
    return users
  }
})
```

## Provisioning Engine

The rules engine that makes it all work.

```typescript
// Rules are evaluated in order
// First match wins (unless 'additive: true')

await rippling.provisioning.rules([
  // Everyone gets these
  {
    name: 'All employees',
    when: { status: 'active' },
    provision: [
      { app: 'google-workspace' },
      { app: 'slack', channels: ['#all-hands', '#random'] },
      { app: '1password', vault: 'company' }
    ]
  },

  // Department-specific
  {
    name: 'Engineering',
    when: { department: 'Engineering' },
    additive: true,
    provision: [
      { app: 'github', org: 'startup', team: 'engineering' },
      { app: 'linear', team: 'engineering' },
      { app: 'aws', role: 'developer', accounts: ['staging'] }
    ]
  },

  // Role-specific
  {
    name: 'Managers',
    when: { hasDirectReports: true },
    additive: true,
    provision: [
      { app: 'slack', channels: ['#managers'] },
      { app: 'lattice', role: 'manager' },
      { app: 'expensify', role: 'approver' }
    ]
  },

  // Special access
  {
    name: 'Production access',
    when: {
      department: 'Engineering',
      level: { gte: 'L4' },
      tenure: { gte: '6 months' }
    },
    additive: true,
    provision: [
      { app: 'aws', accounts: ['production'], role: 'senior-developer' },
      { app: 'pagerduty', role: 'responder' }
    ]
  }
])
```

## Self-Service IT

Employees handle common IT tasks themselves.

```typescript
// Employee self-service portal
await rippling.self.requestApp('sarah-chen', 'datadog', {
  reason: 'Debugging production issues'
})

await rippling.self.reportIssue('sarah-chen', {
  type: 'device',
  device: 'macbook-C02XX1234567',
  issue: 'Battery draining quickly',
  priority: 'low'
})

await rippling.self.requestDevice('sarah-chen', {
  type: 'monitor',
  model: 'LG 27" 4K',
  reason: 'Remote work setup'
})
```

## Pricing

| Plan | Price | What You Get |
|------|-------|--------------|
| **Self-Hosted** | $0 | Run it yourself, unlimited employees/devices |
| **Managed** | $149/mo | Hosted, connector updates, support |
| **Enterprise** | Custom | SLA, dedicated support, custom connectors |

**No per-employee or per-device fees.**

- 100 employees + 150 devices on Rippling: ~$3,000+/month
- Same on rippling.do Managed: $149/month

## Migration

Import from Rippling:

```typescript
import { migrate } from 'rippling.do/migrate'

await migrate.fromRippling({
  apiKey: process.env.RIPPLING_API_KEY
})

// Imports:
// - All employee records
// - App assignments
// - Device inventory
// - Access levels
// - Provisioning rules (as best-effort)
```

## Why This Exists

Rippling had the right idea: people and devices are connected. Manage them together.

But the implementation became another expensive enterprise tool. Per-seat pricing for HR, per-device for IT, per-module for everything else.

The insight that HR and IT belong together doesn't require $50+ per employee per month. It requires good data modeling and integration work.

**rippling.do** provides the unified platform without the unified invoice.

## Contributing

rippling.do is open source under MIT license.

```bash
git clone https://github.com/dotdo/rippling.do
cd rippling.do
npm install
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Build on it, sell it, make it yours.

---

**One record. Everything flows. Zero per-seat fees.**
