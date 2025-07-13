const { env } = await import('cloudflare:workers').catch(() => ({ env: { error: true } }))

export default {

}