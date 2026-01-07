/**
 * page.as - Create and manage web pages
 *
 * Build landing pages, websites, and web applications.
 * page.as/landing, page.as/blog, page.as/portfolio
 *
 * @see https://page.as
 *
 * @example
 * ```typescript
 * import { page } from 'page.as'
 *
 * // Create a landing page
 * const landing = await page.create({
 *   slug: 'my-product',
 *   title: 'My Amazing Product',
 *   template: 'startup',
 *   sections: [
 *     { type: 'hero', headline: 'Build faster', cta: 'Get Started' },
 *     { type: 'features', items: [...] }
 *   ]
 * })
 *
 * // Publish the page
 * await page.publish('my-product')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type SectionType = 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'faq' | 'team' | 'contact' | 'custom'

export interface Section {
  type: SectionType
  id?: string
  /** Section content varies by type */
  [key: string]: unknown
}

export interface PageConfig {
  /** Page slug */
  slug: string
  /** Page title */
  title: string
  /** Meta description */
  description?: string
  /** Template name */
  template?: string
  /** Page sections */
  sections?: Section[]
  /** Custom CSS */
  css?: string
  /** Custom JavaScript */
  js?: string
  /** Custom domain */
  domain?: string
  /** Favicon URL */
  favicon?: string
  /** OG image */
  ogImage?: string
  /** Analytics tracking */
  analytics?: {
    google?: string
    plausible?: string
    custom?: string
  }
}

export interface Page {
  id: string
  slug: string
  title: string
  description?: string
  template?: string
  status: 'draft' | 'published' | 'archived'
  url: string
  domain?: string
  sections: Section[]
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface PageVersion {
  id: string
  pageId: string
  sections: Section[]
  createdAt: Date
  createdBy?: string
  message?: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  previewUrl: string
  sections: SectionType[]
}

export interface PageMetrics {
  views: number
  uniqueVisitors: number
  avgTimeOnPage: number
  bounceRate: number
  conversionRate: number
  topSources: Array<{ source: string; visits: number }>
  period: string
}

export interface AbTest {
  id: string
  pageId: string
  name: string
  variants: Array<{ id: string; name: string; weight: number }>
  metric: string
  status: 'running' | 'completed' | 'paused'
  winner?: string
  createdAt: Date
}

// Client interface
export interface PageAsClient {
  /**
   * Create a page
   */
  create(config: PageConfig): Promise<Page>

  /**
   * Get page details
   */
  get(slug: string): Promise<Page>

  /**
   * List all pages
   */
  list(options?: { status?: Page['status']; template?: string; limit?: number }): Promise<Page[]>

  /**
   * Update a page
   */
  update(slug: string, config: Partial<PageConfig>): Promise<Page>

  /**
   * Delete a page
   */
  delete(slug: string): Promise<void>

  /**
   * Publish a page
   */
  publish(slug: string): Promise<Page>

  /**
   * Unpublish a page
   */
  unpublish(slug: string): Promise<Page>

  /**
   * Duplicate a page
   */
  duplicate(slug: string, newSlug: string): Promise<Page>

  /**
   * Get page versions
   */
  versions(slug: string): Promise<PageVersion[]>

  /**
   * Restore a version
   */
  restore(slug: string, versionId: string): Promise<Page>

  /**
   * List templates
   */
  templates(category?: string): Promise<Template[]>

  /**
   * Get a template
   */
  template(name: string): Promise<Template>

  /**
   * Get page metrics
   */
  metrics(slug: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<PageMetrics>

  /**
   * Add a section
   */
  addSection(slug: string, section: Section, position?: number): Promise<Page>

  /**
   * Update a section
   */
  updateSection(slug: string, sectionId: string, section: Partial<Section>): Promise<Page>

  /**
   * Remove a section
   */
  removeSection(slug: string, sectionId: string): Promise<Page>

  /**
   * Reorder sections
   */
  reorderSections(slug: string, sectionIds: string[]): Promise<Page>

  /**
   * Create A/B test
   */
  createTest(slug: string, config: { name: string; variants: Array<{ name: string; sections: Section[] }>; metric: string }): Promise<AbTest>

  /**
   * Get A/B test results
   */
  testResults(testId: string): Promise<AbTest & { results: Record<string, { views: number; conversions: number }> }>

  /**
   * Export page as HTML
   */
  export(slug: string): Promise<string>

  /**
   * Generate page with AI
   */
  generate(prompt: string, options?: { template?: string; style?: string }): Promise<Page>
}

/**
 * Create a configured page.as client
 */
export function Page(options?: ClientOptions): PageAsClient {
  return createClient<PageAsClient>('https://page.as', options)
}

/**
 * Default page.as client instance
 */
export const page: PageAsClient = Page()

// Convenience exports
export const create = (config: PageConfig) => page.create(config)
export const publish = (slug: string) => page.publish(slug)
export const templates = (category?: string) => page.templates(category)

export default page

// Re-export types
export type { ClientOptions } from 'rpc.do'
