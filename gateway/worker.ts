// import { Hono } from 'hono'
import { env } from 'cloudflare:workers'

const { yaml } = env as any

// const app = new Hono()

// app.get('/', async (c) => {
//   return new Response(await yaml.stringify({ hello: 'world', items: [1, 2, 3] }))
//   // return c.json({ hello: 'world' })
// })

// export default app

export default {
  fetch: async () => {
    const result = await yaml.testing('123').catch((e: any) => ({ error: e.message, stack: e.stack }))
    console.log(result)
    return new Response(await yaml.stringify({ hello: 'world', items: [1, 2, 3], result }))
  }
}