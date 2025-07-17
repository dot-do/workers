import { env, WorkerEntrypoint } from 'cloudflare:workers'
export { SDK } from './sdk'
import * as functions from './functions'

// const modules = (import.meta as any).glob('**/*', { eager: true })

// for (const [path, module] of Object.entries(modules)) {
//   const { default: fn } = module
//   console.log(path, fn)
// }


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
    console.log({ ns, fn, args })
    // this.env.
    return {
      ns,
      fn,
      args,
      // modules: import.meta,
    }
  }
}
