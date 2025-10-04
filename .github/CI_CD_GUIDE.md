# CI/CD Guide for Workers Microservices

Complete guide to understanding and working with the CI/CD pipeline.

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Workflow Stages](#workflow-stages)
4. [Development Workflow](#development-workflow)
5. [Deployment Strategy](#deployment-strategy)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Overview

The Workers microservices CI/CD pipeline provides:
- **Automated testing** on every push and PR
- **Parallel execution** for fast feedback
- **Selective deployment** based on changed files
- **Automatic rollback** on deployment failures
- **Comprehensive monitoring** and alerting

### Key Features

- ✅ **Fast**: Parallel testing, intelligent caching
- ✅ **Safe**: Staging validation, automatic rollback
- ✅ **Scalable**: Per-service workflows, matrix strategies
- ✅ **Observable**: Detailed logs, coverage reports, metrics

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Push                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CI Workflow (ci.yml)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Install Dependencies (cached)                               │
│  2. Type Check (all services)                                   │
│  3. Lint & Format Check                                         │
│  4. Unit Tests (parallel per service)                           │
│  5. Integration Tests                                           │
│  6. Coverage Report (80% threshold)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │ On main branch
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Deploy Workflow (deploy.yml)                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Detect Changed Services                                     │
│  2. Deploy DB (foundation)                                      │
│  3. Deploy Core Services (parallel)                             │
│     - Auth, Schedule, Webhooks, Email, MCP, Queue              │
│  4. Deploy Gateway (last, routes to all)                       │
│  5. Health Checks & Smoke Tests                                 │
│  6. Rollback on Failure (automatic)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Service Dependency Graph

```
                    ┌─────────┐
                    │ Gateway │ (deploys last)
                    └────┬────┘
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                    ┌────▼────┐
    │   DB    │ (deploys first)    │  Auth   │
    └────┬────┘                    └─────────┘
         │
    ┌────┴─────┬──────┬──────┬──────┬─────┐
    │          │      │      │      │     │
┌───▼──┐  ┌───▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼─┐ ┌─▼───┐
│Email │  │  MCP │ │Queue│ │Sched│ │Web│ │hooks│
└──────┘  └──────┘ └────┘ └────┘ └───┘ └─────┘
```

## Workflow Stages

### Stage 1: Code Quality (CI)

**Purpose:** Ensure code meets quality standards before merging

**Steps:**
1. **Install** - Install dependencies with caching
2. **Type Check** - Verify TypeScript types across all services
3. **Lint** - Check code formatting
4. **Test** - Run unit tests for each service

**Duration:** ~5-10 minutes

**Triggers:**
- Push to any branch
- Pull request creation/update
- Manual dispatch

### Stage 2: Integration Testing

**Purpose:** Verify services work together correctly

**Steps:**
1. Run integration test suite
2. Test RPC communication between services
3. Test error handling and edge cases
4. Validate end-to-end flows

**Duration:** ~3-5 minutes

**Triggers:**
- After unit tests pass
- On PR merge to main
- Nightly schedule

### Stage 3: Deployment

**Purpose:** Deploy code to production safely

**Steps:**
1. **Detect Changes** - Identify which services changed
2. **Deploy Foundation** - Deploy DB service first
3. **Deploy Core** - Deploy dependent services in parallel
4. **Deploy Gateway** - Deploy routing layer last
5. **Validate** - Run health checks and smoke tests
6. **Rollback** - Automatically rollback on failure

**Duration:** ~5-10 minutes

**Triggers:**
- Push to main branch (automatic)
- Manual dispatch (selective deployment)

### Stage 4: Monitoring

**Purpose:** Ensure deployment is healthy

**Steps:**
1. Monitor error rates (first 5 minutes)
2. Check response times (first 15 minutes)
3. Verify scheduled tasks (first hour)
4. Review analytics (first 24 hours)

**Duration:** Ongoing

**Actions:**
- Alert on thresholds exceeded
- Create incident issues
- Trigger automatic rollback if critical

## Development Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
cd gateway
# ... edit files ...

# 3. Test locally
pnpm test
pnpm typecheck

# 4. Commit changes
git add .
git commit -m "feat: add new feature"

# 5. Push branch
git push origin feature/new-feature
```

**What happens:**
- CI workflow runs automatically
- Type checking, linting, testing
- PR checks show pass/fail status
- Coverage report posted to PR

### Pull Request Flow

```bash
# 1. Create PR on GitHub
gh pr create --title "Add new feature" --body "Description..."

# 2. CI runs automatically
# View status: gh pr checks

# 3. Review coverage report
# View: gh pr view --web

# 4. Request review
gh pr review <pr-number> --approve

# 5. Merge PR
gh pr merge <pr-number> --squash
```

**What happens:**
- All CI checks must pass
- Coverage must meet threshold
- PR must be approved
- Squash merge to main
- Deployment triggers automatically

### Hotfix Flow

```bash
# 1. Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# 2. Make minimal fix
cd gateway
# ... fix bug ...

# 3. Test
pnpm test

# 4. Push and create PR
git push origin hotfix/critical-bug
gh pr create --title "fix: critical bug" --label hotfix

# 5. Fast-track review
# Request immediate review

# 6. Merge and deploy
gh pr merge --squash
# Deployment happens automatically
```

**Fast-track criteria:**
- Critical production bug
- Minimal code changes
- Tests passing
- Senior engineer approval

## Deployment Strategy

### Automatic Deployment (Recommended)

**Trigger:** Push to `main` branch

**Process:**
1. CI runs and passes
2. Changes detected automatically
3. Only changed services deploy
4. Gateway deploys last
5. Health checks validate
6. Automatic rollback on failure

**Example:**
```bash
# 1. Merge PR to main
gh pr merge 123 --squash

# 2. Monitor deployment
gh run watch

# 3. Verify deployment
curl https://api.services.do/health
```

### Manual Deployment

**Use cases:**
- Deploy specific service
- Deploy to staging first
- Deploy outside normal hours
- Re-deploy after rollback

**Commands:**

```bash
# Deploy all services to production
gh workflow run deploy.yml -f service=all -f environment=production

# Deploy specific service to staging
gh workflow run deploy.yml -f service=gateway -f environment=staging

# Deploy gateway only to production
gh workflow run deploy.yml -f service=gateway -f environment=production
```

### Staged Deployment

**Process:**
1. Deploy to staging
2. Validate in staging
3. Deploy to production
4. Monitor in production

**Commands:**

```bash
# 1. Deploy to staging
gh workflow run deploy.yml -f service=all -f environment=staging

# 2. Validate
curl https://staging.api.services.do/health

# 3. Run smoke tests
cd tests/integration
pnpm test:e2e --base-url=https://staging.api.services.do

# 4. Deploy to production
gh workflow run deploy.yml -f service=all -f environment=production

# 5. Monitor
watch -n 5 'curl -s https://api.services.do/health | jq'
```

### Selective Deployment

Deploy only specific services:

```bash
# Deploy only database service
gh workflow run deploy.yml -f service=db

# Deploy only gateway
gh workflow run deploy.yml -f service=gateway

# Deploy auth and schedule
# (requires running twice, or modify workflow)
gh workflow run deploy.yml -f service=auth
gh workflow run deploy.yml -f service=schedule
```

## Troubleshooting

### Common Issues

#### 1. CI Failing on Install

**Symptoms:**
- `pnpm install` fails
- Dependency resolution errors

**Solutions:**
```bash
# Clear cache
gh workflow run ci.yml

# Update lockfile
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
git push
```

#### 2. Type Check Errors

**Symptoms:**
- TypeScript compilation errors
- Type mismatches

**Solutions:**
```bash
# Check locally
pnpm typecheck

# Fix errors
# ... edit files ...

# Verify
pnpm typecheck
```

#### 3. Test Failures

**Symptoms:**
- Unit tests failing
- Integration tests timing out

**Solutions:**
```bash
# Run tests locally
pnpm test

# Run specific test
pnpm test gateway/tests/routes.test.ts

# Debug test
pnpm test --watch

# Check test logs in CI
gh run view <run-id> --log
```

#### 4. Deployment Failures

**Symptoms:**
- Deployment workflow fails
- Health checks fail
- Rollback triggered

**Solutions:**
```bash
# Check deployment logs
gh run view <run-id> --log

# Check service logs
cd gateway
wrangler tail

# Manual health check
curl -v https://api.services.do/health

# Manual rollback if needed
gh workflow run deploy.yml -f service=gateway
```

#### 5. Secret Errors

**Symptoms:**
- "Missing secret" errors
- Authentication failures

**Solutions:**
```bash
# List secrets
gh secret list

# Set missing secret
gh secret set CLOUDFLARE_API_TOKEN

# Verify secret in wrangler
cd gateway
wrangler secret list
```

### Debugging Workflows

#### View Workflow Runs

```bash
# List recent runs
gh run list --workflow=ci.yml --limit=10

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

#### Re-run Failed Jobs

```bash
# Re-run entire workflow
gh run rerun <run-id>

# Re-run only failed jobs
gh run rerun <run-id> --failed
```

#### Cancel Running Workflow

```bash
gh run cancel <run-id>
```

### Monitoring Deployments

#### Real-time Monitoring

```bash
# Watch deployment
gh run watch

# Tail service logs
cd gateway
wrangler tail --env production

# Monitor health
watch -n 5 'curl -s https://api.services.do/health | jq'
```

#### Post-Deployment

```bash
# Check Cloudflare analytics
open https://dash.cloudflare.com

# Review error logs
cd gateway
wrangler tail --status=error --env production

# Check metrics
# (implement metrics endpoint)
curl https://api.services.do/metrics
```

## Best Practices

### Code Quality

1. **Run tests before pushing**
   ```bash
   pnpm test && pnpm typecheck && pnpm format
   ```

2. **Keep tests fast**
   - Unit tests < 100ms each
   - Integration tests < 1s each
   - Total test suite < 5 minutes

3. **Maintain coverage**
   - Minimum 80% coverage
   - 100% for critical paths
   - Add tests for bug fixes

### Deployment Safety

1. **Deploy during low-traffic periods**
   - Tuesday-Thursday, 10am-4pm
   - Avoid Friday afternoons
   - Avoid holidays

2. **Deploy small changes**
   - One feature at a time
   - Easy to rollback
   - Easy to debug

3. **Monitor deployments**
   - First 5 minutes: Error rates
   - First 15 minutes: Response times
   - First hour: User reports
   - First 24 hours: Analytics

### Performance

1. **Optimize CI runtime**
   - Use caching effectively
   - Run tests in parallel
   - Skip unnecessary steps

2. **Optimize deployments**
   - Only deploy changed services
   - Use smart placement
   - Minimize build time

3. **Optimize feedback loop**
   - Fast local tests
   - Quick CI feedback
   - Immediate deployment visibility

### Security

1. **Protect secrets**
   - Never commit secrets
   - Rotate tokens regularly
   - Use environment-specific secrets

2. **Review dependencies**
   - Run security audits nightly
   - Update dependencies regularly
   - Monitor vulnerability reports

3. **Control access**
   - Require PR reviews
   - Limit deployment permissions
   - Use environment protection

## Metrics and KPIs

### CI/CD Performance

- **Mean Time to Feedback**: <5 minutes (CI completion)
- **Mean Time to Deploy**: <10 minutes (merge to production)
- **Deployment Frequency**: 2-3 times per week
- **Change Failure Rate**: <5%
- **Mean Time to Recovery**: <15 minutes

### Code Quality

- **Test Coverage**: ≥80%
- **Type Safety**: 100% (0 errors)
- **Lint Warnings**: 0
- **Security Vulnerabilities**: 0 critical, 0 high

### Deployment Success

- **Deployment Success Rate**: ≥95%
- **Rollback Rate**: <5%
- **Post-Deployment Incidents**: <1%
- **Mean Time to Detect**: <5 minutes

## Additional Resources

- [Workflows Documentation](./workflows/README.md)
- [Secrets Configuration](./SECRETS.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Wrangler Configuration](./WRANGLER_EXAMPLE.jsonc)
- [Architecture Documentation](../../ARCHITECTURE.md)

## Support

- **GitHub Issues**: [Create Issue](https://github.com/dot-do/workers/issues/new)
- **Slack**: #devops, #ci-cd
- **Email**: devops@services.do

---

**Last Updated:** 2025-10-03
**Version:** 1.0
**Maintained By:** DevOps Team
