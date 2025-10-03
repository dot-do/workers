import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        miniflare: {
          // Minimal config for unit tests - bindings are mocked in tests
          compatibilityDate: '2025-07-09',
        },
      },
    },
  },
})
