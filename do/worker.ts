import { WorkerEntrypoint } from 'cloudflare:workers'
export { SDK } from './sdk'

export default class extends WorkerEntrypoint {
  async fetch(request: Request) {
    const { hostname, pathname, searchParams } = new URL(request.url)
    const ns = hostname
    const fn = pathname
    const args = Object.fromEntries(searchParams)
    const result = await this.do(ns, fn, args)
    return new Response(JSON.stringify(result))
  }

  async do(ns: string, fn: string, args: any) {
    return {
      ns,
      fn,
      args,
    }
  }
}