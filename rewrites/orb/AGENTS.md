# Agent Instructions - Orb Rewrite

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**orb.do** is a Cloudflare Workers rewrite of [Orb](https://withorb.com), a usage-based billing platform. Package: `@dotdo/orb`

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Event Ingestion** | High-volume usage metering (1000+ events/sec) |
| **Pricing Models** | Per-unit, tiered, graduated, volume, package |
| **Subscriptions** | Lifecycle management with proration |
| **Invoicing** | Line items, credits, PDF generation |
| **Entitlements** | Sub-ms feature gating via KV cache |

### Architecture

```
orb/
├── src/
│   ├── metering/           # Event ingestion & aggregation
│   │   ├── durable-object/
│   │   │   └── meter.ts    # MeterDO class
│   │   ├── ingest.ts       # Event endpoint
│   │   └── aggregate.ts    # COUNT, SUM, MAX, UNIQUE_COUNT
│   ├── pricing/            # Pricing calculations
│   │   ├── durable-object/
│   │   │   └── pricing.ts  # PricingDO class
│   │   ├── engine.ts       # calculateUsageAmount
│   │   ├── tiered.ts       # Graduated & volume
│   │   └── currency.ts     # Multi-currency
│   ├── subscriptions/      # Subscription state
│   │   ├── durable-object/
│   │   │   └── subscription.ts
│   │   ├── lifecycle.ts    # Create, update, cancel
│   │   └── proration.ts    # Mid-cycle changes
│   ├── invoicing/          # Invoice generation
│   │   ├── durable-object/
│   │   │   └── invoice.ts  # InvoiceDO class
│   │   ├── generator.ts    # Line items
│   │   ├── pdf.ts          # PDF rendering
│   │   └── storage.ts      # R2 archive
│   └── entitlements/       # Feature gating
│       ├── cache.ts        # KV entitlement cache
│       ├── check.ts        # hasFeature, getLimit
│       └── middleware.ts   # Hono middleware
├── .beads/                 # Issue tracking
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## Quick Reference

```bash
bd ready              # Find available work (RED tests first!)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## TDD Workflow

This project follows strict TDD Red-Green-Refactor:

1. **[RED]** - Write failing tests first
2. **[GREEN]** - Implement minimal code to pass
3. **[REFACTOR]** - Optimize without changing behavior

**Dependencies enforce this order.** GREEN tasks are blocked until RED is complete.

### Current TDD Cycles

| Epic | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| Usage Metering | orb-c80 | orb-09q | orb-cpc |
| Pricing Engine | orb-qnu | orb-w4x | orb-n0w |
| Subscriptions | orb-nzf | orb-1lh | orb-5nv |
| Invoicing | orb-jtd | orb-446 | orb-4c5 |
| Entitlements | orb-4xx | orb-2fj | orb-64s |

## Key Patterns

### MeterDO Event Structure

```typescript
interface MeterEvent {
  idempotencyKey: string  // Required - prevents duplicates
  customerId: string      // Required - customer identifier
  eventType: string       // e.g., "api_call", "storage_gb"
  timestamp: number       // Unix timestamp (35-day window)
  properties?: Record<string, string | number>
}
```

### Entitlement Cache (Sub-ms)

```typescript
// KV key format
`entitlement:${customerId}:${featureKey}` -> "true" | "false"
`limit:${customerId}:${featureKey}` -> "1000"
```

### Proration Calculation

```typescript
const ratio = periodRemaining / periodTotal
const proration = (newPrice - oldPrice) * ratio
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
