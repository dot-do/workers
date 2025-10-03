# SEO Schema Generator Worker

Schema.org JSON-LD structured data generator for SEO optimization.

## Features

- **20+ Schema Types** - Organization, Article, HowTo, FAQ, Product, etc.
- **Validation** - Built-in schema validation
- **Caching** - KV-based caching for performance
- **Batch Generation** - Generate multiple schemas at once
- **Type-Safe** - Full TypeScript support

## API Endpoints

### HTTP API (Hono)

```bash
# Generate single schema
POST /generate
{
  "schemaType": "Organization",
  "data": { "name": "Example Corp", "url": "https://example.com" },
  "validate": true,
  "minify": false
}

# Batch generate
POST /batch
[
  { "schemaType": "Organization", "data": {...} },
  { "schemaType": "Article", "data": {...} }
]

# Validate schema
POST /validate
{ "@context": "https://schema.org", "@type": "Organization", ... }

# List templates
GET /templates

# Shorthand endpoints
POST /organization
POST /article
POST /howto
POST /faq
POST /product
POST /breadcrumb
```

### RPC Methods (Service Bindings)

```typescript
// Generate specific schema types
await env.SEO_SCHEMA.generateOrganization(data)
await env.SEO_SCHEMA.generateArticle(data)
await env.SEO_SCHEMA.generateHowTo(data)
await env.SEO_SCHEMA.generateFAQ(data)
await env.SEO_SCHEMA.generateProduct(data)
await env.SEO_SCHEMA.generateBreadcrumb(data)

// Validate schema
await env.SEO_SCHEMA.validateSchema(schema)

// Generate with options
await env.SEO_SCHEMA.generate({
  schemaType: 'Article',
  data: {...},
  validate: true,
  minify: false
})

// Batch generate
await env.SEO_SCHEMA.batchGenerate([...options])
```

## Supported Schema Types

- **Organization** - Company/brand information
- **Article** - Blog posts, articles, news
- **TechArticle** - Technical tutorials
- **BlogPosting** - Blog posts
- **HowTo** - Step-by-step guides
- **FAQPage** - FAQ sections
- **Product** - Product information
- **LocalBusiness** - Local business info
- **BreadcrumbList** - Navigation breadcrumbs
- **SoftwareApplication** - Software/app info
- **Person** - Author/person info
- **Review** - Product/service reviews
- And 10+ more...

## Configuration

**wrangler.jsonc:**
- `SCHEMA_CACHE` - KV namespace for caching
- `SCHEMA_QUEUE` - Queue for async generation
- `DB` - Service binding for database

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

## Integration

**Service Binding:**
```jsonc
{
  "services": [
    { "binding": "SEO_SCHEMA", "service": "seo-schema" }
  ]
}
```

**Usage:**
```typescript
// Generate Organization schema
const orgSchema = await env.SEO_SCHEMA.generateOrganization({
  name: 'Example Corp',
  url: 'https://example.com',
  logo: 'https://example.com/logo.png'
})

// Generate Article schema
const articleSchema = await env.SEO_SCHEMA.generateArticle({
  headline: 'How to Use AI for SEO',
  datePublished: '2025-01-01',
  author: {
    '@type': 'Person',
    name: 'John Doe'
  }
})

// Add to HTML
html += `<script type="application/ld+json">${articleSchema}</script>`
```

## Related

- **Types:** `@dot-do/seo-types` package
- **Issue:** #33
