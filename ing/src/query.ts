/**
 * Graph Query and Traversal Engine
 */

import type { Triple, GraphResult, GraphNode, GraphEdge, Path, Env } from './types'
import { getTriple } from './triples'

/**
 * Traverse graph from a starting node
 */
export async function traverseGraph(
  start: string,
  depth: number,
  direction: 'forward' | 'backward' | 'both',
  env: Env
): Promise<GraphResult> {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const visited = new Set<string>()

  // BFS traversal
  const queue: Array<{ node: string; currentDepth: number }> = [{ node: start, currentDepth: 0 }]
  visited.add(start)

  // Add starting node
  nodes.set(start, {
    id: start,
    type: 'subject', // Will be updated based on position in triple
    label: start,
  })

  while (queue.length > 0) {
    const { node, currentDepth } = queue.shift()!

    if (currentDepth >= depth) {
      continue
    }

    // Get neighbors based on direction
    const neighbors = await getNeighbors(node, direction, env)

    for (const neighbor of neighbors) {
      // Add node if not seen
      if (!nodes.has(neighbor.nodeId)) {
        nodes.set(neighbor.nodeId, {
          id: neighbor.nodeId,
          type: neighbor.type,
          label: neighbor.nodeId,
        })
      }

      // Add edge
      edges.push({
        from: neighbor.type === 'object' ? neighbor.nodeId : node,
        to: neighbor.type === 'object' ? node : neighbor.nodeId,
        predicate: neighbor.predicate,
      })

      // Add to queue if not visited
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId)
        queue.push({ node: neighbor.nodeId, currentDepth: currentDepth + 1 })
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    depth,
  }
}

/**
 * Find all paths between two nodes
 */
export async function findPaths(from: string, to: string, maxDepth: number, env: Env): Promise<Path[]> {
  const paths: Path[] = []

  // DFS to find all paths
  async function dfs(current: string, target: string, visited: Set<string>, path: string[], depth: number) {
    if (depth > maxDepth) {
      return
    }

    if (current === target) {
      paths.push({
        nodes: [...path, current],
        edges: [], // TODO: collect edge IDs
        length: path.length,
      })
      return
    }

    visited.add(current)

    const neighbors = await getNeighbors(current, 'forward', env)

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        await dfs(neighbor.nodeId, target, visited, [...path, current], depth + 1)
      }
    }

    visited.delete(current)
  }

  await dfs(from, to, new Set(), [], 0)

  // Sort by length (shortest first)
  paths.sort((a, b) => a.length - b.length)

  return paths
}

/**
 * Get neighbors of a node
 */
export async function getNeighbors(
  node: string,
  direction: 'forward' | 'backward' | 'both',
  env: Env
): Promise<Array<{ nodeId: string; predicate: string; type: 'subject' | 'object' }>> {
  const neighbors: Array<{ nodeId: string; predicate: string; type: 'subject' | 'object' }> = []

  // Forward: node is subject, get objects
  if (direction === 'forward' || direction === 'both') {
    const forwardResult = await env.DB_SERVICE.query({
      query: `
        SELECT DISTINCT st.object, st.predicate
        FROM triple_index ti
        JOIN semantic_triples st ON ti.triple_id = st.id
        WHERE ti.node = ? AND ti.direction = 'subject' AND st.deleted_at IS NULL
      `,
      params: [node],
    })

    if (forwardResult.rows) {
      for (const row of forwardResult.rows) {
        neighbors.push({
          nodeId: row.object,
          predicate: row.predicate,
          type: 'object',
        })
      }
    }
  }

  // Backward: node is object, get subjects
  if (direction === 'backward' || direction === 'both') {
    const backwardResult = await env.DB_SERVICE.query({
      query: `
        SELECT DISTINCT st.subject, st.predicate
        FROM triple_index ti
        JOIN semantic_triples st ON ti.triple_id = st.id
        WHERE ti.node = ? AND ti.direction = 'object' AND st.deleted_at IS NULL
      `,
      params: [node],
    })

    if (backwardResult.rows) {
      for (const row of backwardResult.rows) {
        neighbors.push({
          nodeId: row.subject,
          predicate: row.predicate,
          type: 'subject',
        })
      }
    }
  }

  return neighbors
}

/**
 * Execute SPARQL-like query (simplified)
 */
export async function executeQuery(pattern: string, env: Env): Promise<Triple[]> {
  // Simplified query parser
  // TODO: Implement full SPARQL parser

  // Basic pattern matching: ?subject='accountant' ?predicate='invoicing' ?object=*
  const regex = /\?(\w+)=(['*\w]+)/g
  const matches = [...pattern.matchAll(regex)]

  const query: Record<string, string> = {}

  for (const match of matches) {
    const field = match[1]
    const value = match[2].replace(/['"]/g, '')

    if (value !== '*') {
      query[field] = value
    }
  }

  // Query triples
  const conditions: string[] = ['deleted_at IS NULL']
  const params: any[] = []

  if (query.subject) {
    conditions.push('subject = ?')
    params.push(query.subject)
  }

  if (query.predicate) {
    conditions.push('predicate = ?')
    params.push(query.predicate)
  }

  if (query.object) {
    conditions.push('object = ?')
    params.push(query.object)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await env.DB_SERVICE.query({
    query: `
      SELECT id, subject, predicate, object, context,
             created_at, created_by, confidence
      FROM semantic_triples
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `,
    params,
  })

  return result.rows.map((row: any) => ({
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    context: row.context ? JSON.parse(row.context) : undefined,
    created_at: row.created_at,
    created_by: row.created_by,
    confidence: row.confidence,
  }))
}

/**
 * Get triple count grouped by predicate
 */
export async function getPredicateStats(env: Env): Promise<Record<string, number>> {
  const result = await env.DB_SERVICE.query({
    query: `
      SELECT predicate, COUNT(*) as count
      FROM semantic_triples
      WHERE deleted_at IS NULL
      GROUP BY predicate
      ORDER BY count DESC
    `,
  })

  const stats: Record<string, number> = {}

  for (const row of result.rows) {
    stats[row.predicate] = row.count
  }

  return stats
}

/**
 * Get triple count grouped by subject
 */
export async function getSubjectStats(env: Env): Promise<Record<string, number>> {
  const result = await env.DB_SERVICE.query({
    query: `
      SELECT subject, COUNT(*) as count
      FROM semantic_triples
      WHERE deleted_at IS NULL
      GROUP BY subject
      ORDER BY count DESC
      LIMIT 100
    `,
  })

  const stats: Record<string, number> = {}

  for (const row of result.rows) {
    stats[row.subject] = row.count
  }

  return stats
}
