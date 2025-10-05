# Workers Test Suite

Comprehensive test suite for all workers services using multiple access methods.

## Overview

This test suite tests all RPC functions across all workers using:
- **HTTP Adapter** - Direct HTTP calls
- **APIs Adapter** - Via apis.do SDK
- **MCP Adapter** - Via mcp.do MCP server
- **RPC Adapter** - Direct service bindings (local only)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests with HTTP adapter
pnpm test:http

# Run all tests with APIs adapter
pnpm test:apis

# Run all tests with MCP adapter
pnpm test:mcp

# Run tests with all available adapters
pnpm test:all

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

## Environment Variables

```bash
# API configuration
TEST_API_BASE_URL=http://localhost:8787
TEST_API_KEY=your-api-key
TEST_ACCESS_TOKEN=your-access-token

# MCP configuration
TEST_MCP_SERVER_URL=https://mcp.do
```

## Architecture

```
tests/
├── __shared__/
│   ├── adapters/           # Test adapters
│   │   ├── types.ts
│   │   ├── http-adapter.ts
│   │   ├── apis-adapter.ts
│   │   ├── mcp-adapter.ts
│   │   └── rpc-adapter.ts
│   │
│   ├── test-cases/         # Reusable test cases
│   │   ├── gateway.test-cases.ts
│   │   ├── db.test-cases.ts
│   │   ├── auth.test-cases.ts
│   │   └── ...
│   │
│   ├── utils/              # Test utilities
│   │   ├── setup.ts
│   │   └── assertions.ts
│   │
│   └── runner.ts           # Test runner
│
└── integration/            # Integration tests
    ├── http.test.ts
    ├── apis.test.ts
    ├── mcp.test.ts
    └── all-adapters.test.ts
```

## Test Case Format

```typescript
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
  tags: ['health', 'fast'],
}
```

## Adding New Tests

### 1. Add test cases to service file:

```typescript
// tests/__shared__/test-cases/myservice.test-cases.ts
export const myServiceTestCases: TestCase[] = [
  {
    service: 'myservice',
    method: 'myMethod',
    description: 'should do something',
    input: { foo: 'bar' },
    expected: { result: 'success' },
  },
]
```

### 2. Add to integration tests:

```typescript
// tests/integration/http.test.ts
import { myServiceTestCases } from '../__shared__/test-cases/myservice.test-cases'

const suites = [
  // ... existing suites
  createTestSuite('My Service', myServiceTestCases),
]
```

## Test Statistics

**Current Coverage:**
- Gateway: 7 test cases
- DB: 11 test cases
- Auth: 14 test cases

**Total:** 32 test cases × 4 adapters = **128 test scenarios**

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Workers

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter @workers/tests test:all
        env:
          TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
          TEST_ACCESS_TOKEN: ${{ secrets.TEST_ACCESS_TOKEN }}
```

## Benefits

### 1. Write Once, Test Everywhere
Test cases are defined once and run against all access methods automatically.

### 2. Comprehensive Coverage
Every RPC function is tested across all workers and all access methods.

### 3. Easy to Extend
Adding a new test case automatically tests it via all adapters.

### 4. Type-Safe
All test cases are TypeScript with full type checking.

### 5. Fast Feedback
Tests run in parallel when possible for quick feedback.

## Next Steps

1. ✅ Core adapters implemented (HTTP, APIs, MCP, RPC)
2. ✅ Test cases for gateway, db, auth services
3. ⏳ Add test cases for remaining services (schedule, webhooks, email, mcp, queue)
4. ⏳ CI/CD integration
5. ⏳ Performance benchmarking
6. ⏳ Mutation testing

## Related Documentation

- [TEST_SUITE_ARCHITECTURE.md](../TEST_SUITE_ARCHITECTURE.md) - Detailed architecture
- [workers/CLAUDE.md](../CLAUDE.md) - Workers architecture
- [sdk/packages/apis.do/](../../sdk/packages/apis.do/) - APIs SDK
- [sdk/packages/cli.do/](../../sdk/packages/cli.do/) - CLI SDK
