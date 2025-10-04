# Integration Testing Strategy - Workers for Platforms

**Version:** 1.0
**Date:** 2025-10-04
**Status:** Active

## Overview

This document defines the comprehensive testing strategy for Workers microservices deployed to Cloudflare Workers for Platforms dispatch namespaces. It covers testing at multiple levels: local development, dispatch namespace deployment, and production verification.

## Architecture Context

### Workers for Platforms Architecture

```
GitHub Actions / Local Dev
  ↓
Deploy API (authenticated)
  ↓
Cloudflare Workers for Platforms API
  ↓
Dispatch Namespace (production/staging/development)
  ↓
Dispatcher Worker (routes by subdomain/path)
  ↓
User Workers (gateway, db, auth, schedule, webhooks, email, mcp, queue)
```

### Testing Scope

**What We Test:**
- ✅ Worker code functionality (unit tests)
- ✅ RPC communication between services (integration tests)
- ✅ HTTP API endpoints (integration tests)
- ✅ Dispatcher routing logic (dispatch namespace tests)
- ✅ Service-to-service bindings through namespaces (end-to-end tests)
- ✅ Deploy API functionality (deployment tests)
- ✅ Error handling and retry logic (resilience tests)
- ✅ Performance and latency (benchmark tests)

**What We Don't Test:**
- ❌ Cloudflare's platform infrastructure
- ❌ Network latency outside our control
- ❌ Third-party service reliability

## Test Levels

### 1. Unit Tests

**Purpose:** Test individual worker functions in isolation

**Location:** `workers/[service]/tests/[service].test.ts`

**Characteristics:**
- Fast execution (<100ms per test)
- No external dependencies
- Mock all service bindings
- Mock database queries
- Mock external APIs

**Example:**
```typescript
// workers/db/tests/db.test.ts
describe('DbService', () => {
  it('should execute query', async () => {
    const mockDb = createMockDatabase()
    const service = new DbService(ctx, { DB: mockDb })
    const result = await service.query('SELECT 1')
    expect(result).toBeDefined()
  })
})
```

**Coverage Target:** 80%+ per service

**Run Command:**
```bash
# Run all unit tests
pnpm test:unit

# Run for specific service
cd workers/db && pnpm test
```

### 2. Integration Tests

**Purpose:** Test service-to-service communication via RPC

**Location:** `workers/tests/integration/`

**Test Files:**
- `gateway-routing.test.ts` - Gateway routes to all services
- `rpc-communication.test.ts` - Direct RPC calls between services
- `end-to-end-flows.test.ts` - Complete user journeys
- `error-handling.test.ts` - Error propagation and retry
- `performance.test.ts` - Latency and throughput benchmarks

**Characteristics:**
- Medium execution time (1-5 seconds per test)
- Uses mock service bindings OR deployed services
- Tests actual RPC interfaces
- Validates error handling
- Measures performance

**Example:**
```typescript
// tests/integration/rpc-communication.test.ts
describe('RPC Communication', () => {
  it('should call DB service via RPC', async () => {
    const result = await env.DB_SERVICE.query('SELECT 1')
    expect(result).toHaveProperty('data')
  })
})
```

**Coverage Target:** All 8 services, all RPC methods

**Run Command:**
```bash
# Run all integration tests
pnpm test:integration

# Watch mode
pnpm test:integration:watch
```

### 3. Dispatch Namespace Tests

**Purpose:** Test Workers for Platforms dispatch namespace functionality

**Location:** `workers/tests/integration/dispatch-namespace.test.ts`

**What We Test:**
- Deploying workers to namespaces via Deploy API
- Dispatcher routing to user workers
- Service-to-service RPC through namespace
- Namespace isolation (dev/staging/production)
- Worker not found errors (404)
- Dispatch errors (500)

**Characteristics:**
- Requires real namespaces (or mocked)
- Tests Deploy API integration
- Tests Dispatcher worker
- Validates namespace isolation
- Medium to slow execution (5-30 seconds per test)

**Example:**
```typescript
// tests/integration/dispatch-namespace.test.ts
describe('Dispatch Namespace Deployment', () => {
  it('should deploy worker to development namespace', async () => {
    const result = await deployToNamespace('gateway', 'development')
    expect(result).toHaveProperty('success', true)
  })

  it('should route request through dispatcher', async () => {
    const response = await fetch('https://gateway.do/health')
    expect(response.ok).toBe(true)
  })
})
```

**Coverage Target:** All 8 services, all 3 namespaces

**Run Command:**
```bash
# Run dispatch namespace tests
pnpm test -- dispatch-namespace
```

### 4. End-to-End Tests

**Purpose:** Test complete user flows through production-like environment

**Location:** `workers/tests/e2e/` (Playwright)

**What We Test:**
- Full user registration flow
- Authentication and authorization
- Webhook processing
- Email delivery
- Scheduled tasks execution
- Queue processing

**Characteristics:**
- Slowest execution (30-60 seconds per test)
- Uses deployed services (staging or production)
- Real database
- Real external APIs (with test accounts)
- Validates end-user experience

**Example:**
```typescript
// tests/e2e/registration.spec.ts
test('user can register and receive welcome email', async ({ page }) => {
  await page.goto('https://app.do/register')
  await page.fill('input[name=email]', 'test@example.com')
  await page.click('button[type=submit]')
  await expect(page.locator('.success')).toBeVisible()
})
```

**Coverage Target:** All critical user journeys

**Run Command:**
```bash
# Run e2e tests
pnpm test:e2e

# Run in headed mode
pnpm test:e2e -- --headed
```

## Testing Environments

### Local Development

**Purpose:** Rapid iteration during development

**Services:** Local Workers using `wrangler dev`

**Database:** Local D1 database or mock

**Configuration:**
```bash
# .dev.vars
ENVIRONMENT=development
BASE_URL=http://localhost:8787
```

**Characteristics:**
- Fastest feedback loop
- No deployment required
- Mock external dependencies
- Use local database

**Limitations:**
- Not testing dispatch namespace routing
- Not testing Deploy API
- Service bindings may differ from production

**Best For:**
- Unit tests
- Integration tests with mocks
- Quick validation

### Development Namespace

**Purpose:** Test dispatch namespace deployment before staging

**Services:** Deployed to `dotdo-development` namespace

**Database:** Shared development database

**Configuration:**
```bash
ENVIRONMENT=development
BASE_URL=https://api.do
NAMESPACE=dotdo-development
```

**Characteristics:**
- Tests real deployment process
- Tests dispatcher routing
- Tests service bindings through namespace
- Safe environment for experimentation

**Limitations:**
- Shared environment (multiple developers)
- May have test data conflicts

**Best For:**
- Dispatch namespace tests
- Deploy API validation
- Pre-staging verification

### Staging Namespace

**Purpose:** Production-like testing before production deployment

**Services:** Deployed to `dotdo-staging` namespace

**Database:** Staging database (copy of production schema)

**Configuration:**
```bash
ENVIRONMENT=staging
BASE_URL=https://staging.api.do
NAMESPACE=dotdo-staging
```

**Characteristics:**
- Production-like environment
- Real external API integrations (test accounts)
- Isolated from production
- Complete end-to-end testing

**Limitations:**
- External APIs may have rate limits
- Test data must be cleaned up

**Best For:**
- Integration tests
- End-to-end tests
- Performance benchmarks
- Pre-production validation

### Production Namespace

**Purpose:** Real production environment

**Services:** Deployed to `dotdo-production` namespace

**Database:** Production database (PostgreSQL/Neon + ClickHouse)

**Configuration:**
```bash
ENVIRONMENT=production
BASE_URL=https://api.do
NAMESPACE=dotdo-production
```

**Characteristics:**
- Real users and data
- Real external integrations
- Monitoring and alerting enabled
- Cannot run destructive tests

**Testing Strategy:**
- Smoke tests only
- Health checks
- Monitoring and observability
- Canary deployments

**Best For:**
- Smoke tests
- Health monitoring
- Performance monitoring

## Testing Strategies

### Mock vs Real Services

#### When to Mock

**Use mocks for:**
- Unit tests (always)
- Rapid local development
- CI/CD pipelines (faster execution)
- External dependencies (third-party APIs)
- Database queries (predictable responses)

**Benefits:**
- Fast execution
- No external dependencies
- Predictable results
- No rate limits

**Drawbacks:**
- May not catch integration issues
- Mock behavior may drift from reality

#### When to Use Real Services

**Use real services for:**
- Integration tests (when possible)
- Dispatch namespace tests (required)
- End-to-end tests (required)
- Staging verification
- Production smoke tests

**Benefits:**
- Tests real behavior
- Catches integration bugs
- Tests service bindings

**Drawbacks:**
- Slower execution
- Requires deployed services
- May have rate limits

### Test Data Management

#### Test Data Strategy

**Principles:**
1. **Isolation** - Each test creates its own data
2. **Cleanup** - Tests clean up after themselves
3. **Uniqueness** - Use timestamps/UUIDs for unique data
4. **Deterministic** - Same input = same output

**Example:**
```typescript
// Generate unique test data
const user = {
  id: `user_${Date.now()}_${Math.random()}`,
  email: `test_${Date.now()}@example.com`,
  name: 'Test User'
}

// Clean up after test
afterEach(async () => {
  await db.delete('users', { id: user.id })
})
```

#### Test Database

**Local Development:**
- Use local D1 database
- Reset before each test suite
- Seed with minimal data

**Development Namespace:**
- Shared development database
- Tests create/cleanup their own data
- No destructive operations

**Staging:**
- Staging database (copy of prod schema)
- Periodic resets from production snapshot
- Tests clean up after themselves

**Production:**
- Never modify real data
- Read-only queries only
- Use observability tools

### Performance Testing

#### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| RPC call latency | <50ms | <100ms |
| Dispatcher routing | <5ms | <10ms |
| Gateway routing | <10ms | <25ms |
| End-to-end flow | <200ms | <500ms |
| Database query | <20ms | <50ms |
| External API call | <500ms | <1000ms |

#### Performance Testing Approach

**Baseline Measurement:**
```typescript
// Measure baseline performance
const { duration } = await measureTime(async () => {
  await env.DB_SERVICE.query('SELECT 1')
})
console.log(`RPC latency: ${duration}ms`)
```

**Percentile Benchmarks:**
```typescript
// Run 100 samples
const durations = []
for (let i = 0; i < 100; i++) {
  const { duration } = await measureTime(testFunction)
  durations.push(duration)
}

const p50 = percentile(durations, 0.50)
const p95 = percentile(durations, 0.95)
const p99 = percentile(durations, 0.99)

console.log(`p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms`)
```

**Regression Detection:**
- Run performance tests in CI
- Compare against baseline
- Fail if regression >20%
- Alert if regression >50%

### Error Testing

#### Error Scenarios to Test

**Service Errors:**
- Service not found (404)
- Service not deployed (404)
- RPC call fails (500)
- Timeout (504)
- Rate limit (429)

**Validation Errors:**
- Invalid input (400)
- Missing required fields (400)
- Type mismatches (400)

**Authentication Errors:**
- Missing auth token (401)
- Invalid auth token (401)
- Expired token (401)
- Insufficient permissions (403)

**Database Errors:**
- Connection failure
- Query syntax error
- Constraint violation
- Transaction rollback

#### Error Testing Example

```typescript
describe('Error Handling', () => {
  it('should handle service not deployed', async () => {
    const response = await fetch('https://notdeployed.do/health')
    expect(response.status).toBe(404)

    const error = await response.json()
    expect(error).toHaveProperty('error')
    expect(error.error.code).toBe('SERVICE_NOT_DEPLOYED')
  })

  it('should retry on transient errors', async () => {
    let attempts = 0
    const result = await retry(async () => {
      attempts++
      if (attempts < 3) throw new Error('Transient error')
      return 'success'
    }, { maxAttempts: 3, delay: 100 })

    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })
})
```

## Test Organization

### Directory Structure

```
workers/
├── [service]/
│   ├── src/
│   │   └── index.ts         # Service code
│   └── tests/
│       └── [service].test.ts # Unit tests
├── tests/
│   ├── integration/
│   │   ├── README.md                      # This testing guide
│   │   ├── TESTING_STRATEGY.md            # Testing strategy (this file)
│   │   ├── setup.ts                       # Test utilities and mocks
│   │   ├── gateway-routing.test.ts        # Gateway routing (73 tests)
│   │   ├── rpc-communication.test.ts      # RPC calls (45 tests)
│   │   ├── end-to-end-flows.test.ts       # User flows (28 tests)
│   │   ├── error-handling.test.ts         # Error scenarios (42 tests)
│   │   ├── performance.test.ts            # Performance (38 tests)
│   │   ├── dispatch-namespace.test.ts     # Namespace tests (NEW)
│   │   └── vitest.config.ts               # Test config
│   └── e2e/
│       ├── playwright.config.ts
│       └── *.spec.ts         # End-to-end tests
└── scripts/
    └── run-tests.sh          # Test runner script
```

### Naming Conventions

**Test Files:**
- `[feature].test.ts` - Unit tests
- `[feature]-integration.test.ts` - Integration tests
- `[feature].spec.ts` - E2E tests (Playwright)

**Test Suites:**
```typescript
describe('ServiceName', () => {
  describe('FeatureGroup', () => {
    it('should do specific thing', async () => {
      // Test implementation
    })
  })
})
```

**Test Names:**
- Use "should" statements
- Be specific and descriptive
- Include expected behavior
- Include error cases

**Good Examples:**
- ✅ `should deploy worker to development namespace`
- ✅ `should return 404 when service not deployed`
- ✅ `should retry on transient RPC errors`

**Bad Examples:**
- ❌ `test deployment` (too vague)
- ❌ `it works` (not descriptive)
- ❌ `db test` (not specific)

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Workers

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test -- --coverage

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:integration
        env:
          BASE_URL: http://localhost:8787

  deploy-to-development:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to development namespace
        run: ./scripts/deploy-wave-2f.sh development
        env:
          DEPLOY_API_KEY: ${{ secrets.DEPLOY_API_KEY }}

  dispatch-namespace-tests:
    needs: deploy-to-development
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test -- dispatch-namespace
        env:
          BASE_URL: https://api.do
          ENVIRONMENT: development

  e2e-tests:
    needs: dispatch-namespace-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:e2e
        env:
          BASE_URL: https://api.do
```

### Test Execution Order

**On Every Commit:**
1. Unit tests (fast, always run)
2. Integration tests with mocks (medium speed)
3. Linting and type checking

**On Pull Request:**
1. All unit tests
2. All integration tests
3. Deploy to development namespace
4. Run dispatch namespace tests
5. Run critical e2e tests

**On Merge to Main:**
1. All tests (unit + integration + e2e)
2. Deploy to staging namespace
3. Run full test suite against staging
4. Deploy to production (if tests pass)
5. Run smoke tests against production

## Test Utilities

### Available Utilities

**From `setup.ts`:**

```typescript
// Environment configuration
TEST_ENV.BASE_URL
TEST_ENV.TEST_API_KEY
TEST_ENV.TIMEOUT

// Mock creation
createMockEnv()
createMockService(name)

// Test data generators
testData.user()
testData.apiKey()
testData.webhook()
testData.email()

// HTTP helpers
testRequest(path, options)
waitForService(serviceName, maxAttempts, delay)

// Performance measurement
measureTime(fn)
assertPerformance(duration, budget)

// Retry logic
retry(fn, attempts, delay)

// Assertions
assertSuccess(response)
assertStatus(response, expectedStatus)
assertPerformance(duration, budget)

// Cleanup
cleanupTestData()
```

### Creating New Test Utilities

**Add to `setup.ts`:**

```typescript
export async function waitForWorkerDeployed(
  workerName: string,
  namespace: string,
  maxAttempts = 10
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`https://${workerName}.do/health`)
      if (response.ok) return true
    } catch (error) {
      // Worker not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  return false
}
```

## Troubleshooting

### Common Issues

#### Tests Failing Locally

**Symptom:** Tests pass in CI but fail locally

**Causes:**
- Local services not running
- Wrong environment variables
- Stale test database
- Port conflicts

**Solutions:**
```bash
# Check services are running
pnpm dev

# Reset environment
rm .dev.vars
cp .dev.vars.example .dev.vars

# Clear test database
rm -rf .wrangler/state
```

#### Flaky Tests

**Symptom:** Tests pass/fail inconsistently

**Causes:**
- Race conditions
- Network timeouts
- Shared test data
- Timing dependencies

**Solutions:**
- Add retries for network-dependent tests
- Increase timeouts
- Use unique test data per test
- Add explicit waits

**Example:**
```typescript
// Add retry logic
const result = await retry(async () => {
  return await fetch('https://api.do/health')
}, { maxAttempts: 3, delay: 1000 })

// Increase timeout
it('should complete flow', async () => {
  // ...
}, { timeout: 30000 }) // 30 seconds
```

#### Namespace Tests Not Working

**Symptom:** Dispatch namespace tests fail

**Possible Issues:**
1. Services not deployed to namespace
2. Dispatcher not deployed
3. Wrong namespace configuration
4. Secrets not configured

**Debug Steps:**
```bash
# List workers in namespace
wrangler dispatch-namespace list-workers dotdo-development

# Check dispatcher logs
wrangler tail dispatcher

# Test dispatcher directly
curl https://gateway.do/health -v
```

### Debug Helpers

```typescript
// Log environment
console.log('Testing against:', TEST_ENV.BASE_URL)
console.log('Namespace:', process.env.NAMESPACE)

// Log response details
const response = await testRequest('/api/db/health')
console.log('Status:', response.status)
console.log('Headers:', Object.fromEntries(response.headers))
console.log('Body:', await response.text())

// Measure timings
const start = Date.now()
await testFunction()
console.log('Duration:', Date.now() - start, 'ms')
```

## Best Practices

### Writing Good Tests

**Do:**
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Clean up test data
- ✅ Use appropriate assertions
- ✅ Mock external dependencies
- ✅ Test error cases
- ✅ Test edge cases
- ✅ Keep tests fast

**Don't:**
- ❌ Test multiple things in one test
- ❌ Depend on test execution order
- ❌ Share state between tests
- ❌ Use real production data
- ❌ Ignore failing tests
- ❌ Skip cleanup
- ❌ Hard-code values

### Test Maintenance

**Regular Tasks:**
- Update tests when code changes
- Remove obsolete tests
- Refactor duplicated test code
- Update test utilities
- Review test coverage
- Fix flaky tests
- Update documentation

**Monthly Reviews:**
- Review test execution times
- Identify slow tests
- Check test coverage trends
- Update performance targets
- Review test failures in CI

## Metrics and Reporting

### Test Metrics

**Track These Metrics:**
- Test count (by type)
- Test coverage percentage
- Test execution time
- Failure rate
- Flaky test count
- Time to fix failures

### Coverage Goals

| Service | Current | Target |
|---------|---------|--------|
| gateway | 80%+ | 85%+ |
| db | 68% | 80%+ |
| auth | Basic | 80%+ |
| schedule | 92-96% | 95%+ |
| webhooks | 80%+ | 85%+ |
| email | TBD | 80%+ |
| mcp | TBD | 80%+ |
| queue | TBD | 80%+ |

### Test Reports

**Generate Reports:**
```bash
# Coverage report
pnpm test -- --coverage

# HTML report
pnpm test -- --coverage --reporter=html

# View report
open coverage/index.html
```

## Next Steps

### Immediate Actions

1. ✅ Review this testing strategy
2. ⏳ Create dispatch-namespace.test.ts
3. ⏳ Update existing tests for namespace deployment
4. ⏳ Run tests against development namespace
5. ⏳ Document test results

### Short-term (Next 2 Weeks)

6. Add missing test coverage for services <80%
7. Create e2e tests for critical flows
8. Set up performance benchmarking
9. Integrate tests into CI/CD
10. Create test data management strategy

### Long-term (Next Month)

11. Implement automated performance regression detection
12. Create comprehensive error testing suite
13. Set up continuous test monitoring
14. Document common failure patterns
15. Create runbook for test failures

## Related Documentation

- **[Integration Test README](./README.md)** - Overview of integration tests
- **[Workers CLAUDE.md](../../CLAUDE.md)** - Workers architecture
- **[Dispatcher README](../../dispatcher/README.md)** - Dispatcher service
- **[Deploy API README](../../deploy/README.md)** - Deploy API service
- **[Implementation Plan](/Users/nathanclevenger/Projects/.do/notes/2025-10-03-workers-for-platforms-implementation.md)** - Migration plan

---

**Last Updated:** 2025-10-04
**Status:** Active
**Owner:** Subagent H
**Version:** 1.0
