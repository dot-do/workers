import { WorkerEntrypoint } from 'cloudflare:workers'

export default class extends WorkerEntrypoint {
  async fetch() {
    return new Response('Hello from Worker B')
  }

  add(a, b) {
    return a + b
  }
}