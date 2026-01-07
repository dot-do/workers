import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
  },
  resolve: {
    alias: [
      // Resolve .js imports to .ts files for vitest
      {
        find: /^(\.\.?\/.*)\.js$/,
        replacement: '$1.ts',
      },
    ],
  },
})
