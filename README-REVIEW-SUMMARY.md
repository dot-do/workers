# README Review Summary

**Review Date**: 2026-01-08
**Files Reviewed**: 153 README files
**Review Scope**: State, completeness, and consistency with workers.do vision

---

## Executive Summary

| Category | Total | Complete | Mostly Complete | Incomplete/Stub |
|----------|-------|----------|-----------------|-----------------|
| Core | 2 | 2 | 0 | 0 |
| Agents/Roles/Teams/Workflows | 5 | 3 | 2 | 0 |
| Objects | 11 | 11 | 0 | 0 |
| Apps | 4 | 3 | 1 | 0 |
| Integrations | 6 | 5 | 1 | 0 |
| Middleware | 4 | 4 | 0 | 0 |
| Packages/Plugins | 8 | 5 | 3 | 0 |
| Rewrites | 61 | 55 | 4 | 2 |
| SDKs | 43 | 34 | 6 | 3 |
| Startups/Services | 9 | 4 | 4 | 1 |

**Overall Health**: ~85% of READMEs are complete and consistent with the workers.do vision.

---

## Critical Issues (High Priority)

### 1. SDK API Key Pattern Violations
**Files affected**: Multiple SDKs show direct `apiKey` parameter examples
- `sdks/rpc.do/README.md` - Shows `process.env.DO_API_KEY` (anti-pattern)
- `sdks/llm.do/README.md` - Direct apiKey in factory config
- `sdks/models.do/README.md` - Direct apiKey in factory config
- `sdks/nouns.do/README.md` - Direct apiKey in factory config
- `sdks/payments.do/README.md` - Direct apiKey in factory config
- `sdks/apps.as/README.md` - Direct `process.env.DATABASE_URL` access

**Fix**: Update to rely on rpc.do's environment system per CLAUDE.md principle #8

### 2. Missing SDK Configuration Sections
**Files affected**:
- `sdks/videos.as/README.md`
- `sdks/waitlist.as/README.md`
- `sdks/wiki.as/README.md`
- `sdks/marketplace.as/README.md`
- `sdks/mcp.do/README.md`
- `sdks/mdx.as/README.md`
- `sdks/page.as/README.md`

**Fix**: Add Quick Start and Configuration sections with `import 'rpc.do/env'` pattern

### 3. Duplicate/Inconsistent Startup READMEs
- `startups/README.md` is exact duplicate of `startups/startups.new/README.md`
- `startups/startups.as/README.md` is a stub with unclear purpose

**Fix**:
- Rewrite `startups/README.md` as overview/index
- Expand or merge `startups.as` with `startups.new`

### 4. Integration Binding Name Mismatch
- `integrations/workos/README.md` uses `WORKOS` binding
- CLAUDE.md specifies `ORG` as conventional binding name

**Fix**: Change all `WORKOS` to `ORG` throughout

---

## Medium Priority Issues

### Tree-Shakable Documentation Missing
Per CLAUDE.md principle #5, packages should document tree-shakable entry points:
- `packages/edge-api/README.md` - Missing `/tiny`, `/rpc`, `/auth` documentation
- `packages/rpc/README.md` - Missing subpath exports
- `packages/react-compat/README.md` - Missing (under development)

**Exemplary files** (use as templates):
- `packages/glyphs/README.md`
- `opensaas/README.md`
- `saaskit/README.md`

### Workflow API Inconsistency
`workflows/README.md` shows three different API patterns:
1. Event-driven: `on.Feature.requested(async feature => {...})`
2. Workflow constructor: `Workflow({ on: '...', plan: {...} })`
3. Tagged template: `` dev`add stripe integration` ``

**Fix**: Align with single API pattern from CLAUDE.md

### Missing Agents in Documentation
`agents/README.md` only mentions Priya, Ralph, Tom - missing:
- Rae (Frontend)
- Mark (Marketing)
- Sally (Sales)
- Quinn (QA)

### Apps Tech Stack Inconsistency
`apps/docs/README.md` uses Fumadocs UI instead of shadcn/ui (all apps should use shadcn per CLAUDE.md)

---

## Low Priority Issues

### Platform Services Context Missing
- `integrations/stripe/README.md` - Should mention it's part of payments.do
- `workers/llm/README.md` - Missing external SDK pattern documentation

### Minor Code Example Fixes
- `README.md` line 89: Uses `priya.plan(product)` instead of tagged template
- `roles/README.md` line 102: Syntax error in tagged template

---

## Incomplete/Stub READMEs

### Rewrites (need expansion)
| File | Lines | Issue |
|------|-------|-------|
| `rewrites/veeva/README.md` | 105 | Stub - missing architecture, features, deployment |
| `rewrites/epic/README.md` | 220 | Missing architecture, AI-native section |
| `rewrites/greenhouse/README.md` | 112 | Very short, minimal detail |
| `rewrites/posthog/README.md` | 317 | Stub - needs significant expansion |
| `rewrites/sentry/README.md` | 221 | Stub - needs complete rewrite |
| `rewrites/orb/README.md` | 313 | Missing migration, detailed examples |
| `rewrites/segment/README.md` | 354 | Missing migration, architecture details |

### SDKs (need configuration sections)
- `sdks/videos.as/README.md`
- `sdks/waitlist.as/README.md`
- `sdks/wiki.as/README.md`

---

## Exemplary READMEs (Use as Templates)

### Best Overall
1. **`objects/do/README.md`** - Perfect alignment with vision, explains triple meaning
2. **`objects/human/README.md`** - Excellent human-AI collaboration documentation
3. **`objects/startup/README.md`** - Perfect hero alignment
4. **`startups/startups.new/README.md`** - Comprehensive, well-structured

### Best SDK Examples
1. **`sdks/plans.do/README.md`** - Correctly avoids direct apiKey examples
2. **`sdks/kpis.do/README.md`** - Excellent configuration section

### Best Rewrite Examples
1. **`rewrites/salesforce/README.md`** - 1149 lines, extremely thorough
2. **`rewrites/databricks/README.md`** - 1116 lines, gold standard
3. **`rewrites/docusign/README.md`** - 853 lines, excellent manifesto

### Best Package Examples
1. **`packages/glyphs/README.md`** - Perfect tree-shaking documentation
2. **`opensaas/README.md`** - Perfect multi-level exports
3. **`saaskit/README.md`** - Full vision alignment

---

## Structural Patterns to Standardize

### For SDKs
```markdown
## Installation
## Quick Start
## Usage (with `import 'rpc.do/env'` for Workers)
## API Reference
## Configuration (env vars, NOT direct apiKey)
```

### For Rewrites
```markdown
## The Problem
## The workers.do Way
## Promise Pipelining Examples
## Features
## AI-Native Features
## Architecture
## Migration Guide
## Roadmap
```

### For Packages
```markdown
## Installation
## Tree-Shakable Imports
  - `/tiny` - Minimal
  - `/rpc` - RPC bindings
  - `/auth` - With auth
## Usage
## API Reference
```

---

## Recommended Actions

### Immediate (Fix within 1 week)
1. Fix `startups/README.md` duplicate
2. Update SDK READMEs with missing configuration sections
3. Fix `integrations/workos/README.md` binding name

### Short-term (Fix within 2 weeks)
1. Add tree-shakable documentation to packages
2. Expand stub rewrites (veeva, epic, greenhouse, posthog, sentry)
3. Add missing agents to `agents/README.md`

### Ongoing
1. Ensure all new SDKs follow configuration pattern
2. Use exemplary READMEs as templates for new documentation
3. Run periodic consistency checks

---

## Statistics

- **Total READMEs**: 153
- **Complete**: ~130 (85%)
- **Mostly Complete**: ~15 (10%)
- **Incomplete/Stub**: ~8 (5%)
- **Critical Issues**: 4
- **Medium Issues**: 5
- **Low Priority Issues**: 3
