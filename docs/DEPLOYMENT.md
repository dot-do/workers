# workers.do Deployment Guide

This guide provides comprehensive instructions for deploying workers.do services to Cloudflare Workers, including initial setup, custom domains, environment configuration, CI/CD integration, and monitoring.

## Table of Contents

- [Prerequisites](#prerequisites)
- [First Deployment](#first-deployment)
- [Custom Domains](#custom-domains)
- [Environment Configuration](#environment-configuration)
- [CI/CD Integration](#cicd-integration)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Advanced Deployment Strategies](#advanced-deployment-strategies)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Account Setup

1. **Cloudflare Account**

   Create a Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up/workers-and-pages) if you do not have one. The free tier includes:
   - 100,000 requests per day
   - 10ms CPU time per invocation
   - Durable Objects (first 1 million requests free)

2. **API Tokens**

   Generate API tokens for programmatic deployments:
   - Navigate to **My Profile** > **API Tokens**
   - Click **Create Token**
   - Use the **Edit Cloudflare Workers** template or create a custom token with:
     - `Account > Workers Scripts > Edit`
     - `Account > Workers Routes > Edit`
     - `Zone > Zone > Read` (for custom domains)
     - `Zone > DNS > Edit` (for custom domains)

3. **Find Your Account ID**

   Your Account ID is displayed on the Workers overview page in the Cloudflare dashboard. You will need this for wrangler configuration.

### CLI Installation

Install the Wrangler CLI globally:

```bash
npm install -g wrangler
```

Or use it via npx without global installation:

```bash
npx wrangler --version
```

**Required versions:**
- Node.js: 18.0.0 or higher
- Wrangler: 3.0.0 or higher (this project uses 4.54.0+)

### Authentication

Authenticate the Wrangler CLI with your Cloudflare account:

```bash
wrangler login
```

This opens a browser window for OAuth authentication. For CI/CD environments, use API tokens instead:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### Project Setup

Clone the workers.do repository and install dependencies:

```bash
git clone https://github.com/dot-do/workers.git
cd workers
npm install
```

---

## First Deployment

### Understanding the Monorepo Structure

The workers.do project is a monorepo containing multiple deployable workers:

```
workers/           # Cloudflare Workers
  deployer/       # Deployment management service
  id.org.ai/      # Authentication service
  oauth.do/       # OAuth provider
  llm/            # AI gateway
  stripe/         # Payments integration
sdks/             # SDK packages
packages/         # Shared libraries
objects/          # Durable Objects
```

### Creating a New Worker

Use the `create-do` package to scaffold a new service:

```bash
npx create-do my-service
cd my-service
npm install
```

This generates:
- `src/index.ts` - Worker entry point
- `src/durable-object/index.ts` - Durable Object class
- `src/mcp/index.ts` - MCP tools for AI integration
- `wrangler.toml` - Wrangler configuration
- `package.json` - Dependencies and scripts

### Wrangler Configuration

Create or update `wrangler.toml` (or `wrangler.jsonc` for JSON format with comments):

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Custom domains
routes = [
  { pattern = "my-service.do", custom_domain = true }
]

# Durable Objects
[durable_objects]
bindings = [
  { name = "MY_DO", class_name = "MyDurableObject" }
]

[[migrations]]
tag = "v1"
new_classes = ["MyDurableObject"]

# D1 Database (optional)
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "placeholder"  # Replace after creation

# KV Namespace (optional)
[[kv_namespaces]]
binding = "KV"
id = "placeholder"  # Replace after creation

# R2 Bucket (optional)
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# Environment variables (non-sensitive)
[vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"

# Development settings
[dev]
port = 8787
local_protocol = "http"
```

### Local Development

Run your worker locally:

```bash
wrangler dev
```

This starts a local development server at `http://localhost:8787` with:
- Hot reloading on file changes
- Local Durable Objects storage
- Simulated KV/R2/D1 bindings

### Deploying to Cloudflare

Deploy your worker to production:

```bash
wrangler deploy
```

For monorepo workers, use workspace-specific deployment:

```bash
# Deploy a specific worker
npm run deploy --workspace=workers/my-worker

# Deploy all workers
npm run deploy

# Deploy to staging environment
npm run deploy:staging
```

### Verifying Deployment

After deployment, verify your worker is running:

```bash
# List deployments
wrangler deployments list

# View deployment details
wrangler deployments status

# Test the health endpoint
curl https://my-worker.your-subdomain.workers.dev/health

# Stream live logs
wrangler tail
```

---

## Custom Domains

### Adding a Custom Domain

workers.do services use `.do` domains by convention. Configure custom domains in `wrangler.toml`:

```toml
routes = [
  { pattern = "my-service.do", custom_domain = true },
  { pattern = "api.my-service.do", custom_domain = true }
]
```

### DNS Configuration

For custom domains, configure DNS records:

1. **If your domain is on Cloudflare:**

   Wrangler handles DNS automatically when you deploy with `custom_domain = true`.

2. **If your domain is external:**

   Add a CNAME record pointing to your Workers subdomain:
   ```
   CNAME my-service.do -> my-worker.your-subdomain.workers.dev
   ```

3. **For the workers.do platform domains:**

   Use the builder.domains service:
   ```typescript
   await env.DOMAINS.claim('my-startup.hq.com.ai')
   await env.DOMAINS.route('my-startup.hq.com.ai', { worker: 'my-worker' })
   ```

### SSL Certificates

Cloudflare automatically provisions and manages SSL certificates for all Workers:
- Free Universal SSL for *.workers.dev subdomains
- Free SSL for custom domains proxied through Cloudflare
- Automatic certificate renewal

No manual SSL configuration is required.

### Route Patterns

Configure route patterns for more control:

```toml
# Exact domain match
routes = [
  { pattern = "api.example.com", zone_name = "example.com" }
]

# Wildcard subdomain
routes = [
  { pattern = "*.api.example.com", zone_name = "example.com" }
]

# Path-based routing
routes = [
  { pattern = "example.com/api/*", zone_name = "example.com" }
]
```

---

## Environment Configuration

### Environment Variables

Define non-sensitive environment variables in `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"
API_VERSION = "v1"
MAX_REQUESTS_PER_MINUTE = "100"
```

Access in your worker:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`Environment: ${env.ENVIRONMENT}`)
    return new Response('OK')
  }
}
```

### Secrets Management

Store sensitive values (API keys, tokens, credentials) as secrets:

```bash
# Add a secret
wrangler secret put ANTHROPIC_API_KEY
# Enter the value when prompted

# Add secrets from a file
wrangler secret put API_KEY < api-key.txt

# List secrets (names only)
wrangler secret list

# Delete a secret
wrangler secret delete OLD_API_KEY
```

Common secrets for workers.do:

```bash
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put AUTH_SECRET
wrangler secret put DATABASE_URL
```

### Multiple Environments

Configure staging and production environments:

```toml
# Base configuration
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
ENVIRONMENT = "production"

# Staging environment
[env.staging]
name = "my-worker-staging"
routes = [
  { pattern = "staging.my-service.do", custom_domain = true }
]

[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "debug"

# Preview environment (for PRs)
[env.preview]
name = "my-worker-preview"

[env.preview.vars]
ENVIRONMENT = "preview"
LOG_LEVEL = "debug"
```

Deploy to specific environments:

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy

# Set secrets for specific environment
wrangler secret put API_KEY --env staging
```

### Local Development Variables

Create a `.dev.vars` file for local development secrets (do not commit this file):

```bash
# .dev.vars
ANTHROPIC_API_KEY=sk-ant-xxx
STRIPE_SECRET_KEY=sk_test_xxx
DATABASE_URL=postgres://localhost:5432/dev
```

Add to `.gitignore`:

```
.dev.vars
*.local.*
```

---

## CI/CD Integration

### GitHub Actions

The workers.do project includes a comprehensive GitHub Actions workflow. Create `.github/workflows/deploy.yml`:

```yaml
name: CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  NODE_VERSION: '20'

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Run typecheck
        run: npm run typecheck

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.workers.do
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Deploy to Cloudflare Workers (Staging)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://workers.do
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Deploy to Cloudflare Workers (Production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: production
```

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm test
  cache:
    paths:
      - node_modules/

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
    - npm run typecheck
  cache:
    paths:
      - node_modules/
  artifacts:
    paths:
      - dist/

deploy-staging:
  stage: deploy
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
    - npx wrangler deploy --env staging
  environment:
    name: staging
    url: https://staging.workers.do
  only:
    - main
  variables:
    CLOUDFLARE_API_TOKEN: $CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CLOUDFLARE_ACCOUNT_ID

deploy-production:
  stage: deploy
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
    - npx wrangler deploy
  environment:
    name: production
    url: https://workers.do
  only:
    - main
  when: manual
  variables:
    CLOUDFLARE_API_TOKEN: $CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CLOUDFLARE_ACCOUNT_ID
```

### Other CI/CD Platforms

For other platforms (CircleCI, Jenkins, etc.), the deployment steps are:

1. Install Node.js 18+
2. Install dependencies: `npm ci`
3. Build the project: `npm run build`
4. Set environment variables: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
5. Deploy: `npx wrangler deploy`

---

## Monitoring and Debugging

### Viewing Logs

Stream real-time logs from your deployed worker:

```bash
# Stream all logs
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by specific path
wrangler tail --search "/api/"

# JSON output for parsing
wrangler tail --format json

# Tail specific environment
wrangler tail --env staging
```

### Adding Logging

Use console methods in your worker code:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log('Request received:', request.url)
    console.info('Processing request')
    console.warn('Deprecated endpoint used')
    console.error('Something went wrong')

    // Structured logging
    console.log(JSON.stringify({
      level: 'info',
      message: 'Request processed',
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    }))

    return new Response('OK')
  }
}
```

### Metrics and Analytics

Access Workers analytics in the Cloudflare dashboard:
- Request count and success rate
- CPU time utilization
- Bandwidth usage
- Geographic distribution
- Error rates

For custom metrics, use the Analytics Engine:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now()

    // Your worker logic
    const response = await handleRequest(request)

    // Record custom metric
    env.ANALYTICS?.writeDataPoint({
      blobs: [request.url, request.method],
      doubles: [Date.now() - start],
      indexes: [request.headers.get('cf-ray') || '']
    })

    return response
  }
}
```

### Error Tracking

Implement error boundaries and reporting:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env)
    } catch (error) {
      // Log error details
      console.error('Unhandled error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: request.url,
        method: request.method
      })

      // Return error response
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
```

### Health Checks

Implement health endpoints for monitoring:

```typescript
// Basic health check
if (url.pathname === '/health') {
  return Response.json({ status: 'ok', timestamp: Date.now() })
}

// Detailed health check
if (url.pathname === '/__health') {
  const health = {
    status: 'ok',
    timestamp: Date.now(),
    environment: env.ENVIRONMENT,
    dependencies: {
      database: await checkDatabase(env),
      cache: await checkCache(env),
      external: await checkExternalAPI()
    }
  }

  const allHealthy = Object.values(health.dependencies).every(d => d.healthy)
  return Response.json(health, { status: allHealthy ? 200 : 503 })
}
```

---

## Advanced Deployment Strategies

### Gradual Rollouts

Use Workers Deployments API for gradual rollouts:

```bash
# Create a new version without activating
wrangler versions upload

# List versions
wrangler versions list

# Deploy with percentage-based rollout
wrangler versions deploy <version-id> --percentage 10

# Gradually increase traffic
wrangler versions deploy <version-id> --percentage 50
wrangler versions deploy <version-id> --percentage 100
```

### Rollback

Quickly rollback to a previous version:

```bash
# List deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback

# Rollback to specific deployment
wrangler rollback --deployment-id <deployment-id>
```

### Blue-Green Deployments

For zero-downtime deployments with instant rollback capability:

1. **Deploy to alternate environment:**
   ```bash
   wrangler deploy --env blue  # or --env green
   ```

2. **Test the new deployment**

3. **Switch traffic** by updating DNS or route configuration

4. **Rollback** by switching back to the previous environment

### Deployment Health Checks

The workers.do platform includes deployment health checking via `packages/deployment`:

```typescript
import { DeploymentHealthChecker } from '@dotdo/deployment'

const healthChecker = new DeploymentHealthChecker({
  healthEndpoint: '/__health',
  timeout: 5000,
  retries: 3,
  latencyThreshold: 1000
})

// Pre-deployment check
const preCheck = await healthChecker.preDeploymentCheck(workerId)
if (!preCheck.canDeploy) {
  console.error('Cannot deploy:', preCheck.reason)
  process.exit(1)
}

// Post-deployment verification
const postCheck = await healthChecker.postDeploymentCheck(workerId, deploymentId)
if (postCheck.shouldRollback) {
  await triggerRollback()
}
```

---

## Troubleshooting

### Common Issues

#### "Error: Authentication required"

```bash
# Re-authenticate with Cloudflare
wrangler login

# Or set API token
export CLOUDFLARE_API_TOKEN="your-token"
```

#### "Durable Object not found"

Ensure migrations are configured in `wrangler.toml`:

```toml
[[migrations]]
tag = "v1"
new_classes = ["MyDurableObject"]
```

Then redeploy:

```bash
wrangler deploy
```

#### "Script size exceeds limit"

Cloudflare Workers have a 10MB limit (1MB for free tier). Reduce bundle size by:
- Tree-shaking unused dependencies
- Using dynamic imports
- Moving large assets to R2

#### "CPU time exceeded"

Workers have CPU time limits:
- Free tier: 10ms
- Paid: 50ms (bundled), 30s (unbound)

Optimize by:
- Caching responses
- Using Durable Objects for computation
- Offloading to queues

#### "Memory limit exceeded"

Workers have a 128MB memory limit. Reduce memory usage by:
- Streaming large responses
- Using Durable Objects for state
- Processing data in chunks

### Debug Checklist

1. **Check deployment status:**
   ```bash
   wrangler deployments status
   ```

2. **Verify secrets are set:**
   ```bash
   wrangler secret list
   ```

3. **Test locally first:**
   ```bash
   wrangler dev
   ```

4. **Check logs for errors:**
   ```bash
   wrangler tail --status error
   ```

5. **Verify route configuration:**
   ```bash
   wrangler route list
   ```

6. **Test with curl:**
   ```bash
   curl -v https://your-worker.workers.dev/health
   ```

### Getting Help

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [workers.do Repository Issues](https://github.com/dot-do/workers/issues)
- [Cloudflare Discord](https://discord.cloudflare.com/)

---

## Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `wrangler login` | Authenticate CLI |
| `wrangler dev` | Start local development |
| `wrangler deploy` | Deploy to production |
| `wrangler deploy --env staging` | Deploy to staging |
| `wrangler tail` | Stream live logs |
| `wrangler secret put NAME` | Add a secret |
| `wrangler secret list` | List secrets |
| `wrangler deployments list` | List deployments |
| `wrangler rollback` | Rollback deployment |
| `wrangler versions list` | List versions |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token for authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `WRANGLER_LOG` | Set to `debug` for verbose output |

### File Reference

| File | Purpose |
|------|---------|
| `wrangler.toml` | Worker configuration |
| `wrangler.jsonc` | Worker configuration (JSON format) |
| `.dev.vars` | Local development secrets |
| `package.json` | Dependencies and scripts |
| `.github/workflows/deploy.yml` | CI/CD workflow |
