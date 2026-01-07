# nouns.do

**Name your world. Let AI understand it.**

```bash
npm install nouns.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { nouns } from 'nouns.do'

// Or use the factory for custom config
import { Nouns } from 'nouns.do'
const nouns = Nouns({ baseURL: 'https://custom.example.com' })
```

---

## Your Data Is Speaking a Language AI Can't Understand

You have data everywhere. Customers in Salesforce. Orders in Shopify. Products in a database. Users in Auth0.

But building AI that works with your business means:
- Scattered schemas that don't match each other
- No shared vocabulary between systems
- AI that doesn't know a "customer" from a "user"
- Manual mapping every time you connect something new
- Brittle integrations that break when schemas change

**AI is powerful. But it's deaf to your domain.**

## What If AI Understood Your Business?

```typescript
import { nouns } from 'nouns.do'

// Describe your domain in plain English
const schema = await nouns.do`
  A Customer has a name, email, and tier (free, pro, enterprise).
  A Customer has many Orders.
  An Order belongs to a Customer and has many LineItems.
  A LineItem references a Product and has a quantity.
  A Product has a name, price, and inventory count.
`

// Or define with full control
const Customer = await nouns.define('Customer', {
  fields: {
    name: { type: 'string', required: true },
    email: { type: 'string', unique: true },
    tier: { type: 'enum', values: ['free', 'pro', 'enterprise'] }
  },
  relationships: {
    orders: { type: 'hasMany', target: 'Order' }
  }
})

// Create instances - AI knows what they mean
const alice = await nouns.instances('Customer').create({
  name: 'Alice Chen',
  email: 'alice@example.com',
  tier: 'pro'
})
```

**nouns.do** gives you:
- A shared vocabulary AI actually understands
- Relationships that map to real business logic
- Type-safe operations on your domain objects
- Automatic validation and migrations
- One source of truth for your entire stack

## Define Your Domain in 3 Steps

### 1. Define Your Nouns

```typescript
import { nouns } from 'nouns.do'

// Natural language for quick modeling
const schema = await nouns.do`
  A Company has a name and industry.
  A Company has many Employees.
  An Employee belongs to a Company and has a name, email, and role.
  An Employee can manage many other Employees.
`

// Programmatic for precision
await nouns.define('Employee', {
  fields: {
    name: { type: 'string', required: true },
    email: { type: 'string', unique: true },
    role: { type: 'string' },
    startDate: { type: 'date' },
    salary: { type: 'number' }
  },
  relationships: {
    company: { type: 'belongsTo', target: 'Company' },
    manager: { type: 'belongsTo', target: 'Employee' },
    reports: { type: 'hasMany', target: 'Employee', foreignKey: 'managerId' }
  }
})
```

### 2. Connect to Your Data

```typescript
// Create and query instances
const employees = nouns.instances('Employee')

// Create
const emp = await employees.create({
  name: 'Bob Smith',
  email: 'bob@company.com',
  role: 'Engineer'
})

// Query with filters
const engineers = await employees.list({
  filter: { role: 'Engineer' },
  orderBy: 'startDate',
  order: 'desc'
})

// Update
await employees.update(emp.id, { role: 'Senior Engineer' })

// Validate before saving
const result = await nouns.validate('Employee', {
  name: 'Invalid',
  email: 'not-an-email'
})
// { valid: false, errors: [{ field: 'email', message: '...' }] }
```

### 3. Let AI Work With Your Domain

```typescript
// Export for AI consumption
const typeScript = await nouns.export('typescript')
const graphQL = await nouns.export('graphql')

// Import from existing schemas
await nouns.import(existingSchema, 'sql')

// Migrations handled automatically
const migration = await nouns.migrate({ preview: true })
console.log(migration.operations)
// [{ type: 'addField', noun: 'Employee', field: 'department' }]

await nouns.applyMigration(migration.id)
```

## The Difference

**Without nouns.do:**
- "customer_id" in one system, "userId" in another
- AI prompts full of schema explanations
- Every integration is custom glue code
- Schema changes break everything
- Weeks of data modeling meetings
- Nobody knows what fields mean

**With nouns.do:**
- One canonical model for your business
- AI understands context automatically
- Integrations map to your vocabulary
- Migrations generated automatically
- Model in minutes, refine over time
- Self-documenting, always current

## Everything You Need

```typescript
// Get relationships
const rels = await nouns.relationships('Order')
// [{ type: 'belongsTo', target: 'Customer' }, { type: 'hasMany', target: 'LineItem' }]

// Add relationships
await nouns.relate('Product', 'category', {
  type: 'belongsTo',
  target: 'Category'
})

// Full schema access
const schema = await nouns.schema()
console.log(schema.nouns.map(n => n.name))
// ['Customer', 'Order', 'LineItem', 'Product', 'Category']

// Instance operations
const products = nouns.instances('Product')
const count = await products.count({ inventory: 0 })
console.log(`${count} products out of stock`)
```

## Field Types

| Type | Description |
|------|-------------|
| `string` | Text values |
| `number` | Numeric values (integers, decimals) |
| `boolean` | True/false values |
| `date` | Date without time |
| `datetime` | Date with time |
| `json` | Arbitrary JSON data |
| `enum` | One of predefined values |
| `reference` | Foreign key to another noun |

## Relationship Types

| Type | Description |
|------|-------------|
| `hasOne` | One-to-one (e.g., User hasOne Profile) |
| `hasMany` | One-to-many (e.g., Customer hasMany Orders) |
| `belongsTo` | Inverse of hasOne/hasMany |
| `manyToMany` | Many-to-many via junction table |

## Configuration

```typescript
// Workers - import env adapter to configure from environment
import 'rpc.do/env'
import { Nouns } from 'nouns.do'

const nouns = Nouns()
```

Or use a custom configuration:

```typescript
import { Nouns } from 'nouns.do'

const nouns = Nouns({
  apiKey: 'your-api-key',
  baseURL: 'https://custom.nouns.do'
})
```

Environment variables `NOUNS_API_KEY` or `DO_API_KEY` are automatically configured when using `rpc.do/env`.

## Stop Translating. Start Building.

Your business has a language. Your customers, orders, products - they mean something specific to you. Define them once, and let every system, every AI, every integration speak your language.

**Name your world. Let AI understand it.**

```bash
npm install nouns.do
```

[Define your domain at nouns.do](https://nouns.do)

---

MIT License
