# bamboohr.do

> Simple HR for growing teams. AI-powered. Zero per-employee fees.

You're a startup founder. Your team just hit 50 people. HR software wants $6/employee/month - that's $3,600/year just to track PTO and store employee records. For what is essentially a spreadsheet with a nice UI. Your growing team shouldn't be penalized for growing.

**bamboohr.do** is the open-source alternative. Run it yourself or let us host it. No per-employee fees. Ever.

## AI-Native API

```typescript
import { bamboohr } from 'bamboohr.do'           // Full SDK
import { bamboohr } from 'bamboohr.do/tiny'      // Minimal client
import { olive } from 'bamboohr.do/agents'       // AI HR assistant
```

Natural language for HR workflows:

```typescript
import { bamboohr } from 'bamboohr.do'

// Talk to it like a colleague
await bamboohr`hire Sarah Chen as Engineer starting Jan 15`
await bamboohr`who's on PTO next week?`
await bamboohr`employees in Engineering with anniversaries this month`

// Chain like sentences
await bamboohr`new hires this month`
  .map(emp => bamboohr`assign ${emp} onboarding workflow`)
  .map(emp => bamboohr`schedule ${emp} orientation`)

// Onboarding that flows naturally
await bamboohr`onboard Sarah Chen`
  .provision(`laptop, Slack, GitHub`)
  .assign(`Engineering`)
  .buddy(`Alex Kim`)
```

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
import { BambooHR } from 'bamboohr.do'

export default BambooHR({
  name: 'acme-startup',
  domain: 'hr.acme.com',
})
```

## Features

### Employee Directory

The heart of any HR system. Everyone in one place.

```typescript
// Find anyone
const sarah = await bamboohr`Sarah Chen`
const engineering = await bamboohr`everyone in Engineering`
const managers = await bamboohr`all managers in San Francisco`

// AI infers what you need
await bamboohr`Sarah Chen`              // returns employee
await bamboohr`Sarah's manager`         // returns Alex Kim
await bamboohr`who reports to Alex?`    // returns team list
await bamboohr`org chart Engineering`   // returns hierarchy
```

### Time Off

Request, approve, track. No spreadsheets.

```typescript
// Natural as asking a coworker
await bamboohr`how much PTO does Sarah have?`
await bamboohr`who's out this week?`
await bamboohr`vacation calendar for March`

// Request time off in one line
await bamboohr`Sarah taking March 17-21 off for spring break`
// Auto-routes to manager for approval

// Manager approves naturally
await bamboohr`approve Sarah's PTO request`

// Bulk queries just work
await bamboohr`employees with more than 80 hours unused PTO`
await bamboohr`team utilization this quarter`
```

### Onboarding

New hire checklists that actually get completed.

```typescript
// Onboard in one line
await bamboohr`onboard Sarah Chen as Engineer on Alex's team`
  .provision(`laptop, Slack, GitHub, Figma`)
  .buddy(`Jamie Wong`)

// Or step by step
await bamboohr`hire Sarah Chen as Engineer starting Jan 15`
await bamboohr`assign Sarah to Engineering onboarding`
await bamboohr`order laptop for Sarah`
await bamboohr`set up Sarah's accounts`

// Track progress naturally
await bamboohr`Sarah's onboarding status`
await bamboohr`incomplete onboarding tasks this week`
await bamboohr`new hires without assigned buddies`
```

### Performance Management

Goal setting, reviews, feedback. Lightweight but effective.

```typescript
// Set goals naturally
await bamboohr`Sarah's Q1 goal: ship auth service with OAuth2 and SAML`
await bamboohr`Sarah's Q1 goal: reduce API errors by 50%`
await bamboohr`Sarah's Q1 goal: mentor Jamie on the codebase`

// Request feedback
await bamboohr`request feedback on Sarah from her teammates`
await bamboohr`360 review for Sarah due March 15`

// Reviews flow naturally
await bamboohr`start Sarah's Q1 review`
await bamboohr`Sarah exceeded expectations this quarter`

// Bulk operations
await bamboohr`employees without Q1 goals`
await bamboohr`pending reviews this week`
await bamboohr`team feedback completion rates`
```

### Document Storage

Employee documents in one place.

```typescript
// Store documents naturally
await bamboohr`upload Sarah's offer letter`
await bamboohr`add I-9 for Sarah`

// Find documents
await bamboohr`Sarah's documents`
await bamboohr`unsigned policy acknowledgments`
await bamboohr`expiring certifications this month`

// E-signatures
await bamboohr`send handbook acknowledgment to Sarah for signature`
await bamboohr`policy update needs signature from all employees by Feb 1`
```

### Reporting

See your workforce data clearly.

```typescript
// Ask for what you need
await bamboohr`headcount by department this year`
await bamboohr`turnover rate by department 2024`
await bamboohr`PTO utilization across Engineering`
await bamboohr`tenure distribution company-wide`

// Complex queries, natural language
await bamboohr`employees by department and location`
await bamboohr`hiring trend last 12 months`
await bamboohr`average tenure in Sales vs Engineering`
```

## AI Assistant

**Olive** is your AI HR assistant. Named after the olive branch - extending help to everyone.

```typescript
import { olive } from 'bamboohr.do/agents'

// Employees talk to Olive naturally
await olive`How much PTO do I have?`
await olive`I need next Friday off`
await olive`what's our remote work policy?`
await olive`who's out this week?`

// Olive handles the complexity
// - Checks balances
// - Creates requests
// - Routes for approval
// - Answers policy questions
// - All from natural language
```

### AI-Powered Onboarding

Olive guides new hires through their first days:

```typescript
// New hires talk to Olive
await olive`I'm new here, what should I do first?`
await olive`help me with my I-9`
await olive`where do I find the employee handbook?`
await olive`who's my buddy?`

// Olive walks them through everything
// - Forms and paperwork
// - Account setup
// - Team introductions
// - First week tasks
```

### AI-Assisted Performance Reviews

```typescript
// Managers get help writing reviews
await olive`help me write Sarah's performance review`
await olive`summarize Sarah's Q1 accomplishments`
await olive`what feedback did Sarah receive this quarter?`

// Olive drafts, you approve
// - Pulls goals and achievements
// - Incorporates peer feedback
// - Drafts review summary
// - You review and finalize
```

### AI for HR Operations

```typescript
// HR gets insights
await olive`onboarding completion rates by department`
await olive`which teams have low buddy assignment rates?`
await olive`draft announcement for new PTO policy`

// Olive surfaces actionable insights
// - Identifies bottlenecks
// - Drafts communications
// - Suggests improvements
```

## Self-Service

Employees handle their own HR tasks. No tickets required.

```typescript
// Employees update their own info naturally
await bamboohr`update my address to 456 Oak Ave, San Francisco`
await bamboohr`my emergency contact is John Chen, spouse, 415-555-1234`
await bamboohr`update my direct deposit`
await bamboohr`show my pay stubs`
await bamboohr`update my profile photo`

// All self-service, no HR tickets needed
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

Connect naturally:

```typescript
// Payroll
await bamboohr`connect to Gusto`
await bamboohr`sync payroll with gusto.do`

// SSO
await bamboohr`enable Okta SSO`

// Slack
await bamboohr`connect Slack`
// Then employees ask Olive in Slack:
// @Olive how much PTO do I have?

// Calendar
await bamboohr`sync time-off to Google Calendar`
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
// One line migration
await bamboohr`import from BambooHR`

// Imports everything:
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
