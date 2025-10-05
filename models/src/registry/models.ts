import type { D1Database } from '@cloudflare/workers-types'
import { GraphDB } from '../graph/db'
import type { Thing, ModelMetadata, ModelVersion } from '../types/schema'
import { ulid } from 'ulid'

export class ModelRegistry {
  private graph: GraphDB

  constructor(private db: D1Database) {
    this.graph = new GraphDB(db)
  }

  // Register a new model
  async registerModel(data: {
    name: string
    description?: string
    metadata: ModelMetadata
    created_by?: string
    version?: string
    tags?: string[]
  }): Promise<{ model: Thing; version: ModelVersion }> {
    const modelId = ulid()
    const versionId = ulid()
    const version = data.version || '1.0.0'

    // Create model thing
    const model = await this.graph.createThing({
      id: modelId,
      type: 'model',
      name: data.name,
      description: data.description,
      metadata: data.metadata,
      created_by: data.created_by,
      status: 'active',
      version,
      tags: data.tags
    })

    // Create version record
    const modelVersion = await this.createVersion(modelId, version, versionId, true, false)

    return { model, version: modelVersion }
  }

  // Create a new version of an existing model
  async createModelVersion(
    modelId: string,
    version: string,
    metadata?: Partial<ModelMetadata>,
    isProduction: boolean = false
  ): Promise<{ model: Thing; version: ModelVersion }> {
    const versionId = ulid()
    const baseModel = await this.graph.getThing(modelId)

    if (!baseModel || baseModel.type !== 'model') {
      throw new Error('Model not found')
    }

    // Create new version thing (derived from base model)
    const versionThing = await this.graph.createThing({
      id: versionId,
      type: 'model',
      name: `${baseModel.name} v${version}`,
      description: baseModel.description,
      metadata: { ...baseModel.metadata, ...metadata },
      created_by: baseModel.created_by,
      status: 'active',
      version
    })

    // Create derivedFrom relationship
    await this.graph.createRelationship({
      id: ulid(),
      source_id: versionId,
      target_id: modelId,
      type: 'derivedFrom',
      properties: { version }
    })

    // Unset previous latest
    await this.db.prepare('UPDATE model_versions SET is_latest = 0 WHERE model_id = ?').bind(modelId).run()

    // Create version record
    const modelVersion = await this.createVersion(modelId, version, versionId, true, isProduction)

    return { model: versionThing, version: modelVersion }
  }

  // Get model by ID
  async getModel(modelId: string): Promise<Thing | null> {
    return this.graph.getThing(modelId)
  }

  // Get model with all versions
  async getModelWithVersions(modelId: string): Promise<{ model: Thing; versions: ModelVersion[] }> {
    const model = await this.graph.getThing(modelId)
    if (!model) throw new Error('Model not found')

    const versions = await this.db
      .prepare('SELECT * FROM model_versions WHERE model_id = ? ORDER BY created_at DESC')
      .bind(modelId)
      .all()

    return {
      model,
      versions: versions.results.map((row) => ({
        id: row.id,
        model_id: row.model_id,
        version: row.version,
        thing_id: row.thing_id,
        is_latest: Boolean(row.is_latest),
        is_production: Boolean(row.is_production),
        created_at: row.created_at
      }))
    }
  }

  // Promote version to production
  async promoteToProduction(modelId: string, version: string): Promise<void> {
    await this.db.prepare('UPDATE model_versions SET is_production = 0 WHERE model_id = ?').bind(modelId).run()

    await this.db.prepare('UPDATE model_versions SET is_production = 1 WHERE model_id = ? AND version = ?').bind(modelId, version).run()
  }

  // Deprecate a model
  async deprecateModel(modelId: string, replacedBy?: string): Promise<void> {
    await this.db.prepare('UPDATE things SET status = ? WHERE id = ?').bind('deprecated', modelId).run()

    if (replacedBy) {
      await this.graph.createRelationship({
        id: ulid(),
        source_id: modelId,
        target_id: replacedBy,
        type: 'replacedBy'
      })
    }
  }

  // Search models
  async searchModels(filters?: { tags?: string[]; status?: string; provider?: string }): Promise<Thing[]> {
    let things = await this.graph.searchThings('model', {
      status: filters?.status,
      tags: filters?.tags
    })

    // Filter by provider if specified
    if (filters?.provider) {
      things = things.filter((thing) => {
        const metadata = thing.metadata as ModelMetadata
        return metadata?.provider === filters.provider
      })
    }

    return things
  }

  // Private helper to create version record
  private async createVersion(modelId: string, version: string, thingId: string, isLatest: boolean, isProduction: boolean): Promise<ModelVersion> {
    const id = ulid()
    const now = Math.floor(Date.now() / 1000)

    await this.db
      .prepare(
        `INSERT INTO model_versions (id, model_id, version, thing_id, is_latest, is_production, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, modelId, version, thingId, isLatest ? 1 : 0, isProduction ? 1 : 0, now)
      .run()

    return {
      id,
      model_id: modelId,
      version,
      thing_id: thingId,
      is_latest: isLatest,
      is_production: isProduction,
      created_at: now
    }
  }
}
