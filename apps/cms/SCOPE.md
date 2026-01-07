# CMS.do / Content.do - Headless CMS Rewrite Scope

## Executive Summary

A Cloudflare Workers-native headless CMS platform that combines the best features of Contentful, Sanity, Strapi, Payload, Directus, and Builder.io into an edge-first, multi-tenant content management system.

**Primary Domain**: `cms.do` (management) / `content.do` (delivery API)
**Package**: `cms.do` / `content.do`
**Category**: Content Management
**Priority**: P1

---

## Platform Research Summary

### 1. Contentful - Enterprise Headless CMS

**Core Value Proposition**: API-first, cloud-native headless CMS with enterprise-grade content infrastructure.

**Key Features**:
- **Content Delivery API (CDA)**: Read-only, globally distributed CDN delivery
- **Content Preview API**: Delivers draft content for editor previews
- **Content Management API**: Read-write API with migration script support
- **Images API**: CDN-backed transformations (resize, crop, format conversion, 4000px max)
- **GraphQL Content API**: Full equivalent to REST for both delivery and preview
- **Flexible Content Modeling**: Custom content types, fields, relationships, reusable components
- **Version Control**: Content versioning with history and rollback

**Architecture Insights**:
- Decouples content storage from presentation
- JSON data delivery via REST or GraphQL
- CDN caching with URL-based image transformations
- Asset size limit: 100MB (images only get transformations)

**Sources**: [Contentful Docs](https://www.contentful.com/developers/docs/), [Bejamas Review](https://bejamas.com/hub/headless-cms/contentful)

---

### 2. Sanity - Real-Time CMS

**Core Value Proposition**: Real-time collaborative content platform with GROQ query language and live preview.

**Key Features**:
- **Content Lake**: Low-latency queries with real-time data syncing
- **GROQ Query Language**: Graph-relational queries for deeply nested structures
- **Real-Time Collaboration**: Multiple editors working simultaneously without conflicts
- **Image Pipeline**: On-the-fly transformations via URL parameters (auto-format, resize, crop, blur)
- **Customizable Studio**: React-based admin UI with App SDK
- **Live CDN**: Assets served globally with indefinite caching based on content hashes

**Architecture Insights**:
- Content hashes for immutable asset URLs
- WebSocket subscriptions for real-time updates
- Server-side transformations before delivery
- Predefined srcsets recommended for CDN cache efficiency

**Sources**: [Sanity Docs](https://www.sanity.io/docs), [Pagepro Guide](https://pagepro.co/blog/what-is-sanity/)

---

### 3. Strapi - Open-Source Headless CMS

**Core Value Proposition**: 100% JavaScript/TypeScript, self-hosted, fully customizable developer-first CMS.

**Key Features**:
- **Dual API Support**: REST and GraphQL auto-generated for every content type
- **Document Service API** (v5): Improved response formats
- **Dynamic Zones**: Flexible page slices and reusable sections
- **Native Internationalization**: Multi-language content from unified interface
- **Custom Roles**: Role-based permissions in free tier
- **Multi-Database**: PostgreSQL, MySQL, MariaDB, SQLite support

**Architecture Insights**:
- OpenAPI specification for auto-generated docs
- Population rules require explicit fragments in v5
- Self-hosted or Strapi Cloud deployment
- TypeScript-first with official typings

**Sources**: [Strapi.io](https://strapi.io/five), [GitHub](https://github.com/strapi/strapi)

---

### 4. Payload CMS - Code-First CMS

**Core Value Proposition**: Next.js native, TypeScript-first CMS that installs directly in your `/app` folder.

**Key Features**:
- **Code-First Philosophy**: Define everything in TypeScript (no admin panel schema editing)
- **Local API**: Direct database interaction, bypassing network latency
- **20+ Field Types**: Rich text, relationships, arrays, blocks, custom fields
- **Built-in Auth**: Registration, email verification, login, password reset
- **Deep Access Control**: Fine-grained permissions at field level
- **Serverless Ready**: One-click deploy to Vercel, Cloudflare (Workers + D1 + R2)

**Architecture Insights**:
- PostgreSQL and MongoDB support
- REST and GraphQL APIs auto-generated
- Localization and webhooks built-in
- Full-stack TypeScript app framework

**Sources**: [Payload CMS](https://payloadcms.com/), [GitHub](https://github.com/payloadcms/payload)

---

### 5. Directus - Data Platform

**Core Value Proposition**: Instant REST and GraphQL APIs from any SQL database with a beautiful no-code admin.

**Key Features**:
- **Database Wrapper**: Introspects existing schemas, no migration required
- **Dual APIs**: REST + GraphQL with WebSocket real-time support
- **Page Builder**: Many-to-Any relationships for component-based pages
- **Live Preview**: See changes before publishing without rebuilds
- **Flows Module**: Event-driven automation and data processing
- **Extensions SDK**: Custom modules, interfaces, API endpoints

**Architecture Insights**:
- Works with PostgreSQL, MySQL, SQLite, MariaDB, MS-SQL, CockroachDB, OracleDB
- Vue.js admin interface (white-label capable)
- BSL 1.1 license (free under $5M revenue)
- On-prem or Directus Cloud ($15/month)

**Sources**: [Directus.io](https://directus.io), [GitHub](https://github.com/directus/directus)

---

### 6. Builder.io - Visual Headless CMS

**Core Value Proposition**: Drag-and-drop visual editor with headless CMS backend for marketers and developers.

**Key Features**:
- **Visual Editor**: True no-code page building with component library
- **Framework Agnostic**: React, Vue, Angular, Svelte, Qwik support
- **A/B Testing**: Built-in experimentation and personalization
- **Edge Delivery**: All content served from edge, server-side or static rendering
- **Composable Content Hub**: API-first architecture for omnichannel delivery
- **E-Commerce Focus**: Shopify, BigCommerce integrations

**Architecture Insights**:
- Small, optimized SDKs for each framework
- Real-time preview during editing
- Visual blocks map to structured data
- Focus on conversion optimization

**Sources**: [Builder.io](https://www.builder.io/), [Knowledge Center](https://www.builder.io/m/knowledge-center/visual-headless-cms)

---

## Cloudflare Workers Rewrite Architecture

### Domain Structure

```
cms.do                    # Content Management (Admin API)
content.do                # Content Delivery (Public API)
assets.do                 # Asset delivery from R2 (or use images.do)
```

### High-Level Architecture

```
cms.do / content.do
├── Content API (edge-cached, global delivery)
│   ├── REST API (/api/v1/content/:type/:id)
│   ├── GraphQL API (/graphql)
│   └── GROQ-like Query Language (/query)
├── Asset Pipeline (R2 + Image Transformations)
│   ├── Upload to R2
│   ├── On-the-fly transformations (resize, crop, format)
│   └── CDN caching with content-hash URLs
├── Content Modeling (D1)
│   ├── Content Types (schema definitions)
│   ├── Fields (rich text, media, references)
│   └── Relationships (one-to-many, many-to-many)
├── Preview/Draft Mode
│   ├── Preview tokens for draft content
│   ├── Live preview via WebSocket
│   └── Scheduled publishing
├── Webhooks
│   ├── Content lifecycle events
│   ├── Cache invalidation triggers
│   └── External integrations
└── Admin UI (React-based Studio)
    ├── Content Editor
    ├── Media Library
    ├── Schema Builder
    └── User/Role Management
```

### Durable Objects Architecture

```typescript
// Core Durable Objects
export class ContentTypeDO extends DurableObject<Env> {
  // Schema definitions, field configurations
  // One per content type per tenant
}

export class ContentEntryDO extends DurableObject<Env> {
  // Individual content entries
  // Handles versioning, drafts, localization
}

export class AssetDO extends DurableObject<Env> {
  // Asset metadata and R2 coordination
  // Transformation cache management
}

export class TenantDO extends DurableObject<Env> {
  // Tenant configuration, API keys
  // Multi-tenant isolation
}

export class WebhookDO extends DurableObject<Env> {
  // Webhook delivery and retry logic
  // Event aggregation
}

export class PreviewSessionDO extends DurableObject<Env> {
  // Preview token management
  // Live preview WebSocket connections
}
```

### Storage Strategy

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Content Schemas | D1 | Relational, queried frequently |
| Content Entries | D1 + SQLite in DO | Fast queries, versioning |
| Draft Content | SQLite in DO | Session-local, real-time |
| Published Content | D1 + Cache API | Global reads, cache-first |
| Assets (files) | R2 | Object storage, CDN delivery |
| Asset Metadata | D1 | Fast lookups, relationships |
| Transformations | R2 (cached) | Pre-computed, immutable |
| Webhooks Queue | Queues | Reliable delivery |

---

## Key Features Implementation

### 1. Content Modeling

```typescript
// Schema Definition (TypeScript-first like Payload)
import { defineContentType, fields } from 'cms.do'

export const BlogPost = defineContentType({
  name: 'blog_post',
  fields: {
    title: fields.text({ required: true, localized: true }),
    slug: fields.slug({ from: 'title' }),
    content: fields.richText({
      blocks: ['paragraph', 'heading', 'image', 'code'],
      localized: true
    }),
    author: fields.relationship({
      to: 'author',
      type: 'many-to-one'
    }),
    tags: fields.relationship({
      to: 'tag',
      type: 'many-to-many'
    }),
    featuredImage: fields.media({
      accept: ['image/*'],
      transforms: ['thumbnail', 'hero']
    }),
    publishedAt: fields.datetime(),
    status: fields.select({
      options: ['draft', 'review', 'published', 'archived'],
      default: 'draft'
    })
  },
  hooks: {
    beforePublish: async (entry) => {
      // Validate, transform, etc.
    },
    afterPublish: async (entry) => {
      // Trigger webhooks, invalidate cache
    }
  }
})
```

### 2. Content Delivery API

```typescript
// REST API
GET /api/v1/content/blog_post?locale=en&status=published
GET /api/v1/content/blog_post/:id?populate=author,tags
GET /api/v1/content/blog_post/:id/preview?token=xxx

// GraphQL
query {
  blogPosts(where: { status: "published" }, locale: "en") {
    title
    content
    author { name avatar }
  }
}

// GROQ-like Query (inspired by Sanity)
*[_type == "blog_post" && status == "published"] {
  title,
  "authorName": author->name,
  "tagNames": tags[]->name
}
```

### 3. Asset Pipeline with R2

```typescript
// Upload flow
POST /api/v1/assets/upload
  -> Generate content hash
  -> Store original in R2: /originals/{hash}/{filename}
  -> Create metadata in D1
  -> Return asset ID + CDN URL

// Transformation flow (on-demand)
GET /assets/{id}/w:800,h:600,f:webp,q:80
  -> Check R2 cache: /transformed/{hash}/w800-h600-webp-q80
  -> If miss: transform via Cloudflare Images API
  -> Store in R2 cache
  -> Return with long cache headers

// URL Structure (content-hash for cache busting)
https://assets.content.do/{tenant}/{hash}/image.jpg
https://assets.content.do/{tenant}/{hash}/w:400,f:avif/image.jpg
```

### 4. Cache Invalidation Strategy

```typescript
// Multi-layer caching with granular invalidation

// Layer 1: Edge Cache (Cache API)
// - Cache by content type + ID + version
// - Use cache tags for bulk invalidation

// Layer 2: CDN Cache (Cloudflare)
// - Purge by URL or cache tag on publish

// Layer 3: R2 Transformed Assets
// - Immutable (content-hash URLs)
// - Never invalidated, new hash on change

// Webhook-driven invalidation
contentEntry.on('publish', async (entry) => {
  // Purge specific entry cache
  await cache.delete(`content:${entry.type}:${entry.id}`)

  // Purge collection cache
  await cache.purgeByTag(`type:${entry.type}`)

  // Trigger external webhook for downstream invalidation
  await webhooks.send({
    event: 'content.published',
    payload: entry,
    targets: ['vercel-isr', 'netlify-odp', 'custom']
  })
})
```

### 5. Preview/Draft Mode

```typescript
// Preview token generation
POST /api/v1/preview/token
{
  "entryId": "blog_post:123",
  "expiresIn": "1h",
  "scope": ["read:draft", "read:published"]
}
// Returns: { token: "eyJ...", url: "https://preview.content.do/..." }

// Preview API (requires token)
GET /api/v1/content/blog_post/123?preview=true
Authorization: Bearer {preview_token}

// Live Preview WebSocket
ws://content.do/preview/live?token=xxx
// Receives real-time updates as editor makes changes

// Next.js Draft Mode Integration
// GET /api/draft?token=xxx&redirect=/blog/my-post
export async function GET(request: Request) {
  const token = request.nextUrl.searchParams.get('token')
  const valid = await cms.verifyPreviewToken(token)

  if (valid) {
    draftMode().enable()
    cookies().set('__previewData', token)
    redirect(request.nextUrl.searchParams.get('redirect'))
  }
}
```

### 6. Multi-Tenant Architecture

```typescript
// Tenant isolation via Durable Object namespacing
class ContentEntryDO extends DurableObject<Env> {
  // ID format: {tenant}:{contentType}:{entryId}

  async fetch(request: Request) {
    const tenantId = this.extractTenant(request)

    // All queries scoped to tenant
    const entries = await this.sql.exec(`
      SELECT * FROM entries
      WHERE tenant_id = ? AND type = ?
    `, [tenantId, contentType])

    return entries
  }
}

// API routing with tenant context
// https://{tenant}.cms.do/api/v1/content/...
// https://cms.do/api/v1/{tenant}/content/...
// Authorization: Bearer {api_key_with_tenant_scope}

// Tenant configuration
interface TenantConfig {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  limits: {
    contentTypes: number
    entries: number
    assets: { count: number, sizeBytes: number }
    apiCalls: number
  }
  features: {
    locales: string[]
    webhooks: boolean
    customDomain: boolean
    sso: boolean
  }
}
```

---

## SDK Design

### Client SDK

```typescript
// cms.do SDK
import { CMS } from 'cms.do'

const cms = CMS({
  endpoint: 'https://my-tenant.cms.do',
  // API key resolved via rpc.do environment system
})

// Content Operations
const posts = await cms.content('blog_post').find({
  where: { status: 'published' },
  populate: ['author', 'tags'],
  locale: 'en',
  limit: 10
})

const post = await cms.content('blog_post').findOne('slug-here')

// With preview
const draftPost = await cms.content('blog_post')
  .preview(previewToken)
  .findOne('123')

// Asset Operations
const asset = await cms.assets.upload(file, {
  folder: 'blog-images',
  alt: 'Featured image',
  transforms: ['thumbnail', 'hero']
})

const imageUrl = cms.assets.url(asset.id, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80
})
```

### Admin SDK

```typescript
// For building custom admin interfaces
import { CMSAdmin } from 'cms.do/admin'

const admin = CMSAdmin({
  endpoint: 'https://my-tenant.cms.do',
  adminKey: process.env.CMS_ADMIN_KEY
})

// Schema Management
await admin.contentTypes.create({
  name: 'blog_post',
  fields: { ... }
})

// Content Management
await admin.content('blog_post').create({
  title: 'New Post',
  status: 'draft'
})

await admin.content('blog_post').update('123', {
  status: 'published'
})

// Webhook Management
await admin.webhooks.create({
  url: 'https://my-app.com/webhooks/cms',
  events: ['content.published', 'content.deleted'],
  secret: 'webhook-secret'
})
```

---

## Implementation Phases

### Phase 1: Core Content API (MVP)
- [ ] Content type schema storage (D1)
- [ ] Basic CRUD for content entries
- [ ] REST API with filtering, pagination
- [ ] Single-tenant mode
- [ ] Basic asset upload to R2

### Phase 2: Content Modeling
- [ ] Rich field types (text, rich text, media, relationships)
- [ ] Content validation
- [ ] Localization support
- [ ] Version history

### Phase 3: Asset Pipeline
- [ ] Image transformations (via Cloudflare Images)
- [ ] Content-hash URLs for caching
- [ ] Media library with metadata
- [ ] Folder organization

### Phase 4: Preview & Publishing
- [ ] Draft/published states
- [ ] Preview tokens
- [ ] Scheduled publishing
- [ ] Publishing workflows

### Phase 5: Multi-Tenancy
- [ ] Tenant isolation
- [ ] API key management
- [ ] Usage limits and metering
- [ ] Custom domains

### Phase 6: Real-Time & Collaboration
- [ ] WebSocket subscriptions
- [ ] Live preview
- [ ] Real-time collaboration (Sanity-style)

### Phase 7: Admin UI
- [ ] React-based studio
- [ ] Content editor
- [ ] Schema builder
- [ ] Media library UI

### Phase 8: Advanced Features
- [ ] GraphQL API
- [ ] GROQ-like query language
- [ ] Webhooks with retry logic
- [ ] SSO integration

---

## Technical Considerations

### Image Transformation Strategy

**Option A: Cloudflare Images (Recommended)**
- Use `/cdn-cgi/image/` URL rewriting
- Automatic format negotiation (WebP, AVIF)
- Built-in CDN caching
- Cost: ~$5 per 100k transformations

**Option B: Workers-based Transformation**
- Use `@cloudflare/images` or custom Sharp/wasm
- More control, but higher compute costs
- 128MB Worker memory limit for large images

**Recommendation**: Cloudflare Images for production, Workers for custom transformations.

### Content Query Performance

```sql
-- Optimized D1 schema for content queries
CREATE TABLE content_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  locale TEXT DEFAULT 'en',
  status TEXT DEFAULT 'draft',
  data JSON NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE INDEX idx_entries_tenant_type ON content_entries(tenant_id, content_type);
CREATE INDEX idx_entries_status ON content_entries(status);
CREATE INDEX idx_entries_locale ON content_entries(locale);

-- Full-text search via FTS5
CREATE VIRTUAL TABLE content_fts USING fts5(
  id, title, content, tokenize='porter'
);
```

### Cache Strategy Matrix

| Content State | Cache Layer | TTL | Invalidation |
|---------------|-------------|-----|--------------|
| Published | Cache API + CDN | 24h | On publish/update |
| Draft | None | - | Real-time |
| Preview | Edge (short) | 5m | On token expiry |
| Assets (original) | R2 + CDN | Forever | Immutable |
| Assets (transformed) | R2 + CDN | Forever | New hash |

### Rate Limiting

```typescript
// Per-tenant rate limits
const limits = {
  free: { rpm: 60, burst: 10 },
  pro: { rpm: 1000, burst: 100 },
  enterprise: { rpm: 10000, burst: 1000 }
}

// Implemented via Durable Objects counter
class RateLimiterDO extends DurableObject<Env> {
  async checkLimit(tenantId: string): Promise<boolean> {
    const key = `${tenantId}:${this.getCurrentMinute()}`
    const count = await this.state.storage.get<number>(key) ?? 0
    const limit = await this.getTenantLimit(tenantId)

    if (count >= limit.rpm) {
      return false
    }

    await this.state.storage.put(key, count + 1)
    return true
  }
}
```

---

## Comparison with Competitors

| Feature | cms.do | Contentful | Sanity | Strapi | Payload | Directus |
|---------|--------|------------|--------|--------|---------|----------|
| Edge-native | Yes | CDN only | CDN only | No | No | No |
| Real-time | Yes | No | Yes | No | No | Yes |
| Code-first | Yes | No | Yes | No | Yes | No |
| Self-hosted | Yes | No | No | Yes | Yes | Yes |
| Image transforms | Yes | Yes | Yes | Via plugin | Via plugin | Yes |
| GraphQL | Yes | Yes | Yes | Yes | Yes | Yes |
| Multi-tenant | Yes | Spaces | Yes | Manual | Manual | Manual |
| TypeScript | Yes | SDK | Yes | Yes | Yes | Yes |
| Pricing | Usage | Per seat | Usage | Self-host | Self-host | BSL |

---

## Open Questions

1. **Domain naming**: `cms.do` vs `content.do` vs both?
   - Recommendation: Both - `cms.do` for admin, `content.do` for delivery API

2. **Visual editor**: Build or integrate?
   - Could integrate with Builder.io or build minimal visual editor

3. **Rich text format**: Portable Text (Sanity), Slate, ProseMirror?
   - Recommendation: Portable Text for structured content

4. **Localization approach**: Separate entries vs. localized fields?
   - Recommendation: Localized fields (Contentful/Sanity style)

5. **Versioning**: Full history vs. last N versions?
   - Recommendation: Configurable per content type

---

## Related Domains

| Domain | Role | Integration |
|--------|------|-------------|
| `images.do` | Image transformation | Asset pipeline |
| `mdx.do` | MDX rendering | Rich text output |
| `webhooks.do` | Webhook delivery | Event system |
| `storage.do` | Object storage | R2 abstraction |
| `payload.do` | Payload CMS compat | Migration path |
| `sites.do` | Static site hosting | JAMstack delivery |

---

## Success Metrics

1. **Content Delivery Latency**: < 50ms p95 globally
2. **Image Transformation**: < 200ms cold, < 10ms cached
3. **Admin UI Response**: < 100ms for CRUD operations
4. **Webhook Delivery**: < 1s from publish to delivery
5. **Uptime**: 99.99% availability

---

## References

- [Contentful API Docs](https://www.contentful.com/developers/docs/)
- [Sanity Documentation](https://www.sanity.io/docs)
- [Strapi v5 Documentation](https://strapi.io/documentation)
- [Payload CMS Docs](https://payloadcms.com/docs)
- [Directus Documentation](https://docs.directus.io/)
- [Builder.io Docs](https://www.builder.io/c/docs)
- [Cloudflare Images](https://developers.cloudflare.com/images/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cache Invalidation Strategies](https://focusreactive.com/granular-cache-invalidation-for-headless-cms/)
