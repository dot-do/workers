# GitHub Actions Workflows

This directory contains all CI/CD workflows for the Workers microservices architecture.

## Overview

The workflows implement a comprehensive CI/CD pipeline with:
- Automated testing (unit, integration, E2E)
- Type checking and linting
- Selective deployment based on changes
- Automatic rollback on failures
- Nightly regression testing
- Performance monitoring

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs:**
1. **Setup** - Detect changed services
2. **Install** - Install and cache dependencies
3. **Type Check** - Verify TypeScript types across all services
4. **Lint** - Check code formatting with Prettier
5. **Unit Tests** - Run tests for each service in parallel (matrix strategy)
6. **Integration Tests** - Test service-to-service communication
7. **Coverage** - Generate and upload coverage reports to Codecov
8. **Status Check** - Final check that all jobs passed

**Features:**
- Parallel execution for maximum speed
- Dependency caching for faster builds
- Matrix strategy for testing multiple services
- Coverage threshold enforcement (80%)
- Detailed test result artifacts

**Usage:**
```bash
# Automatically runs on push/PR
# Or trigger manually:
gh workflow run ci.yml
```

### 2. Deployment Workflow (`deploy.yml`)

**Triggers:**
- Push to `main` branch (on service changes)
- Manual dispatch with service/environment selection

**Deployment Order:**
1. **DB** - Database service (foundation)
2. **Auth, Schedule, Webhooks, Email, MCP, Queue** - Core services (parallel)
3. **Gateway** - API gateway (last, after all others succeed)

**Features:**
- Smart change detection (only deploys changed services)
- Manual service-specific deployment
- Staging/production environment support
- Health checks after each deployment
- Smoke tests for critical endpoints
- Deployment rollback on failure
- Comprehensive deployment notifications

**Usage:**
```bash
# Deploy all services to production (automatic on main push)
gh workflow run deploy.yml

# Deploy specific service to staging
gh workflow run deploy.yml -f service=gateway -f environment=staging

# Deploy all services to staging
gh workflow run deploy.yml -f service=all -f environment=staging
```

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers deploy permission
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### 3. Nightly Tests Workflow (`test-nightly.yml`)

**Triggers:**
- Schedule: 2 AM UTC daily
- Manual dispatch

**Jobs:**
1. **Full Test Suite** - All unit + integration tests
2. **E2E Tests** - End-to-end Playwright tests
3. **Performance Tests** - Regression detection
4. **Security Scan** - Dependency audit and outdated packages
5. **Report** - Generate summary and create issues on failure

**Features:**
- Comprehensive testing beyond PR checks
- Performance regression detection
- Security vulnerability scanning
- Automatic issue creation on failure
- Test result artifacts

**Usage:**
```bash
# Automatically runs nightly
# Or trigger manually:
gh workflow run test-nightly.yml
```

### 4. Per-Service Workflows (Example: `gateway.yml`)

**Purpose:** Focused testing and deployment for individual services

**Triggers:**
- Push to `main`/`develop` (when service files change)
- Pull requests (when service files change)
- Manual dispatch

**Jobs:**
1. **Test** - Type check and run service-specific tests
2. **Deploy** - Deploy to Cloudflare Workers
3. **Rollback** - Automatic rollback on deployment failure

**Features:**
- Service-scoped testing
- Independent deployment
- Health check verification
- Critical endpoint testing
- Automatic rollback with issue creation
- CORS and security header validation

**Usage:**
```bash
# Deploy gateway to staging
gh workflow run gateway.yml -f environment=staging

# Deploy gateway to production
gh workflow run gateway.yml -f environment=production
```

**Note:** Create similar workflows for other services (db.yml, auth.yml, etc.) following the same pattern.

## Setup Instructions

### 1. Add Required Secrets

Navigate to your repository settings → Secrets and variables → Actions:

```bash
# Add Cloudflare credentials
CLOUDFLARE_API_TOKEN=<your-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

**To get Cloudflare API Token:**
1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit Cloudflare Workers template
3. Select your account
4. Copy the generated token

**To get Cloudflare Account ID:**
1. Go to Cloudflare Dashboard
2. Select any domain
3. Find Account ID in the right sidebar

### 2. Configure GitHub Environments (Optional)

For production deployments with approvals:

1. Go to Settings → Environments
2. Create `production` and `staging` environments
3. Add protection rules:
   - Required reviewers (for production)
   - Deployment branches (only main)
   - Environment secrets (if different from staging)

### 3. Enable GitHub Actions

1. Go to Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Set Workflow permissions to "Read and write permissions"

### 4. Configure Codecov (Optional)

For coverage reporting:

1. Go to https://codecov.io
2. Add your repository
3. Copy the upload token
4. Add `CODECOV_TOKEN` secret to repository

## Deployment Strategy

### Automatic Deployments

**On `main` branch push:**
```
Changes detected → CI runs → Deploy affected services → Gateway last
```

**Deployment order ensures:**
- Database migrations run first
- Core services deploy before gateway
- Gateway only deploys if all dependencies succeed

### Manual Deployments

**Selective deployment:**
```bash
# Deploy only auth service
gh workflow run deploy.yml -f service=auth -f environment=production
```

**Emergency rollback:**
```bash
# Trigger rollback by re-running previous successful deployment
gh run rerun <previous-run-id>
```

### Staged Rollouts

For safer deployments:

1. Deploy to staging first:
   ```bash
   gh workflow run deploy.yml -f service=all -f environment=staging
   ```

2. Run smoke tests against staging

3. Deploy to production:
   ```bash
   gh workflow run deploy.yml -f service=all -f environment=production
   ```

## Health Checks

Each deployment includes:

1. **Immediate health check** - `/health` endpoint after 5s
2. **Critical endpoint tests** - Key functionality verification
3. **CORS verification** - Security header validation
4. **Retry logic** - Up to 5 attempts with backoff

Health check failure triggers automatic rollback.

## Monitoring and Alerts

### Deployment Notifications

- ✅ Success: Logs deployment summary
- ❌ Failure: Creates GitHub issue with details
- 🔄 Rollback: Automatic + issue creation

### Nightly Test Failures

Failed nightly tests automatically create issues with:
- Failed job details
- Links to logs
- Recommended next steps
- Assigned to repository owner

### Coverage Tracking

Coverage reports uploaded to Codecov show:
- Overall coverage trends
- Per-service coverage
- Coverage diffs in PRs
- Threshold violations

## Best Practices

### Before Committing

```bash
# Run tests locally
pnpm test

# Type check
pnpm typecheck

# Format code
pnpm format
```

### Pull Request Flow

1. Create feature branch
2. Make changes
3. Push → CI runs automatically
4. Review coverage report in PR
5. Merge → Auto-deploy to production

### Manual Deployment

```bash
# Check workflow status first
gh run list --workflow=deploy.yml

# Deploy specific service
gh workflow run deploy.yml -f service=gateway -f environment=staging

# Watch deployment
gh run watch
```

### Troubleshooting

**CI failing on install:**
```bash
# Clear cache and retry
gh workflow run ci.yml
```

**Deployment failing:**
```bash
# Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# Verify secrets are set
gh secret list

# Check service health locally
cd gateway && pnpm dev
```

**Rollback failed:**
```bash
# Manual rollback to specific commit
git checkout <previous-commit>
gh workflow run deploy.yml -f service=<service>
```

## Customization

### Adding a New Service

1. Create service directory
2. Add to matrix in `ci.yml`:
   ```yaml
   strategy:
     matrix:
       service: [..., new-service]
   ```

3. Add deployment job in `deploy.yml`:
   ```yaml
   deploy-new-service:
     name: Deploy New Service
     # ... copy from existing service job
   ```

4. Create `new-service.yml` workflow (optional)

### Modifying Test Timeouts

In `ci.yml`:
```yaml
env:
  TEST_TIMEOUT: 30000  # Increase if needed
```

### Adding Environment Variables

In service wrangler.jsonc:
```jsonc
{
  "vars": {
    "NEW_VAR": "value"
  }
}
```

Or set as secret:
```bash
wrangler secret put NEW_SECRET
```

## Workflow Dependencies

```
ci.yml
├── install
├── typecheck
├── lint
├── unit-tests (parallel matrix)
├── integration-tests
└── coverage

deploy.yml
├── detect-changes
├── deploy-db (first)
├── deploy-{auth,schedule,...} (parallel)
└── deploy-gateway (last)

test-nightly.yml
├── full-test-suite
├── e2e-tests
├── performance-tests
├── security-scan
└── report (creates issues on failure)

gateway.yml (per-service)
├── test
├── deploy
└── rollback (on failure)
```

## Performance Optimization

### Caching Strategy

- **pnpm cache** - Speeds up dependency installation (2-5x faster)
- **Build cache** - Reuses previous builds when possible
- **Test cache** - Vitest automatically caches results

### Parallel Execution

- Unit tests run in parallel per service (matrix)
- Core services deploy in parallel
- Multiple PRs can run CI simultaneously (with concurrency groups)

### Selective Execution

- Only changed services deploy
- Path filters prevent unnecessary runs
- Workflow dependencies prevent redundant work

## Security Considerations

### Secrets Management

- Never commit secrets to repository
- Use GitHub encrypted secrets
- Set secrets via `wrangler secret put` for production
- Rotate tokens regularly

### Deployment Safety

- Gateway deploys last (prevents routing to broken services)
- Health checks before considering deployment successful
- Automatic rollback on failure
- Manual approval option for production (environment protection)

### Dependency Scanning

- Nightly security audits
- Automated issue creation on vulnerabilities
- Outdated dependency tracking

## Resources

- [Cloudflare Workers Deployment](https://developers.cloudflare.com/workers/wrangler/ci-cd/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Vitest CI Configuration](https://vitest.dev/guide/ci.html)

## Support

For issues with:
- **Workflows**: Open issue in this repo
- **Cloudflare**: Check [Cloudflare Status](https://www.cloudflarestatus.com)
- **GitHub Actions**: Check [GitHub Status](https://www.githubstatus.com)

---

**Last Updated:** 2025-10-03
**Maintained By:** DevOps Team
