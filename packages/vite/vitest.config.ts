import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const __dirname = new URL('.', import.meta.url).pathname

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: resolve(__dirname),
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000, // 60 seconds for build tests
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@dotdo/vite': resolve(__dirname, './src/index.ts'),
    },
  },
})
