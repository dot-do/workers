import { stringify } from 'yaml'
import { ulid as generateULID } from 'ulid'
import { clickhouse, sql } from './sql'
import { WorkerEntrypoint } from 'cloudflare:workers'


export default class extends WorkerEntrypoint<Env> {
  
  async fetch(request: Request) {
    const { url, method } = request
    let cf = Object.fromEntries(Object.entries(request.cf ?? {}).filter(([key]) => !key.startsWith('tls')))
    const { hostname, pathname } = new URL(url)
    // const headers = Object.fromEntries(request.headers)
    const userAgent = request.headers.get('user-agent')
    // this.ctx.waitUntil(this.send(hostname, 'WebRequest', { method, url, userAgent, cf }))
    return Response.json(await this.events(hostname))
  }

  async get(ns: string, id: string) {
    return sql`SELECT * FROM data WHERE ns = ${ns} AND id = ${id}`
  }

  async list(ns: string) {
    return sql`SELECT id FROM data WHERE id LIKE ${'https://' + ns + '%'}`
  }


  async events(ns: string) {
    return sql`SELECT ulid, type, id, data FROM events WHERE id LIKE ${'https://' + ns + '%'} ORDER BY id DESC LIMIT 100`
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

  async insertMany(values: any[], opts: { ns: string, type: string, versioned?: boolean }) {
    const events = values.map(value => {
      const ulid = generateULID()
      let { $id, id, $context, $meta, meta, $type, type, $content, content, data, ...rest } = value
      if (!id) id = $id ?? ulid
      if (!id.startsWith('https://')) id = 'https://' + opts.ns + '/' + id
      if (!type) type = $type ?? type
      if (!data) data = rest
      if (!content) content = $content ?? content ?? ('---\n' + stringify(data) + '---\n')
      if (!content.startsWith('---')) content = '---\n' + stringify(data) + '---\n' + content
      return { 
        ulid, 
        type: opts.versioned ? 'UpsertVersion' : 'Upsert', 
        object: { id, type, data, content, meta }
      }
    })
    this.env.pipeline.send(events)
  }


  clickhouse() {
    return clickhouse
  }


  async insert(args: Parameters<typeof clickhouse.insert>[0]) {
    return clickhouse.insert(args)
  }

  query(args: Parameters<typeof clickhouse.query>[0]) {
    return clickhouse.query(args)
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
