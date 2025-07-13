import { env, WorkerEntrypoint } from 'cloudflare:workers'
import Cloudflare from 'cloudflare'

const cloudflare = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN
})

const worker = /* js */ `

import { WorkerEntrypoint } from 'cloudflare:workers'
import * as module from './index.mjs'

class Worker extends WorkerEntrypoint {
  fetch() {
    return Response.json(Reflect.ownKeys(module))
  }
}

for (const key of Reflect.ownKeys(module)) {
  if (key === 'default') continue;            // skip default export
  const getter = () => module[key];              // preserves live binding

  if (typeof module[key] === 'function') {
    Object.defineProperty(Worker.prototype, key, { get: getter });
  } else {
    Object.defineProperty(Worker, key, { get: getter });
  }
}

export default Worker

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
