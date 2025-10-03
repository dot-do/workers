# Integration Tests

Comprehensive integration testing suite for Workers microservices architecture.

## Test Structure

```
tests/integration/
├── README.md                    # This file
├── setup.ts                     # Test utilities and mocks
├── gateway-routing.test.ts      # Gateway → Service routing
├── rpc-communication.test.ts    # Service-to-service RPC
├── end-to-end-flows.test.ts     # Complete user flows
├── error-handling.test.ts       # Error propagation & retry
└── performance.test.ts          # Performance benchmarks
```

## What We Test

### 1. Gateway Routing (gateway-routing.test.ts)
- Gateway routes requests to all 8 core services
- Domain-based routing works correctly
- Service bindings are properly configured
- Authentication and rate limiting applied correctly

### 2. RPC Communication (rpc-communication.test.ts)
- Direct RPC calls between services
- Type safety across service boundaries
- Service bindings work as expected
- RPC error handling

### 3. End-to-End Flows (end-to-end-flows.test.ts)
- Complete user journeys through multiple services
- Gateway → DB → Auth → Business Logic
- Data flows correctly through the system
- State management across services

### 4. Error Handling (error-handling.test.ts)
- Errors propagate correctly through service chain
- Retry logic works as expected
- Circuit breakers and fallbacks
- Error formatting and logging

### 5. Performance (performance.test.ts)
- RPC call latency measurements
- Gateway routing overhead
- Concurrent request handling
- Performance budgets and alerts

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm vitest run tests/integration/gateway-routing.test.ts

# Watch mode
pnpm vitest watch tests/integration/

# Coverage
pnpm vitest run tests/integration/ --coverage
```

## Test Environment

Tests require:
- All 8 core services deployed locally or in dev environment
- Service bindings configured in wrangler.jsonc
- Test database with seed data
- Mock external dependencies (Stripe, WorkOS, etc.)

## CI/CD Integration

Integration tests run in CI after:
1. All unit tests pass
2. All services build successfully
3. Services deployed to test environment

Tests must pass before:
- Merging to main
- Deploying to production
- Creating releases

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| RPC call latency | <50ms | <100ms |
| Gateway routing | <10ms | <25ms |
| End-to-end flow | <200ms | <500ms |
| Concurrent requests (100) | <1s | <2s |

## Troubleshooting

**Tests failing locally:**
- Ensure all services are running: `pnpm dev` in each service
- Check service bindings in wrangler.jsonc
- Verify test database is seeded

**Flaky tests:**
- Add retries for network-dependent tests
- Increase timeouts for slow services
- Check for race conditions in async operations

**Performance regressions:**
- Run baseline before changes: `pnpm test:integration:baseline`
- Compare results: `pnpm test:integration:compare`
- Investigate slowest tests first

## Contributing

When adding new services:
1. Add gateway routing tests
2. Add RPC communication tests
3. Update end-to-end flows
4. Document performance targets
5. Update this README

---

**Last Updated:** 2025-10-03
**Test Coverage Target:** 80%+
**Services Tested:** 8/8 core services
