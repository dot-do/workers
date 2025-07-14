import { env, WorkerEntrypoint } from 'cloudflare:workers'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
// })



export default class extends WorkerEntrypoint {

  async openai(opts: any) {
    const gateway = env.ai.gateway('functions-do')
    const result = await gateway.run({
      provider: 'openai',
      endpoint: 'v1/chat/completions',
      ...opts,
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        ...opts.headers,
      },
    }).then(res => res.json())
    console.log(result)
    return result
  }

  async openrouter(opts: any) {
    const gateway = env.ai.gateway('functions-do')
    const result = await gateway.run({
      provider: 'openrouter',
      endpoint: 'chat/completions',
      ...opts,
      headers: {
        'Authorization': `Bearer ${env.OPEN_ROUTER_API_KEY}`,
        ...opts.headers,
      },
    }).then(res => res.json())
    console.log(result)
    return result
  }

  async fetch(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams) as any
    query.model = query.model || 'o3'
    query.prompt = query.prompt || 'Hello, world!'
    console.log(query)
    return Response.json(await this.openai(query))
  }
}