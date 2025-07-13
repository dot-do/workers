import { env, WorkerEntrypoint } from 'cloudflare:workers'

const db: any = env.db
const yaml: any = env.yaml

export default class extends WorkerEntrypoint {
  async models() {
    const { data } = await fetch('https://prxy.do/openrouter.ai/api/frontend/models/find').then(r => r.json()) as any || {}
    const results = await db.insertMany('models.do', 'Model', data.models.map((data: any) => ({ id: data.slug, data, content: `# ${data.name}\n\n${data.description}` })))
    console.log(results)
    return data.models
  }

  async modelNames() {
    const models = await this.models()
    return models.map((model: any) => model.slug)
  }

  async fetch() {
    const models = await this.models()
    const response = await yaml.stringify(models)
    return new Response(response)
  }
}
