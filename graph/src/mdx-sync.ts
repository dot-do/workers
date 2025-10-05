/**
 * MDX Sync - Bidirectional synchronization with MDX content repositories
 * Converts MDX frontmatter to Schema.org entities and vice versa
 */

import type { D1Database } from '@cloudflare/workers-types'
import * as things from './things'
import * as relationships from './relationships'
import { buildThingUri, CommonPredicates } from './schema-org'

// ============================================================================
// Types
// ============================================================================

export interface MDXFrontmatter {
  title: string
  description?: string
  [key: string]: any
}

export interface MDXFile {
  slug: string
  frontmatter: MDXFrontmatter
  content: string
  source: string // Repository name (apps, brands, etc.)
}

// ============================================================================
// MDX Repository Mapping
// ============================================================================

/**
 * Map MDX repository to Schema.org type
 */
const REPO_TYPE_MAP: Record<string, string> = {
  apps: 'SoftwareApplication',
  brands: 'Organization',
  functions: 'SoftwareSourceCode',
  integrations: 'WebAPI',
  schemas: 'Dataset',
  services: 'Service',
  sources: 'DataFeed',
  workflows: 'Action',
  agents: 'SoftwareAgent',
  business: 'Organization',
}

/**
 * Get Schema.org type for a repository
 */
export function getTypeForRepo(repo: string): string {
  return REPO_TYPE_MAP[repo] || 'Thing'
}

// ============================================================================
// MDX → Database Sync
// ============================================================================

/**
 * Convert MDX frontmatter to Schema.org properties
 */
export function frontmatterToProperties(frontmatter: MDXFrontmatter, repo: string): Record<string, any> {
  const properties: Record<string, any> = {
    name: frontmatter.title,
    description: frontmatter.description,
  }

  // Add repo-specific mappings
  switch (repo) {
    case 'apps':
      if (frontmatter.url) properties.url = frontmatter.url
      if (frontmatter.platform) properties.operatingSystem = frontmatter.platform
      if (frontmatter.techStack) properties.programmingLanguage = frontmatter.techStack
      if (frontmatter.features) properties.featureList = frontmatter.features
      break

    case 'brands':
      if (frontmatter.url) properties.url = frontmatter.url
      if (frontmatter.foundingDate) properties.foundingDate = frontmatter.foundingDate
      if (frontmatter.logo) properties.logo = frontmatter.logo
      break

    case 'functions':
      if (frontmatter.parameters) properties.parameters = frontmatter.parameters
      if (frontmatter.returns) properties.returnType = frontmatter.returns
      if (frontmatter.language) properties.programmingLanguage = frontmatter.language
      break

    case 'integrations':
      if (frontmatter.apiUrl) properties.url = frontmatter.apiUrl
      if (frontmatter.authentication) properties.authenticationMethod = frontmatter.authentication
      if (frontmatter.rateLimit) properties.rateLimit = frontmatter.rateLimit
      break

    case 'services':
      if (frontmatter.serviceType) properties.serviceType = frontmatter.serviceType
      if (frontmatter.provider) properties.provider = frontmatter.provider
      if (frontmatter.endpoint) properties.url = frontmatter.endpoint
      break
  }

  // Include all other frontmatter fields
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!properties[key] && key !== 'title' && key !== 'description') {
      properties[key] = value
    }
  }

  return properties
}

/**
 * Sync MDX file to database
 */
export async function syncMDXToDatabase(db: D1Database, mdx: MDXFile): Promise<void> {
  const type = getTypeForRepo(mdx.source)
  const id = buildThingUri(type, mdx.slug)
  const properties = frontmatterToProperties(mdx.frontmatter, mdx.source)

  // Add content to properties
  properties.text = mdx.content

  // Upsert thing
  await things.upsert(db, {
    id,
    type,
    properties,
    source: mdx.source,
    namespace: 'mdx',
  })

  // Create relationships based on frontmatter references
  await syncRelationships(db, id, mdx.frontmatter, mdx.source)
}

/**
 * Sync relationships from frontmatter references
 */
async function syncRelationships(db: D1Database, subjectId: string, frontmatter: MDXFrontmatter, repo: string): Promise<void> {
  // Extract relationship fields from frontmatter
  const relationshipFields: Record<string, string> = {
    worksFor: CommonPredicates.worksFor,
    author: CommonPredicates.author,
    creator: CommonPredicates.creator,
    publisher: CommonPredicates.publisher,
    manufacturer: CommonPredicates.manufacturer,
    brand: CommonPredicates.brand,
    partOf: CommonPredicates.partOf,
    relatedTo: CommonPredicates.relatedTo,
  }

  for (const [field, predicate] of Object.entries(relationshipFields)) {
    const value = frontmatter[field]
    if (!value) continue

    // Handle array or single value
    const values = Array.isArray(value) ? value : [value]

    for (const val of values) {
      // If value is a URI, create relationship
      if (typeof val === 'string' && val.startsWith('http')) {
        await relationships.upsert(db, {
          subject: subjectId,
          predicate,
          object: val,
          namespace: 'mdx',
        })
      } else if (typeof val === 'string') {
        // If value is a slug, build URI
        const objectType = getTypeForRepo(repo)
        const objectId = buildThingUri(objectType, val)
        await relationships.upsert(db, {
          subject: subjectId,
          predicate,
          object: objectId,
          namespace: 'mdx',
        })
      }
    }
  }
}

/**
 * Batch sync multiple MDX files
 */
export async function batchSyncMDX(db: D1Database, files: MDXFile[]): Promise<{ synced: number; errors: string[] }> {
  let synced = 0
  const errors: string[] = []

  for (const file of files) {
    try {
      await syncMDXToDatabase(db, file)
      synced++
    } catch (error: any) {
      errors.push(`${file.source}/${file.slug}: ${error.message}`)
    }
  }

  return { synced, errors }
}

// ============================================================================
// Database → MDX Sync
// ============================================================================

/**
 * Convert Schema.org properties to MDX frontmatter
 */
export function propertiesToFrontmatter(properties: Record<string, any>, repo: string): MDXFrontmatter {
  const frontmatter: MDXFrontmatter = {
    title: properties.name || 'Untitled',
    description: properties.description,
  }

  // Add repo-specific mappings (reverse)
  switch (repo) {
    case 'apps':
      if (properties.url) frontmatter.url = properties.url
      if (properties.operatingSystem) frontmatter.platform = properties.operatingSystem
      if (properties.programmingLanguage) frontmatter.techStack = properties.programmingLanguage
      if (properties.featureList) frontmatter.features = properties.featureList
      break

    case 'brands':
      if (properties.url) frontmatter.url = properties.url
      if (properties.foundingDate) frontmatter.foundingDate = properties.foundingDate
      if (properties.logo) frontmatter.logo = properties.logo
      break

    case 'functions':
      if (properties.parameters) frontmatter.parameters = properties.parameters
      if (properties.returnType) frontmatter.returns = properties.returnType
      if (properties.programmingLanguage) frontmatter.language = properties.programmingLanguage
      break

    case 'integrations':
      if (properties.url) frontmatter.apiUrl = properties.url
      if (properties.authenticationMethod) frontmatter.authentication = properties.authenticationMethod
      if (properties.rateLimit) frontmatter.rateLimit = properties.rateLimit
      break

    case 'services':
      if (properties.serviceType) frontmatter.serviceType = properties.serviceType
      if (properties.provider) frontmatter.provider = properties.provider
      if (properties.url) frontmatter.endpoint = properties.url
      break
  }

  // Include other properties
  for (const [key, value] of Object.entries(properties)) {
    if (!frontmatter[key] && key !== 'name' && key !== 'description' && key !== 'text') {
      frontmatter[key] = value
    }
  }

  return frontmatter
}

/**
 * Generate MDX file from database entity
 */
export async function generateMDXFromDatabase(db: D1Database, thingId: string): Promise<string> {
  const thing = await things.get(db, thingId)
  if (!thing) throw new Error(`Thing not found: ${thingId}`)

  const properties = JSON.parse(thing.properties)
  const frontmatter = propertiesToFrontmatter(properties, thing.source || 'apps')
  const content = properties.text || ''

  // Build frontmatter YAML
  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`
      } else if (typeof value === 'object') {
        return `${key}: ${JSON.stringify(value)}`
      } else if (typeof value === 'string') {
        return `${key}: "${value.replace(/"/g, '\\"')}"`
      } else {
        return `${key}: ${value}`
      }
    })
    .join('\n')

  return `---\n${frontmatterYaml}\n---\n\n${content}`
}

// ============================================================================
// Webhook Handler
// ============================================================================

export interface WebhookPayload {
  repository: string // Repository name (apps, brands, etc.)
  files: {
    slug: string
    frontmatter: Record<string, any>
    content: string
  }[]
}

/**
 * Handle GitHub webhook for MDX repository changes
 */
export async function handleWebhook(db: D1Database, payload: WebhookPayload): Promise<{ synced: number; errors: string[] }> {
  const mdxFiles: MDXFile[] = payload.files.map((file) => ({
    slug: file.slug,
    frontmatter: file.frontmatter,
    content: file.content,
    source: payload.repository,
  }))

  return await batchSyncMDX(db, mdxFiles)
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export all entities from a repository to MDX format
 */
export async function exportRepoToMDX(db: D1Database, repo: string): Promise<Map<string, string>> {
  const { things: thingsList } = await things.list(db, { source: repo })

  const mdxFiles = new Map<string, string>()

  for (const thing of thingsList) {
    const mdx = await generateMDXFromDatabase(db, thing.id)
    const slug = thing.id.split('/').pop() || thing.id
    mdxFiles.set(slug, mdx)
  }

  return mdxFiles
}

/**
 * Export entire namespace to MDX
 */
export async function exportNamespaceToMDX(db: D1Database, namespace: string): Promise<Map<string, Map<string, string>>> {
  const repos = Object.keys(REPO_TYPE_MAP)
  const result = new Map<string, Map<string, string>>()

  for (const repo of repos) {
    const mdxFiles = await exportRepoToMDX(db, repo)
    if (mdxFiles.size > 0) {
      result.set(repo, mdxFiles)
    }
  }

  return result
}
