# Agent Instructions for @dotdo/posthog

PostHog on Cloudflare Durable Objects - Product analytics for every AI agent.

## Project Overview

This is a rewrite of PostHog's core functionality using Cloudflare primitives:
- **Event Capture** - `posthog.capture()` with batch processing
- **Feature Flags** - `posthog.isFeatureEnabled()` with edge evaluation
- **Analytics Engine** - Funnels, retention, cohorts via D1/Analytics Engine
- **Experiments** - A/B testing with statistical significance

## Architecture

```
src/
  core/           # Pure business logic
  durable-object/ # EventsDO, FlagsDO, ExperimentsDO
  storage/        # SQLite (hot) + Analytics Engine (aggregates)
  mcp/            # AI tool definitions
```

**Key Durable Objects:**
- `EventsDO` - Event ingestion and storage per project
- `FlagsDO` - Feature flag state and evaluation
- `ExperimentsDO` - Experiment bucketing and results

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## TDD Workflow

All work follows strict Red-Green-Refactor:

1. **[RED]** Write failing test first
2. **[GREEN]** Implement minimal code to pass
3. **[REFACTOR]** Clean up while tests pass

Check dependencies before starting:
```bash
bd show <id>          # See blocking issues
bd blocked            # See all blocked work
```

## Key Patterns

### Event Capture
```typescript
// API compatibility with PostHog JS SDK
posthog.capture('$pageview', {
  $current_url: 'https://example.com',
  custom_property: 'value'
})
```

### Feature Flags
```typescript
// Edge-evaluated flags with KV caching
const enabled = await posthog.isFeatureEnabled('new-feature', distinctId, {
  groups: { company: 'acme' },
  personProperties: { plan: 'pro' }
})
```

### Experiments
```typescript
// Deterministic bucketing
const variant = await posthog.getExperimentVariant('signup-flow', distinctId)
// variant: 'control' | 'variant-a' | 'variant-b'
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
