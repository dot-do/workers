# greenhouse.do

> AI-native recruiting. From job post to hired. No per-seat fees.

You're a startup founder. You're hiring your first 10 engineers. ATS software wants $15,000/year before you hire anyone. Every recruiter, every hiring manager adds cost. You have 500 resumes to screen. Manually. Your recruiting shouldn't cost more than your first hire's signing bonus.

## AI-Native API

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Natural language recruiting
const candidates = await greenhouse`candidates in final round for Engineering`
const pipeline = await greenhouse`hiring pipeline for Q1`

// Promise pipelining for hiring
const hired = await scout`screen ${applications} for Senior Engineer`
  .map(screened => greenhouse`advance top 12 to phone screen`)
  .map(advanced => scout`prepare interview materials`)
  .map(prepped => greenhouse`schedule with interviewers`)
  .map(scheduled => scout`generate scorecards after interviews`)

// AI sourcing
const sourced = await scout`
  Find candidates matching:
  - 5+ years TypeScript
  - Distributed systems experience
  - Open to ${location}
`.map(matches => greenhouse`add to pipeline`)
```

One API call. AI screens 500 resumes. You make the decisions.

## Tree-Shakable Imports

```typescript
// Full featured
import { greenhouse, scout } from 'greenhouse.do'

// Minimal - no AI, just data operations
import { greenhouse } from 'greenhouse.do/tiny'

// RPC bindings for Cloudflare Workers
import { greenhouse, scout } from 'greenhouse.do/rpc'

// With authentication
import { greenhouse, scout } from 'greenhouse.do/auth'

// Just the AI agent
import { scout } from 'greenhouse.do/agents'
```

## The Problem

Greenhouse and Lever built the modern ATS. Recruiting became structured, data-driven, measurable.

But now:

- **$6,000-15,000+ per year** - Before you hire anyone
- **Per-seat pricing** - Every recruiter, every hiring manager adds cost
- **AI is a premium add-on** - "AI features" cost extra, on top of expensive base
- **The real work is still manual** - Screening 500 resumes? That's on you.

The irony: **recruiting is the most AI-ready function in any company**.

- Reading resumes? AI is better.
- Matching skills to requirements? AI is better.
- Scheduling interviews? AI is definitely better.
- First-round screening? AI can handle 80% of it.

Yet recruiting software charges you $15,000/year to store applications and send emails.

**greenhouse.do** puts AI at the center of recruiting. Open source. No per-seat fees.

## One-Click Deploy

```bash
npx create-dotdo greenhouse
```

Your AI-powered recruiting platform is live.

## Features

### Job Postings with AI

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Create and publish in one pipeline
const job = await scout`write job description for Senior Engineer`
  .map(description => greenhouse`post job with ${description}`)
  .map(job => greenhouse`publish to linkedin, indeed, levels.fyi`)

// Track the funnel
const stats = await greenhouse`application stats for ${job}`
```

### Application Processing

Applications flow in. AI screens them.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Screen all new applications with AI
const pipeline = await greenhouse`new applications for Senior Engineer`
  .map(apps => scout`screen ${apps} against job requirements`)
  .map(screened => greenhouse`advance candidates scoring above 80%`)
  .map(advanced => scout`prepare recruiter notes for ${advanced}`)

// AI returns structured analysis
// {
//   advance: [
//     { name: 'Jordan Rivera', score: 87, highlights: ['OSS maintainer', 'exact stack'] },
//     { name: 'Casey Kim', score: 82, highlights: ['distributed systems at scale'] }
//   ],
//   review: [
//     { name: 'Pat Lee', score: 72, note: 'Strong skills but career gap to discuss' }
//   ],
//   reject: 27
// }
```

### Interview Pipeline

Customizable stages, AI-coordinated.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Define interview loop with natural language
const plan = await greenhouse`create interview plan: recruiter screen,
  technical phone, system design, coding, team fit, hiring manager`

// Move candidates through with pipelining
const interviewed = await greenhouse`candidates ready for onsite`
  .map(candidates => scout`schedule onsites for ${candidates}`)
  .map(scheduled => scout`prepare interview packets`)
  .map(prepped => [sarah, alex, chris, maria].map(i => i`interview ${candidate}`))
  .map(feedback => scout`aggregate feedback for hiring committee`)
```

### Scorecards

Interviewers submit feedback, AI aggregates.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// After interviews complete
const decision = await greenhouse`feedback for ${candidate}`
  .map(feedback => scout`analyze interview feedback for patterns`)
  .map(analysis => scout`prepare hiring committee summary`)

// AI synthesizes all feedback into clear recommendation
// "4 strong-yes, 1 yes. Strengths: system design, collaboration.
//  Probe further: domain experience. Recommended: extend offer."
```

### Scheduling

AI handles the calendar Tetris.

```typescript
import { scout } from 'greenhouse.do'

// One command, all the coordination
await scout`schedule ${candidate}'s onsite for next week with
  sarah, alex, jamie, and chris. Include lunch break.`

// AI finds optimal slots across all calendars
// Sends candidate available times
// Candidate picks, everyone gets invites
```

### Offers

Generate, send, track offers.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Full offer pipeline
const offer = await scout`draft offer for ${candidate} at $175k + 10k equity`
  .map(draft => greenhouse`send offer to ${candidate}`)
  .map(sent => greenhouse`track offer status`)

// Handle negotiation with AI
await scout`${candidate} is asking for $190k. Analyze market data and recommend.`
// "Market range: $165k-$205k. Candidate scored 4.2/5. Recommend counter at $185k
//  with enhanced equity. Total comp increase 7%, still within budget."
```

### Referrals

Track employee referrals and bonuses.

```typescript
import { greenhouse } from 'greenhouse.do'

// Submit and track referrals
await greenhouse`submit referral: Pat Johnson from sarah for Senior Engineer`
const bonuses = await greenhouse`referral bonuses due this month`
```

## Scout: The Recruiting Agent

**Scout** is unified with the core API - both `greenhouse` and `scout` work together seamlessly.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Scout excels at AI-heavy tasks
await scout`source 20 candidates matching our Senior Engineer requirements`
await scout`analyze why our offer acceptance rate dropped this quarter`
await scout`prepare personalized outreach for ${passiveCandidates}`

// Greenhouse handles data operations
await greenhouse`candidates in final round`
await greenhouse`offers pending this week`
await greenhouse`hiring metrics for Q1`
```

### Parallel Interview Panels

```typescript
// Fan-out to multiple interviewers, fan-in for decision
const decision = await scout`prepare interview for ${candidate}`
  .map(prep => [sarah, alex, chris, maria].map(i => i`interview ${candidate}`))
  .map(feedback => scout`synthesize feedback and recommend decision`)
```

## Candidate Experience

Candidates see a polished, responsive process.

```typescript
import { greenhouse } from 'greenhouse.do'

// Beautiful candidate portal auto-generated
const portal = await greenhouse`candidate portal for ${candidate}`
// Timeline, interview schedule, prep materials, offer signing - all included
```

## Analytics

Understand your recruiting funnel with natural language.

```typescript
import { greenhouse, scout } from 'greenhouse.do'

// Ask questions, get answers
const insights = await greenhouse`hiring metrics for Engineering Q4`
const sources = await greenhouse`which sources produce best hires?`
const bottlenecks = await scout`why is time-to-hire increasing?`

// AI surfaces actionable insights
// "Referrals convert 3x better than Indeed. Sarah's candidates have 78%
//  success rate. Bottleneck: 5-day average wait at technical screen."
```

## Integrations

Seamless pipelining to other .do services.

```typescript
import { greenhouse } from 'greenhouse.do'
import { bamboohr } from 'bamboohr.do'

// Hired candidates flow to HR
const onboarded = await greenhouse`offers accepted this week`
  .map(hired => bamboohr`onboard ${hired}`)

// Connect job boards, calendars, background checks
await greenhouse`connect linkedin, indeed, google-calendar, checkr`
```

## Architecture

Durable Objects for recruiting at scale.

```
JobDO              Job postings, requirements, metrics
ApplicationDO      Candidate applications, AI analysis, pipeline
CandidateDO        Profile across applications, communications
InterviewDO        Schedule, feedback, scorecards
OfferDO            Compensation, status, signatures
ScoutDO            AI screening, sourcing, coordination
```

All accessible through natural language:

```typescript
import { scout } from 'greenhouse.do'

// Search with natural language
const candidates = await scout`
  TypeScript engineers with distributed systems experience in SF
`
```

## Pricing

| Plan | Price | What You Get |
|------|-------|--------------|
| **Self-Hosted** | $0 | Run it yourself, unlimited users/jobs |
| **Managed** | $199/mo | Hosted, AI features, job board integrations |
| **Enterprise** | Custom | SLA, dedicated support, custom AI training |

**No per-seat fees. No per-job fees.**

- 5 recruiters + 20 hiring managers on Greenhouse: ~$15,000/year
- Same on greenhouse.do Managed: $2,388/year

## Why This Exists

Recruiting is inherently an AI problem:

1. **Matching** - Does this resume match this job?
2. **Screening** - Is this candidate worth interviewing?
3. **Scheduling** - When can 5 people meet with 1 candidate?
4. **Communication** - Keep candidates informed at every stage

Traditional ATS software charges $15,000/year to do what spreadsheets did in 2005.

The AI that should be doing the hard work? That's a premium add-on.

**greenhouse.do** flips this. AI does the hard work. The rest is just data storage.

## Contributing

greenhouse.do is open source under MIT license.

```bash
git clone https://github.com/dotdo/greenhouse.do
cd greenhouse.do
npm install
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Build on it, sell it, make it yours.

---

**AI finds the talent. You make the decisions.**
