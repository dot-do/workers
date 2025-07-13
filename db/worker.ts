import { Hono } from 'hono'
import { stringify } from 'yaml'
import { clickhouse, sql } from './sql'

const app = new Hono()

app.all('*', async (c, next) => {
  console.log(c.req.raw.cf?.colo)
  if (c.req.raw.cf?.colo !== 'IAD') {
    for (let i = 0; i < 4; i++) {
      await fetch('https://ast-us-east-1-8a1cce82.s3.us-east-1.amazonaws.com/latency-test.json')
    }
  }
  await next()
})

app.get('/', async (c) => {
  const { url } = c.req
  const { hostname } = new URL(url)
  console.log(url)
  const result = await sql`SELECT * from data`
  return c.text('---\n' + stringify({ ns: hostname, url, ...result }, { indent: 2, lineWidth: 120 }) + '---')
})

app.get('/:id', async (c) => {
  const { url } = c.req
  const { hostname } = new URL(url)
  console.log(url)
  const result = await sql`SELECT 1`
  return c.json({ ns: hostname, url, ...result })
})



export default app

