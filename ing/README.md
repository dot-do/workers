# `ing` - Semantic Triple Network Worker

**Version:** 1.0.0
**Status:** 🚧 Implementation Complete, Testing In Progress
**Domain:** `ing.as`

## Overview

The `ing` worker is the **semantic triple coordinator** for the `.do` ecosystem. It manages semantic relationships between Objects, Actions (gerunds), and Subjects (agents/roles) in a sophisticated graph database, enabling natural language URL patterns like:

```
[verb].ing.as/[subject]/[object]
```

**Examples:**
- `invoicing.ing.as/accountant/invoice_123`
- `coding.ing.as/developer/app_456`
- `treating.ing.as/doctor/patient_789`

## Architecture

The worker provides **four interfaces**:

1. **RPC** - Service-to-service calls via `WorkerEntrypoint`
2. **HTTP** - RESTful API via Hono
3. **MCP** - AI agent tools via Model Context Protocol
4. **Queue** - Async message processing

### Core Components

- **`types.ts`** - TypeScript type definitions (Triple, Verb, Role, Context, etc.)
- **`triples.ts`** - Triple storage and CRUD operations
- **`verbs.ts`** - Verb registry with GS1 and custom verbs
- **`roles.ts`** - Role resolution and capability checking (RBAC)
- **`query.ts`** - Graph traversal and SPARQL-like queries
- **`index.ts`** - Main entrypoint with all interfaces

## Quick Start

### Installation

```bash
cd workers/ing
pnpm install
```

### Development

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Deployment

```bash
# Deploy to production
pnpm deploy
```

## API Reference

### RPC Interface

```typescript
import type { IngService } from './src/index'

// Access via service binding
const triple = await env.ING_SERVICE.createTriple({
  subject: 'accountant',
  predicate: 'invoicing',
  object: 'invoice_123'
})

// Query triples
const result = await env.ING_SERVICE.queryTriples({
  subject: 'accountant',
  predicate: 'invoicing'
})

// Resolve verb
const verb = await env.ING_SERVICE.resolveVerb('invoicing')

// Check capability
const capability = await env.ING_SERVICE.checkCapability('accountant', 'invoicing')

// Traverse graph
const graph = await env.ING_SERVICE.traverse({
  start: 'accountant',
  depth: 3,
  direction: 'forward'
})
```

### HTTP API

#### Triple Operations

```bash
# Create triple
curl -X POST https://ing.as/triples \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "accountant",
    "predicate": "invoicing",
    "object": "invoice_123",
    "context": {
      "temporal": { "timestamp": "2025-10-04T10:00:00Z" },
      "spatial": { "location": "office" }
    }
  }'

# Get triple by ID
curl https://ing.as/triples/triple_123

# Query triples
curl "https://ing.as/triples?subject=accountant&predicate=invoicing"

# Delete triple
curl -X DELETE https://ing.as/triples/triple_123
```

#### Verb Operations

```bash
# Resolve verb
curl https://ing.as/verbs/invoicing

# List all verbs
curl https://ing.as/verbs

# List verbs by category
curl "https://ing.as/verbs?category=supply-chain"

# Register custom verb
curl -X POST https://ing.as/verbs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "auditing",
    "gerund": "auditing",
    "base_form": "audit",
    "category": "finance",
    "danger_level": "medium",
    "required_role": ["auditor", "accountant"]
  }'
```

#### Role Operations

```bash
# Resolve role
curl https://ing.as/roles/accountant

# Get role capabilities
curl https://ing.as/roles/accountant/capabilities

# Check capability
curl -X POST https://ing.as/roles/accountant/check/invoicing

# List all roles
curl https://ing.as/roles
```

#### Graph Operations

```bash
# Traverse graph
curl -X POST https://ing.as/graph/traverse \
  -H "Content-Type: application/json" \
  -d '{
    "start": "accountant",
    "depth": 3,
    "direction": "forward"
  }'

# Find paths
curl -X POST https://ing.as/graph/paths \
  -H "Content-Type: application/json" \
  -d '{
    "from": "accountant",
    "to": "invoice_123",
    "maxDepth": 5
  }'

# Get neighbors
curl "https://ing.as/graph/accountant/neighbors?direction=forward"
```

#### Query Operations

```bash
# Execute SPARQL-like query
curl -X POST https://ing.as/query \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "?subject=accountant ?predicate=* ?object=*"
  }'

# Get statistics
curl https://ing.as/stats
```

### MCP Tools

AI agents can use these tools via Model Context Protocol:

1. **`ing_create_triple`** - Create semantic triple
2. **`ing_query_triples`** - Search triples by pattern
3. **`ing_resolve_verb`** - Get verb definition
4. **`ing_check_capability`** - Validate role permission
5. **`ing_traverse_graph`** - Navigate semantic graph

### Queue Messages

Send async messages to the `semantic-triples` queue:

```typescript
await env.SEMANTIC_TRIPLES_QUEUE.send({
  type: 'CREATE_TRIPLE',
  payload: {
    subject: 'accountant',
    predicate: 'invoicing',
    object: 'invoice_123'
  }
})
```

**Message Types:**
- `CREATE_TRIPLE` - Create triple asynchronously
- `DELETE_TRIPLE` - Delete triple asynchronously
- `INFER_TRIPLES` - AI-powered triple inference
- `SYNC_TO_GRAPH` - Sync entity to graph

## Data Model

### Semantic Triple

```typescript
{
  id: "triple_123",
  subject: "accountant",
  predicate: "invoicing",
  object: "invoice_456",
  context: {
    temporal: { timestamp: "2025-10-04T10:00:00Z" },
    spatial: { location: "office" },
    causal: { reason: "client_request" }
  },
  created_at: "2025-10-04T10:00:00Z",
  created_by: "user_789",
  confidence: 1.0
}
```

### Verb Definition

```typescript
{
  id: "invoicing",
  gerund: "invoicing",
  base_form: "invoice",
  category: "finance",
  danger_level: "low",
  required_role: ["accountant"],
  requires_approval: false,
  description: "Creating and managing invoices",
  examples: ["invoice_123", "invoice_456"]
}
```

### Role Definition

```typescript
{
  id: "accountant",
  name: "accountant",
  capabilities: ["invoicing", "reconciling", "reporting"],
  onet_code: "13-2011.00",
  description: "Financial professional handling accounting tasks"
}
```

## Verb Registry

### GS1 Business Steps (37 verbs)

The worker includes all 37 GS1 Core Business Vocabulary business steps:

- **Supply Chain**: accepting, arriving, assembling, collecting, commissioning, consigning, creating, cycle_counting, decommissioning, departing, destroying, disassembling, dispensing, encoding, entering_exiting, holding, inspecting, installing, killing, packing, picking, receiving, removing, repackaging, repairing, replacing, reserving, retail_selling, sampling, sensor_reporting, shipping, staging_outbound, stock_taking, stocking, storing, transporting, unloading

### Common Business Verbs

- **Knowledge**: reading, writing, editing, deleting
- **Business**: reviewing, approving
- **Technology**: deploying, coding, testing, designing
- **Finance**: invoicing, paying
- **Medical**: diagnosing, prescribing, treating

### Custom Verbs

Register custom verbs via API:

```bash
POST /verbs
{
  "id": "custom_verb",
  "gerund": "custom_verbing",
  "base_form": "custom_verb",
  "category": "custom",
  "danger_level": "safe"
}
```

## Role Registry

### Predefined Roles

- **admin** - Full system access (wildcard `*` capability)
- **accountant** - Financial operations
- **developer** - Software development
- **senior_developer** - Development + deployment
- **doctor** - Medical diagnosis and treatment
- **nurse** - Patient care
- **lawyer** - Legal services
- **manager** - Approval and delegation
- **finance_manager** - Financial authority
- **devops_engineer** - Infrastructure and deployments
- **viewer** - Read-only access

### Custom Roles

Register custom roles via API or database:

```bash
POST /roles
{
  "id": "custom_role",
  "name": "custom_role",
  "capabilities": ["verb1", "verb2"],
  "description": "Custom role description"
}
```

## Security & Permissions

### RBAC Integration

- **Capability Matrix**: Each role has specific verb permissions
- **Danger Levels**: Verbs classified as safe → critical
- **Approval Required**: High-risk verbs require explicit approval
- **Role Hierarchy**: Roles can inherit from parent roles
- **Audit Logging**: All operations logged for compliance

### Permission Checks

```typescript
const capability = await checkCapability('accountant', 'invoicing')

if (capability.allowed) {
  // Proceed with operation
  if (capability.requires_approval) {
    // Request approval first
  }
} else {
  // Deny access
  console.log(capability.reason)
}
```

## Query Language

### Pattern Matching

```
?subject='accountant' ?predicate=* ?object=*
?subject=* ?predicate='invoicing' ?object=*
?subject='accountant' ?predicate='invoicing' ?object='invoice_123'
```

### SPARQL-Like Queries (Planned)

```sparql
SELECT ?subject ?object
WHERE {
  ?subject a :Accountant .
  ?subject :invoicing ?object .
  ?object a :Invoice .
}
```

## Graph Traversal

### Traverse from Node

```typescript
const graph = await traverseGraph('accountant', 3, 'forward', env)

// Returns: { nodes, edges, depth }
```

### Find Paths

```typescript
const paths = await findPaths('accountant', 'invoice_123', 5, env)

// Returns: [{ nodes: [...], edges: [...], length: 3 }, ...]
```

### Get Neighbors

```typescript
const neighbors = await getNeighbors('accountant', 'both', env)

// Returns: ['invoice_123', 'report_456', ...]
```

## Database Integration

The `ing` worker leverages the **existing graph database** infrastructure via `DB_SERVICE` RPC interface, eliminating the need for duplicate triple storage tables.

### Architecture

- **Semantic Triple Mapping**:
  - `subject` → `fromNs:fromId` (thing entity)
  - `predicate` → relationship `type` (verb)
  - `object` → `toNs:toId` (thing entity)
  - `context` → relationship `properties` (5W1H metadata)

### Database Services Used

- **`things` table** (PostgreSQL) - Entities (subjects and objects)
- **`relationships` table** (ClickHouse) - Edges with predicates/verbs
- **DB_SERVICE RPC** - All database operations via service bindings:
  - `upsertRelationship()` - Create/update triples
  - `queryRelationships()` - Query by subject
  - `getIncomingRelationships()` - Query by object
  - `deleteRelationship()` - Delete triples
  - `stats()` / `typeDistribution()` - Analytics

### Storage Format

Relationships are stored with ID format:
```
fromNs:fromId:rel:predicate:toNs:toId
```

Example:
```
ing:accountant:rel:invoicing:ing:invoice_123
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Monitoring

Health check:

```bash
curl https://ing.as/health
```

Statistics:

```bash
curl https://ing.as/stats
```

## Related Documentation

- **[SEMANTICS.md](/SEMANTICS.md)** - Complete semantic triple architecture
- **[Root CLAUDE.md](/CLAUDE.md)** - Multi-repo management
- **[Workers CLAUDE.md](/workers/CLAUDE.md)** - Workers architecture
- **[SDK graphdl](/sdk/packages/graphdl/)** - Business-as-Code types
- **[schema.org.ai](/sdk/packages/schema.org.ai/)** - AI entity vocabulary

## Contributing

1. Follow code style: Prettier with 160 printWidth, no semicolons
2. Add tests for new features
3. Update documentation
4. Run `pnpm typecheck` before committing

## License

MIT

---

**Status:** 🚧 Implementation Complete
**Next Steps:** Testing, deployment, integration
**Managed By:** Claude Code (AI Project Manager)
**Contact:** Issues at https://github.com/dot-do/.do/issues
