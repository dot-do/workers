import { WorkerEntrypoint } from 'cloudflare:workers'
import def, * as mod from './utils'
const pkg = { ...def, ...mod } as any

class RPC extends WorkerEntrypoint {
  constructor() {
    super({} as any, {} as any)
  }

  async fetch(request: Request) {
    const { origin, pathname, searchParams } = new URL(request.url)
    const args = Object.fromEntries(searchParams)
    
    const fn = pathname.slice(1)

    if (pkg[fn]) {
      try {
        return Response.json(await pkg[fn](args))
      } catch (error) {
        return Response.json({ success: false, error: (error as Error).message })
      }
    }

    return Response.json(Object.keys(pkg).map(key => origin + '/' + key))
  }
}

for (const key of Reflect.ownKeys(pkg)) {
  if (key === 'default') continue;
  const desc = { enumerable: false, configurable: true, get() { return pkg[key] } };     
  (typeof pkg[key] === 'function'
    ? Object.defineProperty(RPC.prototype, key, desc)
    : Object.defineProperty(RPC, key, desc));
}

export default RPC