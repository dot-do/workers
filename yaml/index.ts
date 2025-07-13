import { WorkerEntrypoint } from 'cloudflare:workers'
import { parse, stringify } from 'yaml'

export default class extends WorkerEntrypoint {

  parse(...args: Parameters<typeof parse>) {
    return parse(...args)
  }

  stringify(...args: Parameters<typeof stringify>) {
    return stringify(...args)
  }

}
