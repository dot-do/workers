/**
 * Sites Worker Types
 */

export interface Env {
  // Service bindings
  DB_SERVICE: any

  // KV namespace for compiled MDX
  ASSETS: KVNamespace

  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production'
}

export interface SiteMetadata {
  domain: string
  tld: string
  name: string
  title?: string
  description?: string
  // Additional metadata from Velite schema
  [key: string]: any
}

export interface CompiledSite {
  metadata: SiteMetadata
  content: string // Compiled MDX/HTML
  frontmatter: Record<string, any>
}
