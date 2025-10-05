# Quick Start Guide

Get the ML Model Registry POC running in 5 minutes.

## Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account
- Wrangler CLI installed (`pnpm add -g wrangler`)

## Installation

```bash
# Clone or navigate to the POC directory
cd tmp/cloudflare-data-poc-ml-registry

# Install dependencies
pnpm install

# Login to Cloudflare (if not already)
wrangler login
```

## Setup Cloudflare Resources

```bash
# 1. Create D1 database
wrangler d1 create ml-registry-db

# Copy the database_id from output and update wrangler.jsonc
# Replace "local-ml-registry" with your actual database_id

# 2. Run migrations
wrangler d1 migrations apply ml-registry-db --local    # Local
wrangler d1 migrations apply ml-registry-db            # Production

# 3. Create R2 bucket
wrangler r2 bucket create ml-model-artifacts

# 4. Create Vectorize index
wrangler vectorize create ml-model-embeddings --dimensions=768 --metric=cosine
```

## Run Locally

```bash
# Start development server
pnpm dev

# Server runs at http://localhost:8787
```

## Test the API

```bash
# Health check
curl http://localhost:8787

# Register a model
curl -X POST http://localhost:8787/api/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Turbo",
    "description": "OpenAI GPT-4 for code generation",
    "metadata": {
      "framework": "openai",
      "model_type": "text-generation",
      "provider": "openai",
      "model_name": "gpt-4-turbo-preview"
    },
    "tags": ["production", "code-generation"],
    "created_by": "test-user",
    "version": "1.0.0"
  }'

# Get the model_id from response, then:

# Get model details
curl http://localhost:8787/api/models/{model_id}

# Track inference request
curl -X POST http://localhost:8787/api/vibe/track \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "{model_id}",
    "provider": "openai",
    "model_name": "gpt-4-turbo-preview",
    "latency_ms": 1200,
    "tokens_input": 500,
    "tokens_output": 150,
    "cost_usd": 0.03,
    "quality_score": 9.2
  }'

# Get cost summary
curl http://localhost:8787/api/vibe/{model_id}/costs

# Get ROI analysis
curl http://localhost:8787/api/vibe/{model_id}/roi
```

## Deploy to Production

```bash
# Deploy to Cloudflare Workers
pnpm deploy

# Your API will be available at:
# https://ml-registry-poc.{your-subdomain}.workers.dev
```

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm test             # Run tests (when implemented)

# Database
pnpm db:migrate       # Run migrations locally
pnpm db:migrate:prod  # Run migrations in production

# Deployment
pnpm deploy           # Deploy to production

# Wrangler
wrangler d1 execute ml-registry-db --command "SELECT * FROM things LIMIT 10"
wrangler r2 object list ml-model-artifacts
wrangler tail ml-registry-poc  # View logs
```

## Example Workflow

```bash
# 1. Register models
MODEL_GPT4=$(curl -s -X POST http://localhost:8787/api/models \
  -H "Content-Type: application/json" \
  -d '{"name":"GPT-4","metadata":{"provider":"openai","model_name":"gpt-4"},"version":"1.0.0"}' \
  | jq -r '.model.id')

MODEL_CLAUDE=$(curl -s -X POST http://localhost:8787/api/models \
  -H "Content-Type: application/json" \
  -d '{"name":"Claude 3","metadata":{"provider":"anthropic","model_name":"claude-3"},"version":"1.0.0"}' \
  | jq -r '.model.id')

# 2. Track some requests
for i in {1..5}; do
  curl -s -X POST http://localhost:8787/api/vibe/track \
    -H "Content-Type: application/json" \
    -d "{\"model_id\":\"$MODEL_GPT4\",\"provider\":\"openai\",\"model_name\":\"gpt-4\",\"latency_ms\":1200,\"tokens_input\":500,\"tokens_output\":150,\"cost_usd\":0.03,\"quality_score\":9.2}"
    
  curl -s -X POST http://localhost:8787/api/vibe/track \
    -H "Content-Type: application/json" \
    -d "{\"model_id\":\"$MODEL_CLAUDE\",\"provider\":\"anthropic\",\"model_name\":\"claude-3\",\"latency_ms\":900,\"tokens_input\":500,\"tokens_output\":180,\"cost_usd\":0.025,\"quality_score\":9.7}"
done

# 3. Compare models
curl -s -X POST http://localhost:8787/api/vibe/compare \
  -H "Content-Type: application/json" \
  -d "{\"experiment_id\":\"test-001\",\"model_ids\":[\"$MODEL_GPT4\",\"$MODEL_CLAUDE\"]}" \
  | jq '.models[] | {model_name, avg_quality, avg_latency, total_cost}'

# 4. Request approval
APPROVAL_ID=$(curl -s -X POST http://localhost:8787/api/governance/approvals \
  -H "Content-Type: application/json" \
  -d "{\"model_id\":\"$MODEL_GPT4\",\"requested_by\":\"eng-team\",\"check_types\":[\"gdpr\",\"ai_act\"]}" \
  | jq -r '.id')

# 5. Review approval
curl -s -X POST http://localhost:8787/api/governance/approvals/$APPROVAL_ID/review \
  -H "Content-Type: application/json" \
  -d '{"reviewed_by":"compliance-team","approved":true,"notes":"Approved"}' \
  | jq

# 6. Promote to production
curl -s -X POST http://localhost:8787/api/models/$MODEL_CLAUDE/promote/1.0.0 | jq
```

## Troubleshooting

**Database not found:**
- Make sure you ran `wrangler d1 create` and updated `wrangler.jsonc` with the correct `database_id`
- Run migrations: `wrangler d1 migrations apply ml-registry-db`

**R2 bucket not found:**
- Create bucket: `wrangler r2 bucket create ml-model-artifacts`
- Bucket name must match `wrangler.jsonc`

**Vectorize index not found:**
- Create index: `wrangler vectorize create ml-model-embeddings --dimensions=768 --metric=cosine`

**Worker fails to start:**
- Check `wrangler tail` for errors
- Verify all bindings in `wrangler.jsonc` are correct
- Make sure you're logged in: `wrangler login`

## Next Steps

1. Read the [README.md](./README.md) for full documentation
2. Explore the [Graph Schema](./GRAPH_SCHEMA.md)
3. Review the [Implementation Summary](../notes/2025-10-03-ml-registry-governance-poc.md)
4. Run the example workflow in [examples/model-lifecycle.ts](./examples/model-lifecycle.ts)
5. Integrate with your AI Gateway
6. Build a frontend dashboard

## Resources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Hono Framework](https://hono.dev/)
