import { env, WorkerEntrypoint } from 'cloudflare:workers'

const db: any = env.db



export default class extends WorkerEntrypoint {

  async do(request: Request, path: string, args: any) {
    // TODO: Implement Auth with WorkOS for RBAC and FGA
    const { origin, hostname, pathname } = new URL(request.url)
    const reqId = request.headers.get('ray')
    const worker = env.do.get(hostname) as any
    const result = await worker.rpc(path, args)
    this.ctx.waitUntil(db.set(`https://${origin}/_${pathname}`, result))
    
  }

  async fetch(request: Request) {
    const { pathname } = new URL(request.url)
    return Response.json(await this.search(pathname.slice(1) as any))


    ;
    return await worker.fetch(req);
  }
}

