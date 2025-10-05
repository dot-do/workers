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
 * Get neighbors of a node using existing relationship queries
 */
export async function getNeighbors(
  node: string,
  direction: 'forward' | 'backward' | 'both',
  env: Env
): Promise<Array<{ nodeId: string; predicate: string; type: 'subject' | 'object' }>> {
  const neighbors: Array<{ nodeId: string; predicate: string; type: 'subject' | 'object' }> = []

  // Parse entity reference
  const parseRef = (ref: string) => {
    if (ref.includes(':')) {
      const [ns, ...idParts] = ref.split(':')
      return { ns, id: idParts.join(':') }
    }
    return { ns: 'ing', id: ref }
  }

  const { ns, id } = parseRef(node)

  // Forward: node is subject, get objects (outgoing relationships)
  if (direction === 'forward' || direction === 'both') {
    try {
      const relationships = await env.DB_SERVICE.getRelationships(ns, id, { limit: 1000 })

      // relationships is a map: { predicate: "ns:id" | ["ns:id", ...] }
      for (const [predicate, targets] of Object.entries(relationships)) {
        const targetArray = Array.isArray(targets) ? targets : [targets]
        for (const target of targetArray) {
          neighbors.push({
            nodeId: target,
            predicate,
            type: 'object',
          })
        }
      }
    } catch (error) {
      console.error('Error getting forward neighbors:', error)
    }
  }

  // Backward: node is object, get subjects (incoming relationships)
  if (direction === 'backward' || direction === 'both') {
    try {
      const incomingRels = await env.DB_SERVICE.getIncomingRelationships(ns, id, { limit: 1000 })

      // Convert incoming relationships to neighbors
      for (const rel of incomingRels) {
        neighbors.push({
          nodeId: rel.subject,
          predicate: rel.predicate,
          type: 'subject',
        })
      }
    } catch (error) {
      console.error('Error getting backward neighbors:', error)
    }
  }

  return neighbors
}

/**
 * Execute SPARQL-like query (simplified) using queryTriples
 */
export async function executeQuery(pattern: string, env: Env): Promise<Triple[]> {
  // Simplified query parser
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

  // Use queryTriples with parsed pattern
  const { queryTriples } = await import('./triples')
  const result = await queryTriples(
    {
      subject: query.subject,
      predicate: query.predicate,
      object: query.object,
      limit: 100,
    },
    env
  )

  return result.triples
}

/**
 * Get triple count grouped by predicate (relationship type stats)
 */
export async function getPredicateStats(env: Env): Promise<Record<string, number>> {
  // Use DB service stats if available
  try {
    const stats = await env.DB_SERVICE.typeDistribution('ing')
    return stats || {}
  } catch (error) {
    console.error('Error getting predicate stats:', error)
    return {}
  }
}

/**
 * Get triple count grouped by subject
 */
export async function getSubjectStats(env: Env): Promise<Record<string, number>> {
  // Returns approximate stats
  // In future, could aggregate from relationship queries
  try {
    const stats = await env.DB_SERVICE.stats()
    return stats?.thingsByNamespace || {}
  } catch (error) {
    console.error('Error getting subject stats:', error)
    return {}
  }
}
