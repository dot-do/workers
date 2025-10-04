# Fn Worker - Intelligent Function Classification and Routing

AI-powered service that classifies natural language function descriptions and routes them to the appropriate execution strategy.

## Overview

The `fn` worker takes a function description (with optional context and arguments) and uses AI to determine the best execution strategy:

- **code**: Pure TypeScript functions executed in V8 isolates
- **object**: Structured data generation
- **agentic**: Complex multi-step processes requiring AI agents
- **human**: Tasks requiring human intervention

## Features

- **AI Classification**: Uses GPT-4o-mini (or custom model) to classify functions
- **Intelligent Routing**: Automatically routes to AI service, agent service, or database
- **Sync & Async**: Supports both synchronous and background execution
- **Queue-Based**: Background jobs via Cloudflare Queues
- **RPC Interface**: Service-to-service communication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Function Request                         │
│  description: "Sort array of numbers"                        │
│  args: { numbers: [3, 1, 4, 1, 5] }                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Classification                           │
│              (GPT-4o-mini default)                           │
│  Analyzes function and returns:                              │
│  { type: "code", confidence: 0.95, reasoning: "..." }       │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬───────────────┐
        ▼                ▼                ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│     code     │ │    object    │ │   agentic    │ │    human     │
│              │ │              │ │              │ │              │
│  AI Service  │ │  AI Service  │ │    Agent     │ │   Database   │
│  generates   │ │  generates   │ │   Service    │ │   (tasks)    │
│  and runs    │ │  structured  │ │   (Durable   │ │              │
│  TypeScript  │ │  JSON        │ │   Objects)   │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Deploy to Cloudflare
pnpm deploy
```

## API Usage

### Execute Function (Sync)

```bash
POST /fn
{
  "description": "Sort an array of numbers in ascending order",
  "args": {
    "numbers": [3, 1, 4, 1, 5, 9, 2, 6]
  }
}

Response:
{
  "success": true,
  "type": "code",
  "result": [1, 1, 2, 3, 4, 5, 6, 9],
  "classification": {
    "type": "code",
    "confidence": 0.95,
    "reasoning": "Simple array sorting can be implemented as pure TypeScript code"
  },
  "executionTime": 245
}
```

### Execute Function (Async)

```bash
POST /fn
{
  "description": "Generate a complete blog application with authentication",
  "options": {
    "mode": "async"
  }
}

Response:
{
  "success": true,
  "type": "agentic",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "classification": {
    "type": "agentic",
    "confidence": 0.98,
    "reasoning": "Multi-step process requiring code generation and reasoning"
  },
  "executionTime": 120
}
```

### Get Job Status

```bash
GET /fn/jobs/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "agentic",
    "status": "completed",
    "result": { ... },
    "created_at": "2025-01-15T10:30:00Z",
    "completed_at": "2025-01-15T10:35:00Z"
  }
}
```

## Function Types

### Code Functions

Simple, deterministic operations that can be implemented as TypeScript:

```javascript
{
  "description": "Calculate factorial of a number",
  "args": { "n": 5 }
}
// Routes to: AI_SERVICE.code() → executeCode()
// Result: 120
```

### Object Functions

Structured data generation:

```javascript
{
  "description": "Generate a user profile with realistic data",
  "args": {
    "age": 30,
    "profession": "software engineer"
  }
}
// Routes to: AI_SERVICE.generate() with JSON response format
// Result: { name: "...", email: "...", bio: "..." }
```

### Agentic Functions

Complex, multi-step processes:

```javascript
{
  "description": "Create a REST API for a blog with authentication",
  "context": "Use Express and JWT for authentication"
}
// Routes to: AGENT_SERVICE.createAgent() → generates full codebase
// Result: { agentId: "...", sessionId: "...", previewURL: "..." }
```

### Human Functions

Tasks requiring human intervention:

```javascript
{
  "description": "Review and approve the deployment plan",
  "args": {
    "assignee": "john@example.com",
    "priority": "high"
  }
}
// Routes to: DB.execute() → creates task in database
// Result: { taskId: "...", status: "pending" }
```

## RPC Interface

```typescript
// Service-to-service calls
const result = await env.FN_SERVICE.executeFunction({
  description: 'Sort array of numbers',
  args: { numbers: [3, 1, 4, 1, 5] }
})

console.log(result.type) // 'code'
console.log(result.result) // [1, 1, 3, 4, 5]
```

## Configuration

### Environment Variables

Required in `.dev.vars`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_MODEL=gpt-4o-mini
```

### Bindings

- **AI_SERVICE**: AI generation RPC service
- **AGENT_SERVICE**: Agent Durable Objects RPC service
- **DB**: Database RPC service
- **QUEUE**: Queue service for async execution

## Classification Logic

The worker uses a carefully crafted prompt to classify functions:

1. **Analyzes** the function description and arguments
2. **Determines** the best execution strategy
3. **Returns** type, confidence score, and reasoning
4. **Routes** to the appropriate service

Default classification criteria:

- **code**: Deterministic, no external state, pure functions
- **object**: Structured data generation, schema-based
- **agentic**: Multi-step, requires reasoning, complex logic
- **human**: Requires judgment, approvals, creative work

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to staging
CLOUDFLARE_ENV=staging pnpm deploy
```

## Examples

### Example 1: Data Transformation

```bash
POST /fn
{
  "description": "Convert CSV data to JSON array",
  "args": {
    "csv": "name,age\nJohn,30\nJane,25"
  }
}

# Classified as: code
# Result: [{ name: "John", age: 30 }, { name: "Jane", age: 25 }]
```

### Example 2: Configuration Generation

```bash
POST /fn
{
  "description": "Generate nginx configuration for a Node.js app",
  "args": {
    "domain": "example.com",
    "port": 3000
  }
}

# Classified as: object
# Result: { server: { ... }, upstream: { ... } }
```

### Example 3: Multi-Step Process

```bash
POST /fn
{
  "description": "Build a weather dashboard with real-time updates",
  "context": "Use React, Tailwind, and OpenWeather API"
}

# Classified as: agentic
# Result: { agentId: "...", sessionId: "...", previewURL: "..." }
```

### Example 4: Human Task

```bash
POST /fn
{
  "description": "Review code for security vulnerabilities",
  "args": {
    "assignee": "security-team@example.com",
    "priority": "high",
    "dueDate": "2025-01-20"
  }
}

# Classified as: human
# Result: { taskId: "...", status: "pending" }
```

## Status

- ✅ Basic structure and types
- ✅ AI classification logic
- ✅ Routing to all service types
- ✅ Sync and async execution
- ✅ Queue-based background processing
- ✅ RPC and HTTP interfaces
- ⏳ MCP tools (TODO)
- ⏳ Tests (TODO)

## Related

- [workers/CLAUDE.md](../CLAUDE.md) - Workers architecture overview
- [workers/ai/CLAUDE.md](../ai/CLAUDE.md) - AI service integration
- [workers/agent/CLAUDE.md](../agent/CLAUDE.md) - Agent service integration
