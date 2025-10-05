/**
 * Memory Graph System - Entity and relationship tracking
 *
 * Features:
 * - Entity extraction and tracking
 * - Relationship discovery
 * - Knowledge graph queries
 * - Graph traversal and path finding
 * - Memory associations
 */

import type { Env, Entity, Relationship, MemoryGraphNode, MemoryGraphEdge } from '../types'

export class MemoryGraph {
  constructor(private env: Env) {}

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string): Promise<Entity | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM entities WHERE id = ?'
    ).bind(entityId).first()

    if (!result) return null

    return {
      ...result,
      attributes: JSON.parse((result as any).attributes || '{}')
    } as Entity
  }

  /**
   * Get entities by type
   */
  async getEntitiesByType(sessionId: string, type: string): Promise<Entity[]> {
    const results = await this.env.DB.prepare(`
      SELECT * FROM entities
      WHERE session_id = ? AND type = ?
      ORDER BY occurrences DESC
    `).bind(sessionId, type).all()

    return results.results.map((r: any) => ({
      ...r,
      attributes: JSON.parse(r.attributes || '{}')
    })) as Entity[]
  }

  /**
   * Get most mentioned entities
   */
  async getTopEntities(sessionId: string, limit: number = 10): Promise<Entity[]> {
    const results = await this.env.DB.prepare(`
      SELECT * FROM entities
      WHERE session_id = ?
      ORDER BY occurrences DESC
      LIMIT ?
    `).bind(sessionId, limit).all()

    return results.results.map((r: any) => ({
      ...r,
      attributes: JSON.parse(r.attributes || '{}')
    })) as Entity[]
  }

  /**
   * Get relationships for an entity
   */
  async getEntityRelationships(entityId: string): Promise<Relationship[]> {
    const results = await this.env.DB.prepare(`
      SELECT * FROM relationships
      WHERE source_entity_id = ? OR target_entity_id = ?
      ORDER BY strength DESC
    `).bind(entityId, entityId).all()

    return results.results as Relationship[]
  }

  /**
   * Get related entities (neighbors in graph)
   */
  async getRelatedEntities(entityId: string, maxDepth: number = 1): Promise<Entity[]> {
    const visited = new Set<string>()
    const entities: Entity[] = []

    await this.traverseGraph(entityId, maxDepth, visited, entities)

    return entities
  }

  /**
   * Find path between two entities
   */
  async findPath(sourceId: string, targetId: string, maxDepth: number = 5): Promise<Entity[] | null> {
    const queue: { id: string; path: string[] }[] = [{ id: sourceId, path: [sourceId] }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { id, path } = queue.shift()!

      if (id === targetId) {
        // Found path - retrieve entities
        const entities: Entity[] = []
        for (const entityId of path) {
          const entity = await this.getEntity(entityId)
          if (entity) entities.push(entity)
        }
        return entities
      }

      if (path.length >= maxDepth) continue
      if (visited.has(id)) continue

      visited.add(id)

      // Get neighbors
      const relationships = await this.getEntityRelationships(id)
      for (const rel of relationships) {
        const neighborId = rel.sourceEntityId === id ? rel.targetEntityId : rel.sourceEntityId
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, path: [...path, neighborId] })
        }
      }
    }

    return null // No path found
  }

  /**
   * Build graph representation
   */
  async buildGraph(sessionId: string): Promise<{
    nodes: MemoryGraphNode[]
    edges: MemoryGraphEdge[]
  }> {
    // Get all entities
    const entities = await this.env.DB.prepare(
      'SELECT * FROM entities WHERE session_id = ?'
    ).bind(sessionId).all()

    // Get all relationships
    const relationships = await this.env.DB.prepare(
      'SELECT * FROM relationships WHERE session_id = ?'
    ).bind(sessionId).all()

    // Build nodes
    const nodes: MemoryGraphNode[] = entities.results.map((e: any) => ({
      id: e.id,
      type: 'entity',
      data: {
        ...e,
        attributes: JSON.parse(e.attributes || '{}')
      },
      connections: 0
    }))

    // Build edges and count connections
    const connectionCount = new Map<string, number>()
    const edges: MemoryGraphEdge[] = relationships.results.map((r: any) => {
      connectionCount.set(r.source_entity_id, (connectionCount.get(r.source_entity_id) || 0) + 1)
      connectionCount.set(r.target_entity_id, (connectionCount.get(r.target_entity_id) || 0) + 1)

      return {
        source: r.source_entity_id,
        target: r.target_entity_id,
        type: r.type,
        weight: r.strength
      }
    })

    // Update connection counts
    nodes.forEach(node => {
      node.connections = connectionCount.get(node.id) || 0
    })

    return { nodes, edges }
  }

  /**
   * Get graph statistics
   */
  async getGraphStats(sessionId: string): Promise<{
    entityCount: number
    relationshipCount: number
    avgDegree: number
    maxDegree: number
    entityTypes: Map<string, number>
    relationshipTypes: Map<string, number>
  }> {
    const { nodes, edges } = await this.buildGraph(sessionId)

    const entityTypes = new Map<string, number>()
    const relationshipTypes = new Map<string, number>()

    let totalDegree = 0
    let maxDegree = 0

    for (const node of nodes) {
      const type = node.data.type
      entityTypes.set(type, (entityTypes.get(type) || 0) + 1)
      totalDegree += node.connections
      maxDegree = Math.max(maxDegree, node.connections)
    }

    for (const edge of edges) {
      relationshipTypes.set(edge.type, (relationshipTypes.get(edge.type) || 0) + 1)
    }

    return {
      entityCount: nodes.length,
      relationshipCount: edges.length,
      avgDegree: nodes.length > 0 ? totalDegree / nodes.length : 0,
      maxDegree,
      entityTypes,
      relationshipTypes
    }
  }

  /**
   * Find communities/clusters in graph
   */
  async findCommunities(sessionId: string): Promise<Map<number, Entity[]>> {
    const { nodes, edges } = await this.buildGraph(sessionId)

    if (nodes.length === 0) return new Map()

    // Simple community detection using connected components
    const communities = new Map<number, Entity[]>()
    const visited = new Set<string>()
    let communityId = 0

    for (const node of nodes) {
      if (visited.has(node.id)) continue

      const community: Entity[] = []
      await this.dfsTraverse(node.id, edges, visited, community)

      communities.set(communityId++, community)
    }

    return communities
  }

  /**
   * Get central/hub entities
   */
  async getCentralEntities(sessionId: string, limit: number = 10): Promise<Entity[]> {
    const { nodes } = await this.buildGraph(sessionId)

    // Sort by connection count (degree centrality)
    const sortedNodes = nodes
      .sort((a, b) => b.connections - a.connections)
      .slice(0, limit)

    return sortedNodes.map(n => n.data as Entity)
  }

  /**
   * Query graph with Cypher-like syntax
   */
  async queryGraph(sessionId: string, query: GraphQuery): Promise<any[]> {
    const { nodes, edges } = await this.buildGraph(sessionId)

    // Simple query implementation
    let results: any[] = []

    switch (query.type) {
      case 'MATCH':
        results = await this.matchPattern(query.pattern, nodes, edges)
        break

      case 'SHORTEST_PATH':
        if (query.source && query.target) {
          const path = await this.findPath(query.source, query.target)
          results = path ? [path] : []
        }
        break

      case 'NEIGHBORS':
        if (query.entityId) {
          const neighbors = await this.getRelatedEntities(query.entityId, query.depth || 1)
          results = neighbors
        }
        break

      default:
        throw new Error(`Unsupported query type: ${query.type}`)
    }

    return results
  }

  /**
   * Export graph in various formats
   */
  async exportGraph(sessionId: string, format: 'json' | 'dot' | 'cytoscape'): Promise<string> {
    const { nodes, edges } = await this.buildGraph(sessionId)

    switch (format) {
      case 'json':
        return JSON.stringify({ nodes, edges }, null, 2)

      case 'dot':
        return this.convertToDOT(nodes, edges)

      case 'cytoscape':
        return this.convertToCytoscape(nodes, edges)

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Traverse graph recursively
   */
  private async traverseGraph(
    entityId: string,
    maxDepth: number,
    visited: Set<string>,
    entities: Entity[],
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(entityId)) return

    visited.add(entityId)

    const entity = await this.getEntity(entityId)
    if (entity) entities.push(entity)

    if (currentDepth < maxDepth - 1) {
      const relationships = await this.getEntityRelationships(entityId)
      for (const rel of relationships) {
        const neighborId = rel.sourceEntityId === entityId ? rel.targetEntityId : rel.sourceEntityId
        await this.traverseGraph(neighborId, maxDepth, visited, entities, currentDepth + 1)
      }
    }
  }

  /**
   * DFS traverse for community detection
   */
  private async dfsTraverse(
    nodeId: string,
    edges: MemoryGraphEdge[],
    visited: Set<string>,
    community: Entity[]
  ): Promise<void> {
    if (visited.has(nodeId)) return

    visited.add(nodeId)

    const entity = await this.getEntity(nodeId)
    if (entity) community.push(entity)

    // Find connected nodes
    const connectedEdges = edges.filter(e => e.source === nodeId || e.target === nodeId)

    for (const edge of connectedEdges) {
      const neighborId = edge.source === nodeId ? edge.target : edge.source
      if (!visited.has(neighborId)) {
        await this.dfsTraverse(neighborId, edges, visited, community)
      }
    }
  }

  /**
   * Match pattern in graph
   */
  private async matchPattern(
    pattern: string,
    nodes: MemoryGraphNode[],
    edges: MemoryGraphEdge[]
  ): Promise<any[]> {
    // Simple pattern matching: (EntityType)-[RelationType]->(EntityType)
    const regex = /\((\w+)\)-\[(\w+)\]->\((\w+)\)/
    const match = pattern.match(regex)

    if (!match) {
      throw new Error('Invalid pattern syntax')
    }

    const [, sourceType, relType, targetType] = match

    const results: any[] = []

    for (const edge of edges) {
      if (edge.type === relType) {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)

        if (
          sourceNode?.data.type === sourceType &&
          targetNode?.data.type === targetType
        ) {
          results.push({
            source: sourceNode.data,
            relationship: edge,
            target: targetNode.data
          })
        }
      }
    }

    return results
  }

  /**
   * Convert to DOT format (Graphviz)
   */
  private convertToDOT(nodes: MemoryGraphNode[], edges: MemoryGraphEdge[]): string {
    let dot = 'digraph MemoryGraph {\n'
    dot += '  rankdir=LR;\n'
    dot += '  node [shape=box];\n\n'

    // Add nodes
    for (const node of nodes) {
      dot += `  "${node.id}" [label="${node.data.name}\\n(${node.data.type})"];\n`
    }

    dot += '\n'

    // Add edges
    for (const edge of edges) {
      dot += `  "${edge.source}" -> "${edge.target}" [label="${edge.type}", weight=${edge.weight}];\n`
    }

    dot += '}\n'

    return dot
  }

  /**
   * Convert to Cytoscape.js format
   */
  private convertToCytoscape(nodes: MemoryGraphNode[], edges: MemoryGraphEdge[]): string {
    const cytoscape = {
      elements: {
        nodes: nodes.map(n => ({
          data: {
            id: n.id,
            label: n.data.name,
            type: n.data.type,
            connections: n.connections
          }
        })),
        edges: edges.map((e, i) => ({
          data: {
            id: `e${i}`,
            source: e.source,
            target: e.target,
            label: e.type,
            weight: e.weight
          }
        }))
      }
    }

    return JSON.stringify(cytoscape, null, 2)
  }
}

interface GraphQuery {
  type: 'MATCH' | 'SHORTEST_PATH' | 'NEIGHBORS'
  pattern?: string
  source?: string
  target?: string
  entityId?: string
  depth?: number
}
