# CDN Service - Content Delivery Network

A comprehensive content delivery network service that applies supply chain management concepts to digital content lifecycle, providing full traceability, provenance tracking, and compliance reporting.

## Overview

This service tracks digital content from **creation → approval → publishing → distribution → consumption**, capturing every step in an immutable event log with EPCIS-inspired metadata.

**Deployed URL:** https://cdn.drivly.workers.dev

## Features

### 1. EPCIS-Inspired Event Model

Every content lifecycle event captured with:
- **Event Type:** creation, edit, approval, publish, distribution, consumption, archive
- **Action:** observe, add, delete, modify
- **Business Step:** creating, reviewing, publishing (adapted for content)
- **Disposition:** in_progress, active, inactive
- **Location Context:** CMS, website, mobile app, social media

### 2. Provenance Tracking

Full attribution chain:
- Human creators and contributors
- AI models and tools used
- Edit history with diffs
- License propagation
- Copyright management

### 3. Multi-Channel Publishing

Distribute content to:
- Websites
- Mobile apps
- APIs
- Social media platforms
- Email newsletters
- Custom channels

### 4. Consumption Analytics

Track performance across channels:
- Views and unique viewers
- Time spent and completion rates
- Interactions (clicks, shares, comments)
- Device and geographic breakdown
- Referrer analysis

### 5. Content Graph

Relationship tracking:
- References between content
- Derivative works
- Translations
- Updates and supersessions
- Content recommendations
- Influence scoring

### 6. Compliance & Disclosure

GDPR and AI Act compliance:
- AI-generated content disclosure
- Human review requirements
- License constraints
- Attribution requirements
- Audit trail generation

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **API** | Hono (lightweight, fast) |
| **Database** | Cloudflare D1 (metadata + events) |
| **Cache** | Cloudflare KV (content caching) |
| **Storage** | Cloudflare R2 (content files) |
| **Analytics** | Analytics Engine (consumption tracking) |
| **Queues** | Cloudflare Queues (async processing) |

## Infrastructure

### Cloudflare Resources

- **D1 Database:** `cdn-cache-db` (ID: 0df8ed4b-98db-4569-9bfc-8271fb946a8f)
- **KV Namespace:** `cdn-cache` (ID: 45b6ccbc3c674bd696704f1c70e72195)
- **R2 Bucket:** `cdn-content`
- **Analytics Dataset:** `cdn_consumption`
- **Queues:** `cdn-events`, `cdn-events-dlq`

## API Endpoints

### Events
- `POST /events/creation` - Content created
- `POST /events/edit` - Content edited
- `POST /events/approval` - Content approved
- `POST /events/publish` - Content published
- `POST /events/distribution` - Content distributed to channel
- `POST /events/consumption` - Content consumed by user
- `GET /events/:contentId` - Get event history
- `GET /events/:contentId/timeline` - Get lifecycle timeline

### Provenance
- `POST /provenance` - Add provenance entry
- `GET /provenance/:contentId` - Get full provenance chain
- `POST /provenance/ai-disclosure` - Set AI disclosure
- `GET /provenance/:contentId/ai-disclosure` - Get AI disclosure
- `POST /provenance/license` - Set license
- `GET /provenance/:contentId/license` - Get license info
- `GET /provenance/:contentId/compliance` - Compliance report

### Distribution
- `POST /channels` - Register distribution channel
- `GET /channels` - List active channels
- `POST /distribution/schedule` - Schedule distribution
- `POST /distribution/publish` - Publish to channel
- `GET /distribution/:contentId` - Get distributions
- `GET /distribution/:contentId/metrics` - Distribution metrics

### Analytics
- `GET /analytics/:contentId` - Get consumption analytics
- `GET /analytics/:contentId/summary` - Analytics summary
- `GET /analytics/trending` - Trending content

### Graph
- `GET /graph/:contentId/relationships` - Get relationships
- `GET /graph/:contentId/related` - Find related content
- `GET /graph/:contentId/recommendations` - Recommendations
- `GET /graph/:contentId/lineage` - Content lineage
- `GET /graph/:contentId/influence` - Influence score
- `GET /graph/stale` - Find stale content

## Database Schema

10 core tables:
1. **content** - Content metadata and current state
2. **content_events** - EPCIS-style lifecycle events
3. **content_provenance** - Creator attribution chain
4. **distribution_channels** - Publishing channels
5. **content_distributions** - Channel-specific distributions
6. **content_consumption** - Aggregated analytics
7. **content_relationships** - Content graph
8. **approval_workflows** - Editorial workflows
9. **license_propagation** - License tracking
10. **ai_disclosure** - AI compliance data

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Deploy

```bash
# Deploy to production
pnpm deploy

# Apply database migrations
pnpm d1:migrations:remote
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Health check
curl https://cdn.drivly.workers.dev/
```

## Migration from Prototype

This service was migrated from `prototypes/content-delivery-pipeline/` on 2025-10-05.

**Key Changes:**
- Renamed from "content-supply-chain" to "cdn"
- Updated package name to `@dot-do/cdn`
- Provisioned production Cloudflare resources
- Applied database schema to production D1
- Deployed to production environment

## See Also

- **[workers/CLAUDE.md](../CLAUDE.md)** - Workers repository overview
- **[Root CLAUDE.md](../../CLAUDE.md)** - Multi-repo management
- **[prototypes/content-delivery-pipeline/](../../prototypes/content-delivery-pipeline/)** - Original prototype

## License

MIT
