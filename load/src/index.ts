import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env {
  db: any
  yaml: any
  DEPLOY_SERVICE: any
}

export default class LoadService extends WorkerEntrypoint<Env> {
  /**
   * Fetch all models from OpenRouter API and store in database
   */
  async models() {
    try {
      const response = await fetch('https://prxy.do/openrouter.ai/api/frontend/models/find')
      const { data } = await response.json() as any

      if (!data || !data.models) {
        throw new Error('Invalid response from OpenRouter API')
      }

      // Upsert each model individually
      const results = []
      for (const modelData of data.models) {
        try {
          const result = await this.env.db.upsert({
            ns: 'models.do',
            id: modelData.slug,
            type: 'Model',
            data: modelData,
            content: `# ${modelData.name}\n\n${modelData.description || ''}`,
          })
          results.push(result)
        } catch (err) {
          console.error(`[Load] Error upserting model ${modelData.slug}:`, err)
        }
      }

      console.log(`[Load] Upserted ${results.length} models`)
      return data.models
    } catch (error) {
      console.error('[Load] Error fetching models:', error)
      throw error
    }
  }

  /**
   * Get list of model slugs/names only
   */
  async modelNames() {
    const models = await this.models()
    return models.map((model: any) => model.slug)
  }

  /**
   * HTTP endpoint - returns model names as YAML
   */
  async fetch(request: Request) {
    try {
      const models = await this.modelNames()
      const yamlContent = await this.env.yaml.stringify(models)

      return new Response(yamlContent, {
        headers: {
          'Content-Type': 'text/yaml; charset=utf-8',
        },
      })
    } catch (error) {
      console.error('[Load] Fetch error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to load models',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }
}
