import { env, WorkerEntrypoint } from 'cloudflare:workers'
import { experimental_createMCPClient } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const db: any = env.db



export default class extends WorkerEntrypoint {

  async search(domain: string) {
    const headers = { Accept: 'application/json', Authorization: `Bearer ${env.DYNADOT_KEY}` }
    const $id = `https://api.dynadot.com/restful/v1/domains/${domain}/search`
    const response = await fetch($id, { headers }).then(res => res.json()) as any
    response.$id = $id
    this.ctx.waitUntil(db.upsert(response, { $id, $type: 'Domain.Search' }))
    return response
  }

  async bulkSearch(domains: string[]) {
    const headers = { Accept: 'application/json', Authorization: `Bearer ${env.DYNADOT_KEY}` }
    const response = await fetch(`https://api.dynadot.com/restful/v1/domains/domain_name_list?domain_name_list=${domains.slice(0, 20).join(',')}`, { headers }).then(res => res.json())
    return response
  }

  async fetch(request: Request) {
    const { pathname } = new URL(request.url)
    return Response.json(await this.search(pathname.slice(1) as keyof typeof servers & string))
  }
}