/**
 * site.do - Database schema
 *
 * Drizzle ORM schema for website/landing page management
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/**
 * Core site entity
 */
export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain').unique(), // custom domain
  description: text('description'),
  tagline: text('tagline'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  theme: text('theme').default('default'),
  status: text('status').default('draft'), // draft, published, maintenance, archived
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
})

/**
 * Pages within a site
 */
export const pages = sqliteTable('pages', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  content: text('content'), // MDX/HTML content
  contentType: text('content_type').default('mdx'), // mdx, html, markdown
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),
  template: text('template').default('default'),
  isHomepage: integer('is_homepage', { mode: 'boolean' }).default(false),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  parentId: text('parent_id'), // for nested pages
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Blog posts
 */
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  contentType: text('content_type').default('mdx'),
  featuredImage: text('featured_image'),
  author: text('author'),
  authorId: text('author_id'),
  category: text('category'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),
  status: text('status').default('draft'), // draft, published, scheduled, archived
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  readTime: integer('read_time'), // minutes
  views: integer('views').default(0),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Media library
 */
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  filename: text('filename').notNull(),
  originalName: text('original_name'),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // bytes
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  altText: text('alt_text'),
  caption: text('caption'),
  width: integer('width'),
  height: integer('height'),
  folder: text('folder').default('/'),
  uploadedBy: text('uploaded_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * SEO settings per site
 */
export const seoSettings = sqliteTable('seo_settings', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id).unique(),
  defaultTitle: text('default_title'),
  titleTemplate: text('title_template').default('%s | {siteName}'),
  defaultDescription: text('default_description'),
  defaultOgImage: text('default_og_image'),
  twitterHandle: text('twitter_handle'),
  twitterCardType: text('twitter_card_type').default('summary_large_image'),
  googleSiteVerification: text('google_site_verification'),
  bingSiteVerification: text('bing_site_verification'),
  robotsTxt: text('robots_txt'),
  sitemapEnabled: integer('sitemap_enabled', { mode: 'boolean' }).default(true),
  canonicalUrl: text('canonical_url'),
  structuredData: text('structured_data', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Analytics - page views and events
 */
export const pageViews = sqliteTable('page_views', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  pageId: text('page_id'),
  postId: text('post_id'),
  path: text('path').notNull(),
  visitorId: text('visitor_id'),
  sessionId: text('session_id'),
  referrer: text('referrer'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  country: text('country'),
  city: text('city'),
  device: text('device'), // desktop, mobile, tablet
  browser: text('browser'),
  os: text('os'),
  duration: integer('duration'), // seconds on page
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Analytics aggregates by period
 */
export const analyticsAggregates = sqliteTable('analytics_aggregates', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  period: text('period').notNull(), // YYYY-MM-DD or YYYY-MM
  periodType: text('period_type').default('day'), // day, week, month
  pageViews: integer('page_views').default(0),
  uniqueVisitors: integer('unique_visitors').default(0),
  sessions: integer('sessions').default(0),
  avgDuration: real('avg_duration').default(0),
  bounceRate: real('bounce_rate').default(0),
  topPages: text('top_pages', { mode: 'json' }),
  topReferrers: text('top_referrers', { mode: 'json' }),
  topCountries: text('top_countries', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Form submissions
 */
export const formSubmissions = sqliteTable('form_submissions', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  formId: text('form_id').notNull(),
  formName: text('form_name'),
  pageId: text('page_id'),
  data: text('data', { mode: 'json' }).notNull(),
  email: text('email'), // extracted for convenience
  name: text('name'), // extracted for convenience
  status: text('status').default('new'), // new, read, replied, archived, spam
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  metadata: text('metadata', { mode: 'json' }),
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Navigation menus
 */
export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  location: text('location'), // header, footer, sidebar
  items: text('items', { mode: 'json' }).$type<MenuItem[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Activity log for site changes
 */
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  actorId: text('actor_id'),
  actorType: text('actor_type').default('user'), // user, system, ai
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Types
export interface MenuItem {
  id: string
  label: string
  url: string
  target?: '_blank' | '_self'
  children?: MenuItem[]
}
