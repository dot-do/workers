import { env, WorkerEntrypoint } from 'cloudflare:workers'
import Cloudflare from 'cloudflare'

const cloudflare = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN
})
const account_id = 'b6641681fe423910342b9ffa1364c76d'

const worker = /* js */ `

import { WorkerEntrypoint } from 'cloudflare:workers'
import def, * as mod from './index.mjs'
const pkg = { ...def, ...mod }

class RPC extends WorkerEntrypoint { }

for (const key of Reflect.ownKeys(pkg)) {
  if (key === 'default') continue;
  const desc = { enumerable: false, configurable: true, get() { return pkg[key] } };     
  (typeof pkg[key] === 'function'
    ? Object.defineProperty(RPC.prototype, key, desc)
    : Object.defineProperty(RPC, key, desc));
}

export default RPC

`

export default class extends WorkerEntrypoint {

  deployWorker(name: string, module: string) {
    return cloudflare.workersForPlatforms.dispatch.namespaces.scripts.update(
      'do',
      name,
      {
        account_id,
        files: {
          'worker.mjs': new File([worker], 'worker.mjs', { type: 'application/javascript' }),
          'index.mjs': new File([module], 'index.mjs', { type: 'application/javascript' }),
        },
        metadata: {
          main_module: 'worker.mjs',
          compatibility_date: '2025-07-08'
        }
      }
    )
  }
  
  getWorker(name: string) {
    return cloudflare.workersForPlatforms.dispatch.namespaces.scripts.content.get('do', name, { account_id })
  }

  async fetch(request: Request) {
    try {
      const { pathname } = new URL(request.url)
      const name = pathname.slice(1)
      // const worker = await this.getWorker(name).then(res => res.text())
      // return new Response(worker, { headers: { 'Content-Type': 'application/javascript' } })
      const start = Date.now()
      const worker = await this.deployWorker('test', '') //'export const sum=(a,b)=>a+b')
      const deployTime = Date.now() - start
      return Response.json({ name, worker, deployTime })
    }
    catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}
