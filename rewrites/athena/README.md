# athena.do

> Practice Management. Revenue Cycle. Patient-First. AI-Native.

Athenahealth built a $17B empire on the backs of independent physicians. Cloud-based practice management that promised to simplify healthcare, but instead delivered $250/patient/year in administrative burden, opaque billing, and interoperability that exists only in marketing materials.

**athena.do** is the open-source alternative. Deploy your own practice management system. AI-native revenue cycle. FHIR-first interoperability. Zero per-claim fees.

## The Problem

Independent practices are being squeezed out of existence:

- **$250/patient/year** in administrative costs - Documentation, billing, prior auth, phone tag
- **6-8% of revenue** to Athenahealth - Per-claim percentages on top of monthly fees
- **30% of healthcare spending** is administrative - $1.2 trillion annually in the US
- **45% claim denial rate** for first submissions - Rework costs $25-35 per claim
- **Prior auth purgatory** - 34 hours/week per practice on prior authorizations alone
- **Interoperability theater** - "FHIR-enabled" but data still trapped in silos

Meanwhile, hospital systems with armies of billing staff acquire struggling practices for pennies on the dollar. The independent physician - the backbone of American healthcare - is disappearing.

## The Solution

**athena.do** levels the playing field:

```
Athenahealth                    athena.do
-----------------------------------------------------------------
$250/patient/year admin         AI handles the paperwork
6-8% per-claim fee              $0 - run your own
45% first-pass denial           AI-optimized clean claims
34 hrs/week prior auth          Automated PA submissions
Months to implement             Deploy in hours
Proprietary everything          Open source, MIT licensed
```

## AI-Native API

Talk to your practice. Get things done.

```typescript
import { athena } from 'athena.do'

// Ask like you'd ask your office manager
await athena`who needs diabetes follow-up?`
await athena`appeal the winnable denials from this month`
await athena`bill today's visits`

// Chain like conversation
await athena`denied claims over $1000`.appeal()
await athena`Dr. Chen's schedule tomorrow`.remind()
await athena`patients with balance over $500`.collect()
```

That's it. The AI figures out the rest.

### Bring What You Need

```typescript
import { athena } from 'athena.do'           // Everything
import { athena } from 'athena.do/tiny'      // Edge-optimized
```

## Deploy

```bash
npx create-dotdo athena
```

Done. Your practice runs on your infrastructure.

## Features

### Patient Management

```typescript
// Natural language patient lookup
const maria = await athena`find Maria Rodriguez`
const overdue = await athena`patients overdue for wellness visit`

// Or scan an insurance card
const patient = await athena`register patient`.scan(insuranceCardPhoto)
```

### Scheduling

```typescript
// Book like you're talking to the front desk
await athena`book Maria for a wellness visit with Dr. Chen next week`
await athena`find me a 30-minute slot for a new patient this Friday`

// Manage the day
await athena`who's on the schedule today?`
await athena`move the 2pm to 3pm`
await athena`cancel Mrs. Johnson and notify her`
```

### Check-In

```typescript
// Patient texts "here" or clicks a link
await athena`check in ${patient}`
// AI verifies insurance, collects copay, updates demographics
// Staff sees: "Maria Rodriguez - Checked in, $25 copay collected"
```

### Documentation

```typescript
// Ambient: AI listens, documents, codes
await athena`document this visit`.listen()

// Or dictate after
await athena`46yo diabetic here for wellness, doing great on metformin`

// AI generates SOAP note, suggests codes, queues charges
```

### Orders

```typescript
// Natural language orders
await athena`order A1c, lipid panel, and CMP for Maria`
await athena`refer to ophthalmology for diabetic eye exam`
await athena`refill her metformin, 90 day supply`

// AI handles the details: correct codes, fasting instructions, e-prescribe routing
```

## Revenue Cycle

AI fights for every dollar.

```typescript
// End of day: bill everything
await athena`bill today's visits`

// AI documents -> codes -> scrubs -> submits
// You review exceptions. That's it.
```

### Denials

```typescript
// The billing specialist's dream
await athena`appeal the winnable denials`

// AI analyzes each denial, drafts appeal letters, attaches documentation
// You approve. AI submits.

// Or get specific
await athena`why was claim 12345 denied?`
await athena`appeal Mrs. Chen's MRI denial`
```

### Prior Auth

```typescript
// 34 hours/week → 34 seconds
await athena`submit prior auth for knee replacement`

// AI pulls clinical history, failed treatments, imaging
// Submits to payer. Tracks until resolution.
// Appeals automatically if denied.
```

### Payments

```typescript
// ERA comes in, AI handles it
await athena`post today's payments`

// Denials go to appeal queue. Patient balances get statements.
// You see the summary.
```

## REST API

Full Athenahealth-compatible REST API for integrations that need it.

```
/patients, /appointments, /claims, /documents, /encounters
```

But you probably won't need it. Just talk to athena.

## AI That Works

### Documentation That Writes Itself

```typescript
// AI listens to the visit, writes the note
await athena`document this visit`.listen()

// Or voice-dictate afterward
await athena`stable diabetic, refill metformin, see in 3 months`
```

### Patient Outreach

```typescript
// Find gaps, write messages, send them
await athena`reach out to patients overdue for mammograms`

// AI writes personalized messages, sends via patient preference
```

## Architecture

Each practice is isolated. Your data stays yours.

```
your-practice.athena.do  →  Durable Object (SQLite + R2)
                              ↓
                         Encrypted, HIPAA-compliant
                              ↓
                         You control it
```

## Who It's For

- **Solo practices** - Run your own PM system for free
- **Small groups** - Central billing, shared scheduling
- **Telehealth** - Built-in video, ambient documentation
- **Billing services** - RCM without the PM (connect any EHR)

## Deploy Anywhere

```bash
npx create-dotdo athena                    # Cloudflare (recommended)
docker run dotdo/athena                    # Self-hosted
kubectl apply -f athena-hipaa.yaml         # Kubernetes
```

## vs Athenahealth

| | Athenahealth | athena.do |
|-|--------------|-----------|
| Cost | $250/patient/year + 6-8% | $0 |
| Setup | 3-6 months | Hours |
| AI | Premium add-on | Built-in |
| Data | Theirs | Yours |

## Interoperability

FHIR R4 native. Carequality. CommonWell. HL7. e-Prescribe.

```typescript
// Pull records from other providers
await athena`get Maria's records from the hospital`

// Send referrals
await athena`send referral to Austin Eye Associates`
```

## Open Source

MIT License. Built for independent practice.

```bash
git clone https://github.com/dotdo/athena.do
```

Contributions welcome from practice administrators, billers, coders, and physicians who know what the software should actually do.

---

AI assists. Humans decide. Your responsibility. MIT License.

**[athena.do](https://athena.do)** | Part of [workers.do](https://workers.do)
