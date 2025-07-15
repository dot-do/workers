import { env } from 'cloudflare:workers'


export const toMarkdown = env?.ai?.toMarkdown as any