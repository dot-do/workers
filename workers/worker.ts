import { env, WorkerEntrypoint } from 'cloudflare:workers'

const db: any = env.db
const yaml: any = env.yaml



export default class extends WorkerEntrypoint {

  async do(request: Request, ns: string, fn: string, args: any) {
    try {
      // TODO: Implement Auth with WorkOS for RBAC and FGA
      const worker = env.do.get(ns) as any
      if (!Array.isArray(args)) args = [args]
      const result = await worker[fn](...args)
      console.log(result)
      return result
    } catch (error) {
      console.error(error)
      return { error: (error as Error).message, ns, fn, args }
    }
    
  }

  async fetch(request: Request) {
    try {
      // parse the URL, read the subdomain
      let workerName = new URL(request.url).host.split('.')[0]
      let userWorker = env.do.get(workerName, { }, { params_object: { cf: request.cf, url: request.url, method: request.method }} as any )
      return await userWorker.fetch(request)
    } catch (e) {
      if ((e as Error).message.startsWith('Worker not found')) {
        // we tried to get a worker that doesn't exist in our dispatch namespace
        return new Response('Not Found', { status: 404 })
      }

      // this could be any other exception from `fetch()` *or* an exception
      // thrown by the called worker (e.g. if the dispatched worker has
      // `throw MyException()`, you could check for that here).
      return new Response((e as Error).message, { status: 500 })
    }
  }
}

