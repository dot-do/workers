import { env, WorkerEntrypoint } from 'cloudflare:workers'
import { ulid as generateULID } from 'ulid'

export default class extends WorkerEntrypoint {


  // save(data: any) {
  //   const { pathname } = new URL(request.url)
  //   const name = pathname.slice(1)
  //   const worker = await this.getWorker(name).then(res => res.json())
  //   const deployTime = Date.now() - start
  //   return Response.json({ name, worker, deployTime })
  // }

  // send(data: any) {
  //   const { pathname } = new URL(request.url)
  //   const name = pathname.slice(1)
  //   const worker = await this.getWorker(name).then(res => res.json())
  //   const deployTime = Date.now() - start
  //   return Response.json({ name, worker, deployTime })
  // }

  async fetch(request: Request) {
    try {
      const { url, method } = request
      const { origin, hostname, pathname, searchParams } = new URL(request.url)
      const headers = Object.fromEntries(request.headers)
      const query = Object.fromEntries(searchParams)
      let body: any
      try {
        body = await request.text()
        body = JSON.parse(body)
      }
      catch (error) { }
      const ulid = generateULID()
      const event = {
        $context: origin,
        $id: ulid,
        $type: 'Webhook.Received',
        type: 'Webhook.Received',
        timestamp: new Date().toISOString(),
        url,
        method,
        origin,
        hostname,
        pathname,
        query,
        body,
        headers,
        ulid,
      }
      const result = await env.pipeline.send([event])
      return Response.json({ success: true, result })
    }
    catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
  }

}
