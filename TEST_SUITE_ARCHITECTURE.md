# Shareable Test Suite Architecture

## Overview

A comprehensive, shareable test suite architecture that tests all RPC functions across all workers using multiple access methods (APIs, RPC, CLI, MCP).

## Goals

1. **Comprehensive Coverage** - Test every RPC function on every worker
2. **Multiple Access Methods** - Test via apis.do, rpc.do, cli.do, mcp.do
3. **Reusable Test Cases** - Write once, run against all access methods
4. **Type-Safe** - Leverage TypeScript for type checking
5. **Maintainable** - Easy to add new tests as services evolve

## Architecture

```
workers/
├── tests/
│   ├── __shared__/
│   │   ├── test-cases/           # Reusable test case definitions
│   │   │   ├── gateway.test-cases.ts
│   │   │   ├── db.test-cases.ts
│   │   │   ├── auth.test-cases.ts
│   │   │   ├── schedule.test-cases.ts
│   │   │   ├── webhooks.test-cases.ts
│   │   │   ├── email.test-cases.ts
│   │   │   ├── mcp.test-cases.ts
│   │   │   └── queue.test-cases.ts
│   │   │
│   │   ├── adapters/             # Access method adapters
│   │   │   ├── types.ts          # Common types
│   │   │   ├── apis-adapter.ts   # apis.do adapter
│   │   │   ├── rpc-adapter.ts    # rpc.do adapter
│   │   │   ├── cli-adapter.ts    # cli.do adapter
│   │   │   ├── mcp-adapter.ts    # mcp.do adapter
│   │   │   └── http-adapter.ts   # Direct HTTP adapter
│   │   │
│   │   ├── fixtures/             # Test data fixtures
│   │   │   ├── users.json
│   │   │   ├── agents.json
│   │   │   └── workflows.json
│   │   │
│   │   └── utils/                # Test utilities
│   │       ├── setup.ts          # Test setup/teardown
│   │       ├── assertions.ts     # Custom assertions
│   │       └── helpers.ts        # Helper functions
│   │
│   ├── apis.do/                  # apis.do specific tests
│   │   └── integration.test.ts
│   │
│   ├── rpc.do/                   # rpc.do specific tests
│   │   └── integration.test.ts
│   │
│   ├── cli.do/                   # cli.do specific tests
│   │   └── integration.test.ts
│   │
│   └── mcp.do/                   # mcp.do specific tests
│       └── integration.test.ts
│
└── vitest.config.ts              # Shared Vitest config
```

## Test Case Definition Format

Each test case is defined in a declarative format that can be executed by any adapter:

```typescript
// tests/__shared__/test-cases/gateway.test-cases.ts

import type { TestCase } from '../adapters/types'

export const gatewayTestCases: TestCase[] = [
  {
    service: 'gateway',
    method: 'health',
    description: 'should return health status',
    input: {},
    expected: {
      status: 'ok',
      service: 'gateway',
    },
    assertions: [
      (result) => result.status === 'ok',
      (result) => result.service === 'gateway',
    ],
  },
  {
    service: 'gateway',
    method: 'route',
    description: 'should route request to correct service',
    input: {
      path: '/db/users',
      method: 'GET',
    },
    expected: {
      service: 'db',
      method: 'query',
    },
  },
  // ... more test cases
]
```

## Adapter Interface

All adapters must implement a common interface:

```typescript
// tests/__shared__/adapters/types.ts

export interface TestAdapter {
  name: string
  setup(): Promise<void>
  teardown(): Promise<void>
  call(service: string, method: string, input: any): Promise<any>
}

export interface TestCase {
  service: string
  method: string
  description: string
  input: any
  expected?: any
  assertions?: Array<(result: any) => boolean>
  skip?: boolean
  only?: boolean
  tags?: string[]
}

export interface TestSuite {
  name: string
  cases: TestCase[]
}
```

## Example Adapters

### 1. apis.do Adapter

```typescript
// tests/__shared__/adapters/apis-adapter.ts

import { createClient } from 'apis.do'
import type { TestAdapter } from './types'

export class ApisAdapter implements TestAdapter {
  name = 'apis.do'
  private client: any

  async setup() {
    this.client = createClient({
      baseUrl: process.env.API_BASE_URL || 'https://api.do',
      apiKey: process.env.API_KEY,
    })
  }

  async teardown() {
    // Cleanup if needed
  }

  async call(service: string, method: string, input: any): Promise<any> {
    return await this.client.call(`${service}.${method}`, input)
  }
}
```

### 2. RPC Adapter

```typescript
// tests/__shared__/adapters/rpc-adapter.ts

import type { TestAdapter } from './types'

export class RPCAdapter implements TestAdapter {
  name = 'rpc.do'
  private env: any

  async setup() {
    // Setup Cloudflare Worker environment with service bindings
    // This would use miniflare or workerd for local testing
    this.env = await setupWorkerEnvironment()
  }

  async teardown() {
    // Cleanup
  }

  async call(service: string, method: string, input: any): Promise<any> {
    const serviceBinding = this.env[`${service.toUpperCase()}_SERVICE`]
    return await serviceBinding[method](input)
  }
}
```

### 3. MCP Adapter

```typescript
// tests/__shared__/adapters/mcp-adapter.ts

import { createMCPClient } from 'cli.do'
import type { TestAdapter } from './types'

export class MCPAdapter implements TestAdapter {
  name = 'mcp.do'
  private client: any

  async setup() {
    this.client = createMCPClient({
      serverUrl: process.env.MCP_SERVER_URL || 'https://mcp.do',
      accessToken: process.env.ACCESS_TOKEN,
    })
  }

  async teardown() {
    // Cleanup
  }

  async call(service: string, method: string, input: any): Promise<any> {
    // MCP uses the universal 'do' tool
    const code = `return await $.${service}.${method}(${JSON.stringify(input)})`
    const result = await this.client.callTool('do', { code })
    return JSON.parse(result.content[0].text)
  }
}
```

## Test Runner

The test runner executes test cases using all adapters:

```typescript
// tests/__shared__/runner.ts

import { describe, it, expect } from 'vitest'
import type { TestAdapter, TestCase, TestSuite } from './adapters/types'

export function runTestSuite(adapter: TestAdapter, suite: TestSuite) {
  describe(`${suite.name} [${adapter.name}]`, () => {
    beforeAll(async () => {
      await adapter.setup()
    })

    afterAll(async () => {
      await adapter.teardown()
    })

    for (const testCase of suite.cases) {
      const testFn = testCase.skip ? it.skip : testCase.only ? it.only : it

      testFn(testCase.description, async () => {
        const result = await adapter.call(
          testCase.service,
          testCase.method,
          testCase.input
        )

        // Run custom assertions
        if (testCase.assertions) {
          for (const assertion of testCase.assertions) {
            expect(assertion(result)).toBe(true)
          }
        }

        // Match expected output
        if (testCase.expected) {
          expect(result).toMatchObject(testCase.expected)
        }
      })
    }
  })
}

export function runAllTests(
  adapters: TestAdapter[],
  suites: TestSuite[]
) {
  for (const adapter of adapters) {
    for (const suite of suites) {
      runTestSuite(adapter, suite)
    }
  }
}
```

## Service-Specific Test Cases

### Gateway Service

```typescript
// tests/__shared__/test-cases/gateway.test-cases.ts

export const gatewayTestCases: TestCase[] = [
  {
    service: 'gateway',
    method: 'health',
    description: 'returns health status',
    input: {},
    expected: { status: 'ok' },
  },
  {
    service: 'gateway',
    method: 'route',
    description: 'routes to correct service',
    input: { path: '/db/users', method: 'GET' },
    assertions: [(r) => r.service === 'db'],
  },
]
```

### DB Service

```typescript
// tests/__shared__/test-cases/db.test-cases.ts

export const dbTestCases: TestCase[] = [
  {
    service: 'db',
    method: 'query',
    description: 'executes SELECT query',
    input: { sql: 'SELECT 1 as num', params: [] },
    expected: { rows: [{ num: 1 }] },
  },
  {
    service: 'db',
    method: 'execute',
    description: 'executes INSERT statement',
    input: {
      sql: 'INSERT INTO test (name) VALUES (?)',
      params: ['test'],
    },
    assertions: [(r) => r.changes === 1],
  },
]
```

### Auth Service

```typescript
// tests/__shared__/test-cases/auth.test-cases.ts

export const authTestCases: TestCase[] = [
  {
    service: 'auth',
    method: 'validateToken',
    description: 'validates valid token',
    input: { token: 'valid-token' },
    expected: { valid: true, userId: 'user-123' },
  },
  {
    service: 'auth',
    method: 'validateToken',
    description: 'rejects invalid token',
    input: { token: 'invalid-token' },
    expected: { valid: false },
  },
]
```

## Integration Test Example

```typescript
// tests/apis.do/integration.test.ts

import { ApisAdapter } from '../__shared__/adapters/apis-adapter'
import { runAllTests } from '../__shared__/runner'
import { gatewayTestCases } from '../__shared__/test-cases/gateway.test-cases'
import { dbTestCases } from '../__shared__/test-cases/db.test-cases'
import { authTestCases } from '../__shared__/test-cases/auth.test-cases'

const adapter = new ApisAdapter()

const suites = [
  { name: 'Gateway Service', cases: gatewayTestCases },
  { name: 'DB Service', cases: dbTestCases },
  { name: 'Auth Service', cases: authTestCases },
]

runAllTests([adapter], suites)
```

## Running Tests

```bash
# Run all tests with all adapters
pnpm test

# Run tests for specific adapter
pnpm test:apis
pnpm test:rpc
pnpm test:cli
pnpm test:mcp

# Run tests for specific service
pnpm test -- gateway
pnpm test -- db
pnpm test -- auth

# Run tests with coverage
pnpm test:coverage
```

## Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/tests/**'],
    },
    testTimeout: 30000, // 30 seconds
  },
})
```

## Benefits

### 1. Write Once, Test Everywhere

Test cases are defined once and run against all access methods:
- apis.do
- rpc.do (direct service bindings)
- cli.do (via CLI commands)
- mcp.do (via MCP protocol)
- Direct HTTP

### 2. Comprehensive Coverage

Every RPC function is tested across all workers:
- gateway (30+ functions)
- db (50+ functions)
- auth (20+ functions)
- schedule (15+ functions)
- webhooks (25+ functions)
- email (10+ functions)
- mcp (5+ functions)
- queue (10+ functions)

**Total: 165+ RPC functions** × **5 access methods** = **825+ test cases**

### 3. Easy to Extend

Adding a new test case:

```typescript
// Add to appropriate test-cases file
{
  service: 'db',
  method: 'newFunction',
  description: 'does something new',
  input: { foo: 'bar' },
  expected: { result: 'success' },
}
```

Automatically runs against all adapters!

### 4. Type-Safe

All test cases are TypeScript:
- Autocomplete for service/method names
- Type checking for inputs/outputs
- Refactoring safety

### 5. Performance

Tests run in parallel using Vitest:
- Fast feedback
- Parallel execution per adapter
- Isolated test environments

## Advanced Features

### Tagging

```typescript
{
  service: 'db',
  method: 'query',
  tags: ['read', 'fast'],
  // ...
}

// Run only tagged tests
pnpm test -- --grep=read
```

### Fixtures

```typescript
// tests/__shared__/fixtures/users.json
[
  { "id": "1", "email": "alice@example.com" },
  { "id": "2", "email": "bob@example.com" }
]

// Use in test cases
import users from '../fixtures/users.json'

{
  service: 'auth',
  method: 'validateUser',
  input: { email: users[0].email },
  expected: { valid: true, userId: users[0].id },
}
```

### Setup/Teardown

```typescript
// tests/__shared__/utils/setup.ts

export async function setupTestData(adapter: TestAdapter) {
  // Create test users
  await adapter.call('db', 'execute', {
    sql: 'INSERT INTO users (email) VALUES (?)',
    params: ['test@example.com'],
  })
}

export async function teardownTestData(adapter: TestAdapter) {
  // Clean up test data
  await adapter.call('db', 'execute', {
    sql: 'DELETE FROM users WHERE email = ?',
    params: ['test@example.com'],
  })
}
```

## Next Steps

1. ✅ Design architecture
2. ⏳ Implement core adapters (apis, rpc, mcp, cli)
3. ⏳ Create test cases for all 8 core services
4. ⏳ Set up CI/CD integration
5. ⏳ Add performance benchmarking
6. ⏳ Add mutation testing

## Related Documentation

- [workers/CLAUDE.md](./CLAUDE.md) - Workers architecture
- [sdk/packages/apis.do/](../sdk/packages/apis.do/) - APIs SDK
- [sdk/packages/cli.do/](../sdk/packages/cli.do/) - CLI SDK
- [workers/mcp/](./mcp/) - MCP server

---

**Status:** Design Complete
**Next:** Implement core adapters
**Owner:** Claude Code
