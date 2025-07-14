import { env, WorkerEntrypoint } from 'cloudflare:workers'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
})

export default class extends WorkerEntrypoint {

  generateText(args: Parameters<typeof generateText>[0] & { model?: string }) {
  
    return generateText({
      ...args,
      model: typeof args.model === 'string' ? openai(args.model) : args.model,
    })
  }

  async fetch(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams) as any
    query.model = query.model || 'o3'
    query.prompt = query.prompt || 'Hello, world!'
    console.log(query)
    return Response.json(await this.generateText(query))
  }
}