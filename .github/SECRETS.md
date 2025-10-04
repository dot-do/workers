# Required Secrets Configuration

This document lists all required secrets for GitHub Actions workflows.

## GitHub Repository Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

#### Cloudflare Workers Deployment

```bash
CLOUDFLARE_API_TOKEN
```
- **Description:** API token for deploying to Cloudflare Workers
- **How to get:**
  1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → My Profile → API Tokens
  2. Click "Create Token"
  3. Use "Edit Cloudflare Workers" template
  4. Select your account
  5. Click "Continue to summary" → "Create Token"
  6. Copy the token (shown only once!)

```bash
CLOUDFLARE_ACCOUNT_ID
```
- **Description:** Your Cloudflare account ID
- **How to get:**
  1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
  2. Select any domain
  3. Find "Account ID" in the right sidebar under Account Overview
  4. Copy the Account ID

### Optional Secrets

#### Code Coverage Reporting

```bash
CODECOV_TOKEN
```
- **Description:** Token for uploading coverage to Codecov
- **How to get:**
  1. Go to [Codecov](https://codecov.io)
  2. Sign in with GitHub
  3. Add your repository
  4. Copy the upload token from settings

#### Slack Notifications (if implemented)

```bash
SLACK_WEBHOOK_URL
```
- **Description:** Webhook URL for Slack notifications
- **How to get:**
  1. Go to your Slack workspace settings
  2. Navigate to Apps → Incoming Webhooks
  3. Add to Slack → Choose channel
  4. Copy the Webhook URL

## Environment-Specific Secrets

For production vs. staging environments, configure in: **Settings → Environments**

### Production Environment

```bash
CLOUDFLARE_API_TOKEN_PROD
CLOUDFLARE_ACCOUNT_ID_PROD
```

### Staging Environment

```bash
CLOUDFLARE_API_TOKEN_STAGING
CLOUDFLARE_ACCOUNT_ID_STAGING
```

## Cloudflare Wrangler Secrets

For application runtime secrets (not CI/CD), use Wrangler:

```bash
# Set a secret for a specific service
cd gateway
wrangler secret put WORKOS_API_KEY

# Set a secret for all services
for service in gateway db auth schedule webhooks email mcp queue; do
  cd $service
  wrangler secret put DATABASE_URL
  cd ..
done
```

### Common Wrangler Secrets

**Auth Service:**
```bash
cd auth
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put JWT_SECRET
```

**Database Service:**
```bash
cd db
wrangler secret put DATABASE_URL          # PostgreSQL connection string
wrangler secret put CLICKHOUSE_URL        # ClickHouse connection string
wrangler secret put CLICKHOUSE_PASSWORD
```

**AI Services:**
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY
```

**Email Service:**
```bash
cd email
wrangler secret put RESEND_API_KEY
```

**Webhooks Service:**
```bash
cd webhooks
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put WORKOS_WEBHOOK_SECRET
```

## Verification

### Check GitHub Secrets

```bash
gh secret list
```

### Check Wrangler Secrets

```bash
cd gateway
wrangler secret list
```

### Test Deployment

```bash
# Dry run deployment
cd gateway
wrangler deploy --dry-run

# Test with actual deployment
gh workflow run deploy.yml -f service=gateway -f environment=staging
```

## Security Best Practices

### 1. Token Permissions

**Cloudflare API Token should have:**
- ✅ Workers Routes: Edit
- ✅ Workers Scripts: Edit
- ✅ Account Settings: Read
- ❌ Do NOT grant Zone-level permissions unless needed

### 2. Token Rotation

Rotate tokens every 90 days:

```bash
# 1. Generate new Cloudflare token
# 2. Update GitHub secret
gh secret set CLOUDFLARE_API_TOKEN

# 3. Verify deployment still works
gh workflow run deploy.yml -f service=gateway -f environment=staging

# 4. Revoke old token from Cloudflare dashboard
```

### 3. Access Control

- Limit who can manage secrets (Settings → Actions → General)
- Use environment protection rules for production
- Enable required reviewers for production deployments

### 4. Audit Logging

Monitor secret usage:
- GitHub: Settings → Security → Audit log
- Cloudflare: Audit Logs tab

### 5. Backup Secrets

Keep encrypted backup of critical secrets in password manager:
- 1Password
- LastPass
- Bitwarden

## Troubleshooting

### Error: "Missing required secret"

```bash
# Check if secret is set
gh secret list

# Set the secret
gh secret set CLOUDFLARE_API_TOKEN

# Re-run workflow
gh run rerun <run-id>
```

### Error: "Invalid token"

```bash
# Verify token has correct permissions
# Generate new token from Cloudflare dashboard
# Update secret
gh secret set CLOUDFLARE_API_TOKEN
```

### Error: "Account ID mismatch"

```bash
# Check account ID in wrangler.jsonc matches secret
cd gateway
cat wrangler.jsonc | grep account_id

# Update secret if needed
gh secret set CLOUDFLARE_ACCOUNT_ID
```

### Error: "Wrangler secret not found"

```bash
# List secrets for service
cd gateway
wrangler secret list

# Set missing secret
wrangler secret put SECRET_NAME
```

## Quick Setup Script

```bash
#!/bin/bash
# setup-secrets.sh

echo "🔐 Setting up GitHub Actions secrets..."

# Prompt for values
read -p "Enter Cloudflare API Token: " CF_TOKEN
read -p "Enter Cloudflare Account ID: " CF_ACCOUNT_ID

# Set GitHub secrets
gh secret set CLOUDFLARE_API_TOKEN -b "$CF_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID -b "$CF_ACCOUNT_ID"

echo "✅ GitHub secrets configured!"

# Optional: Set up Wrangler secrets
echo ""
echo "🔐 Setting up Wrangler secrets..."
read -p "Enter DATABASE_URL: " DATABASE_URL
read -p "Enter WORKOS_API_KEY: " WORKOS_API_KEY

for service in gateway db auth schedule webhooks email mcp queue; do
  echo "Setting secrets for $service..."
  cd $service
  echo "$DATABASE_URL" | wrangler secret put DATABASE_URL
  echo "$WORKOS_API_KEY" | wrangler secret put WORKOS_API_KEY
  cd ..
done

echo "✅ All secrets configured!"
```

Make executable and run:
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

## Environment Variables vs Secrets

### Use Environment Variables (in wrangler.jsonc) for:
- ✅ Non-sensitive configuration (e.g., `ENVIRONMENT=production`)
- ✅ Feature flags
- ✅ Public URLs
- ✅ Timeout values

### Use Secrets for:
- ✅ API keys and tokens
- ✅ Database credentials
- ✅ Webhook secrets
- ✅ JWT secrets
- ✅ Encryption keys

## Example Configuration

### wrangler.jsonc (Public)
```jsonc
{
  "name": "gateway",
  "vars": {
    "ENVIRONMENT": "production",
    "API_VERSION": "v1",
    "ENABLE_RATE_LIMITING": true,
    "RATE_LIMIT_PER_MINUTE": 100
  }
}
```

### Wrangler Secrets (Private)
```bash
wrangler secret put WORKOS_API_KEY
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
```

---

**Last Updated:** 2025-10-03
**Security Contact:** security@services.do
