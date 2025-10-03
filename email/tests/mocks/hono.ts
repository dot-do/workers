/**
 * Mock for Hono
 */

export class Hono {
  routes: any[] = []

  use(path: string, handler: any) {
    this.routes.push({ method: 'USE', path, handler })
  }

  get(path: string, handler: any) {
    this.routes.push({ method: 'GET', path, handler })
  }

  post(path: string, handler: any) {
    this.routes.push({ method: 'POST', path, handler })
  }

  fetch(request: any, env: any, ctx: any) {
    return new Response('OK')
  }
}

export const cors = () => (c: any, next: any) => next()
