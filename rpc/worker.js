import { WorkerEntrypoint } from 'cloudflare:workers'
import def, * as mod from './pkg'
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