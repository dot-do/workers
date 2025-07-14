import { env, WorkerEntrypoint } from 'cloudflare:workers'

const db: any = env.db



export default class extends WorkerEntrypoint {

  async do(path: string, args: any) {
    const { pathname } = new URL(request.url)
    return Response.json(await this.search(pathname.slice(1) as any))
  }

  async fetch(request: Request) {
    const { pathname } = new URL(request.url)
    return Response.json(await this.search(pathname.slice(1) as any))
  }
}