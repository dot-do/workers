# rippling.do

> One system for people and devices. Unified IT + HR. AI-powered provisioning.

You're a startup founder. You just hired employee #25. You need to create their email, add them to Slack, provision GitHub, ship a laptop, set up payroll, enroll benefits... Two systems. Duplicate data. Manual processes. And both want $35/employee/month. Your growth shouldn't come with a per-seat tax.

## AI-Native API

```typescript
import { rippling } from 'rippling.do'           // Full SDK
import { rippling } from 'rippling.do/tiny'      // Minimal client
import { rippling } from 'rippling.do/hr'        // HR-only operations
```

Natural language for people operations:

```typescript
import { rippling, rio } from 'rippling.do'

// Talk to it like a colleague
const sarah = await rippling`Sarah Chen`
const engineers = await rippling`engineers in Austin`
const onboarding = await rippling`new hires this month`

// Chain like sentences
await rippling`hire Sarah Chen as Engineer`
  .provision(['github', 'linear', 'aws'])
  .shipLaptop()
  .scheduleOnboarding()

// Offboarding that handles itself
await rippling`Sarah's last day is Friday`
  .revokeAccess()
  .recoverDevices()
  .transferFiles()
```

## The workers.do Way

```typescript
import { rippling, rio } from 'rippling.do'

// Natural language provisioning
const employee = await rippling`onboard ${candidate} to ${department}`
const access = await rippling`grant ${employee} access to ${app}`
const device = await rio`ship laptop to ${employee}`

// Promise pipelining for complete onboarding
const provisioned = await rippling`hire ${candidate}`
  .map(emp => rippling`create accounts for ${emp}`)
  .map(emp => rippling`provision ${emp} with ${departmentApps}`)
  .map(emp => rio`ship ${device} to ${emp}`)
  .map(emp => rio`guide ${emp} through IT setup`)

// AI-assisted offboarding
const offboarded = await rio`${employee}'s last day is ${date}`
  .map(emp => rippling`revoke all app access for ${emp}`)
  .map(emp => rippling`recover devices from ${emp}`)
  .map(emp => rippling`transfer ${emp}'s files to ${manager}`)
```

One record. Everything flows. AI handles the provisioning.

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
import { rippling, rio } from 'rippling.do'

// Hire in natural language
await rippling`hire Sarah Chen as Software Engineer in Engineering`

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
// Query anyone naturally
const sarah = await rippling`Sarah Chen`
const engineers = await rippling`engineers in San Francisco`
const onPTO = await rippling`employees on PTO this week`

// AI infers what you need
await rippling`Sarah Chen`              // returns employee
await rippling`Sarah's devices`         // returns device list
await rippling`Sarah's app access`      // returns provisioned apps
```

When Sarah's record changes, everything updates:

```typescript
// Promote in natural language
await rippling`promote Sarah Chen to Tech Lead`

// Automatically:
// - GitHub: Added to 'tech-leads' team
// - AWS: Role upgraded to 'tech-lead' with production access
// - Slack: Added to #tech-leads channel
// - Linear: Made team admin
// - Compensation: Flagged for review
```

When Sarah leaves:

```typescript
// Offboard naturally
await rippling`Sarah's last day is June 30`

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
// Get employee with natural language
const sarah = await rippling`Sarah Chen`

// HR data
sarah.name               // Sarah Chen
sarah.department         // Engineering
sarah.manager            // Alex Kim
sarah.salary             // $150,000
sarah.startDate          // 2025-01-15

// IT data
sarah.email              // sarah@startup.com
sarah.apps               // ['slack', 'github', 'notion', ...]
sarah.devices            // ['macbook-pro-m3-sarah']
sarah.accessLevel        // L3 (department-specific access)

// Computed
sarah.tenure             // 2 months
sarah.isFullyProvisioned // true
sarah.complianceStatus   // 'green'
```

### App Provisioning

Connect your SaaS apps. Provisioning becomes automatic.

```typescript
// Connect apps in natural language
await rippling`connect Google Workspace for startup.com`
await rippling`connect Slack`
await rippling`connect GitHub`

// Define provisioning rules naturally
await rippling`when engineers join`.provision(['github', 'linear', 'slack', 'notion', 'aws'])
await rippling`when tech leads join`.provision(['pagerduty', 'aws production'])
await rippling`when managers join`.provision(['lattice', 'expensify'])

// Or just describe what you want
await rippling`engineers get GitHub, Linear, Slack #engineering, and AWS staging`
await rippling`tech leads also get production AWS and PagerDuty`
```

### Device Management

Laptops, phones, monitors - tracked and managed.

```typescript
// Add devices naturally
await rippling`add MacBook Pro M3 serial C02XX1234567`
await rippling`add 27" LG monitor to inventory`

// Assign to employees
await rippling`give Sarah the new MacBook`
await rippling`ship laptop to Jamie in Austin`

// Track devices
await rippling`Sarah's devices`
await rippling`all laptops in stock`
await rippling`devices needing refresh`

// Off-boarding device recovery
await rippling`recover Sarah's laptop`.returnTo('Office HQ').wipeOnReturn()
await rippling`wipe Jamie's MacBook remotely`
```

### Access Control

Manage who can access what.

```typescript
// Define access levels naturally
await rippling`new employees get Slack #all-hands, Notion public wiki, view-only Drive`
await rippling`full-time employees also get team channels and team drive`
await rippling`after 6 months with manager approval, employees get AWS staging and private repos`

// Grant access on demand
await rippling`Sarah needs Datadog access`.approvedUntil('90 days')
await rippling`give Jamie production AWS access`
await rippling`add the interns to #summer-2025`

// Revoke just as easily
await rippling`remove Jamie's production access`
await rippling`revoke all access for terminated employees`
```

### IT Service Desk

Employees request, IT approves, system provisions.

```typescript
// Employees request naturally
await rippling`Sarah requests Datadog for debugging production`
await rippling`Jamie needs a new monitor for home office`

// IT approves with one line
await rippling`approve Sarah's Datadog request for 90 days`
await rippling`approve Jamie's monitor, ship to home address`

// Track requests
await rippling`pending IT requests`
await rippling`requests this week`
await rippling`Jamie's open requests`
```

### Compliance

Track software licenses, access reviews, security.

```typescript
// License tracking
await rippling`how many Slack seats are we using?`
await rippling`unused Figma licenses`
await rippling`software spend this quarter`

// Access reviews
await rippling`run AWS access review by March 1`
await rippling`who has production access?`
await rippling`access not reviewed in 90 days`

// Security posture
await rippling`security issues`
await rippling`employees without MFA`
await rippling`devices with outdated OS`
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

  // What happens when someone joins
  provision: (employee) => myAppApi.createUser(employee),

  // What happens when someone leaves
  deprovision: (employee) => myAppApi.deleteUser(employee.email),

  // Keep state in sync
  sync: () => myAppApi.listUsers()
})
```

## Provisioning Engine

The rules engine that makes it all work.

```typescript
// Rules read like sentences
await rippling`everyone gets Google Workspace, Slack, and 1Password`
await rippling`engineers also get GitHub, Linear, and AWS staging`
await rippling`managers also get Slack #managers, Lattice, and Expensify`

// Conditional access reads naturally
await rippling`senior engineers with 6+ months get production AWS and PagerDuty`
await rippling`after SOC 2 training, employees can access customer data`

// Chain provisioning with promise pipelining
await rippling`new engineers this quarter`
  .map(emp => rippling`provision ${emp} with standard engineering stack`)
  .map(emp => rippling`ship laptop to ${emp}`)
  .map(emp => rippling`schedule onboarding call for ${emp}`)
```

## Self-Service IT

Employees handle common IT tasks themselves.

```typescript
// Employees request what they need naturally
await rippling`I need Datadog for debugging production`
await rippling`my laptop battery is draining fast`
await rippling`I need a monitor for my home office`

// Managers can act on behalf of reports
await rippling`Sarah needs Figma for the new project`
await rippling`order a standing desk for Jamie`
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
import { rippling } from 'rippling.do'

// One line migration
await rippling`import everything from Rippling`

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
