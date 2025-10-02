# Testing Guide

Comprehensive testing infrastructure for dot-do microservices architecture.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Getting Started](#getting-started)
4. [Writing Tests](#writing-tests)
5. [Test Utilities](#test-utilities)
6. [Running Tests](#running-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

---

## Overview

The dot-do project uses a comprehensive testing strategy with three types of tests:

- **Unit Tests** - Test individual functions and components in isolation
- **Integration Tests** - Test RPC communication between services
- **E2E Tests** - Test full user flows through the gateway

### Test Stack

- **Test Framework:** Vitest with `@cloudflare/vitest-pool-workers`
- **E2E Testing:** Playwright
- **Mocking:** Vitest mocks + custom mock factories
- **Coverage:** Vitest coverage (v8 provider)
- **CI/CD:** GitHub Actions

### Coverage Goals

- **Minimum:** 80% coverage across all metrics
- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 80%
- **Statements:** 80%

---

## Test Types

### 1. Unit Tests

Test individual functions and components in isolation using mocks.

**Location:** `{service}/__tests__/` or `{service}/*.test.ts`

**Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { mockDatabaseService, createTestThing } from '@/test-utils'

describe('DatabaseService', () => {
  it('should get thing by id', async () => {
    const db = mockDatabaseService()
    const thing = createTestThing({ id: 'test-123' })

    db.getThing.mockResolvedValue(thing)

    const result = await db.getThing('agent', 'test-123')
    expect(result.id).toBe('test-123')
  })
})
```

### 2. Integration Tests

Test RPC communication between services.

**Location:** `{service}/__tests__/integration/` or `{service}/*.integration.test.ts`

**Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import { testRPC } from '@/test-utils'

describe('Database RPC Integration', () => {
  it('should call DB service via RPC', async () => {
    const result = await testRPC(env.DB, 'getThing', ['agent', 'test-id'])

    expect(result).toBeDefined()
    expect(result.ns).toBe('agent')
  })
})
```

### 3. E2E Tests

Test full user flows through the gateway.

**Location:** `workers/e2e/tests/`

**Example:**
```typescript
import { test, expect } from '@playwright/test'

test('should create and retrieve thing', async ({ request }) => {
  const response = await request.post('/api/things/test', {
    data: { name: 'Test Thing' }
  })

  expect(response.ok()).toBeTruthy()
  const thing = await response.json()

  const getResponse = await request.get(`/api/things/test/${thing.id}`)
  expect(getResponse.ok()).toBeTruthy()
})
```

---

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Install Playwright (for E2E tests)

```bash
npx playwright install --with-deps
```

### 3. Configure Test Environment

Create `.env.test` in the root:

```bash
ENVIRONMENT=test
DATABASE_URL=http://localhost:5432
API_KEY=test-api-key
```

### 4. Run Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

---

## Writing Tests

### Test File Structure

```
workers/
├── db/
│   ├── src/
│   │   └── index.ts
│   └── __tests__/
│       ├── unit/
│       │   └── queries.test.ts
│       └── integration/
│           └── rpc.test.ts
├── test-utils/
│   ├── setup.ts
│   ├── mocks.ts
│   ├── factories.ts
│   ├── generators.ts
│   └── integration.ts
└── e2e/
    └── tests/
        ├── things.spec.ts
        └── relationships.spec.ts
```

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mockDatabaseService } from '@/test-utils'

describe('ServiceName', () => {
  let service: ReturnType<typeof mockDatabaseService>

  beforeEach(() => {
    service = mockDatabaseService()
  })

  it('should do something', async () => {
    // Arrange
    const input = 'test'
    service.method.mockResolvedValue('result')

    // Act
    const result = await service.method(input)

    // Assert
    expect(result).toBe('result')
    expect(service.method).toHaveBeenCalledWith(input)
  })
})
```

### Integration Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import { testRPC } from '@/test-utils'

describe('Service Integration', () => {
  it('should communicate via RPC', async () => {
    // Arrange
    const args = ['ns', 'id']

    // Act
    const result = await testRPC(env.DB, 'getThing', args)

    // Assert
    expect(result).toBeDefined()
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ request }) => {
    // Arrange - Create test data

    // Act - Perform actions
    const response = await request.post('/api/endpoint', {
      data: { key: 'value' }
    })

    // Assert - Verify results
    expect(response.ok()).toBeTruthy()
  })
})
```

---

## Test Utilities

### Available Utilities

#### Setup Utilities (`test-utils/setup.ts`)

```typescript
import {
  createMockExecutionContext,
  createTestRequest,
  createTestResponse,
  setupTestEnvironment,
  parseJsonResponse,
  sleep,
  retry,
  withTimeout
} from '@/test-utils'
```

#### Mock Factories (`test-utils/mocks.ts`)

```typescript
import {
  mockDatabaseService,
  mockAuthService,
  mockAIService,
  mockSearchService,
  mockQueueService,
  mockEventsService,
  mockKVNamespace,
  mockR2Bucket,
  mockD1Database,
  mockEnvironment,
  resetAllMocks
} from '@/test-utils'
```

#### Data Factories (`test-utils/factories.ts`)

```typescript
import {
  createTestThing,
  createTestRelationship,
  createTestUser,
  createTestAgent,
  createTestWorkflow,
  createTestFunction,
  createTestBatch,
  randomString,
  randomInt,
  randomEmail,
  defineFactory
} from '@/test-utils'
```

#### Data Generators (`test-utils/generators.ts`)

```typescript
import {
  generateThing,
  generateThings,
  generateRelationship,
  generateThingGraph,
  DatabaseSeeder,
  seedDatabase,
  RealisticDataGenerator,
  bulkInsert,
  generatePerformanceTestData
} from '@/test-utils'
```

#### Integration Helpers (`test-utils/integration.ts`)

```typescript
import {
  testRPC,
  createMockRPCService,
  assertRPCCalled,
  assertRPCCallCount,
  createTestServiceBinding,
  MockServiceCommunication,
  IntegrationTestHelper,
  testServiceFlow,
  testParallelRPC,
  testRPCWithRetry
} from '@/test-utils'
```

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test path/to/test.ts

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage

# Run only unit tests
pnpm test -- --run unit

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e -- --ui
```

### Coverage Reports

```bash
# Generate coverage report
pnpm test -- --coverage

# View HTML coverage report
open coverage/index.html
```

### Debugging Tests

```bash
# Run tests with debugger
node --inspect-brk node_modules/.bin/vitest

# Run specific test with verbose output
pnpm test -- --reporter=verbose path/to/test.ts

# Run tests with console logs
pnpm test -- --reporter=default
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- **Pull Requests** to `main` or `develop`
- **Pushes** to `main` or `develop`

### Workflow Jobs

1. **Unit Tests** - Fast tests in isolation
2. **Integration Tests** - RPC communication tests
3. **E2E Tests** - Full user flow tests
4. **Type Check** - TypeScript validation
5. **Lint** - Code style validation
6. **Coverage** - Coverage reporting to Codecov

### Required Secrets

- `CODECOV_TOKEN` - For coverage reporting

### Workflow Configuration

See `.github/workflows/test.yml` for full configuration.

---

## Best Practices

### 1. Test Naming

```typescript
// ✅ Good - Descriptive and clear
it('should create thing when valid data provided', ...)
it('should return 404 when thing not found', ...)

// ❌ Bad - Vague or unclear
it('works', ...)
it('test thing', ...)
```

### 2. Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const input = 'test'
  const expected = 'result'
  service.method.mockResolvedValue(expected)

  // Act - Execute the code under test
  const result = await service.method(input)

  // Assert - Verify the results
  expect(result).toBe(expected)
  expect(service.method).toHaveBeenCalledWith(input)
})
```

### 3. Use Factories for Test Data

```typescript
// ✅ Good - Use factories
const thing = createTestThing({ name: 'Custom Name' })

// ❌ Bad - Manual object creation
const thing = {
  id: '123',
  name: 'Custom Name',
  // ... many more fields
}
```

### 4. Mock External Dependencies

```typescript
// ✅ Good - Mock all external services
const db = mockDatabaseService()
db.getThing.mockResolvedValue(testThing)

// ❌ Bad - Rely on real services in unit tests
const db = new DatabaseService() // Don't do this in unit tests
```

### 5. Clean Up After Tests

```typescript
import { afterEach } from 'vitest'
import { resetAllMocks } from '@/test-utils'

afterEach(() => {
  resetAllMocks() // Clear all mocks after each test
})
```

### 6. Test Error Cases

```typescript
it('should handle errors gracefully', async () => {
  db.getThing.mockRejectedValue(new Error('Not found'))

  await expect(db.getThing('agent', 'invalid')).rejects.toThrow('Not found')
})
```

### 7. Use Meaningful Assertions

```typescript
// ✅ Good - Multiple specific assertions
expect(result.id).toBeDefined()
expect(result.name).toBe('Test Thing')
expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)

// ❌ Bad - Single vague assertion
expect(result).toBeTruthy()
```

### 8. Test One Thing at a Time

```typescript
// ✅ Good - Test one behavior per test
it('should create thing', ...)
it('should validate thing name', ...)
it('should set default values', ...)

// ❌ Bad - Test multiple behaviors in one test
it('should create, validate, and save thing', ...)
```

### 9. Use Descriptive Test Data

```typescript
// ✅ Good - Descriptive test data
const thing = createTestThing({ name: 'Thing to be deleted' })
const user = createTestUser({ email: 'admin@test.com' })

// ❌ Bad - Generic test data
const thing = createTestThing({ name: 'test' })
const user = createTestUser()
```

### 10. Avoid Test Interdependence

```typescript
// ✅ Good - Independent tests
describe('Service', () => {
  it('test 1', () => { /* ... */ })
  it('test 2', () => { /* ... */ })
})

// ❌ Bad - Tests depend on each other
describe('Service', () => {
  let sharedState // Don't share state between tests
  it('test 1', () => { sharedState = 'value' })
  it('test 2', () => { expect(sharedState).toBe('value') })
})
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow tests
it('slow test', async () => { ... }, { timeout: 10000 })

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
})
```

#### Mock Not Working

```typescript
// Ensure mocks are reset between tests
import { resetAllMocks } from '@/test-utils'

afterEach(() => {
  resetAllMocks()
})
```

#### Cloudflare Workers Specific Issues

```typescript
// Use correct imports for Workers
import { env } from 'cloudflare:test'  // ✅
import { env } from '@cloudflare/workers-types' // ❌
```

#### Coverage Not Generating

```bash
# Ensure vitest coverage is installed
pnpm add -D @vitest/coverage-v8

# Run with coverage flag
pnpm test -- --coverage
```

---

## Examples

See `workers/examples/` for complete test examples:

- `unit-test.example.ts` - Unit test examples
- `integration-test.example.ts` - Integration test examples
- `workers/e2e/tests/` - E2E test examples

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** 2025-10-02
**Maintained By:** QA Engineer A
