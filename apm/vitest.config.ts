import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        DB: {},
        METRICS: {},
        TRACES: {},
        LOGS: {},
        RUM: {},
        ALERT_STATE: {},
        SAMPLING_STATE: {},
        AI: {}
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    }
  }
})
