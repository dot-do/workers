import Squids from 'sqids'
import { xxHash32 } from '@taylorzane/hash-wasm'
import { WorkerEntrypoint } from 'cloudflare:workers'

export default class extends WorkerEntrypoint {
  // async fetch() {
  //   return new Response('Hello from Worker B')
  // }

  async xxHash32(data) {
    const hash = await xxHash32(data)
    console.log(hash)
    return hash
  }

  async encodeSqid(data) {
    const sqids = new Squids()
    const hash = await xxHash32(data)
    return sqids.encode([hash])
  }
  
}





