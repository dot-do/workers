# CI/CD Setup Guide - Quick Start

This guide will walk you through setting up CI/CD for your Workers microservices in **~15 minutes**.

## Prerequisites

- ✅ GitHub CLI installed (`gh`)
- ✅ GitHub CLI authenticated (`gh auth status`)
- ✅ Cloudflare account with Workers enabled
- ⏳ Cloudflare API token (we'll create this)

## Step 1: Get Cloudflare Credentials (5 minutes)

### 1.1 Get Your Account ID

```bash
# Option A: From Cloudflare Dashboard
# 1. Go to https://dash.cloudflare.com
# 2. Click any domain
# 3. Look for "Account ID" in right sidebar
# 4. Copy the ID

# Option B: Using wrangler
wrangler whoami
# Look for "Account ID:" in the output
```

**Save this for later:** `CLOUDFLARE_ACCOUNT_ID=your-account-id-here`

### 1.2 Create API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Click **"Use template"** next to "Edit Cloudflare Workers"
4. Configure:
   - **Account Resources:** Select your account
   - **Zone Resources:** Include → All zones (or specific zones)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **COPY THE TOKEN NOW** (shown only once!)

**Save this for later:** `CLOUDFLARE_API_TOKEN=your-token-here`

## Step 2: Set GitHub Secrets (2 minutes)

### Quick Setup Script

```bash
# Navigate to workers directory
cd /Users/nathanclevenger/Projects/.do/workers

# Set secrets (will prompt for values)
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN

# Verify secrets are set
gh secret list
```

**Expected output:**
```
CLOUDFLARE_ACCOUNT_ID  Updated YYYY-MM-DD
CLOUDFLARE_API_TOKEN   Updated YYYY-MM-DD
```

### Manual Setup (Alternative)

If `gh secret set` doesn't work:

1. Go to https://github.com/dot-do/workers/settings/secrets/actions
2. Click **"New repository secret"**
3. Add `CLOUDFLARE_ACCOUNT_ID` with your account ID
4. Add `CLOUDFLARE_API_TOKEN` with your API token

## Step 3: Test CI Workflow (5 minutes)

### 3.1 Trigger CI with a Test Commit

```bash
# Make a test commit
git commit --allow-empty -m "test: Verify CI/CD workflows"
git push

# Watch the workflow run
gh run watch
```

### 3.2 What Should Happen

**CI Workflow will:**
1. ✅ Install dependencies (~2 min)
2. ✅ Type check all services (~1 min)
3. ✅ Run unit tests (~2 min)
4. ✅ Run integration tests (~2 min)
5. ✅ Generate coverage reports (~1 min)

**Total time:** ~5-10 minutes

### 3.3 View Results

```bash
# Check workflow status
gh run list

# View detailed logs
gh run view --log

# Open in browser
gh run view --web
```

## Step 4: Test Deployment (Optional - 3 minutes)

### 4.1 Manual Deployment to Staging

```bash
# Deploy all services to staging
gh workflow run deploy.yml \
  --field service=all \
  --field environment=staging

# Watch deployment
gh run watch
```

### 4.2 Deploy Specific Service

```bash
# Deploy just the gateway service
gh workflow run deploy.yml \
  --field service=gateway \
  --field environment=staging
```

## Step 5: Verify Deployment (2 minutes)

### 5.1 Check Service Health

```bash
# If deployed to Cloudflare
curl https://gateway.YOURWORKER.workers.dev/health

# Check logs
cd gateway
wrangler tail --env staging
```

## Optional Enhancements

### Enable Code Coverage Reports

1. Go to https://codecov.io
2. Sign in with GitHub
3. Add `dot-do/workers` repository
4. Copy upload token
5. Add to GitHub secrets:

```bash
gh secret set CODECOV_TOKEN
```

### Enable Slack Notifications

1. Go to your Slack workspace → Apps
2. Search for "Incoming Webhooks"
3. Add to Slack → Choose channel
4. Copy webhook URL
5. Add to GitHub secrets:

```bash
gh secret set SLACK_WEBHOOK_URL
```

## Troubleshooting

### "gh: command not found"

Install GitHub CLI:
```bash
brew install gh
gh auth login
```

### "wrangler: command not found"

Install wrangler:
```bash
pnpm add -D wrangler
npx wrangler login
```

### "Authentication failed"

Check your Cloudflare token permissions:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Edit your token
3. Ensure it has "Edit Cloudflare Workers" permissions
4. Regenerate if needed

### Workflow Not Triggering

Check:
1. ✅ Workflows are in `.github/workflows/`
2. ✅ You pushed to `main` branch
3. ✅ Actions are enabled in repo settings
4. ✅ View: https://github.com/dot-do/workers/actions

### Deployment Failing

Check:
1. ✅ Secrets are set correctly: `gh secret list`
2. ✅ Wrangler.jsonc files exist in services
3. ✅ Account ID matches your Cloudflare account
4. ✅ View workflow logs: `gh run view --log`

## Next Steps

Once CI/CD is working:

1. ✅ **Create Per-Service Workflows**
   - Copy `gateway.yml` pattern
   - Create workflows for other services

2. ✅ **Configure Environments**
   - Go to repo Settings → Environments
   - Create `staging` and `production` environments
   - Add required reviewers for production

3. ✅ **Setup Monitoring**
   - Configure Cloudflare Analytics
   - Set up error tracking
   - Create dashboards

4. ✅ **Run Integration Tests**
   - Set up local dev environment
   - Execute integration test suite
   - Fix any failures

## Quick Reference

### Check Workflow Status
```bash
gh run list                    # List recent runs
gh run view                    # View latest run
gh run view --log              # View logs
gh run watch                   # Watch live
gh run view --web              # Open in browser
```

### Manual Workflows
```bash
gh workflow list               # List all workflows
gh workflow run ci.yml         # Run CI
gh workflow run deploy.yml     # Run deployment
gh workflow view ci.yml        # View workflow details
```

### Secrets Management
```bash
gh secret list                 # List all secrets
gh secret set SECRET_NAME      # Add/update secret
gh secret delete SECRET_NAME   # Remove secret
```

## Support

- **Documentation:** [.github/CI_CD_GUIDE.md](.github/CI_CD_GUIDE.md)
- **Deployment Checklist:** [.github/DEPLOYMENT_CHECKLIST.md](.github/DEPLOYMENT_CHECKLIST.md)
- **Secrets Guide:** [.github/SECRETS.md](.github/SECRETS.md)
- **Workflow Details:** [.github/workflows/README.md](.github/workflows/README.md)

## Success Criteria

✅ Your setup is complete when:

1. ✅ `gh secret list` shows both secrets
2. ✅ `git push` triggers CI workflow
3. ✅ CI workflow passes all checks
4. ✅ Deployment workflow can be triggered manually
5. ✅ Services deploy successfully to staging

**Time to complete:** ~15-20 minutes

**You're done!** 🎉 Your CI/CD pipeline is now operational.

---

**Last Updated:** 2025-10-03
**Questions?** Check [.github/README.md](.github/README.md) or create an issue
