# @dotdo/glyphs

A visual programming language embedded in TypeScript. Write expressive code using CJK glyphs as valid identifiers.

```typescript
import { 入, 人, 巛, 彡, 口, 回, 田, 目, 亘, ılıl } from '@dotdo/glyphs'

// Define a type
const User = 口({ name: String, email: String })

// Worker creates user
const user = await 人`signup Alice alice@example.com`

// Store in collection
await 田.users.add(回(User, user))

// Emit event, track metric
巛`user.created ${user}`
ılıl.increment('signups')
```

## Why Glyphs?

**They're valid TypeScript.** CJK characters are legal JavaScript identifiers. No transpilation, no macros—just code.

**They're visual.** Each glyph looks like what it does:
- `入` (enter) → function invocation
- `人` (person) → worker/agent
- `巛` (river) → flowing events
- `田` (field) → grid of data

**They're concise.** Express intent in a single character while maintaining full type safety.

## Installation

```bash
npm install @dotdo/glyphs
# or
pnpm add @dotdo/glyphs
# or
bun add @dotdo/glyphs
```

## The Glyphs

Every glyph exports both the visual symbol and an ASCII alias. Use whichever you prefer.

| Glyph | ASCII | Concept | Visual Metaphor |
|-------|-------|---------|-----------------|
| `入` | `fn` | function/invoke | Arrow entering |
| `人` | `worker` | worker/agent | Person standing |
| `巛` | `on` | event/stream | Flowing river |
| `彡` | `db` | database | Stacked layers |
| `田` | `c` | collection | Grid cells |
| `目` | `ls` | list | Rows of items |
| `口` | `T` | type/schema | Empty container |
| `回` | `$` | instance | Nested box |
| `亘` | `www` | site/page | Horizontal span |
| `ılıl` | `m` | metrics | Bar chart |
| `卌` | `q` | queue | Items in line |

## Quick Reference

```typescript
import {
  入, fn,      // function invocation
  人, worker,  // worker/agent execution
  巛, on,      // event emission
  彡, db,      // database access
  田, c,       // collections
  目, ls,      // lists
  口, T,       // type definitions
  回, $,       // instance creation
  亘, www,     // sites/pages
  ılıl, m,     // metrics
  卌, q,       // queues
} from '@dotdo/glyphs'
```

---

## 入 — Function Invocation

Invoke functions using tagged templates.

```typescript
import { 入, fn } from '@dotdo/glyphs'

// Basic invocation
const result = await 入`calculate fibonacci of ${42}`

// Chaining
const processed = await 入`fetch data`
  .then(入`transform`)
  .then(入`validate`)

// ASCII equivalent
const result = await fn`calculate fibonacci of ${42}`
```

---

## 人 — Worker/Agent

Dispatch tasks to AI agents or human workers.

```typescript
import { 人, worker } from '@dotdo/glyphs'

// Generic worker
const review = await 人`review this code for security issues`

// Named agents
const analysis = await 人.tom`review the architecture`
const roadmap = await 人.priya`plan Q1 features`
const tests = await 人.quinn`write unit tests for auth module`

// Parallel execution
const [code, product, qa] = await Promise.all([
  人.tom`review code`,
  人.priya`review product`,
  人.quinn`run tests`
])

// Dynamic agent
const agent = 'tom'
const result = await 人[agent]`review ${code}`
```

---

## 巛 — Events

Emit and subscribe to events with pattern matching.

```typescript
import { 巛, on } from '@dotdo/glyphs'

// Emit via tagged template
巛`user.created ${{ id: '123', email: 'alice@example.com' }}`

// Subscribe to exact event
巛.on('user.created', (event) => {
  console.log('New user:', event.data)
})

// Pattern matching
巛.on('user.*', (event) => {
  console.log('User event:', event.name)
})

巛.on('*.created', (event) => {
  console.log('Something created:', event.name)
})

// One-time listener
巛.once('app.ready', () => {
  console.log('App is ready!')
})

// Unsubscribe
const unsubscribe = 巛.on('user.updated', handler)
unsubscribe()
```

---

## 口 — Type Definition

Define schemas with validation.

```typescript
import { 口, T } from '@dotdo/glyphs'

// Basic type
const User = 口({
  name: String,
  email: String,
  age: Number,
  active: Boolean
})

// With validation
const Email = 口({
  value: String,
  validate: (v) => v.includes('@')
})

// Nested types
const Profile = 口({
  user: User,
  settings: 口({
    theme: String,
    notifications: Boolean
  })
})

// Infer TypeScript type
type UserType = 口.Infer<typeof User>
// { name: string, email: string, age: number, active: boolean }
```

---

## 回 — Instance Creation

Create validated instances from types.

```typescript
import { 口, 回, $, T } from '@dotdo/glyphs'

const User = 口({ name: String, email: String })

// Create instance
const alice = 回(User, {
  name: 'Alice',
  email: 'alice@example.com'
})

// Validation on creation
const invalid = 回(User, { name: 123 }) // throws ValidationError

// Instances are immutable
alice.name = 'Bob' // TypeError: Cannot assign to read-only property

// Update by creating new instance
const updated = 回(User, { ...alice, name: 'Alicia' })

// ASCII equivalent
const bob = $(User, { name: 'Bob', email: 'bob@example.com' })
```

---

## 田 — Collections

Type-safe collections with CRUD operations.

```typescript
import { 田, c } from '@dotdo/glyphs'

interface User {
  id: string
  name: string
  email: string
}

// Create collection
const users = 田<User>('users')

// CRUD operations
await users.add({ id: '1', name: 'Alice', email: 'alice@example.com' })
const user = await users.get('1')
await users.update('1', { name: 'Alicia' })
await users.delete('1')

// List all
const allUsers = await users.list()
```

---

## 目 — Lists

Fluent list operations with lazy evaluation.

```typescript
import { 目, ls } from '@dotdo/glyphs'

const users = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 }
]

// Fluent queries
const result = await 目(users)
  .where({ age: { gte: 28 } })
  .map(u => u.name)
  .sort('asc')
  .limit(10)
  .toArray()

// Async iteration
for await (const user of 目(users).where({ age: { gt: 25 } })) {
  console.log(user.name)
}

// From collection
const activeUsers = 目(田.users)
  .where({ active: true })
  .toArray()
```

---

## 彡 — Database

Database access with query building and transactions.

```typescript
import { 彡, db } from '@dotdo/glyphs'

interface Schema {
  users: { id: string, name: string, email: string }
  posts: { id: string, title: string, authorId: string }
}

const database = 彡<Schema>()

// Query
const users = await database.users
  .where({ email: { like: '%@example.com' } })
  .orderBy('name')
  .limit(10)
  .execute()

// Insert
await database.users.insert({
  id: '1',
  name: 'Alice',
  email: 'alice@example.com'
})

// Transactions
await database.tx(async (tx) => {
  const user = await tx.users.insert({ id: '1', name: 'Alice', email: 'a@b.com' })
  await tx.posts.insert({ id: '1', title: 'Hello', authorId: user.id })
})
```

---

## 亘 — Sites/Pages

Build pages and routes with tagged templates.

```typescript
import { 亘, www } from '@dotdo/glyphs'

// Create page
const usersPage = 亘`/users ${userList}`

// With dynamic content
const userPage = 亘`/users/${userId} ${userData}`

// Define routes
亘.route('/users', () => fetchUsers())
亘.route('/users/:id', ({ params }) => fetchUser(params.id))

// Bulk routes
亘.route({
  '/': () => homePage,
  '/users': () => usersPage,
  '/about': () => aboutPage,
})

// Render
const response = await site.render(request)
```

---

## ılıl — Metrics

Track counters, gauges, timers, and histograms.

```typescript
import { ılıl, m } from '@dotdo/glyphs'

// Counters
ılıl.increment('requests')
ılıl.increment('errors', 1, { code: 500 })

// Gauges
ılıl.gauge('connections', 42)
ılıl.gauge('memory_mb', process.memoryUsage().heapUsed / 1024 / 1024)

// Timers
const timer = ılıl.timer('request.duration')
await handleRequest()
timer.stop()

// Or with automatic timing
const result = await ılıl.time('db.query', async () => {
  return await db.query(sql)
})

// Histograms
ılıl.histogram('response.size', bytes)
```

---

## 卌 — Queues

Push, pop, and process queued items.

```typescript
import { 卌, q } from '@dotdo/glyphs'

interface Task {
  id: string
  type: string
  payload: unknown
}

// Create queue
const tasks = 卌<Task>()

// Push/pop
await tasks.push({ id: '1', type: 'email', payload: { to: 'alice@example.com' } })
const next = await tasks.pop()

// Process with consumer
const stop = tasks.process(async (task) => {
  await handleTask(task)
}, {
  concurrency: 5,
  retries: 3
})

// Stop processing
stop()

// Backpressure
const bounded = 卌<Task>({ maxSize: 100 })
await bounded.push(task) // blocks if queue is full
```

---

## Composition

Glyphs compose naturally:

```typescript
import { 入, 人, 巛, 彡, 口, 回, 田, 目, ılıl } from '@dotdo/glyphs'

// Define schema
const User = 口({ name: String, email: String, plan: String })

// Event-driven flow
巛.on('user.signup', async ({ data }) => {
  // Validate and store
  const user = 回(User, data)
  await 田.users.add(user)

  // Track metric
  ılıl.increment('signups', 1, { plan: user.plan })

  // Trigger worker
  await 人.emma`send welcome email to ${user.email}`

  // Emit downstream event
  巛`user.created ${user}`
})

// Query pipeline
const premiumUsers = await 目(彡.users)
  .where({ plan: 'premium', active: true })
  .map(入`enrichUserData`)
  .toArray()
```

## Three Styles, One API

Write code your way:

```typescript
// Visual (glyph)
await 人`review ${code}`

// Terse (short ASCII)
await worker`review ${code}`

// The choice is yours
```

## Tree-Shaking

Import only what you need:

```typescript
// Individual imports
import { 入 } from '@dotdo/glyphs/invoke'
import { 人 } from '@dotdo/glyphs/worker'

// Or import all
import { 入, 人, 巛 } from '@dotdo/glyphs'
```

## TypeScript

Full type inference throughout:

```typescript
const User = 口({ name: String, age: Number })
type UserType = 口.Infer<typeof User> // { name: string, age: number }

const users = 田<UserType>('users')
const user = await users.get('123') // UserType | null

const names = 目(users)
  .map(u => u.name) // inferred as string[]
  .toArray()
```

## Requirements

- Node.js 18+
- TypeScript 5.0+ (recommended)

## License

MIT

---

<p align="center">
  <strong>入 人 巛 彡 田 目 口 回 亘 ılıl 卌</strong>
  <br>
  <em>Code that looks like what it does.</em>
</p>
