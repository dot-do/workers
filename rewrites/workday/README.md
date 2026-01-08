# workday.do

> Enterprise HCM. Edge-Native. Open by Default. AI-First.

Workday charges enterprises millions for implementations, locks them into proprietary systems, and treats AI as an afterthought. Implementation takes 6-18 months. Licensing costs $100K+ annually. The system that manages your people requires its own team to manage.

**workday.do** is the open-source alternative. Deploy in minutes, not months. AI-native from day one. Your data, your infrastructure.

## AI-Native API

```typescript
import { workday } from 'workday.do'           // Full SDK
import { workday } from 'workday.do/tiny'      // Minimal client
import { workday } from 'workday.do/payroll'   // Payroll-only operations
```

Natural language for HR workflows:

```typescript
import { workday } from 'workday.do'

// Talk to it like a colleague
await workday`hire Alex Chen as Software Engineer in Engineering at $150k starting Jan 15`
await workday`promote Alex to Senior Engineer at $165k effective March 1`
await workday`Alex's vacation balance`

// Chain like sentences
await workday`engineers needing reviews`
  .notify(`Your performance review is due`)

// Requests that route themselves
await workday`request 40 hours vacation for Alex Chen Feb 17-21`
  .route('manager-approval')
  .onApprove(async () => await workday`block Alex's calendar`)
```

## The Problem

Workday changed the world by moving HR to the cloud. But that was 2005.

| What Workday Charges | The Reality |
|---------------------|-------------|
| **Implementation** | $500K-5M+ (6-18 month projects) |
| **Annual Licensing** | $100K-1M+ per year |
| **Per-Employee Fees** | $50-200 per employee per month |
| **AI Features** | Additional SKUs, integration headaches |
| **Customization** | $300/hour consultants |
| **Vendor Lock-in** | Decades of data trapped |

### The Complexity Tax

The irony? Workday was founded to be simpler than PeopleSoft. Twenty years later, it *is* PeopleSoft:

- Implementation projects measured in years
- Dedicated "Workday admins" required
- Bolt-on AI sold separately
- Configuration complexity as a moat

## The Solution

**workday.do** reimagines HCM for the AI era:

```
Workday                             workday.do
-----------------------------------------------------------------
$500K-5M implementation             Deploy in minutes
$100K+/year maintenance             $0 - run your own
18-month implementations            npm install && deploy
Bolt-on AI features                 AI-native from day one
Workday's cloud lock-in             Your Cloudflare account
Consultants for everything          Code-first, instant deploy
Per-employee licensing              Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo workday
```

An enterprise HCM. Running on infrastructure you control. AI-native from day one.

```typescript
import { Workday } from 'workday.do'

export default Workday({
  name: 'acme-corp',
  domain: 'hr.acme.com',
  features: {
    effectiveDating: true,
    aiAssistant: true,
  },
})
```

## Features

### Workers

```typescript
// Find anyone
const alex = await workday`Alex Chen`
const engineers = await workday`engineers in Austin`
const managers = await workday`managers with more than 5 direct reports`

// AI infers what you need
await workday`Alex Chen`               // returns worker
await workday`Alex's compensation`     // returns comp details
await workday`Alex's full history`     // returns complete record
```

### Hiring

```typescript
// Hire naturally
await workday`hire Alex Chen as Software Engineer in Engineering at $150k starting Jan 15`
await workday`hire Maria Santos as contractor, product design, $100/hour`
await workday`onboard Alex with standard engineering checklist`

// Batch hiring reads like a roster
await workday`
  hire for Engineering starting Feb 1:
  - Sarah Kim, Senior Engineer, $180k
  - James Liu, Staff Engineer, $220k
  - Priya Patel, Engineering Manager, $200k
`
```

### Positions

```typescript
// Create positions naturally
await workday`create Senior Software Engineer position in Engineering, level IC4, budget 3 headcount, $140k-200k range`
await workday`open positions in Engineering`
await workday`unfilled roles this quarter`
```

### Organizations

```typescript
// Query the org naturally
await workday`org chart`
await workday`Engineering team`
await workday`everyone in Engineering including sub-teams`
await workday`who reports to Sarah Kim`
await workday`org chart as of last quarter`
```

### Compensation

```typescript
// Adjust comp naturally
await workday`give Alex a raise to $165k effective March 1`
await workday`Alex promotion to Senior with 15% bonus target and 5000 RSUs`
await workday`market adjustment for all engineers, 5% increase July 1`

// Review compensation
await workday`Alex's total comp`
await workday`engineering comp by level`
await workday`who's below market in Austin`
```

### Time Off

```typescript
// Check balance naturally
await workday`how much PTO does Alex have`
await workday`Alex's vacation balance`

// Request time off
await workday`request vacation for Alex Feb 17-21`
  .route('manager-approval')
  .onApprove(async () => await workday`block Alex's calendar`)

// Manage leave
await workday`who's out next week`
await workday`Engineering PTO calendar for March`
```

### Recruiting

```typescript
// Open reqs naturally
await workday`open Senior Engineer req for Sarah's team, start April 1`
await workday`open positions in Engineering`
await workday`candidates in pipeline for senior engineer`

// Move candidates through
await workday`schedule Alex Chen for onsite with Sarah's team`
await workday`extend offer to Alex Chen for Senior Engineer at $175k`
```

### Performance

```typescript
// Set goals naturally
await workday`Alex's goals for H1: ship auth system, mentor 2 junior engineers, reduce API latency 50%`
await workday`who's missing goals for this quarter`

// Reviews
await workday`start Q1 performance reviews for Engineering`
await workday`Alex's review history`
await workday`outstanding reviews for Sarah's team`
```

## Effective Dating

Every change is versioned. Not just "when it was entered" - when it takes effect.

```typescript
// Schedule future changes
await workday`promote Alex to Senior Engineer at $165k effective March 1`

// Query point-in-time
await workday`Alex's position`                    // Software Engineer (now)
await workday`Alex's position as of March 1`      // Senior Software Engineer (future)
await workday`who was Alex's manager last January`

// Time travel through your org
await workday`Engineering headcount over the last year`
await workday`org changes between Q1 and Q3 2024`
await workday`who reported to Sarah on March 15, 2024`
```

**Why this matters:**

- **Retroactive corrections** - Fix past mistakes without losing audit trail
- **Future planning** - Model reorgs before they happen
- **Compliance** - Answer "who reported to whom on March 15th, 2024?"
- **Analytics** - Accurate point-in-time headcount, compensation, structure

## AI-Native HR

Your HR team gets an AI colleague on day one.

```typescript
// Employees ask questions naturally
await workday`how much PTO do I have`
// "You have 80 hours of vacation remaining. Your next accrual is February 1st."

await workday`I need next Friday off`
// Creates time-off request, routes to manager for approval

await workday`what's the process for referring a candidate`
// Returns process with links, offers to start a referral

await workday`explain my benefits`
// Personalized benefits summary based on their elections
```

### AI-Powered Workflows

```typescript
// Onboarding that handles itself
await workday`onboard Alex Chen starting Jan 15`
  .guide()       // AI walks them through paperwork
  .introduce()   // schedules meet-the-team
  .setup()       // IT provisioning, badge, etc.

// Offboarding that misses nothing
await workday`offboard Sarah Kim last day Feb 28`
  .checklist()   // ensures complete handoff
  .exit()        // schedules exit interview
  .process()     // handles all systems access

// Manager support
await workday`help me write Alex's performance review`
await workday`how do I handle a difficult conversation about performance`
await workday`attrition trends in Engineering over the last year`
```

### Population Health for HR

```typescript
// Query your workforce like a database
await workday`flight risk in Engineering`
await workday`employees with no manager meeting in 30 days`
await workday`contractors approaching 18-month limit`

// Close HR gaps at scale
await workday`employees missing emergency contacts`
  .outreach()    // personalized reminders
  .track()       // compliance reporting
```

## Enterprise Grade

Open-source doesn't mean toy.

### Audit Trails

```typescript
// Query audit naturally
await workday`who changed Alex's compensation and when`
await workday`all changes to Engineering org this quarter`
await workday`audit trail for Alex since January`

// AI surfaces anomalies
await workday`unusual changes this month`
```

### Role-Based Security

Fine-grained permissions. Managers see their teams. HR sees everyone. Employees see themselves.

```typescript
// Query access naturally
await workday`what can Sarah see`
await workday`who has access to compensation data`
await workday`break glass access log this month`
```

### Business Process Flows

Complex approvals made simple. Promotions, transfers, terminations - all with proper routing.

```typescript
// Approvals route themselves
await workday`promote Alex to Senior at $165k`
  .route('manager')           // Sarah initiates
  .route('hr-partner')        // HR reviews
  .route('comp-team')         // comp approves (if >20% change)
  .route('vp')                // VP approves (if director+)
  .onComplete(async () => await workday`notify Alex`)

// Check approval status
await workday`pending approvals for Sarah`
await workday`where is Alex's promotion in the workflow`
```

### Compliance Ready

Built for the regulatory reality of HR.

- **Data residency** - Deploy in any Cloudflare region
- **GDPR** - Right to erasure, data portability built-in
- **SOC 2** - Audit logs, access controls, encryption
- **I-9, W-4, etc.** - Form workflows included (US)

## Architecture

### Durable Object per Organization

```
CompanyDO (config, branding, policies)
  |
  +-- WorkersDO (demographics, employment)
  |     |-- SQLite: Worker records (encrypted)
  |     +-- R2: Documents, photos (encrypted)
  |
  +-- OrgsDO (structure, hierarchy)
  |     |-- SQLite: Org units, positions
  |     +-- Effective-dated changes
  |
  +-- CompensationDO (payroll, benefits)
  |     |-- SQLite: Comp data (encrypted)
  |
  +-- TimeOffDO (accruals, balances, requests)
  |     |-- SQLite: Leave records
  |
  +-- WorkflowsDO (approvals, routing)
        |-- SQLite: Process instances
        +-- State machines
```

### Bi-Temporal Data Model

```typescript
// Every record has two time dimensions
// "What was true on March 1st?" (as-of query)
await workday`Alex's manager as of March 1`

// "What did we know on Jan 15th?" (as-at query)
await workday`Alex's record as we knew it on Jan 15`

// "What did we think on Jan 15th would be true on March 1st?" (bi-temporal)
await workday`Alex's planned promotion as recorded Jan 15`
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active employees, recent history | <10ms |
| **Warm** | R2 + SQLite Index | Terminated employees (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

## vs Workday

| Feature | Workday | workday.do |
|---------|---------|-----------|
| **Implementation** | $500K-5M+ | Deploy in minutes |
| **Annual Cost** | $100K-1M+ | ~$100/month |
| **Timeline** | 6-18 months | Same day |
| **AI** | Bolt-on, additional SKU | AI-native foundation |
| **Data Location** | Workday's cloud | Your Cloudflare account |
| **Customization** | $300/hour consultants | Code it yourself |
| **Effective Dating** | Enterprise tier | Included |
| **Updates** | Bi-annual releases | Continuous deployment |
| **Lock-in** | Decades of migration | MIT licensed |

## Use Cases

### Self-Service Portal

```typescript
// Employees help themselves
await workday`my PTO balance`
await workday`request Friday off`
await workday`update my address to 123 Main St`
await workday`my pay stubs`
```

### Manager Dashboard

```typescript
// Managers manage
await workday`my team`
await workday`pending approvals`
await workday`who's out this week`
await workday`compensation review for my team`
```

### HR Analytics

```typescript
// HR gets insights
await workday`headcount by department`
await workday`attrition trends this year`
await workday`time to fill by role type`
await workday`diversity metrics for Engineering`
```

### Payroll Integration

```typescript
// Seamless payroll prep
await workday`payroll changes this period`
await workday`export to ADP`
await workday`employees with tax form changes`
```

## Why Open Source for HCM?

### 1. Cost Liberation

$500K-5M implementations are resources diverted from your people. Open source means:
- Minutes to deploy, not months
- No implementation consultants
- No per-employee licensing
- No vendor lock-in

### 2. AI Enablement

Closed HCM systems control what AI you can use. Open source means:
- Integrate any LLM
- Build custom HR automation
- Reduce administrative burden
- Natural language for everything

### 3. Your People Data is Yours

HR data is sensitive. Open source enables:
- True data portability
- Deploy where you need (sovereignty)
- No vendor data mining
- Full audit control

### 4. Innovation Velocity

HCM moves slowly because vendors profit from complexity. Open source enables:
- HR teams to influence development
- Startups to integrate without approval
- Organizations to customize for their needs

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo workday
# Deploys to your Cloudflare account
```

### Private Cloud

```bash
docker run -p 8787:8787 dotdo/workday
# Or Kubernetes
kubectl apply -f workday-do.yaml
```

### On-Premises

For organizations requiring complete control:

```bash
./workday-do-install.sh --on-premises --employee-count=500
```

## Contributing

workday.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/workday.do
cd workday.do
pnpm install
pnpm test
```

## License

MIT License - For the people who manage people.

---

<p align="center">
  <strong>The enterprise HCM monopoly ends here.</strong>
  <br />
  AI-native. Effective-dated. Your data.
  <br /><br />
  <a href="https://workday.do">Website</a> |
  <a href="https://docs.workday.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/workday.do">GitHub</a>
</p>
