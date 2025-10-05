import { sql } from '../sql'

export interface RelationshipListOptions {
  limit?: number
  offset?: number
  page?: number
  type?: string
  order?: 'asc' | 'desc'
}

/**
 * Get outgoing relationships from an entity as a simple predicate -> object(s) map
 * Returns: { "knows": "person-bob", "worksAt": ["company-x", "company-y"] }
 */
export async function getRelationships(ns: string, id: string, options: RelationshipListOptions = {}) {
  const limit = Math.min(options.limit || 1000, 1000)
  const order = options.order || 'desc'

  // Pattern for outgoing relationships: fromNs:fromId:rel:type:%
  const pattern = `${ns}:${id}:rel:%`

  let whereClause = 'id LIKE {pattern:String} AND type = {relType:String}'
  const queryParams: Record<string, any> = { pattern, relType: 'Relationship' }

  if (options.type) {
    // If filtering by relationship type, parse from id field
    whereClause += ' AND data.relationType = {filterType:String}'
    queryParams.filterType = options.type
  }

  const query = `
    SELECT
      id,
      type,
      data,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${whereClause}
    ORDER BY ts ${order === 'desc' ? 'DESC' : 'ASC'}
    LIMIT ${limit}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  // Build predicate -> object(s) map
  const relationships: Record<string, string | string[]> = {}
  const predicateGroups: Record<string, string[]> = {}

  for (const row of rows) {
    const relData = row.data
    const predicate = relData.relationType
    const objectRef = `${relData.to.ns}:${relData.to.id}`

    if (!predicateGroups[predicate]) {
      predicateGroups[predicate] = []
    }
    predicateGroups[predicate].push(objectRef)
  }

  // Convert to single value or array
  for (const [predicate, objects] of Object.entries(predicateGroups)) {
    relationships[predicate] = objects.length === 1 ? objects[0] : objects
  }

  return relationships
}

/**
 * Query relationships as a collection (for endpoints)
 * Returns array format suitable for pagination and HATEOAS collections
 */
export async function queryRelationships(ns: string, id: string, options: RelationshipListOptions = {}) {
  const limit = Math.min(options.limit || 20, 1000)
  const page = options.page || 1
  const offset = options.offset || (page - 1) * limit
  const order = options.order || 'desc'

  // Pattern for outgoing relationships: fromNs:fromId:rel:type:%
  const pattern = `${ns}:${id}:rel:%`

  let whereClause = 'id LIKE {pattern:String} AND type = {relType:String}'
  const queryParams: Record<string, any> = { pattern, relType: 'Relationship' }

  if (options.type) {
    whereClause += ' AND data.relationType = {filterType:String}'
    queryParams.filterType = options.type
  }

  const query = `
    SELECT
      id,
      type,
      data,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${whereClause}
    ORDER BY ts ${order === 'desc' ? 'DESC' : 'ASC'}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  const hasMore = rows.length > limit
  const data = (hasMore ? rows.slice(0, limit) : rows).map((row: any) => {
    const relData = row.data
    const relId = `${relData.from.ns}:${relData.from.id}:${relData.relationType}:${relData.to.ns}:${relData.to.id}`
    return {
      ns: relData.from.ns,
      id: relId,
      type: 'Relationship',
      predicate: relData.relationType,
      subject: `${relData.from.ns}:${relData.from.id}`,
      object: `${relData.to.ns}:${relData.to.id}`,
      data: {
        predicate: relData.relationType,
        subject: { ns: relData.from.ns, id: relData.from.id },
        object: { ns: relData.to.ns, id: relData.to.id },
        properties: relData.properties || {},
      },
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  })

  // Get total count
  const countQuery = `
    SELECT count(*) as count
    FROM data
    WHERE ${whereClause}
  `

  const countResultSet = await client.query({
    query: countQuery,
    format: 'JSON',
    query_params: queryParams,
  })
  const countResult: any = await countResultSet.json()
  const total = Number(countResult.data?.[0]?.count || 0)

  return {
    data,
    total,
    hasMore,
  }
}

/**
 * Get incoming relationships to an entity
 */
export async function getIncomingRelationships(ns: string, id: string, options: RelationshipListOptions = {}) {
  const limit = Math.min(options.limit || 20, 1000)
  const page = options.page || 1
  const offset = options.offset || (page - 1) * limit
  const order = options.order || 'desc'

  // Pattern for incoming relationships: toNs:toId:rel-inv:type:%
  const pattern = `${ns}:${id}:rel-inv:%`

  let whereClause = 'id LIKE {pattern:String} AND type = {relType:String}'
  const queryParams: Record<string, any> = { pattern, relType: 'Relationship' }

  if (options.type) {
    whereClause += ' AND data.relationType = {filterType:String}'
    queryParams.filterType = options.type
  }

  const query = `
    SELECT
      id,
      type,
      data,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${whereClause}
    ORDER BY ts ${order === 'desc' ? 'DESC' : 'ASC'}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  const hasMore = rows.length > limit
  const data = (hasMore ? rows.slice(0, limit) : rows).map((row: any) => {
    const relData = row.data
    return {
      fromNs: relData.from.ns,
      fromId: relData.from.id,
      toNs: relData.to.ns,
      toId: relData.to.id,
      type: relData.relationType,
      properties: relData.properties || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  })

  // Get total count
  const countQuery = `
    SELECT count(*) as count
    FROM data
    WHERE ${whereClause}
  `

  const countResultSet = await client.query({
    query: countQuery,
    format: 'JSON',
    query_params: queryParams,
  })
  const countResult: any = await countResultSet.json()
  const total = Number(countResult.data?.[0]?.count || 0)

  return {
    incoming: data,
    data,
    total,
    hasMore,
  }
}

/**
 * Upsert (insert or update) a relationship
 * Stores bidirectionally for efficient queries
 */
export async function upsert(relationship: {
  fromNs: string
  fromId: string
  toNs: string
  toId: string
  type: string
  properties?: Record<string, any>
}) {
  const now = new Date()
  const client = (await import('../sql')).clickhouse

  // Store outgoing relationship: fromNs:fromId:rel:type:toNs:toId
  const outgoingId = `${relationship.fromNs}:${relationship.fromId}:rel:${relationship.type}:${relationship.toNs}:${relationship.toId}`
  const outgoingData = {
    from: { ns: relationship.fromNs, id: relationship.fromId },
    to: { ns: relationship.toNs, id: relationship.toId },
    relationType: relationship.type,
    properties: relationship.properties || {},
    direction: 'outgoing',
  }

  await client.command({
    query: `
      INSERT INTO data (id, type, content, data, meta, ts, ulid)
      VALUES (
        {id:String},
        {type:String},
        {content:String},
        {data:String},
        {meta:String},
        parseDateTimeBestEffort({ts:String}),
        generateULID()
      )
    `,
    query_params: {
      id: outgoingId,
      type: 'Relationship',
      content: `${relationship.type}: ${relationship.fromNs}:${relationship.fromId} → ${relationship.toNs}:${relationship.toId}`,
      data: JSON.stringify(outgoingData),
      meta: JSON.stringify({ visibility: 'public' }),
      ts: now.toISOString(),
    },
  })

  // Store incoming relationship: toNs:toId:rel-inv:type:fromNs:fromId
  const incomingId = `${relationship.toNs}:${relationship.toId}:rel-inv:${relationship.type}:${relationship.fromNs}:${relationship.fromId}`
  const incomingData = {
    from: { ns: relationship.fromNs, id: relationship.fromId },
    to: { ns: relationship.toNs, id: relationship.toId },
    relationType: relationship.type,
    properties: relationship.properties || {},
    direction: 'incoming',
  }

  await client.command({
    query: `
      INSERT INTO data (id, type, content, data, meta, ts, ulid)
      VALUES (
        {id:String},
        {type:String},
        {content:String},
        {data:String},
        {meta:String},
        parseDateTimeBestEffort({ts:String}),
        generateULID()
      )
    `,
    query_params: {
      id: incomingId,
      type: 'Relationship',
      content: `${relationship.type}: ${relationship.fromNs}:${relationship.fromId} → ${relationship.toNs}:${relationship.toId}`,
      data: JSON.stringify(incomingData),
      meta: JSON.stringify({ visibility: 'public' }),
      ts: now.toISOString(),
    },
  })

  return {
    ...relationship,
    properties: relationship.properties || {},
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Delete a relationship
 * Removes both outgoing and incoming entries
 */
export async function del(fromNs: string, fromId: string, toNs: string, toId: string, type: string) {
  const outgoingId = `${fromNs}:${fromId}:rel:${type}:${toNs}:${toId}`
  const incomingId = `${toNs}:${toId}:rel-inv:${type}:${fromNs}:${fromId}`

  const client = (await import('../sql')).clickhouse

  // Delete outgoing
  await client.command({
    query: `ALTER TABLE data DELETE WHERE id = {id:String}`,
    query_params: { id: outgoingId },
  })

  // Delete incoming
  await client.command({
    query: `ALTER TABLE data DELETE WHERE id = {id:String}`,
    query_params: { id: incomingId },
  })

  return {
    fromNs,
    fromId,
    toNs,
    toId,
    type,
  }
}

/**
 * List all relationships in a namespace
 */
export async function list(ns: string, options: RelationshipListOptions = {}) {
  const limit = Math.min(options.limit || 20, 1000)
  const page = options.page || 1
  const offset = options.offset || (page - 1) * limit
  const order = options.order || 'desc'

  // Pattern for all relationships starting from this namespace
  const pattern = `${ns}:%:rel:%`

  let whereClause = 'id LIKE {pattern:String} AND type = {relType:String}'
  const queryParams: Record<string, any> = { pattern, relType: 'Relationship' }

  if (options.type) {
    whereClause += ' AND data.relationType = {filterType:String}'
    queryParams.filterType = options.type
  }

  const query = `
    SELECT
      id,
      type,
      data,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${whereClause}
    ORDER BY ts ${order === 'desc' ? 'DESC' : 'ASC'}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  const hasMore = rows.length > limit
  const data = (hasMore ? rows.slice(0, limit) : rows).map((row: any) => {
    const relData = row.data
    return {
      fromNs: relData.from.ns,
      fromId: relData.from.id,
      toNs: relData.to.ns,
      toId: relData.to.id,
      type: relData.relationType,
      properties: relData.properties || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  })

  // Get total count
  const countQuery = `
    SELECT count(*) as count
    FROM data
    WHERE ${whereClause}
  `

  const countResultSet = await client.query({
    query: countQuery,
    format: 'JSON',
    query_params: queryParams,
  })
  const countResult: any = await countResultSet.json()
  const total = Number(countResult.data?.[0]?.count || 0)

  return {
    data,
    total,
    hasMore,
    pagination: { limit, offset, total },
  }
}
