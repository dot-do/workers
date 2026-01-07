# database.do

What do you want your database to .do for you?

Schema-first database with natural language queries and promise pipelining.

## Installation

```bash
npm install database.do
# or
pnpm add database.do
# or
yarn add database.do
```

## Quick Start

```typescript
import { database } from 'database.do'

// Natural language queries
const activeUsers = await database.do`find all active users created this week`

// Entity operations with type safety
interface User {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  createdAt: Date
}

// Access entities via explicit entity() method
const users = await database.entity<User>('User').list()
const user = await database.entity<User>('User').get('user-123')
await database.entity<User>('User').create({ name: 'Alice', email: 'alice@example.com', status: 'active' })
```

## Entity Operations

Access entities using the `entity<T>(name)` method:

```typescript
import { db } from 'database.do'

interface Lead {
  id: string
  name: string
  company: string
  score: number
  status: string
}

// Get entity operations for a type
const leads = db.entity<Lead>('Lead')

// List all entities
const allLeads = await leads.list()

// List with options
const pagedLeads = await leads.list({ limit: 10, offset: 0, orderBy: 'createdAt' })

// Find by query
const hotLeads = await leads.find({ status: 'hot' })

// Search with natural language
const techLeads = await leads.search('tech companies in SF')

// Get single entity
const lead = await leads.get('lead-123')

// Create
const newLead = await leads.create({ name: 'Acme Corp', company: 'Acme', score: 85 })

// Update
const updated = await leads.update('lead-123', { score: 95 })

// Upsert
const upserted = await leads.upsert({ id: 'lead-123', score: 100 })

// Delete
await leads.delete('lead-123')
```

## Promise Pipelining

Chain operations without intermediate awaits:

```typescript
// Filter and map in a pipeline
const qualified = await db.entity<Lead>('Lead').list()
  .filter(l => l.score > 80)
  .map(l => ({ name: l.name, company: l.company }))

// Take first N results
const topLeads = await db.entity<Lead>('Lead').list()
  .sort('score', 'desc')
  .take(5)

// Get first matching item
const bestLead = await db.entity<Lead>('Lead').list()
  .filter(l => l.score > 90)
  .first()

// Count results
const totalActive = await db.entity<User>('User').find({ status: 'active' }).count()
```

## Event Tracking

Track analytics events (append-only):

```typescript
// Track an event
await database.track({
  type: 'User.signup',
  source: 'web',
  data: { userId: 'user-123', plan: 'pro' }
})

// Track with correlation
await database.track({
  type: 'Order.placed',
  source: 'api',
  data: order,
  correlationId: sessionId,
  causationId: cartId
})

// Query events
const signupEvents = await database.events({
  type: 'User.signup',
  after: new Date('2024-01-01'),
  limit: 100
})

// Filter by entity type
const userEvents = await database.events({
  type: 'User.%',  // wildcard matching
  source: 'api'
})
```

## Actions

Send commands and track their status:

```typescript
// Fire-and-forget action
await database.send({
  actor: 'user-123',
  object: 'lead-456',
  action: 'qualify'
})

// Action with result waiting
const result = await database.action({
  actor: 'user-123',
  object: 'lead-456',
  action: 'enrich',
  metadata: { provider: 'clearbit' }
})

// Query pending actions
const pending = await database.actions({
  actor: 'user-123',
  status: 'pending'
})

// Complete an action
await database.completeAction('action-id', { enrichedData: {...} })

// Fail an action
await database.failAction('action-id', 'Provider unavailable')
```

## Artifacts

Store and retrieve computed artifacts with caching:

```typescript
// Store an artifact
await database.storeArtifact({
  key: 'report:monthly:2024-01',
  type: 'report',
  source: 'analytics',
  sourceHash: 'abc123',
  content: reportData,
  ttl: 86400,
  metadata: { generatedAt: new Date() }
})

// Retrieve artifact
const artifact = await database.getArtifact<ReportData>('report:monthly:2024-01')
if (artifact) {
  console.log(artifact.content)
}

// Delete artifact
await database.deleteArtifact('report:monthly:2024-01')
```

## Schema Operations

Introspect your database schema:

```typescript
// Get full schema
const schema = await database.schema()

// List entity types
const types = await database.types()
// ['User', 'Lead', 'Order', ...]

// Describe an entity
const userSchema = await database.describe('User')
// {
//   name: 'User',
//   fields: {
//     id: { type: 'string', required: true },
//     email: { type: 'string', required: true },
//     orders: { type: 'Order[]', required: false, relation: 'Order' }
//   }
// }
```

## Local Development

Use `DB` for local schema definition:

```typescript
import { DB, setProvider } from 'database.do'

// Define your schema
const schema = {
  User: {
    id: 'string',
    name: 'string',
    email: 'string',
  },
  Post: {
    id: 'string',
    title: 'string',
    authorId: 'string',
  }
}

// Create a local database
const localDb = DB(schema)

// Or set a custom provider for production
setProvider(myCustomProvider)
```

## Configuration

```typescript
import { Database } from 'database.do'

// Create a configured client
const db = Database({
  apiKey: process.env.DATABASE_DO_API_KEY,
  baseUrl: 'https://database.do',
  timeout: 30000,
})
```

## Environment Variables

- `DO_API_KEY` - API key for authentication
- `DATABASE_DO_API_KEY` - Alternative API key (takes precedence)

## Types

All types are exported for TypeScript users:

```typescript
import type {
  // Schema types
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,
  PrimitiveType,
  // Thing types
  ThingFlat,
  ThingExpanded,
  Thing,
  // Query types
  QueryOptions,
  ListOptions,
  SearchOptions,
  // Event/Action/Artifact types
  Event,
  Action,
  Artifact,
  ActionStatus,
  ArtifactType,
  // Client types
  DatabaseClient,
  EntityOperations,
  DBPromise,
  ClientOptions,
} from 'database.do'
```

## Links

- [Website](https://database.do)
- [Documentation](https://docs.database.do)
- [GitHub](https://github.com/drivly/workers)
