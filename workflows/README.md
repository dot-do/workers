# Workflows Worker

Event-Driven Automation Platform - Zapier/Make.com alternative built entirely on Cloudflare infrastructure.

## Overview

This worker provides comprehensive workflow automation capabilities including:

- **Event Ingestion** - Collect and process events from multiple sources
- **Pattern Matching** - SQL-based CEP (Complex Event Processing), sequence detection, thresholds, anomalies
- **Workflow Execution** - Multi-step workflows with conditional branching, parallel execution, delays
- **Actions Library** - 20+ integrations (Email, SMS, Slack, CRM, Calendar, AI operations)
- **Queue Processing** - Async message handling with retries and dead letter queues

## Architecture

```
Event Ingestion (POST /events)
  ↓
Pattern Matching Engine
  ↓
Workflow Execution (Cloudflare Workflows)
  ↓
Actions Library (20+ integrations)
```

## Infrastructure

- **D1 Database**: `workflows-db` (89bb0573-79ac-4b68-a5c7-26f9d0a89251)
  - Tables: workflows, patterns, workflow_executions, integrations, action_audit_log, accounts, api_keys

- **KV Namespaces**:
  - `WORKFLOW_STATE` (5070c4f409aa420986e29764e01cc0bd) - Execution state
  - `CACHE` (a2866b73415449ee90e363b2f487dcba) - API response caching

- **Queues**:
  - `events` - Event buffering (batch size: 100, timeout: 30s)
  - `workflows` - Workflow execution queue (batch size: 10, timeout: 5s)
  - `events-dlq` - Dead letter queue for failed events
  - `workflows-dlq` - Dead letter queue for failed workflows

## API Endpoints

### Event Ingestion
- `POST /events` - Ingest single event
- `POST /events/batch` - Batch event ingestion (up to 100 events)
- `POST /events/query` - SQL queries on events

### Pattern Management
- `GET /patterns` - List patterns
- `POST /patterns` - Create pattern
- `GET /patterns/:id` - Get pattern
- `PATCH /patterns/:id` - Update pattern
- `DELETE /patterns/:id` - Delete pattern

### Workflow Management
- `GET /workflows` - List workflows
- `POST /workflows` - Create workflow
- `GET /workflows/:id` - Get workflow
- `PATCH /workflows/:id` - Update workflow
- `DELETE /workflows/:id` - Delete workflow
- `POST /workflows/:id/execute` - Execute workflow

### Monitoring
- `GET /monitoring/dashboard` - Dashboard metrics
- `GET /monitoring/executions` - Execution history
- `GET /monitoring/audit` - Action audit log

## Pattern Types

1. **Event Matching** - Simple event type + conditions
2. **SQL Patterns** - Complex event processing with SQL
3. **Sequence Detection** - Ordered/unordered event sequences
4. **Threshold Triggers** - Count, rate, or value thresholds
5. **Anomaly Detection** - Statistical outlier detection

## Workflow Steps

- **action** - Execute an action (email, API call, database operation)
- **condition** - Conditional branching
- **loop** - Iterate over data
- **parallel** - Execute steps in parallel
- **delay** - Wait before continuing
- **webhook** - Trigger external webhook
- **transform** - Transform data
- **ai** - AI operations (text generation, classification)

## Actions Library

### Communication
- send_email, send_sms, send_slack_message, send_webhook

### Data Operations
- db_query, http_request, kv_get, kv_set, r2_put, r2_get

### Integrations
- create_crm_record, update_crm_record, create_ticket, schedule_meeting

### AI Operations
- ai_text_generation, ai_sentiment_analysis, ai_named_entity_recognition

### Utilities
- transform_data, validate_data, log_event

## Environment Variables

```bash
ENVIRONMENT=production
MAX_WORKFLOW_STEPS=100
EVENT_RETENTION_DAYS=90
```

## Required Secrets

```bash
# Set via: wrangler secret put <NAME>
WEBHOOK_SECRET=<secret>
ENCRYPTION_KEY=<key>
RESEND_API_KEY=<key>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
SLACK_WEBHOOK_URL=<url>
HUBSPOT_API_KEY=<key>
LINEAR_API_KEY=<key>
GOOGLE_CALENDAR_TOKEN=<token>
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Example Workflow

**High-Value Signup Onboarding:**

1. Send welcome email
2. Notify sales team on Slack
3. Create CRM record
4. Wait 24 hours
5. Send getting started guide

**Cost**: ~$0.0001 per execution (97% cheaper than Zapier)

## Deployment

Deployed to:
- https://workflows.do/*
- https://automation.apis.do/*

## Source

Migrated from: `prototypes/workflow-automation/`

## Documentation

- **README.md** - This file
- **schema.sql** - Database schema
- **DEPLOYMENT.md** - Deployment guide (in prototype)
- **EXAMPLES.md** - Example workflows (in prototype)

---

**Version**: 1.0.0
**Status**: Production
**Deployed**: 2025-10-05
