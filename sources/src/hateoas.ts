/**
 * HATEOAS (Hypermedia as the Engine of Application State) Implementation
 *
 * Provides full hypermedia support for the sources worker API with:
 * - JSON-LD context (@context) for semantic web compatibility
 * - Schema.org types (@type) for structured data
 * - Canonical identifiers (@id) for unique resource URLs
 * - Hypermedia links (_links) for navigable API
 * - Source and resource navigation
 * - Collection and pagination support
 */

// ============================================================================
// Types
// ============================================================================

export interface HateoasLink {
  href: string
  title?: string
  method?: string
  type?: string
  templated?: boolean
}

export interface HateoasLinks {
  self: HateoasLink
  [key: string]: HateoasLink | HateoasLink[] | undefined
}

export interface HateoasEntity {
  '@context': string
  '@type': string
  '@id': string
  [key: string]: any
  _links: HateoasLinks
}

export interface HateoasCollection {
  '@context': string
  '@type': 'Collection'
  '@id': string
  items: HateoasEntity[]
  totalItems: number
  _links: HateoasLinks
  _meta?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface HateoasOptions {
  baseUrl: string
  contextUrl?: string
  includeRelationships?: boolean
  embedRelated?: boolean
}

// ============================================================================
// Schema.org Type Mapping
// ============================================================================

/**
 * Map entity type to Schema.org type
 * Falls back to generic Thing if no mapping exists
 */
export function getSchemaOrgType(entityType: string): string {
  const typeMap: Record<string, string> = {
    // Content types
    post: 'BlogPosting',
    article: 'Article',
    page: 'WebPage',
    comment: 'Comment',
    review: 'Review',

    // People & Organizations
    user: 'Person',
    author: 'Person',
    organization: 'Organization',
    business: 'LocalBusiness',

    // Products & Services
    product: 'Product',
    service: 'Service',
    offer: 'Offer',

    // Events & Places
    event: 'Event',
    place: 'Place',
    location: 'Place',

    // Media
    image: 'ImageObject',
    video: 'VideoObject',
    audio: 'AudioObject',
    document: 'DigitalDocument',

    // Categories & Tags
    category: 'DefinedTerm',
    tag: 'Thing',

    // Relationships
    Relationship: 'Thing',

    // Sources & APIs
    source: 'DataCatalog',
    api: 'WebAPI',
    softwareapplication: 'SoftwareApplication',
    webapi: 'WebAPI',
    action: 'Action',
    definedterm: 'DefinedTerm',
    model: 'SoftwareApplication',

    // Default
    thing: 'Thing',
  }

  return typeMap[entityType.toLowerCase()] || 'Thing'
}

// ============================================================================
// Link Generation
// ============================================================================

/**
 * Generate canonical URL for entity
 */
export function getEntityUrl(baseUrl: string, ns: string, id: string): string {
  return `${baseUrl}/${ns}/${id}`
}

/**
 * Generate collection URL
 */
export function getCollectionUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return `${baseUrl}/resources`
  }

  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  return query ? `${baseUrl}/resources?${query}` : `${baseUrl}/resources`
}

/**
 * Detect relationships in entity data
 * Returns array of {predicate, targetNs, targetId} for each relationship found
 */
export function detectRelationships(data: any): Array<{ predicate: string; targetNs?: string; targetId?: string; value: any }> {
  const relationships: Array<{ predicate: string; targetNs?: string; targetId?: string; value: any }> = []

  if (!data || typeof data !== 'object') return relationships

  // Common relationship field patterns
  const relationshipPatterns = [
    'author', 'creator', 'owner',
    'parent', 'child', 'sibling',
    'category', 'categories', 'tag', 'tags',
    'related', 'relatedTo', 'linkedTo',
    'assignee', 'reviewer', 'approver',
    'organization', 'company', 'team',
    'parentServer', 'namespace',
  ]

  for (const [key, value] of Object.entries(data)) {
    // Skip non-relationship fields
    if (!relationshipPatterns.some(p => key.toLowerCase().includes(p))) {
      continue
    }

    // Handle string references (e.g., "user-123", "payload:post-456")
    if (typeof value === 'string') {
      // Format: "ns:id" or just "id"
      const parts = value.split(':')
      if (parts.length === 2) {
        relationships.push({
          predicate: key,
          targetNs: parts[0],
          targetId: parts[1],
          value,
        })
      } else if (parts.length === 1 && value.match(/^[a-z0-9._/-]+$/i)) {
        // Single ID without namespace - assume same namespace
        relationships.push({
          predicate: key,
          targetId: value,
          value,
        })
      }
    }

    // Handle array of references
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const parts = item.split(':')
          if (parts.length === 2) {
            relationships.push({
              predicate: key,
              targetNs: parts[0],
              targetId: parts[1],
              value: item,
            })
          } else if (parts.length === 1 && item.match(/^[a-z0-9._/-]+$/i)) {
            relationships.push({
              predicate: key,
              targetId: item,
              value: item,
            })
          }
        }
      }
    }
  }

  return relationships
}

/**
 * Generate links for entity relationships
 */
export function generateRelationshipLinks(
  baseUrl: string,
  ns: string,
  id: string,
  data: any
): Record<string, HateoasLink | HateoasLink[]> {
  const links: Record<string, HateoasLink | HateoasLink[]> = {}
  const relationships = detectRelationships(data)

  // Group by predicate
  const byPredicate = relationships.reduce((acc, rel) => {
    if (!acc[rel.predicate]) acc[rel.predicate] = []
    acc[rel.predicate].push(rel)
    return acc
  }, {} as Record<string, typeof relationships>)

  for (const [predicate, rels] of Object.entries(byPredicate)) {
    if (rels.length === 1) {
      // Single relationship
      const rel = rels[0]
      const targetNs = rel.targetNs || ns
      const targetId = rel.targetId
      if (targetId) {
        links[predicate] = {
          href: getEntityUrl(baseUrl, targetNs, targetId),
          title: predicate,
        }
      }
    } else {
      // Multiple relationships (array)
      links[predicate] = rels
        .filter(rel => rel.targetId)
        .map(rel => ({
          href: getEntityUrl(baseUrl, rel.targetNs || ns, rel.targetId!),
          title: predicate,
        }))
    }
  }

  return links
}

/**
 * Generate pagination links
 */
export function generatePaginationLinks(
  baseUrl: string,
  path: string,
  params: Record<string, any>,
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
): Partial<HateoasLinks> {
  const { page, limit, total, hasMore } = pagination
  const totalPages = Math.ceil(total / limit)

  const buildUrl = (overrides: Record<string, any> = {}) => {
    const queryParams = { ...params, ...overrides }
    const query = Object.entries(queryParams)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    return query ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`
  }

  const links: Partial<HateoasLinks> = {}

  // First page
  if (page > 1) {
    links.first = { href: buildUrl({ page: 1 }) }
  }

  // Previous page
  if (page > 1) {
    links.prev = { href: buildUrl({ page: page - 1 }) }
  }

  // Next page
  if (hasMore || page < totalPages) {
    links.next = { href: buildUrl({ page: page + 1 }) }
  }

  // Last page
  if (totalPages > 1 && page < totalPages) {
    links.last = { href: buildUrl({ page: totalPages }) }
  }

  return links
}

// ============================================================================
// Main HATEOAS Functions
// ============================================================================

/**
 * Wrap single entity with full HATEOAS metadata
 */
export function wrapEntity(
  entity: any,
  options: HateoasOptions
): HateoasEntity {
  const { baseUrl, contextUrl = 'https://schema.org', includeRelationships = true } = options
  const { ns, id, type, data, ...rest } = entity

  // Generate canonical URL
  const entityUrl = getEntityUrl(baseUrl, ns, id)

  // Build base links
  const links: HateoasLinks = {
    self: { href: entityUrl },
    collection: { href: getCollectionUrl(baseUrl, { ns, type }) },
    namespace: { href: getCollectionUrl(baseUrl, { ns }) },
  }

  // Add relationship links
  if (includeRelationships && data) {
    const relLinks = generateRelationshipLinks(baseUrl, ns, id, data)
    Object.assign(links, relLinks)
  }

  return {
    '@context': contextUrl,
    '@type': getSchemaOrgType(type),
    '@id': entityUrl,
    ns,
    id,
    type,
    data,
    ...rest,
    _links: links,
  }
}

/**
 * Wrap collection with full HATEOAS metadata
 */
export function wrapCollection(
  items: any[],
  options: HateoasOptions & {
    path?: string
    params?: Record<string, any>
    pagination?: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }
): HateoasCollection {
  const {
    baseUrl,
    contextUrl = 'https://schema.org',
    path = '/resources',
    params = {},
    pagination,
  } = options

  // Generate collection URL
  const collectionUrl = getCollectionUrl(baseUrl, params)

  // Wrap each item
  const wrappedItems = items.map(item => wrapEntity(item, options))

  // Build base links
  const links: HateoasLinks = {
    self: { href: collectionUrl },
    home: { href: baseUrl },
  }

  // Add pagination links if provided
  if (pagination) {
    Object.assign(links, generatePaginationLinks(baseUrl, path, params, pagination))
  }

  return {
    '@context': contextUrl,
    '@type': 'Collection',
    '@id': collectionUrl,
    items: wrappedItems,
    totalItems: pagination?.total || items.length,
    _links: links,
    ...(pagination && { _meta: pagination }),
  }
}

/**
 * Wrap error response with HATEOAS metadata
 */
export function wrapError(
  error: {
    code: string
    message: string
    details?: any
  },
  options: HateoasOptions & {
    path?: string
  }
): {
  '@context': string
  '@type': 'Error'
  error: typeof error
  _links: HateoasLinks
} {
  const { baseUrl, contextUrl = 'https://schema.org', path = '/' } = options

  return {
    '@context': contextUrl,
    '@type': 'Error',
    error,
    _links: {
      self: { href: `${baseUrl}${path}` },
      home: { href: baseUrl },
    },
  }
}
