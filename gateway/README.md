# gateway

# API Gateway Service

Pure router following Unix philosophy - does one thing (route requests) very well.

## Overview

The API Gateway is the **single HTTP entry point** for all microservices. It's a lightweight, high-performance routing service that:

1. **Routes traffic** - Based on domain/path to appropriate worker services via RPC
2. **Handles authentication** - Bearer tokens, API keys, WorkOS sessions
3. **Implements rate limiting** - Per-user, per-IP, configurable per-route
4. **Logs all requests** - Structured JSON logging with request IDs
5. **Zero business logic** - Just validates, routes, and observes

**Design Philosophy**: The gateway is **just a router** (300-500 LOC). All business logic lives in downstream services.

## Architecture

```
┌─────────────────┐
│   API Gateway   │  ◄── Pure Router
│                 │      - Domain/path routing
│  Middleware:    │      - Authentication
│  - Auth         │      - Rate limiting
│  - Rate Limit   │      - Logging
│  - Logging      │
└────────┬────────┘
         │
         │ Workers RPC (Service Bindings)
         │
         ├─────────┬─────────┬─────────┬─────────┐
         │         │         │         │         │
         ▼         ▼         ▼         ▼         ▼
     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
     │   DB   │ │   AI   │ │  Auth  │ │ Queue  │ │ More.. │
     │Service │ │Service │ │Service │ │Service │ │Services│
     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## Features

### 1. Multi-Layer Routing

**Path-Based Routing**:
- `/db/*` → DB service
- `/ai/*` → AI service
- `/auth/*` → Auth service
- `/queue/*` → Queue service
- `/workflows/*` → Workflows service
- `/agent/*` → Agent service (Durable Objects)
- `/fn/*` → Function classification service

**Domain-Based Routing**:
- `db.services.do` → DB service
- `ai.services.do` → AI service
- `auth.services.do` → Auth service
- `api.services.do` → DB service (default)
- `admin.do` → App/CMS service

**International Character Domains**:
- `彡.io` → DB (彡 = shape/pattern/database)
- `口.io` → DB (口 = mouth/noun - data model)
- `回.io` → DB (回 = rotation/thing - data model)
- `入.io` → FN (入 = enter/function)
- `巛.io` → Workflows (巛 = flow/river)
- `人.io` → Agent (人 = person/agent)

**Service Bindings** (RPC):
- Type-safe compile-time checking
- <5ms RPC calls (p95)
- No HTTP overhead - direct memory access

### 2. Authentication

**Supported Methods**:

1. **Bearer Token (API Keys)**:
   ```bash
   curl -H "Authorization: Bearer sk_live_..." https://api.services.do/db/things
   ```

2. **WorkOS Session (Cookie)**:
   ```bash
   curl -H "Cookie: session=..." https://api.services.do/db/things
   ```

**Public Routes** (no auth required):
- `/health` - Health check
- `/auth/*` - Authentication endpoints
- `GET /` - Root endpoint

**Authenticated Routes**:
- All `POST`, `PUT`, `DELETE`, `PATCH` requests
- Most service endpoints

**Admin-Only Routes**:
- `/batch/*` - Batch processing
- `/schedule/*` - Scheduled jobs
- `/admin/*` - Admin endpoints

### 3. Rate Limiting

**Default Limits**:
- **60 requests/minute** - Most endpoints
- **20 requests/minute** - AI operations
- **10 requests/minute** - Auth operations
- **5 requests/minute** - Batch operations
- **30 requests/minute** - Workflow operations

**Identifier Strategy**:
- **Authenticated**: Per `userId`
- **Anonymous**: Per IP address (CF-Connecting-IP)

**Storage**:
- **Development**: In-memory (single worker)
- **Production**: KV namespace (distributed)

**Response Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1620000000
Retry-After: 30
```

### 4. Structured Logging

**Request Logging**:
```json
{
  "level": "info",
  "type": "request",
  "requestId": "req_1620000000_abc123",
  "timestamp": "2025-10-02T12:00:00Z",
  "method": "GET",
  "path": "/db/things",
  "ip": "1.2.3.4",
  "userId": "user123"
}
```

**Response Logging**:
```json
{
  "level": "info",
  "type": "response",
  "requestId": "req_1620000000_abc123",
  "status": 200,
  "duration": "45ms"
}
```

**Headers**:
- `X-Request-ID` - Unique request identifier
- `X-Response-Time` - Request duration in milliseconds

## API

### RPC Interface



### HTTP Endpoints

**Health Check**:
```bash
GET /health

# Response
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:00:00Z",
  "services": ["db", "ai", "auth", "queue", ...]
}
```

**Route to Service**:
```bash
# Route to DB service
GET /db/things
Authorization: Bearer sk_live_...

# Route to AI service
POST /ai/generate
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "prompt": "Generate a summary..."
}
```

## Error Responses

**401 Unauthorized**:
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid API key or session token"
}
```

**403 Forbidden**:
```json
{
  "error": "Admin access required",
  "message": "This endpoint requires admin privileges"
}
```

**404 Not Found**:
```json
{
  "error": "Not found",
  "message": "No service found for path: /unknown",
  "requestId": "req_1620000000_abc123"
}
```

**429 Too Many Requests**:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 30
}
```

**502 Bad Gateway**:
```json
{
  "error": "Service error",
  "message": "Database unavailable",
  "service": "db",
  "requestId": "req_1620000000_abc123"
}
```

## Performance

**Benchmarks** (measured in production):
- **RPC Latency**: <5ms (p95)
- **HTTP Latency**: <50ms (p95)
- **Throughput**: 10,000+ req/s per worker
- **Memory**: ~10MB per worker instance

**Optimization Tips**:
1. Use Service Bindings (not HTTP) for service-to-service calls
2. Enable Smart Placement for optimal edge routing
3. Use KV for rate limiting (not in-memory) in production
4. Cache authentication results (if high volume)

## Configuration

### Adding a New Service

1. **Add service binding** in frontmatter:
   ```yaml
   services:
     - binding: NEW_SERVICE
       service: new-service
   ```

2. **Add route** in router configuration:
   

3. **Add type** in GatewayEnv interface:
   

### Rate Limit Configuration

Edit `ROUTE_LIMITS` in rate limiting code:


## Security

### Best Practices
1. **Use HTTPS only** - Never expose gateway over HTTP
2. **Validate all inputs** - Gateway validates auth, downstream services validate data
3. **Rate limit aggressively** - Prevent abuse and DDoS
4. **Log everything** - Structured JSON logs for security auditing
5. **Rotate API keys** - Invalidate compromised keys immediately

### Secrets Management
```bash
# Set secrets via Wrangler (never commit to Git)
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
```

## Testing

**Test Coverage**: 30+ tests, 80%+ coverage

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

## Implementation

---

**Generated from:** gateway.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts gateway.mdx`
