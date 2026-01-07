# startup.games

**Master the startup game before you play it for real.**

```bash
npm install startup.games
```

---

## You Want to Build a Startup. But the Learning Curve Is Deadly.

Every aspiring founder faces the same brutal reality:

- Real startups mean real money lost on real mistakes
- Books and courses teach theory, not instinct
- MBA case studies are history lessons, not practice
- The only way to learn is to burn runway

For educators, it's even harder:
- How do you teach entrepreneurship without real stakes?
- How do you give students 10 years of pattern recognition in 10 weeks?
- How do you make business concepts tangible, not theoretical?

**What if you could simulate a startup before you stake your life on one?**

## The Flight Simulator for Founders

```typescript
import { games } from 'startup.games'

// Start a realistic business simulation
const sim = await games.simulate({
  model: 'saas-b2b',
  market: 'developer-tools',
  initialCapital: 50000,
  difficulty: 'normal'
})

// Make the decisions real founders make
await sim.decide({ action: 'hire', role: 'engineer', salary: 120000 })
await sim.decide({ action: 'build', feature: 'api-v2' })
await sim.decide({ action: 'market', channel: 'content', budget: 5000 })

// See what happens
const results = await sim.advance({ months: 3 })
console.log(`MRR: $${results.state.revenue}`)
console.log(`Customers: ${results.state.customers}`)
```

**startup.games** is gamified entrepreneurship:
- Simulations based on real startup data
- Strategic decisions with realistic consequences
- Random events that test your adaptability
- Compete on leaderboards, earn achievements
- Build intuition before you build a company

## Learn Startup Skills in 3 Steps

### 1. Choose Your Business Model

```typescript
import { games } from 'startup.games'

// Pick from realistic business models
const sim = await games.simulate({
  model: 'saas-b2b',        // or 'marketplace', 'ecommerce', 'agency'
  market: 'developer-tools',
  initialCapital: 50000,
  difficulty: 'normal'      // 'easy' | 'normal' | 'hard' | 'nightmare'
})

// Each model has real-world dynamics
// SaaS: High margins, subscription revenue, churn battles
// Marketplace: Cold start problem, network effects, take rates
// Agency: Margins vs scale, client concentration, productization
```

### 2. Make Strategic Decisions

```typescript
// Hiring - who do you need and when?
await sim.decide({ action: 'hire', role: 'engineer' })
await sim.decide({ action: 'hire', role: 'sales' })

// Product - what do you build?
await sim.decide({ action: 'build', feature: 'integrations' })
await sim.decide({ action: 'launch', feature: 'api-v2' })

// Growth - how do you acquire customers?
await sim.decide({ action: 'market', channel: 'paid', budget: 10000 })
await sim.decide({ action: 'market', channel: 'content' })

// Fundraising - when and how much?
await sim.decide({ action: 'raise', amount: 1000000, dilution: 0.15 })

// Pivots - when do you change direction?
await sim.decide({ action: 'pivot', from: 'b2c', to: 'b2b' })
```

### 3. Learn from Outcomes

```typescript
// Advance time and face the consequences
const results = await sim.advance({ months: 3 })

// Track your metrics
const metrics = await sim.getMetrics()
console.log(`Burn rate: $${metrics.burnRate}/month`)
console.log(`Runway: ${metrics.runway} months`)
console.log(`MRR: $${metrics.mrr}`)
console.log(`Growth: ${metrics.growthRate}%`)

// Handle random events
for (const event of results.events) {
  if (event.type === 'opportunity') {
    // "A large enterprise wants to become your customer..."
  }
  if (event.type === 'crisis') {
    // "Your main competitor just raised $50M..."
  }
}
```

## Learning by Reading vs Learning by Doing

**Without startup.games:**
- Read 50 startup books, still freeze on first real decision
- Case studies feel distant and theoretical
- No feedback loop on your intuition
- Learn from failure when failure costs everything

**With startup.games:**
- Experience years of startup decisions in hours
- Immediate feedback on every choice
- Pattern recognition built through repetition
- Fail fast, learn fast, no money lost

## Compete. Achieve. Master.

```typescript
// Challenges give you structured learning goals
const challenges = await games.challenges()
const result = await games.attemptChallenge('first-100-customers')
if (result.success) {
  console.log(`Earned: ${result.rewards.map(r => r.item).join(', ')}`)
}

// Leaderboards let you compete with other aspiring founders
const leaderboard = await games.leaderboard({ period: 'weekly', limit: 10 })
for (const entry of leaderboard.entries) {
  console.log(`#${entry.rank} ${entry.username} - ${entry.score}`)
}

// Achievements track your progress
const achievements = await games.achievements()
// "First Exit", "Unicorn Builder", "Pivot Master", "Ramen Profitable"
```

## Perfect for Educators

```typescript
import { Games } from 'startup.games'

// Create a custom environment for your class
const classroom = Games({
  apiKey: process.env.EDUCATOR_API_KEY
})

// Set up competitions between student teams
// Track progress across the semester
// Grade based on decision quality, not just outcomes
// Give students real entrepreneurship intuition
```

**Use startup.games to:**
- Run semester-long startup simulations
- Create hackathon-style competitions
- Supplement case studies with hands-on practice
- Build entrepreneurship curriculum that actually sticks

## Your Path to Founder-Ready

The best time to learn startup skills was 10 years ago. The second best time is to practice them today, risk-free.

**Don't wait for your first startup to start learning.**

```bash
npm install startup.games
```

[Start playing at startup.games](https://startup.games)

---

Part of the [workers.do](https://workers.do) Autonomous Startup platform:
- **[startups.new](https://startups.new)** - Launch your startup
- **[startups.studio](https://startups.studio)** - Build and grow your startup
- **[startup.games](https://startup.games)** - Practice startup skills

MIT License
