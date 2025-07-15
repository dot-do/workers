import { env, WorkerEntrypoint } from 'cloudflare:workers'

export default class extends WorkerEntrypoint {
  async fetch(request: Request) {
    const { pathname, search } = new URL(request.url)
    const response = await fetch(`https://prxy.do${pathname}${search}`)
    const headers = Object.fromEntries(response.headers.entries())
    const type = response.headers.get('content-type') || 'text/html'
    const body = await response.arrayBuffer()
    // const blob = await response.blob()
    // console.log(blob)
    // console.log(blob.type)
    // const blob = new Blob([body], { type })
    const blob = new Blob([body])
    const markdown = await env.ai.toMarkdown({ name: pathname.slice(1), blob })
    console.log(markdown)
    // const markdown = await env.ai.toMarkdown({ name: pathname.slice(1), blob: { type, data: blob.stream} })
    return Response.json({ markdown, headers })
    // return new Response(markdown.data, {
    //   headers: {
    //     'Content-Type': markdown.mimeType,
    //   },
    // })
  }
}


// export default {
//   async fetch(req, env) {
//     const response = await fetch('https://example.com')
//     const blob = await response.blob()
//     const markdown = await env.ai.toMarkdown({ name: 'example.com', blob })
//     return Response.json(markdown )
//   }
// }
