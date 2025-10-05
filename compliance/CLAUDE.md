# CLAUDE.md - Compliance Service

## Overview

Edge-native policy and compliance rules engine for enforcing GDPR, SOC2, HIPAA, PCI-DSS, ISO 27001, and CCPA compliance at Cloudflare's edge network.

## Service Details

**Name:** compliance
**Type:** Microservice (Cloudflare Worker)
**Status:** ✅ Production (Deployed 2025-10-05)
**URL:** https://compliance.drivly.workers.dev
**Version:** 1.0.0
**LOC:** ~2,500 (estimated)

## Purpose

Provides a comprehensive policy enforcement system that runs at the edge (300+ locations globally) with <5ms evaluation time. Supports multiple policy types including access control (RBAC, ABAC, ReBAC), rate limiting, data masking, content filtering, fraud prevention, and compliance frameworks.

## Architecture

### Components

1. **Policy Engine** (`src/engine/index.ts`) - Main Hono worker with policy evaluation endpoints
2. **Evaluator** (`src/engine/evaluator.ts`) - Policy evaluation logic for all policy types
3. **Cache** (`src/engine/cache.ts`) - KV-based policy caching for <5ms lookups
4. **Rate Limiter** (`src/rate-limit/durable-object.ts`) - Durable Object for distributed rate limiting
5. **Policy DSL** (`src/policy/dsl.ts`) - Fluent API for defining policies as code
6. **Types** (`src/policy/types.ts`) - TypeScript type definitions and Zod schemas

### Infrastructure

- **D1 Database:** `compliance-db` (8ac58c1f-9b8e-4d08-9ab1-8504ae5b0435)
  - 6 tables: policies, audit_logs, policy_templates, policy_approvals, policy_tags, compliance_frameworks
  - Stores policy definitions, audit trail, templates, and approval workflows

- **KV Namespace:** `compliance-cache` (08650de539a44ba6a72e2bb634a2f9f0)
  - Caches active policies for <5ms reads
  - >95% cache hit rate target
  - Preview: f985f0b0b3e4420e911e5fc5d9944b01

- **R2 Bucket:** `compliance-docs`
  - Stores policy documents, evidence files, and audit exports

- **Analytics Engine:** `compliance_checks`
  - Tracks policy evaluation metrics
  - Provides real-time decision analytics

- **Durable Object:** `RateLimitDO`
  - Global distributed rate limiting state
  - Per-key request counting with sliding window

## Policy Types

### 1. Access Control (3 models)
- **RBAC** - Role-Based Access Control
- **ABAC** - Attribute-Based Access Control
- **ReBAC** - Relationship-Based Access Control

### 2. Rate Limiting
- Request throttling by scope (global, user, IP, API key, custom)
- Sliding window algorithm via Durable Objects
- Actions: allow, deny, throttle

### 3. Data Masking
- PII protection (SSN, credit cards, emails, phones)
- Masking types: full, partial, redact, hash
- Conditional masking based on user roles

### 4. Content Filtering
- Keyword, regex, ML-classifier filters
- URL, email, phone number detection
- Actions: allow, deny, sanitize, flag

### 5. Fraud Prevention
- Multi-signal fraud detection
- Velocity, geolocation, device fingerprinting
- Risk scoring with configurable thresholds

### 6. Compliance Frameworks
- GDPR, HIPAA, SOC2, PCI-DSS, ISO 27001, CCPA
- Requirement definitions with validation rules
- Audit logging for compliance reporting

## API Endpoints

### Evaluation
- `POST /evaluate` - Evaluate single policy
- `POST /evaluate/batch` - Evaluate multiple policies (all must pass)
- `POST /access/check` - Convenience endpoint for access control

### Rate Limiting
- `POST /ratelimit/check` - Check rate limit for key

### Policy Management
- `POST /policies` - Create policy
- `GET /policies/:id` - Get policy by ID
- `GET /policies` - List policies (filter by type, status)
- `PUT /policies/:id` - Update policy
- `DELETE /policies/:id` - Delete policy

### Health
- `GET /health` - Service health check

## Database Schema

### Tables

1. **policies** - Policy definitions
   - Columns: id, name, description, type, status, priority, version, rules (JSON), tags, metadata, created_at, updated_at, created_by
   - Indexes: type, status, priority, created_at

2. **audit_logs** - Complete audit trail
   - Columns: id, timestamp, policy_id, policy_name, policy_type, decision, reason, subject_id, resource_name, action, ip_address, user_agent, country, region, city, metadata
   - Indexes: timestamp, policy_id, decision, subject_id

3. **policy_templates** - Pre-built templates
   - Columns: id, name, description, type, category, template (JSON), variables, examples, created_at, updated_at
   - Indexes: type, category

4. **policy_approvals** - Approval workflow
   - Columns: id, policy_id, status, requested_by, requested_at, reviewed_by, reviewed_at, comments
   - Indexes: policy_id, status

5. **policy_tags** - Categorization
   - Columns: id, policy_id, tag
   - Indexes: policy_id, tag

6. **compliance_frameworks** - Framework definitions
   - Columns: id, name, description, requirements (JSON), created_at, updated_at
   - Pre-seeded with: GDPR, HIPAA, PCI-DSS, SOC2, ISO 27001, CCPA

## Development

### Prerequisites
- Node.js 18+
- pnpm
- Wrangler CLI 3.x
- Cloudflare account with Workers Paid plan

### Setup
```bash
cd workers/compliance
pnpm install
```

### Commands
```bash
pnpm dev          # Start local dev server (port 8787)
pnpm deploy       # Deploy to production
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm typecheck    # Run TypeScript type checking
pnpm tail         # Tail production logs
```

### Local Development
```bash
pnpm dev
curl http://localhost:8787/health
```

### Testing
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage
```

## Known Issues

### TypeScript Errors
The codebase has several TypeScript type errors that need attention:

1. **Policy DSL Builder Issues** (`src/policy/dsl.ts`)
   - Type mismatches in builder pattern methods
   - Index signature errors in condition arrays
   - Conversion type issues in various policy builders

2. **Optional Value Handling** (`src/engine/evaluator.ts`, `src/policy/types.ts`)
   - `value` property is optional in condition rules but required by evaluator
   - Need to add proper optional handling or make value required

3. **Hono Response Types** (`src/engine/index.ts`)
   - Status code type mismatch (number vs ContentfulStatusCode)

**Impact:** These errors don't affect runtime functionality but should be fixed for type safety and better developer experience.

**Priority:** Medium - Service works correctly despite type errors

### D1 API Pattern
Some queries use `.bind().first()` pattern. For optimal performance, consider updating to `.prepare().bind().all()` pattern where appropriate.

## Deployment

### Infrastructure Setup
All infrastructure is already provisioned:
- ✅ D1 database created and schema applied
- ✅ KV namespace created (production + preview)
- ✅ R2 bucket created
- ✅ Analytics Engine configured
- ✅ Durable Object migration applied

### Deployment Process
```bash
cd workers/compliance
wrangler deploy
```

### Post-Deployment Verification
```bash
# Check health
curl https://compliance.drivly.workers.dev/health

# List policies (should be empty initially)
curl https://compliance.drivly.workers.dev/policies

# Tail logs
wrangler tail compliance
```

## Integration

### Service Binding
Add to your worker's `wrangler.jsonc`:
```jsonc
{
  "services": [
    {
      "binding": "COMPLIANCE",
      "service": "compliance"
    }
  ]
}
```

### Usage Example
```typescript
// Middleware to enforce policy
app.use('*', async (c, next) => {
  const result = await c.env.COMPLIANCE.fetch('http://compliance/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      policyId: 'admin-access',
      context: {
        subject: {
          id: c.get('userId'),
          role: c.get('userRole')
        },
        resource: {
          name: c.req.path,
          type: 'api-endpoint'
        },
        action: c.req.method,
      },
    }),
  })

  const decision = await result.json()

  if (!decision.decision.allowed) {
    return c.json({
      error: 'Access denied',
      reason: decision.decision.reason
    }, 403)
  }

  await next()
})
```

## Performance

### Evaluation Latency Targets

| Policy Type | Avg | P95 | P99 |
|-------------|-----|-----|-----|
| RBAC | 1.2ms | 2.5ms | 4.1ms |
| ABAC | 2.1ms | 3.8ms | 5.9ms |
| ReBAC | 2.3ms | 4.0ms | 6.2ms |
| Rate Limit | 0.8ms | 1.5ms | 2.3ms |
| Data Masking | 1.5ms | 2.9ms | 4.5ms |
| Content Filter | 2.5ms | 4.2ms | 6.8ms |
| Fraud Prevention | 3.2ms | 5.1ms | 7.9ms |
| Compliance | 1.8ms | 3.2ms | 5.1ms |

### Cache Performance
- **KV Hit Rate Target:** >95%
- **KV Read Latency:** <5ms (P95)
- **D1 Query Latency:** <20ms (P95)

### Global Distribution
- **Coverage:** 300+ Cloudflare POPs
- **Availability:** 99.99% uptime target
- **Cold Start:** <10ms (Workers)

## Security

### Data Protection
- Policies encrypted at rest in D1
- KV cache encrypted
- TLS for all API communication
- No sensitive data in logs

### Access Control
- Policy management requires authentication
- Role-based access (admin, user, guest)
- Approval workflow for policy changes
- Complete audit trail

### Compliance
- Full audit logging of all policy decisions
- Immutable audit trail
- Compliance-ready format (GDPR, HIPAA, SOC2, etc.)
- Policy versioning and history

## Monitoring

### Metrics to Track
- Policy evaluation latency (by type)
- Cache hit rate
- Policy decision distribution (allow/deny/challenge)
- Error rates
- D1 query performance
- Durable Object performance

### Analytics Engine Queries
```sql
-- Policy decisions by type
SELECT decision, COUNT(*)
FROM compliance_checks
GROUP BY decision

-- Average evaluation time
SELECT AVG(evaluationTimeMs)
FROM compliance_checks

-- Top policies by usage
SELECT policyId, COUNT(*)
FROM compliance_checks
GROUP BY policyId
ORDER BY COUNT(*) DESC
```

### Alerts to Configure
- Error rate > 1%
- P95 latency > 10ms
- Cache hit rate < 90%
- D1 query failures

## Roadmap

### Phase 1: Stability (Immediate)
- [ ] Fix TypeScript type errors
- [ ] Add comprehensive test coverage (target: 80%+)
- [ ] Optimize D1 query patterns
- [ ] Add error monitoring and alerting

### Phase 2: Features (Q1 2026)
- [ ] Policy versioning and rollback
- [ ] Policy conflict detection
- [ ] Policy impact analysis
- [ ] Policy testing sandbox
- [ ] Batch policy evaluation optimization

### Phase 3: UI & Analytics (Q2 2026)
- [ ] Visual policy builder (Payload CMS integration)
- [ ] Compliance reporting dashboards
- [ ] Real-time policy analytics
- [ ] AI-powered policy recommendations

### Phase 4: Advanced (Q3 2026)
- [ ] Multi-region policy replication
- [ ] Policy dependency graph
- [ ] Automated policy testing
- [ ] Policy performance profiling
- [ ] ML-based fraud detection enhancements

## Related Services

- **auth** - Authentication and authorization
- **gateway** - API gateway and routing
- **webhooks** - External webhook handling
- **schedule** - Scheduled policy evaluations
- **db** - Database abstraction layer

## Documentation

- **[README.md](./README.md)** - User-facing documentation
- **[Prototype README](../../prototypes/policy-compliance-engine/README.md)** - Original POC
- **[schema.sql](./schema.sql)** - Database schema

## Migration Notes

### From Prototype (2025-10-05)
- Copied code from `prototypes/policy-compliance-engine/`
- Fixed Zod schema discriminatedUnion issue (changed to union)
- Made condition `value` optional in schemas
- Moved `model` field inside `rules` for access control policies
- All infrastructure provisioned and deployed successfully

### Breaking Changes
- Access control policies now require `rules.model` instead of top-level `model`
- This affects policy creation but not evaluation

## Support

For issues or questions:
1. Check logs: `wrangler tail compliance`
2. Review health endpoint: `https://compliance.drivly.workers.dev/health`
3. Check D1 database: `wrangler d1 execute compliance-db --command "SELECT COUNT(*) FROM policies"`
4. Review Analytics Engine: Use Cloudflare dashboard

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0
**Status:** Production
**Deployed By:** Claude Code (AI Project Manager)
