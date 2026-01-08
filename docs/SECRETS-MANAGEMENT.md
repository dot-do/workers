# Secrets Management

This document covers how to manage secrets and environment variables in workers.do across local development, staging, and production environments.

## Overview

workers.do uses Cloudflare Workers secrets management with three distinct patterns:

1. **Local Development** - `.dev.vars` file (gitignored)
2. **Production Deployment** - `wrangler secret put` command
3. **CI/CD Pipeline** - GitHub Secrets injected during deployment

## Local Development

### The `.dev.vars` File

For local development with `wrangler dev`, create a `.dev.vars` file in your worker directory. This file is automatically loaded by Wrangler and should never be committed to git.

```bash
# Create .dev.vars in your worker directory
touch .dev.vars
```

### Template

Copy this template and fill in your values:

```bash
# .dev.vars - Local Development Secrets
# DO NOT COMMIT THIS FILE TO GIT

# Cloudflare API
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Stripe (payments.do)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# WorkOS (org.ai)
WORKOS_API_KEY=sk_test_xxxxx
WORKOS_CLIENT_ID=client_xxxxx

# LLM Providers (llm.do)
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Database
DATABASE_URL=file:./local.db

# JWT / Auth
JWT_SECRET=your_local_jwt_secret_for_development
AUTH_SECRET=your_local_auth_secret_for_development

# Optional: Override environment
ENVIRONMENT=development
```

### Gitignore Configuration

Ensure `.dev.vars` is in your `.gitignore`:

```bash
# Secrets - never commit
.dev.vars
*.env.local
.env
```

### Multiple Worker Directories

If you have multiple workers, each can have its own `.dev.vars`:

```
workers/
  llm/
    .dev.vars      # LLM-specific secrets
  stripe/
    .dev.vars      # Stripe-specific secrets
  cloudflare/
    .dev.vars      # Cloudflare API secrets
```

## Production Secrets with Wrangler

### Setting Production Secrets

Use `wrangler secret put` to set secrets for deployed workers:

```bash
# Set a single secret
wrangler secret put STRIPE_SECRET_KEY

# You'll be prompted to enter the value securely
```

For scripts or automation, pipe the value:

```bash
echo "sk_live_xxxxx" | wrangler secret put STRIPE_SECRET_KEY
```

### Specifying Environment

Set secrets for specific environments:

```bash
# Production
wrangler secret put STRIPE_SECRET_KEY --env production

# Staging
wrangler secret put STRIPE_SECRET_KEY --env staging
```

### Listing Secrets

View configured secrets (values are redacted):

```bash
wrangler secret list
wrangler secret list --env production
```

### Deleting Secrets

Remove a secret from a deployed worker:

```bash
wrangler secret delete STRIPE_SECRET_KEY
wrangler secret delete STRIPE_SECRET_KEY --env production
```

### Bulk Secret Management

For multiple secrets, create a script:

```bash
#!/bin/bash
# scripts/set-secrets.sh

SECRETS=(
  "CLOUDFLARE_API_TOKEN"
  "STRIPE_SECRET_KEY"
  "WORKOS_API_KEY"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "JWT_SECRET"
)

for secret in "${SECRETS[@]}"; do
  echo "Setting $secret..."
  wrangler secret put "$secret" --env "$1"
done
```

Usage:

```bash
./scripts/set-secrets.sh production
```

## CI/CD with GitHub Actions

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers permissions | All deployments |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | All deployments |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Payment processing |
| `WORKOS_API_KEY` | WorkOS API key | Authentication |
| `OPENAI_API_KEY` | OpenAI API key | LLM operations |
| `ANTHROPIC_API_KEY` | Anthropic API key | LLM operations |

### Creating a Cloudflare API Token

1. Go to [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create custom with:
   - **Zone > Zone > Read** (if using custom domains)
   - **Account > Cloudflare Workers > Edit**
   - **Account > Account Settings > Read**
4. Copy the token and add it to GitHub Secrets as `CLOUDFLARE_API_TOKEN`

### GitHub Actions Workflow

The deployment workflow in `.github/workflows/deploy.yml` uses these secrets:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.workers.do
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Deploy to Cloudflare Workers (Staging)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: staging
          secrets: |
            STRIPE_SECRET_KEY
            WORKOS_API_KEY
            OPENAI_API_KEY
            ANTHROPIC_API_KEY
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          WORKOS_API_KEY: ${{ secrets.WORKOS_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://workers.do
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Deploy to Cloudflare Workers (Production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: production
          secrets: |
            STRIPE_SECRET_KEY
            WORKOS_API_KEY
            OPENAI_API_KEY
            ANTHROPIC_API_KEY
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          WORKOS_API_KEY: ${{ secrets.WORKOS_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Environment-Specific Secrets

GitHub supports environment-specific secrets. Configure different values for staging vs production:

1. Go to Settings > Environments
2. Create `staging` and `production` environments
3. Add environment-specific secrets to each

This allows:
- `STRIPE_SECRET_KEY` in staging = test key (`sk_test_...`)
- `STRIPE_SECRET_KEY` in production = live key (`sk_live_...`)

## Secret Naming Conventions

workers.do uses consistent binding names across the platform:

| Binding Name | Purpose | Example Value |
|--------------|---------|---------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API access | `cf_xxxxx` |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier | `abc123def456` |
| `STRIPE_SECRET_KEY` | Stripe payments | `sk_live_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | `whsec_xxxxx` |
| `WORKOS_API_KEY` | WorkOS authentication | `sk_xxxxx` |
| `WORKOS_CLIENT_ID` | WorkOS OAuth | `client_xxxxx` |
| `OPENAI_API_KEY` | OpenAI LLM | `sk-xxxxx` |
| `ANTHROPIC_API_KEY` | Anthropic LLM | `sk-ant-xxxxx` |
| `JWT_SECRET` | JWT signing | Random 256-bit key |
| `AUTH_SECRET` | Better Auth | Random 256-bit key |

## Accessing Secrets in Code

### In Workers

Secrets are available on the `env` object:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    // ...
  }
}
```

### In Durable Objects

Access via `this.env`:

```typescript
import { DO } from 'dotdo'

class MyDO extends DO {
  async handleRequest() {
    const apiKey = this.env.OPENAI_API_KEY
    // ...
  }
}
```

### Type Safety

Define your environment types:

```typescript
interface Env {
  // Secrets
  STRIPE_SECRET_KEY: string
  WORKOS_API_KEY: string
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  JWT_SECRET: string

  // Bindings
  DB: D1Database
  CACHE: KVNamespace
  STORAGE: R2Bucket
}
```

## Security Best Practices

### Do

- Use separate API keys for development, staging, and production
- Rotate secrets regularly (at least quarterly)
- Use the principle of least privilege for API tokens
- Store production secrets only in Cloudflare and GitHub Secrets
- Use environment-specific secrets in GitHub Actions

### Do Not

- Commit `.dev.vars` or any file containing secrets to git
- Log or print secret values
- Share secrets via Slack, email, or other insecure channels
- Use production secrets in local development
- Hardcode secrets in source code

### Secret Rotation

When rotating a secret:

1. Generate new secret/key from the provider
2. Update in all environments:
   ```bash
   # Local
   # Edit .dev.vars manually

   # Staging
   wrangler secret put SECRET_NAME --env staging

   # Production
   wrangler secret put SECRET_NAME --env production

   # GitHub (if using CI/CD injection)
   # Update in GitHub Settings > Secrets
   ```
3. Verify deployments work with new secret
4. Revoke old secret from the provider

## Troubleshooting

### Secret Not Available

If a secret returns `undefined`:

1. Check the secret is set: `wrangler secret list`
2. Verify environment: `wrangler secret list --env production`
3. Ensure the binding name matches exactly (case-sensitive)
4. Redeploy after setting secrets

### Local Development Issues

If `.dev.vars` isn't loaded:

1. Ensure file is in the same directory as `wrangler.toml` or `wrangler.json`
2. Check file permissions: `chmod 600 .dev.vars`
3. Restart `wrangler dev`

### CI/CD Deployment Failures

If GitHub Actions can't access secrets:

1. Verify secret names match exactly
2. Check environment protection rules allow the workflow
3. Ensure the repository has access to organization secrets (if applicable)

## Quick Reference

```bash
# Local development
echo "SECRET_VALUE" > .dev.vars

# Set production secret
wrangler secret put SECRET_NAME --env production

# List secrets
wrangler secret list --env production

# Delete secret
wrangler secret delete SECRET_NAME --env production

# Deploy with secrets via GitHub Actions
# Secrets are injected via cloudflare/wrangler-action
```

## Related Documentation

- [Cloudflare Wrangler Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [workers.do Architecture](./ARCHITECTURE.md)
