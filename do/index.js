import { env } from 'cloudflare:workers'


export const db = new Proxy({}, {
  get(target, key) {
    return async (...args) => {
      const response = await fetch(`https://${env.DB_HOST}/api/v1/do/${key}?args=${JSON.stringify(args)}`)
      return response.json()
    }
  }
})