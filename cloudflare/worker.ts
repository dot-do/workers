import { env, WorkerEntrypoint } from 'cloudflare:workers'
import Cloudflare from 'cloudflare'

const cloudflare = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN
})

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
        account_id: 'b6641681fe423910342b9ffa1364c76d',
        files: {
          'index.mjs': new File([module], 'index.mjs', { type: 'application/javascript' }),
          'worker.mjs': new File([worker], 'worker.mjs', { type: 'application/javascript' })
        },
        metadata: {
          main_module: 'worker.mjs',
          compatibility_date: '2025-07-08'
        }
      }
    )
  }

  fetch() {
    return Response.json({ success: true })
  }
}
