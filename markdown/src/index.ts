import { env, WorkerEntrypoint } from 'cloudflare:workers'

export default class extends WorkerEntrypoint {
  async fetch(request: Request) {
    const { pathname, search } = new URL(request.url)

    // Fetch content via prxy.do
    const response = await fetch(`https://prxy.do${pathname}${search}`)
    const headers = Object.fromEntries(response.headers.entries())
    const type = response.headers.get('content-type') || 'text/html'
    const body = await response.arrayBuffer()

    // Convert to blob
    const blob = new Blob([body])

    // Use Workers AI to convert to markdown
    const markdown = await env.ai.toMarkdown({
      name: pathname.slice(1),
      blob
    })

    console.log(markdown)

    return Response.json({ markdown, headers })
  }
}
