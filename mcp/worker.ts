import { env, WorkerEntrypoint } from 'cloudflare:workers'
import { experimental_createMCPClient } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
// })

const servers = {
  context7: 'https://context7.liam.sh/sse',  // 'https://context7.liam.sh/mcp',
  deepwiki: 'https://mcp.deepwiki.com/sse',
  memory: 'https://mcp.do/memory',
  slack: 'https://mcp.slack.com/sse',
  github: '',
  linear: '',
  stripe: '',
  cloudflare: '',
} as any


export default class extends WorkerEntrypoint {

  async tools(server: any = 'deepwiki') {

    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: servers[server] || 'https://' + server,
      },
    })

    const tools = await client.tools()
    console.log(tools)
    return tools
  }

  async fetch(request: Request) {
    const { pathname } = new URL(request.url)
    return Response.json(await this.tools(pathname.slice(1) as keyof typeof servers & string))
  }
}