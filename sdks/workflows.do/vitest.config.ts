import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'rpc.do': resolve(__dirname, '../rpc.do/index.ts'),
      'ai-workflows': resolve(__dirname, '../../primitives/packages/ai-workflows/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
  },
})
