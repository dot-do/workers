import { WorkerEntrypoint } from 'cloudflare:workers'
import { clickhouse, sql } from './sql'

export class DB extends WorkerEntrypoint {

  async get(ns: string, id: string) {
    return sql`SELECT * FROM data WHERE ns = ${ns} AND id = ${id}`
  }

  async set(ns: string, id: string, data: any, content?: string) {
    return clickhouse.insert({
      table: 'data',
      values: { ns, id, data, content },
      clickhouse_settings: {

      }
    })
  }

  async $() {
    return fetch('https://ctx.do/api')
  }



  async delete(ns: string, id: string) {
    return sql`DELETE FROM data WHERE ns = ${ns} AND id = ${id}`
  }
}
