# agents.do

> You're building something great. You need a team.

You're a founder. You have the vision. But right now it's just you, or maybe a tiny crew. You need people who can turn ideas into reality.

Meet your team:

```typescript
import { priya, ralph, tom, rae, mark, sally, quinn } from 'agents.do'

priya`what should we build first?`
ralph`build that for me`
tom`review Ralph's work`
```

That's it. Just talk to them.

## Your Core Team

**Priya** is your product partner. Tell her what you're thinking, and she'll help you shape it.

```typescript
priya`I want to build a marketplace for freelance designers`
priya`what's the simplest version we could ship this week?`
priya`prioritize these features for me: ${ideas}`
```

**Ralph** is your developer. Give him a task, he builds it.

```typescript
ralph`build user authentication`
ralph`add Stripe payments`
ralph`fix that bug where users can't upload images`
```

**Tom** is your tech lead. He keeps the code clean and catches issues.

```typescript
tom`review what Ralph just built`
tom`is this architecture going to scale?`
tom`check for security issues`
```

**Rae** is your frontend specialist. She makes it beautiful and accessible.

```typescript
rae`design the user dashboard`
rae`make this form more intuitive`
rae`ensure our app is accessible`
```

**Mark** is your marketing voice. He writes copy that converts.

```typescript
mark`write the landing page copy`
mark`create documentation for this API`
mark`draft the launch announcement`
```

**Sally** is your sales closer. She helps you land customers.

```typescript
sally`reach out to these leads: ${prospects}`
sally`prepare a demo for this customer`
sally`help me close this deal`
```

**Quinn** is your QA engineer. She finds the bugs before your users do.

```typescript
quinn`test the checkout flow`
quinn`what edge cases are we missing?`
quinn`verify this works on mobile`
```

## Talk Like They're Real

Because they are. No special syntax. No configuration. Just say what you need:

```typescript
// Be specific
ralph`implement OAuth with Google and GitHub using Better Auth`

// Or be vague
ralph`add social login`

// They figure it out
```

## Work Flows Naturally

Hand off work from one teammate to the next:

```typescript
const plan = await priya`plan our MVP`
const code = await ralph`build ${plan}`
const review = await tom`review ${code}`
```

## Parallel When You Need It

Get multiple perspectives at once:

```typescript
const feedback = await Promise.all([
  priya`does this solve the user problem?`,
  tom`is the implementation solid?`,
])
```

## Real GitHub Accounts

When Tom reviews your PR, you'll see `@tom-do` commenting. When Ralph pushes code, it's from his account. They're real team members with real identities.

```typescript
priya.github // 'priya-do'
ralph.github // 'ralph-do'
tom.github   // 'tom-do'
rae.github   // 'rae-do'
mark.github  // 'mark-do'
sally.github // 'sally-do'
quinn.github // 'quinn-do'
```

## Your Journey

**Week 1:** You have an idea.
```typescript
priya`help me think through this idea: ${pitch}`
```

**Week 2:** You have a plan.
```typescript
const mvp = await priya`what's the smallest thing we can ship?`
await ralph`build ${mvp}`
```

**Week 4:** You have a product.
```typescript
await tom`make sure everything is production-ready`
```

**Month 2:** You have customers.

**Month 6:** You hire your first human. Your agents trained them on the codebase.

---

They're not replacing the humans you'll eventually hire. They're giving you leverage until you get there.

Welcome to your team.

[agents.do](https://agents.do) | [priya.do](https://priya.do) | [ralph.do](https://ralph.do) | [tom.do](https://tom.do) | [rae.do](https://rae.do) | [mark.do](https://mark.do) | [sally.do](https://sally.do) | [quinn.do](https://quinn.do)
