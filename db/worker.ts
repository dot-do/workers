// import { stringify } from 'yaml'
import { ulid } from 'ulid'
import { clickhouse, sql } from './sql'
import { WorkerEntrypoint } from 'cloudflare:workers'


export default class extends WorkerEntrypoint {
  
  async fetch(request: Request) {
    const { url, method } = request
    let cf = Object.fromEntries(Object.entries(request.cf ?? {}).filter(([key]) => !key.startsWith('tls')))
    const { hostname, pathname } = new URL(url)
    // const headers = Object.fromEntries(request.headers)
    const userAgent = request.headers.get('user-agent')
    this.ctx.waitUntil(this.send(hostname, 'WebRequest', { method, url, userAgent, cf }))
    return Response.json(await this.events(hostname))
  }

  async get(ns: string, id: string) {
    return sql`SELECT * FROM data WHERE ns = ${ns} AND id = ${id}`
  }

  async list(ns: string) {
    return sql`SELECT url FROM data WHERE ns = ${ns}`
  }


  async events(ns: string) {
    return sql`SELECT url as id, data FROM events WHERE ns = ${ns} ORDER BY id DESC LIMIT 100`
  }

  async set(ns: string, id: string, data: any, content?: string) {
    return clickhouse.insert({
      table: 'data',
      values: [{ ns, id, data, content }],
      format: 'JSONEachRow',
      clickhouse_settings: {

      }
    })
  }

  async send(ns: string, type: string, data: Record<string, any>) {
    // const type = event.$type ?? event.type ?? 'Action'
    // // const id = event.$id ??event.id ?? event.url
    const id = ulid()
    // const data = event.data ?? event.body

    return clickhouse.insert({
      table: 'events',
      values: [{ ns, id, type, data }],
      format: 'JSONEachRow',
      clickhouse_settings: {
        async_insert: 1,
        
      }
    })
  }

  clickhouse() {
    return clickhouse
  }

  async sql(strings: TemplateStringsArray, ...values: unknown[]) {
    return sql(strings, ...values)
  }

  async $() {
    return fetch('https://ctx.do/api')
  }

  // async delete(ns: string, id: string) {
  //   return sql`DELETE FROM data WHERE ns = ${ns} AND id = ${id}`
  // }
}
