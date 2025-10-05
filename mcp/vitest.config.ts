import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc'
        },
        miniflare: {
          // Mock service bindings for tests
          serviceBindings: {
            DB: async (request) => {
              // Mock DB service responses
              return new Response(JSON.stringify({
                success: true,
                results: []
              }), {
                headers: { 'Content-Type': 'application/json' }
              })
            },
            DO: async (request) => {
              // Mock DO service responses
              return new Response(JSON.stringify({
                success: true
              }), {
                headers: { 'Content-Type': 'application/json' }
              })
            }
          },
          // Disable Durable Objects for unit tests (requires real container runtime)
          durableObjects: {}
        }
      }
    }
  }
})
