/**
 * Mock for cloudflare:workers module
 */

export class WorkerEntrypoint<Env> {
  constructor(public ctx: any, public env: Env) {}
}

export class DurableObject<Env> {
  constructor(public state: any, public env: Env) {}
}
