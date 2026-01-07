/**
 * wiki.as - Create and manage wikis and documentation
 *
 * Build knowledge bases, documentation sites, and wikis.
 * wiki.as/docs, wiki.as/help, wiki.as/knowledge
 *
 * @see https://wiki.as
 *
 * @example
 * ```typescript
 * import { wiki } from 'wiki.as'
 *
 * // Create a wiki
 * const site = await wiki.create({
 *   name: 'docs',
 *   title: 'Product Documentation'
 * })
 *
 * // Create a page
 * await wiki.page('docs', {
 *   slug: 'getting-started',
 *   title: 'Getting Started',
 *   content: '# Welcome\n\nLet\'s get you set up...'
 * })
 *
 * // Search the wiki
 * const results = await wiki.search('docs', 'authentication')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface WikiConfig {
  /** Wiki name/slug */
  name: string
  /** Display title */
  title?: string
  /** Description */
  description?: string
  /** Public or private */
  visibility?: 'public' | 'private' | 'team'
  /** Custom domain */
  domain?: string
  /** Theme */
  theme?: 'light' | 'dark' | 'auto'
  /** Logo URL */
  logo?: string
  /** Navigation structure */
  navigation?: NavigationItem[]
  /** AI-powered features */
  ai?: {
    search?: boolean
    suggestions?: boolean
    autoLink?: boolean
  }
}

export interface NavigationItem {
  title: string
  slug?: string
  children?: NavigationItem[]
}

export interface Wiki {
  id: string
  name: string
  title?: string
  description?: string
  visibility: 'public' | 'private' | 'team'
  url: string
  domain?: string
  pageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PageConfig {
  /** Page slug */
  slug: string
  /** Page title */
  title: string
  /** Markdown content */
  content: string
  /** Parent page slug */
  parent?: string
  /** Page description */
  description?: string
  /** Tags */
  tags?: string[]
  /** Draft status */
  draft?: boolean
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

export interface Page {
  id: string
  slug: string
  title: string
  content: string
  description?: string
  parent?: string
  tags: string[]
  draft: boolean
  url: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
}

export interface PageVersion {
  id: string
  pageId: string
  content: string
  createdAt: Date
  createdBy?: string
  message?: string
}

export interface SearchResult {
  page: Page
  snippet: string
  score: number
  highlights: string[]
}

export interface WikiMetrics {
  pageViews: number
  uniqueVisitors: number
  topPages: Array<{ slug: string; views: number }>
  searchQueries: number
  period: string
}

// Client interface
export interface WikiAsClient {
  /**
   * Create a wiki
   */
  create(config: WikiConfig): Promise<Wiki>

  /**
   * Get wiki details
   */
  get(name: string): Promise<Wiki>

  /**
   * List all wikis
   */
  list(options?: { visibility?: Wiki['visibility']; limit?: number }): Promise<Wiki[]>

  /**
   * Update wiki configuration
   */
  update(name: string, config: Partial<WikiConfig>): Promise<Wiki>

  /**
   * Delete a wiki
   */
  delete(name: string): Promise<void>

  /**
   * Create or update a page
   */
  page(wikiName: string, config: PageConfig): Promise<Page>

  /**
   * Get a page
   */
  getPage(wikiName: string, slug: string): Promise<Page>

  /**
   * List pages
   */
  pages(wikiName: string, options?: { parent?: string; tag?: string; draft?: boolean; limit?: number }): Promise<Page[]>

  /**
   * Delete a page
   */
  deletePage(wikiName: string, slug: string): Promise<void>

  /**
   * Search wiki
   */
  search(wikiName: string, query: string, options?: { limit?: number }): Promise<SearchResult[]>

  /**
   * Get page versions
   */
  versions(wikiName: string, slug: string): Promise<PageVersion[]>

  /**
   * Restore a page version
   */
  restore(wikiName: string, slug: string, versionId: string): Promise<Page>

  /**
   * Get navigation structure
   */
  navigation(wikiName: string): Promise<NavigationItem[]>

  /**
   * Update navigation
   */
  setNavigation(wikiName: string, navigation: NavigationItem[]): Promise<Wiki>

  /**
   * Get wiki metrics
   */
  metrics(wikiName: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<WikiMetrics>

  /**
   * Export wiki
   */
  export(wikiName: string, format?: 'markdown' | 'html' | 'pdf'): Promise<string>

  /**
   * Import pages
   */
  import(wikiName: string, content: string, format?: 'markdown' | 'notion' | 'confluence'): Promise<Page[]>

  /**
   * AI-powered question answering
   */
  ask(wikiName: string, question: string): Promise<{ answer: string; sources: Page[] }>
}

/**
 * Create a configured wiki.as client
 */
export function Wiki(options?: ClientOptions): WikiAsClient {
  return createClient<WikiAsClient>('https://wiki.as', options)
}

/**
 * Default wiki.as client instance
 */
export const wiki: WikiAsClient = Wiki({
  apiKey: typeof process !== 'undefined' ? (process.env?.WIKI_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: WikiConfig) => wiki.create(config)
export const page = (wikiName: string, config: PageConfig) => wiki.page(wikiName, config)
export const search = (wikiName: string, query: string) => wiki.search(wikiName, query)

export default wiki

// Re-export types
export type { ClientOptions } from 'rpc.do'
