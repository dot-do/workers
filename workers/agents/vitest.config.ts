import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '../src/agents.js': resolve(__dirname, './src/agents.ts'),
      './helpers.js': resolve(__dirname, './test/helpers.ts'),
    },
  },
})
