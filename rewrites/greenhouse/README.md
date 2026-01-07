# greenhouse.do

> AI-native recruiting. From job post to hired. No per-seat fees.

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

```typescript
import { recruiting } from 'greenhouse.do'

// Post a job
await recruiting.jobs.create({
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'San Francisco / Remote',
  salary: { min: 150000, max: 200000 },
  description: `
    We're looking for a senior engineer to help build our core platform...
  `
})
```

## Features

### Job Postings

Create jobs, publish everywhere.

```typescript
// Create a job
const job = await recruiting.jobs.create({
  title: 'Senior Software Engineer',
  department: 'Engineering',
  team: 'Platform',
  location: 'San Francisco',
  remote: 'hybrid',                          // 'onsite', 'hybrid', 'remote'
  employment: 'full-time',
  salary: {
    min: 150000,
    max: 200000,
    currency: 'USD',
    display: true                            // Show on job post?
  },
  description: `...`,
  requirements: [
    '5+ years of software engineering experience',
    'Strong TypeScript/Node.js skills',
    'Experience with distributed systems',
    'Excellent communication skills'
  ],
  niceToHave: [
    'Experience with Cloudflare Workers',
    'Open source contributions',
    'Startup experience'
  ],
  hiringManager: 'alex-kim',
  recruiters: ['taylor-recruiter'],
  interviewPlan: 'engineering-standard'
})

// Publish to job boards
await recruiting.jobs.publish(job.id, {
  boards: ['linkedin', 'indeed', 'levels.fyi', 'wellfound'],
  careerPage: true                           // Your careers page
})

// Track applications by source
const stats = await recruiting.jobs.stats(job.id)
// {
//   total: 234,
//   sources: {
//     linkedin: 89,
//     indeed: 67,
//     direct: 45,
//     referral: 33
//   },
//   inPipeline: 45,
//   interviewed: 12,
//   offered: 2,
//   hired: 1
// }
```

### Application Processing

Applications flow in. AI helps process them.

```typescript
// View applications
const applications = await recruiting.applications.list({
  job: 'senior-software-engineer-001',
  status: 'new'
})

// Each application has AI analysis
applications[0]
// {
//   candidate: {
//     name: 'Jordan Rivera',
//     email: 'jordan@email.com',
//     resume: 'jordan-rivera-resume.pdf',
//     linkedin: 'linkedin.com/in/jordanrivera'
//   },
//   aiAnalysis: {
//     matchScore: 87,
//     matchedRequirements: [
//       { requirement: '5+ years experience', match: true, evidence: '7 years at...' },
//       { requirement: 'TypeScript/Node.js', match: true, evidence: 'Built X with...' },
//       { requirement: 'Distributed systems', match: true, evidence: 'Led scaling...' },
//       { requirement: 'Communication', match: 'unclear', evidence: null }
//     ],
//     redFlags: [],
//     highlights: [
//       'Previously at similar-stage startup',
//       'Open source maintainer',
//       'Cloudflare Workers experience (nice-to-have)'
//     ],
//     recommendedAction: 'advance',
//     summary: 'Strong technical fit. 7 years experience with relevant tech stack...'
//   },
//   source: 'linkedin',
//   appliedAt: '2025-01-10T...'
// }
```

### Interview Pipeline

Customizable stages for every role.

```typescript
// Define an interview plan
await recruiting.interviewPlans.create('engineering-standard', {
  stages: [
    {
      name: 'Recruiter Screen',
      type: 'phone',
      duration: 30,
      interviewer: 'recruiter',
      scorecard: ['communication', 'motivation', 'salary-expectations']
    },
    {
      name: 'Technical Phone Screen',
      type: 'phone',
      duration: 60,
      interviewer: 'engineer',
      scorecard: ['coding', 'problem-solving', 'technical-communication']
    },
    {
      name: 'Onsite - System Design',
      type: 'onsite',
      duration: 60,
      interviewer: 'senior-engineer',
      scorecard: ['system-design', 'scalability', 'trade-offs']
    },
    {
      name: 'Onsite - Coding',
      type: 'onsite',
      duration: 60,
      interviewer: 'engineer',
      scorecard: ['coding', 'testing', 'code-quality']
    },
    {
      name: 'Onsite - Team Fit',
      type: 'onsite',
      duration: 45,
      interviewer: 'team-member',
      scorecard: ['collaboration', 'culture-fit', 'growth-mindset']
    },
    {
      name: 'Hiring Manager',
      type: 'onsite',
      duration: 45,
      interviewer: 'hiring-manager',
      scorecard: ['leadership', 'vision-alignment', 'questions']
    }
  ]
})

// Move candidate through stages
await recruiting.applications.advance('jordan-rivera-001', {
  stage: 'technical-phone-screen',
  notes: 'Great recruiter screen. Enthusiastic, clear communication.'
})
```

### Scorecards

Structured interviewer feedback.

```typescript
// Submit scorecard
await recruiting.scorecards.submit({
  application: 'jordan-rivera-001',
  stage: 'technical-phone-screen',
  interviewer: 'sarah-chen',
  scores: {
    coding: 4,                               // 1-5 scale
    problemSolving: 5,
    technicalCommunication: 4
  },
  recommendation: 'strong-yes',              // no, leaning-no, leaning-yes, yes, strong-yes
  notes: `
    Jordan tackled the system design problem methodically. Started with
    requirements clarification, proposed a clean architecture, and
    proactively discussed scaling considerations.

    Particularly impressed by their approach to handling failure modes.
    They asked great questions about our tech stack.

    One area to probe: Less experience with our specific domain.
  `,
  privateNotes: 'Would be great for the platform team specifically.'
})

// View all feedback for a candidate
const feedback = await recruiting.applications.feedback('jordan-rivera-001')
// Aggregated scores, recommendations, notes across all stages
```

### Scheduling

AI handles the calendar Tetris.

```typescript
// Request interview scheduling
await recruiting.scheduling.schedule({
  application: 'jordan-rivera-001',
  stage: 'onsite',
  interviewers: ['sarah-chen', 'alex-kim', 'jamie-wong', 'chris-taylor'],
  duration: {
    'System Design': 60,
    'Coding': 60,
    'Team Fit': 45,
    'Hiring Manager': 45
  },
  constraints: {
    dateRange: { start: '2025-01-20', end: '2025-01-31' },
    candidateTimezone: 'America/Los_Angeles',
    preferredTimes: ['10:00-12:00', '14:00-17:00'],
    breaks: 15                               // Minutes between interviews
  }
})

// AI finds optimal slots across all calendars
// Sends candidate available times
// Candidate picks, everyone gets invites
```

### Offers

Generate, send, track offers.

```typescript
// Create offer
await recruiting.offers.create({
  application: 'jordan-rivera-001',
  title: 'Senior Software Engineer',
  startDate: '2025-02-15',
  compensation: {
    baseSalary: 175000,
    signingBonus: 15000,
    equity: {
      shares: 10000,
      vestingSchedule: '4-year-1-cliff',
      strikePrice: 0.50
    },
    bonus: {
      target: 10,                            // 10% of base
      structure: 'annual'
    }
  },
  benefits: {
    healthInsurance: 'Gold PPO',
    pto: 'unlimited',
    retirement: '401k with 4% match'
  },
  expiresAt: '2025-01-25'
})

// Send offer
await recruiting.offers.send('offer-001', {
  template: 'engineering-offer',
  personalNote: `
    Jordan, we were impressed by your interviews and are excited
    to offer you a position on our Platform team...
  `
})

// Track offer status
const offer = await recruiting.offers.get('offer-001')
// { status: 'pending', viewedAt: '2025-01-20T...', expiresAt: '2025-01-25T...' }
```

### Referrals

Track employee referrals and bonuses.

```typescript
// Employee submits referral
await recruiting.referrals.submit({
  referrer: 'sarah-chen',
  candidate: {
    name: 'Pat Johnson',
    email: 'pat@email.com',
    linkedin: 'linkedin.com/in/patjohnson',
    resume: patResume
  },
  job: 'senior-software-engineer-001',
  notes: 'Worked with Pat at previous company. Excellent engineer.'
})

// Track referral bonus eligibility
const referral = await recruiting.referrals.get('referral-001')
// {
//   referrer: 'sarah-chen',
//   candidate: 'pat-johnson',
//   status: 'hired',
//   hireDate: '2025-03-01',
//   bonusEligibleDate: '2025-06-01',    // After 90 days
//   bonusAmount: 5000
// }
```

## AI Recruiting Agent

**Scout** is your AI recruiting assistant. Named for what they do - find great people.

```typescript
import { scout } from 'greenhouse.do/agents'
```

### AI Resume Screening

```typescript
// Scout screens all new applications
await scout`Screen new applications for Senior Software Engineer`
// "I've reviewed 47 new applications for Senior Software Engineer:
//
// ADVANCE (12):
// - Jordan Rivera (87% match) - 7 years, TypeScript expert, OSS maintainer
// - Casey Kim (82% match) - 6 years, distributed systems at scale
// - Morgan Chen (79% match) - 5 years, exact stack match
// [9 more...]
//
// REVIEW NEEDED (8):
// - Strong skills but career gap
// - Great background but overqualified
// - Interesting non-traditional path
//
// REJECT (27):
// - Missing core requirements
// - Very junior despite title
// - No relevant experience
//
// Shall I advance the top 12 to recruiter screen?"
```

### AI Job Description Writing

```typescript
await scout`Write a job description for a Product Designer`
// "Here's a draft job description:
//
// ---
// **Product Designer**
// San Francisco / Remote | Full-time
//
// **About the Role**
// We're looking for a Product Designer to shape the user experience
// of our developer tools platform. You'll work closely with Engineering
// and Product to design interfaces that developers love.
//
// **What You'll Do**
// - Design end-to-end user experiences for our core products
// - Create wireframes, prototypes, and high-fidelity designs
// - Conduct user research and usability testing
// - Build and maintain our design system
// - Collaborate with engineers on implementation
//
// **What We're Looking For**
// - 4+ years of product design experience
// - Strong portfolio demonstrating UX problem-solving
// - Proficiency in Figma
// - Experience designing developer tools or technical products
// - Excellent communication and collaboration skills
//
// **Nice to Have**
// - Experience with design systems
// - Familiarity with frontend development
// - Background in B2B SaaS
//
// **Compensation**
// $140,000 - $180,000 + equity
// ---
//
// Want me to adjust the tone, requirements, or add anything?"
```

### AI Interview Scheduling

```typescript
await scout`Schedule Jordan Rivera's onsite for next week`
// "I'll schedule Jordan Rivera's onsite interview.
//
// INTERVIEWERS NEEDED:
// - System Design: Sarah Chen
// - Coding: Alex Kim or Jamie Wong
// - Team Fit: Chris Taylor
// - Hiring Manager: Maria Garcia
//
// AVAILABILITY ANALYSIS:
// Best day: Thursday, January 23rd
// - All interviewers available
// - Back-to-back slots from 10am
// - 15-min breaks included
// - Lunch break 12:00-1:00
//
// PROPOSED SCHEDULE:
// 10:00 - 11:00  System Design (Sarah)
// 11:15 - 12:15  Coding (Alex)
// 12:15 - 1:15   Lunch Break
// 1:15 - 2:00    Team Fit (Chris)
// 2:15 - 3:00    Hiring Manager (Maria)
//
// Jordan is in Pacific time. This works for them.
//
// [Send to Jordan for Confirmation] [Try Different Day] [Modify]"
```

### AI Candidate Outreach

```typescript
await scout`Draft outreach for passive candidates for the Platform team`
// "Here are personalized outreach drafts for 5 passive candidates:
//
// **1. Riley Zhang - Staff Engineer at Stripe**
// Subject: Platform engineering at [Company] - your distributed systems expertise
//
// Hi Riley,
//
// I came across your blog post on event sourcing patterns - really
// thoughtful approach to handling consistency at scale.
//
// We're building a platform that faces similar challenges, and I think
// your experience with [specific project from their profile] would
// translate well. We're a 30-person startup backed by [investors],
// and the Platform team is solving [specific technical challenge].
//
// Would you be open to a 20-minute chat about what we're building?
//
// [Draft 2/3/4/5...]
//
// Want me to adjust the tone or focus on different aspects?"
```

### AI Interview Prep

```typescript
await scout`Prepare interview materials for Jordan Rivera's onsite`
// "Here's the interview prep package for Jordan Rivera:
//
// **CANDIDATE SUMMARY**
// - 7 years experience, currently Senior Engineer at [Company]
// - Strengths: Distributed systems, TypeScript, technical leadership
// - Areas to probe: People management, domain knowledge
//
// **FOR SARAH (System Design)**
// Suggested problems (based on our stack + their experience):
// 1. Design a real-time collaboration system
// 2. Design a rate limiter for API gateway
//
// Probe areas:
// - How they handle partition tolerance
// - Experience with Cloudflare (mentioned as nice-to-have)
//
// **FOR ALEX (Coding)**
// Suggested problems:
// 1. Implement a debounced cache with TTL
// 2. Parse and validate configuration schema
//
// Their resume shows strong algorithm skills - go for harder problems.
//
// **FOR CHRIS (Team Fit)**
// Questions to explore:
// - Tell me about a time you disagreed with a technical decision
// - How do you approach mentoring junior engineers?
// - What's your ideal team culture?
//
// **FOR MARIA (Hiring Manager)**
// Topics to cover:
// - Career goals and growth expectations
// - Questions about company direction
// - Sell the opportunity
//
// [Generate PDF Package] [Customize] [Add More]"
```

### AI Offer Negotiation Support

```typescript
await scout`Jordan is asking for $190k base instead of $175k. What should we do?`
// "Analyzing Jordan's offer negotiation:
//
// **MARKET DATA**
// - Our offer: $175,000 base
// - Their ask: $190,000 base
// - Market range (SF, 7 YOE): $165,000 - $205,000
// - Our band for this role: $160,000 - $195,000
//
// **CANDIDATE VALUE ASSESSMENT**
// - Interview scores: 4.2/5 average (above our hire bar of 3.5)
// - Rare skill match: Cloudflare Workers experience
// - Strong references from back-channel
// - Competing offer: Likely (based on timeline urgency)
//
// **RECOMMENDATION**
// Counter at $185,000 with enhanced equity:
// - $10k below their ask (face-saving for both sides)
// - Add 2,000 additional RSUs (12,000 total)
// - Keep signing bonus at $15k
//
// Total comp increases from $208k to $223k (7% increase)
// Still within budget, strong candidate worth stretching for.
//
// **ALTERNATIVE OPTIONS**
// 1. Meet at $190k, no equity change (clean, fast close)
// 2. Stay at $175k, add $10k signing + extra equity (saves ongoing cost)
// 3. Decline counter (risk losing candidate)
//
// [Draft Counter Offer] [Get More Market Data] [Discuss with Team]"
```

## Candidate Experience

Candidates see a polished, responsive process.

```typescript
// Candidate portal
const portal = await recruiting.candidates.portal('jordan-rivera')
// {
//   status: 'Onsite Interview Scheduled',
//   nextStep: 'Onsite Interview - January 23rd',
//   timeline: [
//     { stage: 'Applied', date: '2025-01-10', status: 'complete' },
//     { stage: 'Recruiter Screen', date: '2025-01-14', status: 'complete' },
//     { stage: 'Technical Screen', date: '2025-01-17', status: 'complete' },
//     { stage: 'Onsite', date: '2025-01-23', status: 'scheduled' },
//     { stage: 'Offer', status: 'pending' }
//   ],
//   interviewDetails: {
//     date: '2025-01-23',
//     schedule: [...],
//     location: '123 Main St, SF',
//     contact: 'taylor@startup.com'
//   }
// }
```

Candidates can:
- Check application status
- View interview schedule
- Access interview prep materials
- Communicate with recruiters
- Sign offers digitally

## Analytics

Understand your recruiting funnel.

```typescript
// Pipeline analytics
const analytics = await recruiting.analytics.pipeline({
  period: '2024-Q4',
  department: 'Engineering'
})
// {
//   applications: 892,
//   screensPassed: 234,
//   interviewsPassed: 67,
//   offers: 23,
//   hires: 18,
//   conversionRates: {
//     applicationToScreen: 26%,
//     screenToInterview: 29%,
//     interviewToOffer: 34%,
//     offerAcceptance: 78%
//   },
//   averageTimeToHire: 28 days,
//   averageTimeInStage: {
//     newApplication: 2 days,
//     recruiterScreen: 4 days,
//     technicalScreen: 5 days,
//     onsite: 8 days,
//     offer: 5 days
//   }
// }

// Source effectiveness
const sources = await recruiting.analytics.sources({
  period: '2024'
})
// {
//   linkedin: { applications: 450, hires: 12, costPerHire: '$8,500' },
//   referral: { applications: 120, hires: 15, costPerHire: '$3,333' },
//   direct: { applications: 200, hires: 8, costPerHire: '$0' },
//   indeed: { applications: 300, hires: 5, costPerHire: '$12,000' }
// }

// Interviewer calibration
const interviewers = await recruiting.analytics.interviewers()
// {
//   'sarah-chen': {
//     interviews: 45,
//     passRate: 42%,
//     correlationWithHireSuccess: 0.78,     // High signal
//     averageFeedbackTime: 2 hours
//   },
//   'alex-kim': {
//     interviews: 38,
//     passRate: 65%,
//     correlationWithHireSuccess: 0.52,     // Lower signal
//     averageFeedbackTime: 24 hours
//   }
// }
```

## Integrations

### Job Boards

```typescript
await recruiting.integrations.connect('linkedin', {
  recruiterLicense: process.env.LINKEDIN_LICENSE
})

await recruiting.integrations.connect('indeed', {
  apiKey: process.env.INDEED_API_KEY
})

// Jobs publish automatically
// Applications import automatically
```

### HR Systems

```typescript
// When candidate is hired, create employee record
await recruiting.integrations.connect('bamboohr.do', {
  // Seamless - same platform
  onHire: 'create-employee'
})

// Or workday.do
await recruiting.integrations.connect('workday.do', {
  onHire: 'create-worker'
})
```

### Background Checks

```typescript
await recruiting.integrations.connect('checkr', {
  apiKey: process.env.CHECKR_API_KEY
})

// Trigger background check at offer stage
await recruiting.offers.startBackgroundCheck('offer-001')
```

### Calendars

```typescript
await recruiting.integrations.connect('google-calendar', {
  serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT
})

// AI scheduling reads all interviewer calendars
```

## Architecture

greenhouse.do is built for recruiting at scale.

```
JobDO                    - Job postings
  |                        Requirements, status, metrics
  |
ApplicationDO            - Candidate applications
  |                        Resume, AI analysis, pipeline status
  |
CandidateDO              - Candidate profile (across applications)
  |                        History, preferences, communications
  |
InterviewDO              - Interview events
  |                        Schedule, feedback, scorecards
  |
OfferDO                  - Offers
  |                        Compensation, status, signatures
  |
AIScreenerDO             - AI screening engine
                           Resume parsing, matching, scoring
```

### AI Infrastructure

```typescript
// Resume parsing and analysis
const analysis = await recruiting.ai.analyzeResume({
  resume: resumePdf,
  job: 'senior-software-engineer-001'
})

// Matching algorithm
const match = await recruiting.ai.matchScore({
  candidate: 'jordan-rivera',
  job: 'senior-software-engineer-001'
})

// Natural language search
const candidates = await recruiting.ai.search(
  'TypeScript engineers with distributed systems experience in SF'
)
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
