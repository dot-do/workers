# site.do

> Ship beautiful websites in minutes, not months

You want to launch your landing page, blog, or product site. But you're stuck configuring hosting, fighting with CMS platforms, wiring up analytics, and building form handlers from scratch.

**You're a developer. Your time is worth more than this.**

## The Problem

Every developer shipping a website knows this pain:

- **Deployment complexity** - Configure hosting, CDN, SSL, domains... before writing a single line of content
- **CMS overhead** - WordPress is bloated, headless CMSes need a separate frontend, static sites lack dynamic features
- **Fragmented analytics** - Google Analytics is invasive, privacy-friendly alternatives need separate setup
- **Form handling nightmares** - Build a backend just to receive a contact form submission
- **Multi-site chaos** - Managing multiple sites means multiplying all these problems

You wanted to ship a website. Instead, you're managing infrastructure.

## The Solution

**site.do** is a Durable Object that gives you a complete website backend in one import. Content, SEO, analytics, forms - all with a clean API.

```typescript
import { Site } from 'site.do'

// Create and launch a site in seconds
const site = await siteClient.create({
  name: 'Acme',
  slug: 'acme',
  domain: 'acme.com'
})

await siteClient.publish(site.id)

// Full dashboard in one call
const dashboard = await siteClient.getDashboard(site.id)
// {
//   site: { name, status, domain },
//   content: { pages: 12, posts: 45 },
//   analytics: { pageViews: 10420, uniqueVisitors: 3200 },
//   forms: { newCount: 8 }
// }
```

## 3 Simple Steps

### 1. Install

```bash
npm install site.do
```

### 2. Create Your Site

```typescript
import { Site } from 'site.do'

const site = await siteClient.create({
  name: 'My Startup',
  slug: 'my-startup',
  tagline: 'Build faster, ship sooner',
})

// Add your landing page
await siteClient.createPage({
  siteId: site.id,
  slug: 'home',
  title: 'Welcome',
  content: `# Build faster, ship sooner\n\nYour product description here.`,
  isHomepage: true,
})
```

### 3. Go Live

```typescript
// Configure SEO
await siteClient.updateSeoSettings(site.id, {
  defaultTitle: 'My Startup - Build faster',
  defaultDescription: 'The platform for shipping products faster.',
  twitterHandle: '@mystartup',
})

// Publish everything
await siteClient.publishPage(pageId)
await siteClient.publish(site.id)

// Your site is live at my-startup.site.do (or your custom domain)
```

## Before & After

| Before site.do | After site.do |
|----------------|---------------|
| Days configuring hosting, CDN, SSL | One API call: `create()` then `publish()` |
| Separate CMS + frontend + database | Single Durable Object with SQLite |
| Google Analytics tracking scripts | Built-in privacy-friendly analytics |
| Custom backend for form handling | `submitForm()` - done |
| Complex multi-site infrastructure | Each site is a Durable Object instance |
| Manual sitemap generation | `generateSitemap()` returns everything |
| Scattered content across services | Pages, posts, media - one unified API |

## Full API

### Site Management

```typescript
// Create, update, publish sites
await site.create({ name, slug, domain })
await site.update(id, { tagline: 'New tagline' })
await site.publish(id)
await site.unpublish(id)
await site.archive(id)

// Query sites
await site.get(id)
await site.getBySlug('acme')
await site.getByDomain('acme.com')
await site.list()
```

### Content Management

```typescript
// Pages
await site.createPage({ siteId, slug, title, content, isHomepage })
await site.updatePage(id, { content: 'Updated content' })
await site.publishPage(id)
await site.listPages(siteId)
await site.getPageBySlug(siteId, 'about')

// Blog Posts
await site.createPost({ siteId, slug, title, content, category, tags })
await site.updatePost(id, { content: 'Updated post' })
await site.publishPost(id)
await site.schedulePost(id, futureDate)
await site.listPosts(siteId, { publishedOnly: true, category: 'updates' })
await site.getFeaturedPosts(siteId)

// Media Library
await site.addMedia({ siteId, filename, url, mimeType, size })
await site.listMedia(siteId, folder)
await site.updateMedia(id, { altText: 'Description' })
```

### SEO

```typescript
// Configure site-wide SEO
await site.updateSeoSettings(siteId, {
  defaultTitle: 'My Site',
  titleTemplate: '%s | My Site',
  defaultDescription: 'Site description',
  twitterHandle: '@handle',
  googleSiteVerification: 'verification-code',
})

// Auto-generate sitemap
const sitemap = await site.generateSitemap(siteId)
// [{ url: 'https://...', lastmod: Date, priority: 1.0 }, ...]
```

### Analytics

```typescript
// Track page views (automatic with site.do hosting)
await site.trackPageView({
  siteId,
  path: '/pricing',
  visitorId: 'anon_123',
  referrer: 'google.com',
  device: 'mobile',
})

// Get analytics summary
const analytics = await site.getAnalytics(siteId, startDate, endDate)
// { pageViews, uniqueVisitors, topPages, topReferrers }

// Real-time stats
const liveVisitors = await site.getRealtimeVisitors(siteId)
```

### Form Handling

```typescript
// Receive submissions
await site.submitForm({
  siteId,
  formId: 'contact',
  formName: 'Contact Form',
  data: { name: 'John', email: 'john@example.com', message: 'Hello!' },
  email: 'john@example.com',
})

// Manage submissions
await site.listFormSubmissions(siteId, { status: 'new' })
await site.updateFormSubmission(id, { status: 'replied' })
const stats = await site.getFormSubmissionStats(siteId)
```

### Navigation Menus

```typescript
// Create menus
await site.setMenu(siteId, 'main', {
  name: 'Main Navigation',
  location: 'header',
  items: [
    { id: '1', label: 'Home', url: '/' },
    { id: '2', label: 'Pricing', url: '/pricing' },
    { id: '3', label: 'Blog', url: '/blog' },
  ],
})

// Get menus
await site.getMenu(siteId, 'main')
await site.getMenuByLocation(siteId, 'header')
```

### Dashboard

```typescript
// Everything in one call
const dashboard = await site.getDashboard(siteId)
// {
//   site: { ... },
//   content: { pages: {...}, posts: {...} },
//   seo: { ... },
//   analytics: { pageViews, uniqueVisitors, realtimeVisitors, ... },
//   forms: { stats, newCount },
//   recentActivity: [ ... ]
// }
```

## Built on dotdo

site.do extends the [dotdo](https://github.com/workers-do/workers/tree/main/objects/do) base class, inheriting:

- **SQLite storage** - Full SQL queries, ACID transactions, zero latency
- **Multi-transport** - REST, Workers RPC, WebSocket, MCP
- **Agentic capabilities** - Natural language via the `do()` method
- **Global distribution** - Durable Object routing to nearest region

```typescript
// REST API
POST /sites { "name": "Acme", "slug": "acme" }
GET /sites/acme/pages
POST /sites/acme/forms/contact/submissions

// Workers RPC
const site = await env.SITE.get('acme')
await site.getDashboard()

// AI Agent
await env.SITE.do("Create a new blog post about our product launch")
```

## Why site.do?

| Feature | Benefit |
|---------|---------|
| **Durable Object** | Strong consistency, instant global routing, survives restarts |
| **SQLite storage** | Full SQL queries, ACID transactions, zero cold start |
| **Type-safe** | Full TypeScript types for schema and API |
| **Privacy-first analytics** | No cookies, no tracking scripts, GDPR-friendly |
| **Platform integration** | Works seamlessly with llm.do, payments.do, business.do |

## Part of workers.do

site.do is part of the [workers.do](https://workers.do) platform for building Autonomous Startups:

- **[dotdo](../do)** - Base Durable Object with AI agent
- **[business.do](../business)** - Business entity management
- **[llm.do](https://llm.do)** - AI gateway with billing
- **[payments.do](https://payments.do)** - Stripe Connect integration

## Get Started

```bash
npm install site.do
```

Stop fighting infrastructure. Start shipping websites.

[Read the docs](https://site.do) | [View on GitHub](https://github.com/workers-do/workers/tree/main/objects/site)
