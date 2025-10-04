/**
 * Mock for cloudflare:workers module
 */

export class WorkerEntrypoint<Env = any> {
  env: Env
  ctx: any

  constructor(ctx: any, env: Env) {
    this.ctx = ctx
    this.env = env
  }
}
