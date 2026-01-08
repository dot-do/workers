# AI Functions Architecture

**Date:** 2026-01-08
**Status:** Design

## Overview

This document describes the architecture for the AI Functions system, which provides four types of functions through `workers/functions` as the unified entry point.

## Architecture

```
workers/functions (functions.do)
├── Auto-classifies functions into 4 types using AI
├── Delegates execution to specialized workers
└── Provides unified SDK interface

    ┌──────────────────────────────────────────────────────────────┐
    │                    workers/functions                          │
    │                      (functions.do)                           │
    │  - define(name, args) → AI auto-classifies                   │
    │  - define.code() / .generative() / .agentic() / .human()     │
    │  - invoke(name, params) → routes to appropriate worker       │
    └──────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
    ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
    │  eval │   │   ai  │   │ agents│   │ humans│   │  llm  │
    │ (code)│   │ (gen) │   │(agent)│   │ (hitl)│   │(infra)│
    └───────┘   └───────┘   └───────┘   └───────┘   └───────┘
    env.EVAL    env.AI      env.AGENTS  env.HUMANS  env.LLM
```

## Function Types

### 1. Code Functions → `workers/eval`
**Binding:** `env.EVAL`

Execute user-defined JavaScript/TypeScript code in a secure sandbox.

```typescript
// AI determines this should be a code function
const fn = await define('fibonacci', { n: 10 })
// → Generates code, stores definition, executes in sandbox

// Or explicit definition
define.code({
  name: 'processData',
  code: `export default (input) => input.map(x => x * 2)`,
  runtime: 'v8'
})
```

**Capabilities:**
- Secure sandbox (no access to globals, fetch, etc.)
- Timeout and memory limits
- Sync and async execution
- Syntax validation

### 2. Generative Functions → `workers/ai` [NEW]
**Binding:** `env.AI`

AI text/object generation with no tools or multi-step reasoning.

```typescript
// AI determines this is a generative function
const fn = await define('summarize', { text: 'long article...' })
// → Creates prompt template, uses AI for generation

// Explicit definition
define.generative({
  name: 'extractContacts',
  prompt: 'Extract all contact information from: {{text}}',
  output: { name: 'string', email: 'string', phone: 'string' }
})
```

**Primitives:**
- `generate(prompt, options)` - General text/object generation
- `list(prompt)` - Generate arrays
- `lists(prompt)` - Generate named arrays (for destructuring)
- `extract(text, schema)` - Extract structured data
- `summarize(text)` - Condense text
- `is(value, condition)` - Boolean classification
- `diagram(description)` - Generate mermaid/svg diagrams
- `slides(topic)` - Generate presentations

### 3. Agentic Functions → `workers/agents`
**Binding:** `env.AGENTS`

Multi-step AI execution with tools, memory, and goals.

```typescript
// AI determines this needs tools/multi-step
const fn = await define('researchCompetitor', { company: 'Acme' })
// → Creates agent with web search, analysis tools

// Explicit definition
define.agentic({
  name: 'planTrip',
  goal: 'Plan a complete trip itinerary',
  tools: ['flights', 'hotels', 'restaurants', 'maps'],
  memory: true
})
```

**Capabilities:**
- Tool calling
- Multi-step execution
- Memory/context persistence
- Goal-directed behavior
- Orchestration of sub-agents

### 4. Human Functions → `workers/humans`
**Binding:** `env.HUMANS`

Human-in-the-loop for approvals, reviews, and decisions.

```typescript
// AI determines this needs human input
const fn = await define('approveBudget', { amount: 50000, department: 'eng' })
// → Creates approval task routed to appropriate human

// Explicit definition
define.human({
  name: 'reviewContract',
  channel: 'slack',
  assignee: 'legal-team',
  timeout: '24h'
})
```

**Capabilities:**
- Task queues with priority
- Multi-channel delivery (Slack, Email, SMS, Web)
- Timeout and escalation
- Assignment and reassignment
- Response handling

## workers/ai Design

### Package Structure

```
workers/ai/
├── src/
│   ├── index.ts          # Exports AIDO class
│   └── ai.ts             # AIDO implementation
├── test/
│   ├── helpers.ts        # Test utilities
│   ├── generate.test.ts  # RED: generate tests
│   ├── list.test.ts      # RED: list/lists tests
│   ├── extract.test.ts   # RED: extract tests
│   ├── classify.test.ts  # RED: is/summarize tests
│   └── rpc.test.ts       # RED: RPC interface tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### AIDO Interface

```typescript
export class AIDO {
  // Core primitives
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>
  async list<T>(prompt: string, options?: ListOptions): Promise<T[]>
  async lists<T>(prompt: string, options?: ListsOptions): Promise<Record<string, T[]>>
  async extract<T>(text: string, schema: Schema, options?: ExtractOptions): Promise<T>
  async summarize(text: string, options?: SummarizeOptions): Promise<string>
  async is(value: unknown, condition: string, options?: IsOptions): Promise<boolean>
  async diagram(description: string, options?: DiagramOptions): Promise<string>
  async slides(topic: string, options?: SlidesOptions): Promise<Slide[]>

  // Batch operations
  async generateBatch(prompts: string[], options?: BatchOptions): Promise<GenerateResult[]>

  // RPC interface
  hasMethod(name: string): boolean
  async invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handler
  async fetch(request: Request): Promise<Response>
}
```

### Configuration

```typescript
interface AIOptions {
  model?: string           // Default model
  temperature?: number     // 0-2
  maxTokens?: number       // Max output tokens
  provider?: 'workers-ai' | 'openai' | 'anthropic'
}
```

### Service Binding Usage

```typescript
// In workers/functions
const result = await this.env.AI.generate('Write a poem about TypeScript')

// In workers/db
const schema = await this.env.AI.extract(userMessage, contactSchema)

// In objects/do
const summary = await this.env.AI.summarize(longDocument)
```

## TDD Strategy

### Phase 1: RED (Write Failing Tests)

1. **generate.test.ts** - Core generation
   - Simple text generation
   - JSON/object generation with schema
   - Streaming support
   - Error handling

2. **list.test.ts** - List primitives
   - Generate string arrays
   - Generate object arrays with schema
   - `lists()` for named arrays

3. **extract.test.ts** - Extraction
   - Extract from text with schema
   - Handle missing/optional fields
   - Nested object extraction

4. **classify.test.ts** - Classification
   - Boolean `is()` checks
   - Summarization
   - Diagram generation

5. **rpc.test.ts** - RPC interface
   - hasMethod validation
   - invoke routing
   - HTTP endpoint tests
   - Batch operations

### Phase 2: GREEN (Make Tests Pass)

Implement each method to make tests pass, following patterns from:
- `workers/functions/src/functions.ts` (similar structure)
- `workers/eval/src/eval.ts` (RPC pattern)

### Phase 3: REFACTOR

1. Extract common utilities
2. Improve error messages
3. Add streaming support
4. Optimize batch operations
5. Add caching layer

## workers/functions Updates

The functions worker needs to:

1. **Auto-classify** function definitions using AI
2. **Store** function definitions with their type
3. **Route** invocations to the appropriate worker
4. **Support** explicit type definitions via `define.code()`, etc.

### Classification Logic

```typescript
async classifyFunction(name: string, args: unknown): Promise<FunctionType> {
  // Use AI to analyze the function name and example args
  const analysis = await this.env.AI.generate(`
    Classify this function:
    Name: ${name}
    Example args: ${JSON.stringify(args)}

    Types:
    - code: Pure computation, data transformation, no AI needed
    - generative: Needs AI to generate content, but single-step
    - agentic: Needs multiple steps, tools, web access, or memory
    - human: Needs human approval, review, or decision

    Return only: code | generative | agentic | human
  `)

  return analysis.text.trim() as FunctionType
}
```

## Integration Points

### env.LLM (workers/llm)
Infrastructure-level LLM access with billing. Used by:
- `workers/ai` for generation
- `workers/agents` for agent reasoning

### env.AI (workers/ai)
High-level generative primitives. Used by:
- `workers/functions` for generative function execution
- `workers/db` for AI-powered queries
- `objects/do` for the `do()` method

### env.AGENTS (workers/agents)
Multi-step agent execution. Used by:
- `workers/functions` for agentic function execution

### env.HUMANS (workers/humans)
Human-in-the-loop. Used by:
- `workers/functions` for human function execution
- `workers/agents` when human approval needed

### env.EVAL (workers/eval)
Secure code execution. Used by:
- `workers/functions` for code function execution

## Migration Path

1. Create `workers/ai` with TDD approach
2. Update `workers/functions` to use new architecture
3. Wire up service bindings
4. Update SDKs (`functions.do`, etc.)
5. Update documentation

## Success Criteria

- [ ] All workers have comprehensive test coverage
- [ ] READMEs document binding conventions and usage
- [ ] Functions can be auto-classified correctly
- [ ] Each worker can be tested in isolation
- [ ] End-to-end flow works through functions.do
