/**
 * Triple Storage Operations - Integrated with existing graph database
 *
 * Maps semantic triples to the existing things/relationships graph:
 * - subject → fromNs:fromId (entity in things table)
 * - predicate → relationship type (verb from registry)
 * - object → toNs:toId (entity in things table)
 * - context → relationship properties (5W1H metadata)
 */

import type {
  Triple,
  TriplePattern,
  CreateTripleRequest,
  QueryTriplesRequest,
  Env,
} from './types'

/**
 * Generate unique ID for triple (relationship format)
 */
export function generateTripleId(subject: string, predicate: string, object: string): string {
  const { ns: fromNs, id: fromId } = parseEntityRef(subject)
  const { ns: toNs, id: toId } = parseEntityRef(object)
  return `${fromNs}:${fromId}:rel:${predicate}:${toNs}:${toId}`
}

/**
 * Parse entity reference into namespace and ID
 * Supports formats:
 * - "ns:id" (explicit namespace)
 * - "entity" (default to 'ing' namespace)
 */
function parseEntityRef(ref: string): { ns: string; id: string } {
  if (ref.includes(':')) {
    const [ns, ...idParts] = ref.split(':')
    return { ns, id: idParts.join(':') }
  }
  return { ns: 'ing', id: ref }
}

/**
 * Create a new semantic triple using existing graph database
 */
export async function createTriple(
  params: CreateTripleRequest,
  userId: string,
  env: Env
): Promise<Triple> {
  const { ns: fromNs, id: fromId } = parseEntityRef(params.subject)
  const { ns: toNs, id: toId } = parseEntityRef(params.object)

  // Build relationship properties from 5W1H context
  const properties: Record<string, any> = {
    created_by: userId,
    confidence: params.context?.confidence ?? 1.0,
    ...(params.context && { context: params.context }),
  }

  // Create relationship via DB service
  const relationship = await env.DB_SERVICE.upsertRelationship({
    fromNs,
    fromId,
    toNs,
    toId,
    type: params.predicate,
    properties,
  })

  // Convert relationship back to triple format
  const triple: Triple = {
    id: generateTripleId(params.subject, params.predicate, params.object),
    subject: params.subject,
    predicate: params.predicate,
    object: params.object,
    context: params.context,
    created_at: relationship.createdAt.toISOString(),
    created_by: userId,
    version: 1,
    confidence: properties.confidence,
  }

  return triple
}

/**
 * Get a triple by ID (relationship lookup)
 * ID format: fromNs:fromId:rel:predicate:toNs:toId
 */
export async function getTriple(id: string, env: Env): Promise<Triple | null> {
  try {
    // Parse relationship ID
    const parts = id.split(':')
    if (parts.length < 6 || parts[2] !== 'rel') {
      return null
    }

    const [fromNs, fromId, , predicate, toNs, ...toIdParts] = parts
    const toId = toIdParts.join(':')

    // Query relationship via DB service
    const relationships = await env.DB_SERVICE.queryRelationships(fromNs, fromId, {
      type: predicate,
      limit: 1,
    })

    if (!relationships || relationships.length === 0) {
      return null
    }

    const rel = relationships[0]

    // Convert to triple format
    return {
      id,
      subject: `${fromNs}:${fromId}`,
      predicate,
      object: `${toNs}:${toId}`,
      context: rel.data?.properties?.context,
      created_at: rel.createdAt.toISOString(),
      created_by: rel.data?.properties?.created_by || 'system',
      updated_at: rel.updatedAt?.toISOString(),
      version: 1,
      confidence: rel.data?.properties?.confidence ?? 1.0,
    }
  } catch (error) {
    console.error('Error getting triple:', error)
    return null
  }
}

/**
 * Query triples by pattern using existing relationship queries
 */
export async function queryTriples(
  pattern: QueryTriplesRequest,
  env: Env
): Promise<{ triples: Triple[]; total: number }> {
  const limit = pattern.limit ?? 20
  const offset = pattern.offset ?? 0

  let relationships: any[] = []

  if (pattern.subject) {
    // Query outgoing relationships from subject
    const { ns, id } = parseEntityRef(pattern.subject)
    relationships = await env.DB_SERVICE.queryRelationships(ns, id, {
      type: pattern.predicate,
      limit: limit + 1,
      offset,
    })
  } else if (pattern.object) {
    // Query incoming relationships to object
    const { ns, id } = parseEntityRef(pattern.object)
    relationships = await env.DB_SERVICE.getIncomingRelationships(ns, id, {
      type: pattern.predicate,
      limit: limit + 1,
      offset,
    })
  } else if (pattern.predicate) {
    // Query all relationships of this type
    // This requires a more complex query across all namespaces
    // For now, return empty (can be optimized later)
    return { triples: [], total: 0 }
  } else {
    // No specific pattern - return empty (too broad)
    return { triples: [], total: 0 }
  }

  // Convert relationships to triples
  const hasMore = relationships.length > limit
  const items = hasMore ? relationships.slice(0, limit) : relationships

  const triples: Triple[] = items.map((rel: any) => ({
    id: rel.id,
    subject: rel.subject,
    predicate: rel.predicate,
    object: rel.object,
    context: rel.data?.properties?.context,
    created_at: rel.createdAt.toISOString(),
    created_by: rel.data?.properties?.created_by || 'system',
    updated_at: rel.updatedAt?.toISOString(),
    version: 1,
    confidence: rel.data?.properties?.confidence ?? 1.0,
  }))

  return {
    triples,
    total: triples.length, // Approximate - can be enhanced with count query
  }
}

/**
 * Delete a triple (deletes relationship from graph)
 */
export async function deleteTriple(id: string, userId: string, env: Env): Promise<boolean> {
  try {
    // Parse relationship ID
    const parts = id.split(':')
    if (parts.length < 6 || parts[2] !== 'rel') {
      return false
    }

    const [fromNs, fromId, , predicate, toNs, ...toIdParts] = parts
    const toId = toIdParts.join(':')

    // Delete relationship via DB service
    await env.DB_SERVICE.deleteRelationship(fromNs, fromId, toNs, toId, predicate)

    return true
  } catch (error) {
    console.error('Error deleting triple:', error)
    return false
  }
}
