# GitHub Actions Configuration

This directory contains all GitHub Actions workflows and CI/CD documentation for the Workers microservices architecture.

## Quick Links

- **[CI/CD Guide](./CI_CD_GUIDE.md)** - Complete guide to the CI/CD pipeline
- **[Workflows Documentation](./workflows/README.md)** - Detailed workflow documentation
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre/post-deployment checklist
- **[Secrets Configuration](./SECRETS.md)** - Required secrets setup
- **[Wrangler Examples](./WRANGLER_EXAMPLE.jsonc)** - Multi-environment configuration

## Files Overview

### Workflows (`.github/workflows/`)

| Workflow | Purpose | Triggers |
|----------|---------|----------|
| **ci.yml** | Continuous integration | Push, PR, Manual |
| **deploy.yml** | Production deployment | Push to main, Manual |
| **test-nightly.yml** | Nightly regression tests | Schedule (2 AM), Manual |
| **gateway.yml** | Gateway-specific workflow | Service changes, Manual |

### Documentation

| File | Description |
|------|-------------|
| **CI_CD_GUIDE.md** | Complete CI/CD pipeline guide |
| **DEPLOYMENT_CHECKLIST.md** | Pre-deployment validation checklist |
| **SECRETS.md** | Required secrets and configuration |
| **WRANGLER_EXAMPLE.jsonc** | Multi-environment wrangler config |
| **workflows/README.md** | Detailed workflow documentation |

## Quick Start

### 1. Setup Secrets

```bash
# Add required secrets to GitHub
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

See [SECRETS.md](./SECRETS.md) for detailed instructions.

### 2. Verify CI

```bash
# Push code to trigger CI
git add .
git commit -m "feat: new feature"
git push origin feature-branch

# Watch CI run
gh run watch
```

### 3. Deploy

```bash
# Automatic: Merge PR to main
gh pr merge 123 --squash

# Manual: Deploy specific service
gh workflow run deploy.yml -f service=gateway -f environment=staging
```

See [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) for complete deployment instructions.

## Workflows Summary

### CI Workflow

**File:** `workflows/ci.yml`

**Jobs:**
1. Setup → Install → Type Check
2. Lint → Unit Tests (parallel per service)
3. Integration Tests → Coverage Report

**Duration:** ~5-10 minutes

**Triggers:**
- Push to any branch
- Pull request
- Manual dispatch

### Deploy Workflow

**File:** `workflows/deploy.yml`

**Jobs:**
1. Detect Changed Services
2. Deploy DB (foundation)
3. Deploy Core Services (parallel)
4. Deploy Gateway (last)
5. Health Checks & Validation

**Duration:** ~5-10 minutes

**Triggers:**
- Push to main (automatic)
- Manual dispatch (selective)

### Nightly Tests

**File:** `workflows/test-nightly.yml`

**Jobs:**
1. Full Test Suite
2. E2E Tests
3. Performance Tests
4. Security Scan
5. Generate Report

**Duration:** ~30-60 minutes

**Triggers:**
- Schedule (2 AM UTC daily)
- Manual dispatch

### Per-Service Workflow

**File:** `workflows/gateway.yml` (example)

**Jobs:**
1. Test (type check + tests)
2. Deploy (to Cloudflare)
3. Rollback (on failure)

**Duration:** ~3-5 minutes

**Triggers:**
- Service file changes
- Manual dispatch

## Architecture

### Deployment Order

```
DB Service (first)
    │
    ├─→ Auth Service
    ├─→ Schedule Service
    ├─→ Webhooks Service
    ├─→ Email Service
    ├─→ MCP Service
    └─→ Queue Service
         │
         └─→ Gateway Service (last)
```

**Why this order?**
- DB must be available for all services
- Core services deploy in parallel
- Gateway deploys last (routes to all services)

### Health Check Flow

```
Deploy Service
    │
    ├─→ Wait 5 seconds
    │
    ├─→ Health check (/health endpoint)
    │   ├─→ Pass: Continue
    │   └─→ Fail: Retry 5x with backoff
    │
    ├─→ Smoke test (critical endpoints)
    │   ├─→ Pass: Mark success
    │   └─→ Fail: Trigger rollback
    │
    └─→ Monitor (error rates, response times)
```

### Rollback Process

```
Deployment Failure Detected
    │
    ├─→ Get previous successful commit
    │
    ├─→ Checkout previous version
    │
    ├─→ Deploy previous version
    │
    ├─→ Verify health checks
    │
    ├─→ Create GitHub issue
    │
    └─→ Notify team
```

## Best Practices

### Development

1. **Test locally before pushing**
   ```bash
   pnpm test && pnpm typecheck
   ```

2. **Keep commits focused**
   - One feature per PR
   - Clear commit messages
   - Link to issues

3. **Review CI feedback**
   - Fix failures immediately
   - Maintain coverage threshold
   - Address lint warnings

### Deployment

1. **Deploy during safe windows**
   - Tuesday-Thursday, 10am-4pm
   - Avoid Fridays and weekends

2. **Monitor deployments**
   - Watch first 5 minutes closely
   - Check error rates and response times
   - Verify critical functionality

3. **Use staged deployments**
   - Deploy to staging first
   - Validate thoroughly
   - Then deploy to production

### Security

1. **Protect secrets**
   - Never commit secrets
   - Use GitHub encrypted secrets
   - Rotate tokens regularly

2. **Review permissions**
   - Limit who can deploy
   - Require PR reviews
   - Use environment protection

3. **Audit regularly**
   - Review security scans
   - Update dependencies
   - Monitor vulnerability reports

## Troubleshooting

### CI Failing

```bash
# View failure details
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed

# Check specific service
cd gateway && pnpm test
```

### Deployment Failing

```bash
# Check deployment logs
gh run view <run-id> --log

# Check service health
curl -v https://api.services.do/health

# Manual rollback
gh workflow run deploy.yml -f service=gateway
```

### Secret Issues

```bash
# List secrets
gh secret list

# Set missing secret
gh secret set CLOUDFLARE_API_TOKEN

# Verify with wrangler
cd gateway && wrangler secret list
```

## Metrics

### Target KPIs

- **CI Duration**: <10 minutes
- **Deployment Duration**: <10 minutes
- **Deployment Success Rate**: ≥95%
- **Test Coverage**: ≥80%
- **Mean Time to Recovery**: <15 minutes

### Current Status

Check [STATUS.md](../STATUS.md) for current metrics and health status.

## Support

- **Documentation**: Read guides in this directory
- **Issues**: [Create GitHub Issue](https://github.com/dot-do/workers/issues/new)
- **Slack**: #devops, #ci-cd
- **Email**: devops@services.do

---

**Last Updated:** 2025-10-03
**Maintained By:** DevOps Team
**Repository:** https://github.com/dot-do/workers
