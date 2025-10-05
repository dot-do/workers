import type { D1Database } from '@cloudflare/workers-types'
import { GraphDB } from '../graph/db'
import type { Thing, Relationship } from '../types/schema'
import { ulid } from 'ulid'

export class LineageTracker {
  private graph: GraphDB

  constructor(private db: D1Database) {
    this.graph = new GraphDB(db)
  }

  // Track dataset used for training
  async trackDataset(modelId: string, datasetId: string, properties?: Record<string, any>): Promise<Relationship> {
    return this.graph.createRelationship({
      id: ulid(),
      source_id: modelId,
      target_id: datasetId,
      type: 'trainedOn',
      properties
    })
  }

  // Track model deployment
  async trackDeployment(modelId: string, deploymentId: string, properties?: Record<string, any>): Promise<Relationship> {
    return this.graph.createRelationship({
      id: ulid(),
      source_id: modelId,
      target_id: deploymentId,
      type: 'deployedTo',
      properties
    })
  }

  // Track evaluation dataset
  async trackEvaluation(modelId: string, datasetId: string, metrics?: Record<string, number>): Promise<Relationship> {
    return this.graph.createRelationship({
      id: ulid(),
      source_id: modelId,
      target_id: datasetId,
      type: 'evaluatedOn',
      properties: { metrics }
    })
  }

  // Get full lineage (upstream + downstream)
  async getFullLineage(modelId: string): Promise<{
    upstream: { things: Thing[]; relationships: Relationship[] }
    downstream: { things: Thing[]; relationships: Relationship[] }
  }> {
    // Upstream (what this model depends on)
    const upstream = await this.graph.getModelLineage(modelId)

    // Downstream (what depends on this model)
    const downstreamThings: Thing[] = []
    const downstreamRels: Relationship[] = []
    const visited = new Set<string>()

    const traverseDown = async (id: string) => {
      if (visited.has(id)) return
      visited.add(id)

      const rels = await this.graph.getRelationships(id, undefined, 'out')
      for (const rel of rels) {
        downstreamRels.push(rel)
        const thing = await this.graph.getThing(rel.target_id)
        if (thing) {
          downstreamThings.push(thing)
          await traverseDown(rel.target_id)
        }
      }
    }

    await traverseDown(modelId)

    return {
      upstream,
      downstream: { things: downstreamThings, relationships: downstreamRels }
    }
  }

  // Get impact analysis (what will be affected by changes to this model)
  async getImpactAnalysis(modelId: string): Promise<{
    deployments: Thing[]
    dependentModels: Thing[]
    applications: Thing[]
  }> {
    const { downstream } = await this.getFullLineage(modelId)

    return {
      deployments: downstream.things.filter((t) => t.type === 'deployment'),
      dependentModels: downstream.things.filter((t) => t.type === 'model'),
      applications: downstream.things.filter((t) => t.type === 'experiment')
    }
  }

  // Get lineage visualization data (for graph rendering)
  async getLineageGraph(modelId: string): Promise<{
    nodes: Array<{ id: string; type: string; name: string; metadata?: any }>
    edges: Array<{ source: string; target: string; type: string; properties?: any }>
  }> {
    const { upstream, downstream } = await this.getFullLineage(modelId)

    const allThings = [...upstream.things, ...downstream.things]
    const allRels = [...upstream.relationships, ...downstream.relationships]

    // Deduplicate
    const uniqueThings = Array.from(new Map(allThings.map((t) => [t.id, t])).values())
    const uniqueRels = Array.from(new Map(allRels.map((r) => [r.id, r])).values())

    return {
      nodes: uniqueThings.map((t) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        metadata: t.metadata
      })),
      edges: uniqueRels.map((r) => ({
        source: r.source_id,
        target: r.target_id,
        type: r.type,
        properties: r.properties
      }))
    }
  }

  // Get data provenance (track back to original data sources)
  async getDataProvenance(modelId: string): Promise<Thing[]> {
    const { upstream } = await this.graph.getModelLineage(modelId)

    // Filter to datasets and trace back to sources
    const datasets = upstream.things.filter((t) => t.type === 'dataset')

    return datasets
  }
}
