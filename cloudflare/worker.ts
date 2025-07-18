import { env, WorkerEntrypoint } from 'cloudflare:workers'
import Cloudflare from 'cloudflare'

const cloudflare = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN
})
const account_id = 'b6641681fe423910342b9ffa1364c76d'

const worker = /* js */ `

import { env, WorkerEntrypoint } from 'cloudflare:workers'

globalThis.env = env
globalThis.$ = env.$

// import * as pkg from './index.mjs'

// import def, * as mod from './index.mjs'
// const pkg = { ...def, ...mod }
const pkg = await import('./index.mjs')

const exports = Object.keys(pkg)

class RPC extends WorkerEntrypoint { 
  constructor() {
    super()
    for (const key of Reflect.ownKeys(pkg)) {
      const isFunction = typeof pkg[key] === 'function'
      this[key] = isFunction ? pkg[key].bind(this) : () => pkg[key]
    }
  }
  async fetch(request) {
    try {
      return await pkg.default?.fetch ? pkg.default.fetch(request) : Response.json({ exports }) // fetch(request)
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    // return Response.json({ exports })
  }
}

// for (const key of Reflect.ownKeys(pkg)) {
//   if (key === 'default') continue;
//   const desc = { enumerable: false, configurable: true, get() { return pkg[key] } };     
//   (typeof pkg[key] === 'function'
//     ? Object.defineProperty(RPC.prototype, key, desc)
//     : Object.defineProperty(RPC, key, desc));
// }

export default RPC

`

export default class extends WorkerEntrypoint {

  async deployWorker(name: string, module: string) {
    const result = await cloudflare.workersForPlatforms.dispatch.namespaces.scripts.update(
      'do',
      name,
      {
        account_id,
        files: {
          'worker.mjs': new File([worker], 'worker.mjs', { type: 'application/javascript+module' }),
          'index.mjs': new File([module], 'index.mjs', { type: 'application/javascript+module' }),
        },
        metadata: {
          main_module: 'worker.mjs',
          compatibility_date: '2025-07-08',
          tail_consumers: [{ service: 'pipeline' }],
          bindings: [
            { type: 'version_metadata', name: 'version' },
            { type: 'service', name: '$', service: 'do', environment: 'production' },
          ]
        }
      }
    )
    console.log(result)
    this.ctx.waitUntil(
      env.pipeline.send([{
        type: 'Worker.Deployed',
        ...result,
        module,
      }])
    )
    return result
  }
  
  getWorker(name: string) {
    return cloudflare.workersForPlatforms.dispatch.namespaces.scripts.content.get('do', name, { account_id })
  }

  async fetch(request: Request) {
    try {
      const { pathname } = new URL(request.url)
      let name = pathname.slice(1)
      if (name === '') name = 'sum'
      // const worker = await this.getWorker(name).then(res => res.text())
      // return new Response(worker, { headers: { 'Content-Type': 'application/javascript' } })
      const start = Date.now()
      const worker = await this.deployWorker(name, /* js */ `

export const sum=(a,b)=>a+b
// export default { }
export default { 
  fetch: async request => {
    await $.do('a thing', 'for', { a: 1, b: 2 })
    await $.do('something', 'else', { a: 1, b: 2 })
    console.log({ testing: 123 })
    return fetch('https://example.com') 
  }
}

      `)
      const deployTime = Date.now() - start
      return Response.json({ name, worker, deployTime })
    }
    catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}
