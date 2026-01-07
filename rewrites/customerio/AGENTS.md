# Agent Instructions - customerio.do

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**customerio.do** is a Customer.io-compatible marketing automation platform built on Cloudflare Durable Objects. It provides event tracking, workflow orchestration, dynamic segmentation, multi-channel message delivery, and Liquid template rendering.

Package: `@dotdo/customerio`

## Architecture

```
customerio/
  src/
    core/              # Pure business logic
    durable-objects/   # DO classes
      CustomerDO       # User profiles, events, preferences
      JourneyDO        # Workflow execution via CF Workflows
      SegmentDO        # Dynamic audience computation
      DeliveryDO       # Channel orchestration
      TemplateDO       # Template storage and rendering
    channels/          # Channel adapters
      email/           # Resend, SendGrid, SES
      push/            # APNs, FCM
      sms/             # Twilio, Vonage
      in-app/          # WebSocket
    mcp/               # AI tool definitions
  .beads/              # Issue tracking
```

## TDD Workflow

All work follows strict Red-Green-Refactor:

1. **[RED]** - Write failing tests first
2. **[GREEN]** - Minimal implementation to pass tests
3. **[REFACTOR]** - Clean up without changing behavior

```bash
# Find next RED task
bd ready | grep RED

# Claim and work
bd update customerio-xxx --status in_progress

# After tests pass, close RED
bd close customerio-xxx

# Move to GREEN (now unblocked)
bd ready | grep GREEN
```

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
bd dep tree <id>      # View dependency tree
```

## Key APIs (Customer.io Compatible)

### Track API
```typescript
// POST /v1/identify
await customerio.identify(userId, { email, name, plan })

// POST /v1/track
await customerio.track(userId, 'purchase', { amount: 99 })

// POST /v1/batch
await customerio.batch([...events])
```

### Workflow API
```typescript
// POST /v1/workflows/:id/trigger
await customerio.workflows.trigger('onboarding', {
  recipients: ['user_123'],
  data: { plan: 'pro' }
})
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
