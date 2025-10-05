/**
 * Graph Query Engine
 * SQL-based graph traversal, path finding, and subgraph extraction
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { ThingRecord } from './things'
import type { RelationshipRecord } from './relationships'

// ============================================================================
// Types
// ============================================================================

export interface GraphNode {
  id: string
  type: string
  properties: Record<string, any>
  source?: string
}

export interface GraphEdge {
  id: number
  subject: string
  predicate: string
  object: string
  properties: Record<string, any>
}

export interface GraphPath {
  nodes: GraphNode[]
  edges: GraphEdge[]
  length: number
}

export interface Subgraph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

export interface TraversalOptions {
  maxDepth?: number
  predicateFilter?: string[]
  typeFilter?: string[]
  direction?: 'outgoing' | 'incoming' | 'both'
  limit?: number
}

// ============================================================================
// Graph Traversal (N-hop queries)
// ============================================================================

/**
 * Traverse graph from a starting node (1-hop to N-hop)
 * Uses recursive CTE for efficient traversal
 */
export async function traverse(db: D1Database, startId: string, options: TraversalOptions = {}): Promise<Subgraph> {
  const { maxDepth = 2, predicateFilter, typeFilter, direction = 'both', limit = 100 } = options

  // Build predicate filter clause
  const predicateClause =
    predicateFilter && predicateFilter.length > 0 ? `AND r.predicate IN (${predicateFilter.map((_, i) => `?${i + 2}`).join(',')})` : ''

  // Build type filter clause
  const typeClause = typeFilter && typeFilter.length > 0 ? `AND t.type IN (${typeFilter.map((_, i) => `?${(predicateFilter?.length || 0) + i + 2}`).join(',')})` : ''

  // Determine traversal direction
  let traversalQuery: string
  if (direction === 'outgoing') {
    traversalQuery = `
      WITH RECURSIVE graph_traversal AS (
        -- Base case: start node
        SELECT
          t.id,
          t.type,
          t.properties,
          0 as depth,
          t.id as path
        FROM things t
        WHERE t.id = ?1

        UNION ALL

        -- Recursive case: follow outgoing edges
        SELECT
          t.id,
          t.type,
          t.properties,
          gt.depth + 1 as depth,
          gt.path || ' -> ' || t.id as path
        FROM graph_traversal gt
        JOIN relationships r ON gt.id = r.subject ${predicateClause}
        JOIN things t ON r.object = t.id ${typeClause}
        WHERE gt.depth < ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 2}
      )
      SELECT DISTINCT * FROM graph_traversal
      LIMIT ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 3}
    `
  } else if (direction === 'incoming') {
    traversalQuery = `
      WITH RECURSIVE graph_traversal AS (
        -- Base case: start node
        SELECT
          t.id,
          t.type,
          t.properties,
          0 as depth,
          t.id as path
        FROM things t
        WHERE t.id = ?1

        UNION ALL

        -- Recursive case: follow incoming edges
        SELECT
          t.id,
          t.type,
          t.properties,
          gt.depth + 1 as depth,
          t.id || ' -> ' || gt.path as path
        FROM graph_traversal gt
        JOIN relationships r ON gt.id = r.object ${predicateClause}
        JOIN things t ON r.subject = t.id ${typeClause}
        WHERE gt.depth < ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 2}
      )
      SELECT DISTINCT * FROM graph_traversal
      LIMIT ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 3}
    `
  } else {
    // Both directions
    traversalQuery = `
      WITH RECURSIVE graph_traversal AS (
        -- Base case: start node
        SELECT
          t.id,
          t.type,
          t.properties,
          0 as depth,
          t.id as path
        FROM things t
        WHERE t.id = ?1

        UNION ALL

        -- Recursive case: follow outgoing edges
        SELECT
          t.id,
          t.type,
          t.properties,
          gt.depth + 1 as depth,
          gt.path || ' -> ' || t.id as path
        FROM graph_traversal gt
        JOIN relationships r ON gt.id = r.subject ${predicateClause}
        JOIN things t ON r.object = t.id ${typeClause}
        WHERE gt.depth < ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 2}

        UNION ALL

        -- Recursive case: follow incoming edges
        SELECT
          t.id,
          t.type,
          t.properties,
          gt.depth + 1 as depth,
          t.id || ' -> ' || gt.path as path
        FROM graph_traversal gt
        JOIN relationships r ON gt.id = r.object ${predicateClause}
        JOIN things t ON r.subject = t.id ${typeClause}
        WHERE gt.depth < ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 2}
      )
      SELECT DISTINCT * FROM graph_traversal
      LIMIT ?${(predicateFilter?.length || 0) + (typeFilter?.length || 0) + 3}
    `
  }

  // Build parameters
  const params: any[] = [startId]
  if (predicateFilter) params.push(...predicateFilter)
  if (typeFilter) params.push(...typeFilter)
  params.push(maxDepth, limit)

  const stmt = db.prepare(traversalQuery).bind(...params)
  const result = await stmt.all<ThingRecord & { depth: number; path: string }>()

  // Convert to GraphNode format
  const nodes = new Map<string, GraphNode>()
  for (const row of result.results ?? []) {
    nodes.set(row.id, {
      id: row.id,
      type: row.type,
      properties: JSON.parse(row.properties),
      source: row.source,
    })
  }

  // Get all edges between discovered nodes
  const nodeIds = Array.from(nodes.keys())
  if (nodeIds.length === 0) {
    return { nodes, edges: [] }
  }

  const edgeQuery = `
    SELECT * FROM relationships
    WHERE subject IN (${nodeIds.map((_, i) => `?${i + 1}`).join(',')})
      AND object IN (${nodeIds.map((_, i) => `?${nodeIds.length + i + 1}`).join(',')})
  `

  const edgeStmt = db.prepare(edgeQuery).bind(...nodeIds, ...nodeIds)
  const edgeResult = await edgeStmt.all<RelationshipRecord>()

  const edges: GraphEdge[] = (edgeResult.results ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    properties: JSON.parse(row.properties),
  }))

  return { nodes, edges }
}

/**
 * Find shortest path between two nodes
 * Uses bidirectional BFS-like approach
 */
export async function shortestPath(db: D1Database, startId: string, endId: string, maxDepth: number = 5): Promise<GraphPath | null> {
  const query = `
    WITH RECURSIVE paths AS (
      -- Base case: start from source
      SELECT
        ?1 as current_node,
        ?1 as path,
        0 as depth

      UNION ALL

      -- Recursive case: extend path
      SELECT
        r.object as current_node,
        paths.path || ' -> ' || r.object as path,
        paths.depth + 1 as depth
      FROM paths
      JOIN relationships r ON paths.current_node = r.subject
      WHERE paths.depth < ?3
        AND paths.path NOT LIKE '%' || r.object || '%' -- Prevent cycles
    )
    SELECT * FROM paths
    WHERE current_node = ?2
    ORDER BY depth ASC
    LIMIT 1
  `

  const stmt = db.prepare(query).bind(startId, endId, maxDepth)
  const result = await stmt.first<{ current_node: string; path: string; depth: number }>()

  if (!result) return null

  // Parse path and reconstruct
  const nodeIds = result.path.split(' -> ')
  const length = nodeIds.length - 1

  // Get node details
  const nodesQuery = `SELECT * FROM things WHERE id IN (${nodeIds.map((_, i) => `?${i + 1}`).join(',')})`
  const nodesStmt = db.prepare(nodesQuery).bind(...nodeIds)
  const nodesResult = await nodesStmt.all<ThingRecord>()

  const nodes: GraphNode[] = (nodesResult.results ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    properties: JSON.parse(row.properties),
    source: row.source,
  }))

  // Get edge details
  const edges: GraphEdge[] = []
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const edgeStmt = db.prepare('SELECT * FROM relationships WHERE subject = ?1 AND object = ?2 LIMIT 1').bind(nodeIds[i], nodeIds[i + 1])

    const edge = await edgeStmt.first<RelationshipRecord>()
    if (edge) {
      edges.push({
        id: edge.id,
        subject: edge.subject,
        predicate: edge.predicate,
        object: edge.object,
        properties: JSON.parse(edge.properties),
      })
    }
  }

  return { nodes, edges, length }
}

/**
 * Extract subgraph around a node
 * Gets N-hop neighborhood with all interconnections
 */
export async function extractSubgraph(db: D1Database, centerId: string, radius: number = 1): Promise<Subgraph> {
  return await traverse(db, centerId, {
    maxDepth: radius,
    direction: 'both',
  })
}

/**
 * Find all paths between two nodes (up to max depth)
 */
export async function findAllPaths(db: D1Database, startId: string, endId: string, maxDepth: number = 3, limit: number = 10): Promise<GraphPath[]> {
  const query = `
    WITH RECURSIVE paths AS (
      -- Base case
      SELECT
        ?1 as current_node,
        ?1 as path,
        '' as edges,
        0 as depth

      UNION ALL

      -- Recursive case
      SELECT
        r.object as current_node,
        paths.path || ' -> ' || r.object as path,
        CASE
          WHEN paths.edges = '' THEN CAST(r.id AS TEXT)
          ELSE paths.edges || ',' || CAST(r.id AS TEXT)
        END as edges,
        paths.depth + 1 as depth
      FROM paths
      JOIN relationships r ON paths.current_node = r.subject
      WHERE paths.depth < ?3
        AND paths.path NOT LIKE '%' || r.object || '%' -- Prevent cycles
    )
    SELECT * FROM paths
    WHERE current_node = ?2
    ORDER BY depth ASC
    LIMIT ?4
  `

  const stmt = db.prepare(query).bind(startId, endId, maxDepth, limit)
  const result = await stmt.all<{ current_node: string; path: string; edges: string; depth: number }>()

  const paths: GraphPath[] = []

  for (const row of result.results ?? []) {
    const nodeIds = row.path.split(' -> ')
    const edgeIds = row.edges.split(',').map((id) => parseInt(id))

    // Get node details
    const nodesQuery = `SELECT * FROM things WHERE id IN (${nodeIds.map((_, i) => `?${i + 1}`).join(',')})`
    const nodesStmt = db.prepare(nodesQuery).bind(...nodeIds)
    const nodesResult = await nodesStmt.all<ThingRecord>()

    const nodes: GraphNode[] = (nodesResult.results ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      properties: JSON.parse(row.properties),
      source: row.source,
    }))

    // Get edge details
    const edgesQuery = `SELECT * FROM relationships WHERE id IN (${edgeIds.map((_, i) => `?${i + 1}`).join(',')})`
    const edgesStmt = db.prepare(edgesQuery).bind(...edgeIds)
    const edgesResult = await edgesStmt.all<RelationshipRecord>()

    const edges: GraphEdge[] = (edgesResult.results ?? []).map((row) => ({
      id: row.id,
      subject: row.subject,
      predicate: row.predicate,
      object: row.object,
      properties: JSON.parse(row.properties),
    }))

    paths.push({
      nodes,
      edges,
      length: nodeIds.length - 1,
    })
  }

  return paths
}

/**
 * Get connected components (groups of interconnected nodes)
 */
export async function getConnectedComponents(db: D1Database, namespace?: string): Promise<Subgraph[]> {
  // This is a simplified version - for large graphs, use application-level algorithm
  const whereClause = namespace ? 'WHERE namespace = ?1' : ''
  const params = namespace ? [namespace] : []

  const stmt = db.prepare(`SELECT DISTINCT id FROM things ${whereClause}`).bind(...params)
  const result = await stmt.all<{ id: string }>()

  const visited = new Set<string>()
  const components: Subgraph[] = []

  for (const row of result.results ?? []) {
    if (visited.has(row.id)) continue

    // Extract component using traversal
    const component = await extractSubgraph(db, row.id, 100) // Large radius to get entire component

    // Mark all nodes as visited
    for (const nodeId of component.nodes.keys()) {
      visited.add(nodeId)
    }

    components.push(component)
  }

  return components
}

/**
 * Find common neighbors between two nodes
 */
export async function commonNeighbors(db: D1Database, id1: string, id2: string): Promise<GraphNode[]> {
  const query = `
    SELECT DISTINCT t.*
    FROM things t
    WHERE t.id IN (
      SELECT r1.object FROM relationships r1 WHERE r1.subject = ?1
      INTERSECT
      SELECT r2.object FROM relationships r2 WHERE r2.subject = ?2
    )
    OR t.id IN (
      SELECT r1.subject FROM relationships r1 WHERE r1.object = ?1
      INTERSECT
      SELECT r2.subject FROM relationships r2 WHERE r2.object = ?2
    )
  `

  const stmt = db.prepare(query).bind(id1, id2)
  const result = await stmt.all<ThingRecord>()

  return (result.results ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    properties: JSON.parse(row.properties),
    source: row.source,
  }))
}

/**
 * Calculate node degree (number of connections)
 */
export async function nodeDegree(db: D1Database, nodeId: string): Promise<{ in: number; out: number; total: number }> {
  const outQuery = db.prepare('SELECT COUNT(*) as count FROM relationships WHERE subject = ?1').bind(nodeId)
  const inQuery = db.prepare('SELECT COUNT(*) as count FROM relationships WHERE object = ?1').bind(nodeId)

  const [outResult, inResult] = await Promise.all([outQuery.first<{ count: number }>(), inQuery.first<{ count: number }>()])

  const outDegree = outResult?.count ?? 0
  const inDegree = inResult?.count ?? 0

  return {
    in: inDegree,
    out: outDegree,
    total: inDegree + outDegree,
  }
}

/**
 * Get graph statistics
 */
export async function getGraphStats(db: D1Database, namespace?: string): Promise<{
  nodeCount: number
  edgeCount: number
  avgDegree: number
  typeDistribution: Record<string, number>
  predicateDistribution: Record<string, number>
}> {
  const whereClause = namespace ? 'WHERE namespace = ?1' : ''
  const params = namespace ? [namespace] : []

  // Node count
  const nodeCountStmt = db.prepare(`SELECT COUNT(*) as count FROM things ${whereClause}`).bind(...params)
  const nodeCountResult = await nodeCountStmt.first<{ count: number }>()
  const nodeCount = nodeCountResult?.count ?? 0

  // Edge count
  const edgeCountStmt = db.prepare(`SELECT COUNT(*) as count FROM relationships ${whereClause}`).bind(...params)
  const edgeCountResult = await edgeCountStmt.first<{ count: number }>()
  const edgeCount = edgeCountResult?.count ?? 0

  // Type distribution
  const typeStmt = db.prepare(`SELECT type, COUNT(*) as count FROM things ${whereClause} GROUP BY type`).bind(...params)
  const typeResult = await typeStmt.all<{ type: string; count: number }>()
  const typeDistribution: Record<string, number> = {}
  for (const row of typeResult.results ?? []) {
    typeDistribution[row.type] = row.count
  }

  // Predicate distribution
  const predicateStmt = db.prepare(`SELECT predicate, COUNT(*) as count FROM relationships ${whereClause} GROUP BY predicate`).bind(...params)
  const predicateResult = await predicateStmt.all<{ predicate: string; count: number }>()
  const predicateDistribution: Record<string, number> = {}
  for (const row of predicateResult.results ?? []) {
    predicateDistribution[row.predicate] = row.count
  }

  const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0

  return {
    nodeCount,
    edgeCount,
    avgDegree,
    typeDistribution,
    predicateDistribution,
  }
}
