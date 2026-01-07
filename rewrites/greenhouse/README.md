# greenhouse.do

> Your best recruiter, as an API.

```typescript
import { greenhouse } from 'greenhouse.do'

await greenhouse`hire a senior engineer`
```

That's it. Job posts, sourcing, screening, scheduling, offers—all automatic.

## The Simplest Recruiting API

```typescript
// Hire someone
await greenhouse`hire a senior engineer`

// Check progress
await greenhouse`how's the senior engineer search going?`

// Move someone forward
await greenhouse`move Alex to onsite`

// Make an offer
await greenhouse`offer Jordan $180k`
```

Say it like you'd say it in standup. AI handles the rest.

## What Happens

When you say `hire a senior engineer`, greenhouse.do:

1. **Posts** the job (LinkedIn, Indeed, your careers page)
2. **Sources** matching candidates
3. **Screens** every application
4. **Schedules** interviews with your team
5. **Collects** feedback
6. **Extends** offers

You make decisions. AI does everything else.

## One-Click Deploy

```bash
npx create-dotdo greenhouse
```

## Natural Commands

```typescript
// Hiring
await greenhouse`hire a senior engineer`
await greenhouse`hire 3 SDRs by end of month`

// Pipeline
await greenhouse`who's in final rounds?`
await greenhouse`move Alex to onsite`
await greenhouse`pass on Jordan`

// Offers
await greenhouse`offer Casey $175k`
await greenhouse`Jordan wants $190k—should we match?`

// Questions
await greenhouse`why is time-to-hire increasing?`
await greenhouse`which sources work best?`
await greenhouse`how did Q4 hiring go?`
```

No job IDs. No candidate IDs. Names and intent.

## Under the Hood

You say `hire a senior engineer`. Greenhouse.do:

- Writes the job description
- Posts to LinkedIn, Indeed, your careers page
- Sources passive candidates
- Screens every resume (500? 5,000? No difference)
- Advances top candidates automatically
- Schedules interviews across everyone's calendars
- Collects feedback from interviewers
- Synthesizes into hire/no-hire recommendation
- Drafts and sends offers
- Handles negotiation guidance
- Flows hired candidates to onboarding

All from one line of code.

## Integrations

```typescript
await greenhouse`connect linkedin, indeed, google-calendar, checkr`
```

Hired candidates automatically flow to BambooHR, Rippling, or your HRIS.

## Pricing

| Plan | Price |
|------|-------|
| **Self-Hosted** | $0 |
| **Managed** | $199/mo |

No per-seat fees. No per-job fees. Just recruiting.

---

**You say who to hire. AI handles everything else.**
