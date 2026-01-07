/**
 * site.do - Ship beautiful websites with zero infrastructure
 *
 * A Durable Object for managing websites, landing pages, content,
 * SEO, analytics, and form submissions. Built on dotdo.
 */

import { DO } from 'dotdo'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, asc, gte, lte, isNull, sql } from 'drizzle-orm'
import * as schema from './schema'

// Re-export schema for convenience
export * from './schema'

// Type aliases for convenience
type SiteRecord = typeof schema.sites.$inferSelect
type NewSite = typeof schema.sites.$inferInsert
type Page = typeof schema.pages.$inferSelect
type NewPage = typeof schema.pages.$inferInsert
type Post = typeof schema.posts.$inferSelect
type NewPost = typeof schema.posts.$inferInsert
type Media = typeof schema.media.$inferSelect
type NewMedia = typeof schema.media.$inferInsert
type SeoSettings = typeof schema.seoSettings.$inferSelect
type PageView = typeof schema.pageViews.$inferSelect
type FormSubmission = typeof schema.formSubmissions.$inferSelect
type Menu = typeof schema.menus.$inferSelect

export interface SiteEnv {
  R2?: { put: (key: string, data: any) => Promise<any>; get: (key: string) => Promise<any> }
  LLM?: { complete: (opts: any) => Promise<any> }
  ANALYTICS?: { track: (event: string, data: any) => Promise<void> }
}

/**
 * Site Durable Object
 *
 * Manages a website with:
 * - Site profile and settings
 * - Page and post management
 * - Media library
 * - SEO configuration
 * - Analytics and visitor tracking
 * - Form submissions
 * - Multi-site management
 */
export class Site extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })
  declare env: SiteEnv

  // ===================
  // Site Management
  // ===================

  /**
   * Create a new site
   */
  async create(data: Omit<NewSite, 'id' | 'createdAt' | 'updatedAt'>): Promise<SiteRecord> {
    const id = crypto.randomUUID()
    const [site] = await this.db
      .insert(schema.sites)
      .values({ id, ...data })
      .returning()

    // Create default SEO settings
    await this.db.insert(schema.seoSettings).values({
      id: crypto.randomUUID(),
      siteId: id,
      defaultTitle: data.name,
      defaultDescription: data.description,
    })

    await this.log('site.created', 'site', id, { name: data.name, slug: data.slug })
    return site
  }

  /**
   * Get site by ID
   */
  async get(id: string): Promise<SiteRecord | undefined> {
    const [site] = await this.db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.id, id))
    return site
  }

  /**
   * Get site by slug
   */
  async getBySlug(slug: string): Promise<SiteRecord | undefined> {
    const [site] = await this.db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.slug, slug))
    return site
  }

  /**
   * Get site by custom domain
   */
  async getByDomain(domain: string): Promise<SiteRecord | undefined> {
    const [site] = await this.db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.domain, domain))
    return site
  }

  /**
   * Update site details
   */
  async update(id: string, data: Partial<NewSite>): Promise<SiteRecord> {
    const [site] = await this.db
      .update(schema.sites)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.sites.id, id))
      .returning()

    await this.log('site.updated', 'site', id, data)
    return site
  }

  /**
   * Publish a site
   */
  async publish(id: string): Promise<SiteRecord> {
    const [site] = await this.db
      .update(schema.sites)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.sites.id, id))
      .returning()

    await this.log('site.published', 'site', id)
    return site
  }

  /**
   * Unpublish a site (set to draft)
   */
  async unpublish(id: string): Promise<SiteRecord> {
    const [site] = await this.db
      .update(schema.sites)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(schema.sites.id, id))
      .returning()

    await this.log('site.unpublished', 'site', id)
    return site
  }

  /**
   * Archive a site (soft delete)
   */
  async archive(id: string): Promise<SiteRecord> {
    const [site] = await this.db
      .update(schema.sites)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.sites.id, id))
      .returning()

    await this.log('site.archived', 'site', id)
    return site
  }

  /**
   * Restore an archived site
   */
  async restore(id: string): Promise<SiteRecord> {
    const [site] = await this.db
      .update(schema.sites)
      .set({ status: 'draft', archivedAt: null, updatedAt: new Date() })
      .where(eq(schema.sites.id, id))
      .returning()

    await this.log('site.restored', 'site', id)
    return site
  }

  /**
   * List all sites
   */
  async list(includeArchived = false): Promise<SiteRecord[]> {
    if (includeArchived) {
      return this.db.select().from(schema.sites).orderBy(desc(schema.sites.createdAt))
    }
    return this.db
      .select()
      .from(schema.sites)
      .where(isNull(schema.sites.archivedAt))
      .orderBy(desc(schema.sites.createdAt))
  }

  // ===================
  // Page Management
  // ===================

  /**
   * Create a new page
   */
  async createPage(data: Omit<NewPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<Page> {
    const id = crypto.randomUUID()
    const [page] = await this.db
      .insert(schema.pages)
      .values({ id, ...data })
      .returning()

    await this.log('page.created', 'page', id, { title: data.title, slug: data.slug })
    return page
  }

  /**
   * Get page by ID
   */
  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await this.db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.id, id))
    return page
  }

  /**
   * Get page by slug within a site
   */
  async getPageBySlug(siteId: string, slug: string): Promise<Page | undefined> {
    const [page] = await this.db
      .select()
      .from(schema.pages)
      .where(and(eq(schema.pages.siteId, siteId), eq(schema.pages.slug, slug)))
    return page
  }

  /**
   * Get homepage for a site
   */
  async getHomepage(siteId: string): Promise<Page | undefined> {
    const [page] = await this.db
      .select()
      .from(schema.pages)
      .where(and(eq(schema.pages.siteId, siteId), eq(schema.pages.isHomepage, true)))
    return page
  }

  /**
   * Update a page
   */
  async updatePage(id: string, data: Partial<NewPage>): Promise<Page> {
    const [page] = await this.db
      .update(schema.pages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.pages.id, id))
      .returning()

    await this.log('page.updated', 'page', id, data)
    return page
  }

  /**
   * Publish a page
   */
  async publishPage(id: string): Promise<Page> {
    const [page] = await this.db
      .update(schema.pages)
      .set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.pages.id, id))
      .returning()

    await this.log('page.published', 'page', id)
    return page
  }

  /**
   * Delete a page
   */
  async deletePage(id: string): Promise<void> {
    await this.db.delete(schema.pages).where(eq(schema.pages.id, id))
    await this.log('page.deleted', 'page', id)
  }

  /**
   * List pages for a site
   */
  async listPages(siteId: string, publishedOnly = false): Promise<Page[]> {
    if (publishedOnly) {
      return this.db
        .select()
        .from(schema.pages)
        .where(and(eq(schema.pages.siteId, siteId), eq(schema.pages.isPublished, true)))
        .orderBy(asc(schema.pages.sortOrder))
    }
    return this.db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.siteId, siteId))
      .orderBy(asc(schema.pages.sortOrder))
  }

  // ===================
  // Post Management
  // ===================

  /**
   * Create a new blog post
   */
  async createPost(data: Omit<NewPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
    const id = crypto.randomUUID()

    // Calculate read time if content provided
    let readTime = data.readTime
    if (!readTime && data.content) {
      const wordCount = data.content.split(/\s+/).length
      readTime = Math.ceil(wordCount / 200) // ~200 words per minute
    }

    const [post] = await this.db
      .insert(schema.posts)
      .values({ id, ...data, readTime })
      .returning()

    await this.log('post.created', 'post', id, { title: data.title, slug: data.slug })
    return post
  }

  /**
   * Get post by ID
   */
  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await this.db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
    return post
  }

  /**
   * Get post by slug within a site
   */
  async getPostBySlug(siteId: string, slug: string): Promise<Post | undefined> {
    const [post] = await this.db
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.siteId, siteId), eq(schema.posts.slug, slug)))
    return post
  }

  /**
   * Update a post
   */
  async updatePost(id: string, data: Partial<NewPost>): Promise<Post> {
    // Recalculate read time if content updated
    let readTime = data.readTime
    if (data.content && !readTime) {
      const wordCount = data.content.split(/\s+/).length
      readTime = Math.ceil(wordCount / 200)
    }

    const [post] = await this.db
      .update(schema.posts)
      .set({ ...data, readTime, updatedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning()

    await this.log('post.updated', 'post', id, data)
    return post
  }

  /**
   * Publish a post
   */
  async publishPost(id: string): Promise<Post> {
    const [post] = await this.db
      .update(schema.posts)
      .set({ status: 'published', isPublished: true, publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning()

    await this.log('post.published', 'post', id)
    return post
  }

  /**
   * Schedule a post for future publication
   */
  async schedulePost(id: string, scheduledAt: Date): Promise<Post> {
    const [post] = await this.db
      .update(schema.posts)
      .set({ status: 'scheduled', scheduledAt, updatedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning()

    await this.log('post.scheduled', 'post', id, { scheduledAt })
    return post
  }

  /**
   * Increment post view count
   */
  async incrementPostViews(id: string): Promise<Post> {
    const [post] = await this.db
      .update(schema.posts)
      .set({ views: sql`${schema.posts.views} + 1` })
      .where(eq(schema.posts.id, id))
      .returning()
    return post
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    await this.db.delete(schema.posts).where(eq(schema.posts.id, id))
    await this.log('post.deleted', 'post', id)
  }

  /**
   * List posts for a site
   */
  async listPosts(
    siteId: string,
    options: { publishedOnly?: boolean; category?: string; limit?: number; offset?: number } = {}
  ): Promise<Post[]> {
    const { publishedOnly = false, category, limit = 20, offset = 0 } = options
    const conditions = [eq(schema.posts.siteId, siteId)]

    if (publishedOnly) {
      conditions.push(eq(schema.posts.isPublished, true))
    }
    if (category) {
      conditions.push(eq(schema.posts.category, category))
    }

    return this.db
      .select()
      .from(schema.posts)
      .where(and(...conditions))
      .orderBy(desc(schema.posts.publishedAt))
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(siteId: string, limit = 5): Promise<Post[]> {
    return this.db
      .select()
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.siteId, siteId),
          eq(schema.posts.isPublished, true),
          eq(schema.posts.isFeatured, true)
        )
      )
      .orderBy(desc(schema.posts.publishedAt))
      .limit(limit)
  }

  // ===================
  // Media Management
  // ===================

  /**
   * Add media to library
   */
  async addMedia(data: Omit<NewMedia, 'id' | 'createdAt'>): Promise<Media> {
    const id = crypto.randomUUID()
    const [media] = await this.db
      .insert(schema.media)
      .values({ id, ...data })
      .returning()

    await this.log('media.uploaded', 'media', id, { filename: data.filename, mimeType: data.mimeType })
    return media
  }

  /**
   * Get media by ID
   */
  async getMedia(id: string): Promise<Media | undefined> {
    const [media] = await this.db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, id))
    return media
  }

  /**
   * Update media metadata
   */
  async updateMedia(id: string, data: Partial<NewMedia>): Promise<Media> {
    const [media] = await this.db
      .update(schema.media)
      .set(data)
      .where(eq(schema.media.id, id))
      .returning()

    await this.log('media.updated', 'media', id, data)
    return media
  }

  /**
   * Delete media
   */
  async deleteMedia(id: string): Promise<void> {
    await this.db.delete(schema.media).where(eq(schema.media.id, id))
    await this.log('media.deleted', 'media', id)
  }

  /**
   * List media for a site
   */
  async listMedia(siteId: string, folder?: string, limit = 50, offset = 0): Promise<Media[]> {
    const conditions = [eq(schema.media.siteId, siteId)]
    if (folder) {
      conditions.push(eq(schema.media.folder, folder))
    }

    return this.db
      .select()
      .from(schema.media)
      .where(and(...conditions))
      .orderBy(desc(schema.media.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ===================
  // SEO Settings
  // ===================

  /**
   * Get SEO settings for a site
   */
  async getSeoSettings(siteId: string): Promise<SeoSettings | undefined> {
    const [seo] = await this.db
      .select()
      .from(schema.seoSettings)
      .where(eq(schema.seoSettings.siteId, siteId))
    return seo
  }

  /**
   * Update SEO settings
   */
  async updateSeoSettings(
    siteId: string,
    data: Partial<Omit<SeoSettings, 'id' | 'siteId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SeoSettings> {
    const [seo] = await this.db
      .update(schema.seoSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.seoSettings.siteId, siteId))
      .returning()

    await this.log('seo.updated', 'seo', siteId, data)
    return seo
  }

  /**
   * Generate sitemap data for a site
   */
  async generateSitemap(siteId: string): Promise<{ url: string; lastmod: Date; priority: number }[]> {
    const [pages, posts, site] = await Promise.all([
      this.listPages(siteId, true),
      this.listPosts(siteId, { publishedOnly: true }),
      this.get(siteId),
    ])

    const baseUrl = site?.domain ? `https://${site.domain}` : `https://${site?.slug}.site.do`
    const sitemap: { url: string; lastmod: Date; priority: number }[] = []

    // Add pages
    for (const page of pages) {
      sitemap.push({
        url: page.isHomepage ? baseUrl : `${baseUrl}/${page.slug}`,
        lastmod: page.updatedAt ?? page.createdAt ?? new Date(),
        priority: page.isHomepage ? 1.0 : 0.8,
      })
    }

    // Add posts
    for (const post of posts) {
      sitemap.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastmod: post.updatedAt ?? post.publishedAt ?? new Date(),
        priority: post.isFeatured ? 0.9 : 0.7,
      })
    }

    return sitemap
  }

  // ===================
  // Analytics
  // ===================

  /**
   * Track a page view
   */
  async trackPageView(data: Omit<PageView, 'id' | 'createdAt'>): Promise<void> {
    const id = crypto.randomUUID()
    await this.db.insert(schema.pageViews).values({ id, ...data })
  }

  /**
   * Get analytics summary for a site
   */
  async getAnalytics(
    siteId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    pageViews: number
    uniqueVisitors: number
    topPages: { path: string; views: number }[]
    topReferrers: { referrer: string; count: number }[]
  }> {
    const conditions = [eq(schema.pageViews.siteId, siteId)]
    if (startDate) {
      conditions.push(gte(schema.pageViews.createdAt, startDate))
    }
    if (endDate) {
      conditions.push(lte(schema.pageViews.createdAt, endDate))
    }

    const [pageViewsResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.pageViews)
      .where(and(...conditions))

    const [uniqueVisitorsResult] = await this.db
      .select({ count: sql<number>`count(distinct ${schema.pageViews.visitorId})` })
      .from(schema.pageViews)
      .where(and(...conditions))

    const topPages = await this.db
      .select({
        path: schema.pageViews.path,
        views: sql<number>`count(*)`,
      })
      .from(schema.pageViews)
      .where(and(...conditions))
      .groupBy(schema.pageViews.path)
      .orderBy(desc(sql`count(*)`))
      .limit(10)

    const topReferrers = await this.db
      .select({
        referrer: schema.pageViews.referrer,
        count: sql<number>`count(*)`,
      })
      .from(schema.pageViews)
      .where(and(...conditions, sql`${schema.pageViews.referrer} is not null`))
      .groupBy(schema.pageViews.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10)

    return {
      pageViews: pageViewsResult?.count ?? 0,
      uniqueVisitors: uniqueVisitorsResult?.count ?? 0,
      topPages: topPages as { path: string; views: number }[],
      topReferrers: topReferrers as { referrer: string; count: number }[],
    }
  }

  /**
   * Get real-time visitor count (last 5 minutes)
   */
  async getRealtimeVisitors(siteId: string): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const [result] = await this.db
      .select({ count: sql<number>`count(distinct ${schema.pageViews.visitorId})` })
      .from(schema.pageViews)
      .where(
        and(
          eq(schema.pageViews.siteId, siteId),
          gte(schema.pageViews.createdAt, fiveMinutesAgo)
        )
      )
    return result?.count ?? 0
  }

  // ===================
  // Form Submissions
  // ===================

  /**
   * Submit a form
   */
  async submitForm(
    data: Omit<FormSubmission, 'id' | 'createdAt'>
  ): Promise<FormSubmission> {
    const id = crypto.randomUUID()
    const [submission] = await this.db
      .insert(schema.formSubmissions)
      .values({ id, ...data })
      .returning()

    await this.log('form.submitted', 'form', id, { formId: data.formId, formName: data.formName })
    return submission
  }

  /**
   * Get form submission by ID
   */
  async getFormSubmission(id: string): Promise<FormSubmission | undefined> {
    const [submission] = await this.db
      .select()
      .from(schema.formSubmissions)
      .where(eq(schema.formSubmissions.id, id))
    return submission
  }

  /**
   * Update form submission status
   */
  async updateFormSubmission(
    id: string,
    data: { status?: string; repliedAt?: Date }
  ): Promise<FormSubmission> {
    const [submission] = await this.db
      .update(schema.formSubmissions)
      .set(data)
      .where(eq(schema.formSubmissions.id, id))
      .returning()

    await this.log('form.updated', 'form', id, data)
    return submission
  }

  /**
   * List form submissions for a site
   */
  async listFormSubmissions(
    siteId: string,
    options: { formId?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<FormSubmission[]> {
    const { formId, status, limit = 50, offset = 0 } = options
    const conditions = [eq(schema.formSubmissions.siteId, siteId)]

    if (formId) {
      conditions.push(eq(schema.formSubmissions.formId, formId))
    }
    if (status) {
      conditions.push(eq(schema.formSubmissions.status, status))
    }

    return this.db
      .select()
      .from(schema.formSubmissions)
      .where(and(...conditions))
      .orderBy(desc(schema.formSubmissions.createdAt))
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get form submission count by status
   */
  async getFormSubmissionStats(siteId: string): Promise<{ status: string; count: number }[]> {
    return this.db
      .select({
        status: schema.formSubmissions.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.formSubmissions)
      .where(eq(schema.formSubmissions.siteId, siteId))
      .groupBy(schema.formSubmissions.status)
  }

  // ===================
  // Navigation Menus
  // ===================

  /**
   * Create or update a menu
   */
  async setMenu(
    siteId: string,
    slug: string,
    data: { name: string; location?: string; items: schema.MenuItem[] }
  ): Promise<Menu> {
    const existing = await this.db
      .select()
      .from(schema.menus)
      .where(and(eq(schema.menus.siteId, siteId), eq(schema.menus.slug, slug)))

    if (existing.length > 0) {
      const [menu] = await this.db
        .update(schema.menus)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(schema.menus.siteId, siteId), eq(schema.menus.slug, slug)))
        .returning()
      await this.log('menu.updated', 'menu', menu.id, { slug })
      return menu
    }

    const id = crypto.randomUUID()
    const [menu] = await this.db
      .insert(schema.menus)
      .values({ id, siteId, slug, ...data })
      .returning()

    await this.log('menu.created', 'menu', id, { slug, name: data.name })
    return menu
  }

  /**
   * Get menu by slug
   */
  async getMenu(siteId: string, slug: string): Promise<Menu | undefined> {
    const [menu] = await this.db
      .select()
      .from(schema.menus)
      .where(and(eq(schema.menus.siteId, siteId), eq(schema.menus.slug, slug)))
    return menu
  }

  /**
   * Get menu by location
   */
  async getMenuByLocation(siteId: string, location: string): Promise<Menu | undefined> {
    const [menu] = await this.db
      .select()
      .from(schema.menus)
      .where(and(eq(schema.menus.siteId, siteId), eq(schema.menus.location, location)))
    return menu
  }

  /**
   * List all menus for a site
   */
  async listMenus(siteId: string): Promise<Menu[]> {
    return this.db
      .select()
      .from(schema.menus)
      .where(eq(schema.menus.siteId, siteId))
  }

  /**
   * Delete a menu
   */
  async deleteMenu(siteId: string, slug: string): Promise<void> {
    await this.db
      .delete(schema.menus)
      .where(and(eq(schema.menus.siteId, siteId), eq(schema.menus.slug, slug)))
    await this.log('menu.deleted', 'menu', undefined, { slug })
  }

  // ===================
  // Activity Log
  // ===================

  /**
   * Log an activity
   */
  async log(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    actor?: { id: string; type: 'user' | 'system' | 'ai' }
  ): Promise<void> {
    const id = crypto.randomUUID()
    await this.db.insert(schema.activityLog).values({
      id,
      siteId: resourceId ?? 'system',
      actorId: actor?.id ?? 'system',
      actorType: actor?.type ?? 'system',
      action,
      resource,
      resourceId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  }

  /**
   * Get activity log for a site
   */
  async getActivityLog(
    siteId: string,
    limit = 50,
    offset = 0
  ): Promise<(typeof schema.activityLog.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.activityLog)
      .where(eq(schema.activityLog.siteId, siteId))
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ===================
  // Dashboard
  // ===================

  /**
   * Get a full site dashboard snapshot
   */
  async getDashboard(siteId: string) {
    const [site, pages, posts, seo, analytics, formStats, recentActivity] = await Promise.all([
      this.get(siteId),
      this.listPages(siteId),
      this.listPosts(siteId, { limit: 5 }),
      this.getSeoSettings(siteId),
      this.getAnalytics(siteId),
      this.getFormSubmissionStats(siteId),
      this.getActivityLog(siteId, 10),
    ])

    const realtimeVisitors = await this.getRealtimeVisitors(siteId)

    return {
      site,
      content: {
        pages: {
          total: pages.length,
          published: pages.filter((p) => p.isPublished).length,
        },
        posts: {
          total: posts.length,
          recent: posts,
        },
      },
      seo,
      analytics: {
        ...analytics,
        realtimeVisitors,
      },
      forms: {
        stats: formStats,
        newCount: formStats.find((s) => s.status === 'new')?.count ?? 0,
      },
      recentActivity,
    }
  }
}

export default Site
