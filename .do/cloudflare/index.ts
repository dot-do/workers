import Cloudflare from 'cloudflare'

const cloudflare = new Cloudflare({
  // apiToken: env.CLOUDFLARE_API_TOKEN
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
// import package from './package.json' with { type: 'json' }

const exports = Object.keys(pkg)

class RPC extends WorkerEntrypoint { 
  constructor(env, ctx) {
    super(env, ctx)
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

export async function deployWorker(name: string, module: string, ns: string = 'do') {
  const result = await cloudflare.workersForPlatforms.dispatch.namespaces.scripts.update(
    'do',
    name,
    {
      account_id,
      files: {
        'worker.mjs': new File([worker], 'worker.mjs', { type: 'application/javascript+module' }),
        'index.mjs': new File([module], 'index.mjs', { type: 'application/javascript+module' }),
        // 'package.json': new File([JSON.stringify({ test: 123, version: '1.0.0' })], 'package.json', { type: 'application/json' }),
      },
      metadata: {
        main_module: 'worker.mjs',
        compatibility_date: '2025-07-08',
        tail_consumers: [{ service: 'pipeline' }],
        bindings: [
          { type: 'version_metadata', name: 'version' },
          { type: 'service', name: '$', service: 'do', environment: 'production' },
          { type: 'plain_text', name: 'name', text: name },
          // { type: 'plain_text', name: 'version', text: '1.0.0' },
          { type: 'plain_text', name: 'ns', text: ns },
        ]
      }
    }
  )
  console.info('Worker.Deployed', result)
  // TODO: add waitUntil to $ binding
  // this.ctx.waitUntil(
  //   env.pipeline.send([{
  //     type: 'Worker.Deployed',
  //     ...result,
  //     module,
  //   }])
  // )
  return result
}