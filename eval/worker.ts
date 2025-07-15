import { env, WorkerEntrypoint } from 'cloudflare:workers'

const cloudflare: any = env.cloudflare
const yaml: any = env.yaml

export default class extends WorkerEntrypoint {

  async fetch(request: Request) {
    try {
      const { pathname, searchParams } = new URL(request.url)
      const code = decodeURIComponent(pathname).slice(1).replaceAll('_', ' ')

      // sum=(a,b)=>a+b
      // sum(1,1)

      if (code.includes('=>')) {
        const functionName = 'fn' + pathname.slice(1).split('=')[0]
        const start = Date.now()
        const deployResult = await cloudflare.deployWorker(functionName, `export const _${code}`)
        const deployTime = Date.now() - start
        return Response.json({ deployResult, deployTime })
      }
      else {
        const [functionName, args] = 'fn' + pathname.slice(1).split('(')
        // const result = await (env.do as any).get(functionName)[functionName](args)
        // return Response.json(result)
        return Response.json({ functionName, args })
      }
    }
    catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

}
