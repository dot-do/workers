import { env } from 'cloudflare:workers'

export const get = env.db.get