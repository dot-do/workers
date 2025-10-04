# Tests Runner Worker

**Comprehensive integration testing for all core services via remote bindings.**

## Overview

This worker tests all 8 core services through service bindings (RPC), validating that each service is operational and responding correctly. It provides HTTP endpoints to trigger tests individually or all at once.

## Services Tested

1. **gateway** - API gateway (routing, auth, rate limiting)
2. **db** - Database service (PostgreSQL/Neon + ClickHouse)
3. **auth** - Authentication service (WorkOS, API keys, sessions)
4. **schedule** - Cron jobs and scheduled tasks
5. **webhooks** - External webhooks (Stripe, WorkOS, GitHub, Resend)
6. **email** - Transactional emails (Resend integration)
7. **mcp** - Model Context Protocol server
8. **queue** - Message queue processing

## Endpoints

### Health Check
```bash
curl http://localhost:8787/health
```

Returns service info and available endpoints.

### Test Individual Service
```bash
# Test gateway service
curl http://localhost:8787/test/gateway

# Test database service
curl http://localhost:8787/test/db

# Test auth service
curl http://localhost:8787/test/auth

# Test schedule service
curl http://localhost:8787/test/schedule

# Test webhooks service
curl http://localhost:8787/test/webhooks

# Test email service
curl http://localhost:8787/test/email

# Test MCP service
curl http://localhost:8787/test/mcp

# Test queue service
curl http://localhost:8787/test/queue
```

### Test All Services
```bash
curl http://localhost:8787/test/all
```

Runs all tests in parallel and returns summary.

## Response Format

### Individual Test
```json
{
  "test": "gateway",
  "passed": true,
  "duration": 45,
  "result": {
    "healthCheck": { ... },
    "rootEndpoint": { ... }
  }
}
```

### All Tests
```json
{
  "summary": {
    "total": 8,
    "passed": 8,
    "failed": 0,
    "allPassed": true,
    "duration": 234
  },
  "tests": [
    { "test": "gateway", "passed": true, ... },
    { "test": "db", "passed": true, ... },
    ...
  ]
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Deploy to production
pnpm deploy
```

## Service Bindings

Configured in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "GATEWAY_SERVICE", "service": "gateway" },
    { "binding": "DB_SERVICE", "service": "db" },
    { "binding": "AUTH_SERVICE", "service": "auth" },
    { "binding": "SCHEDULE_SERVICE", "service": "schedule" },
    { "binding": "WEBHOOKS_SERVICE", "service": "webhooks" },
    { "binding": "EMAIL_SERVICE", "service": "email" },
    { "binding": "MCP_SERVICE", "service": "mcp" },
    { "binding": "QUEUE_SERVICE", "service": "queue" }
  ]
}
```

## Testing Approach

Each service test performs:
1. **Health check** - Verify service is responding
2. **Basic operation** - Test core functionality via RPC
3. **Error handling** - Verify graceful failure modes

Tests use service bindings to call services directly via RPC, bypassing HTTP gateway.

## CI/CD Integration

This worker can be called from GitHub Actions to validate deployments:

```yaml
- name: Run Integration Tests
  run: |
    RESPONSE=$(curl -s https://tests-runner.do/test/all)
    ALL_PASSED=$(echo $RESPONSE | jq -r '.summary.allPassed')

    if [ "$ALL_PASSED" != "true" ]; then
      echo "Tests failed!"
      exit 1
    fi
```

## Vitest Integration

Can also run tests using Vitest with `@cloudflare/vitest-pool-workers`:

```bash
pnpm test
```

See `tests/` directory for Vitest-based integration tests.
