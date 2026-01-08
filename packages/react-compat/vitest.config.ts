import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const __dirname = new URL('.', import.meta.url).pathname

export default defineConfig({
  test: {
    globals: true,
    // Use happy-dom for class component tests that need DOM access
    environment: 'happy-dom',
    root: resolve(__dirname),
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      // React compatibility - alias React to our compatibility layer
      // This is critical for @tanstack/react-query integration
      'react': resolve(__dirname, './src/index.ts'),
      'react-dom': resolve(__dirname, './src/dom.ts'),
      'react-dom/client': resolve(__dirname, './src/dom.ts'),
      'react/jsx-runtime': resolve(__dirname, './src/jsx-runtime.ts'),
      'react/jsx-dev-runtime': resolve(__dirname, './src/jsx-dev-runtime.ts'),
      // Direct package aliases for importing from @dotdo/react
      '@dotdo/react': resolve(__dirname, './src/index.ts'),
      '@dotdo/react/compat': resolve(__dirname, './src/index.ts'),
      '@dotdo/react/dom': resolve(__dirname, './src/dom.ts'),
      '@dotdo/react/dom/client': resolve(__dirname, './src/dom.ts'),
      '@dotdo/react/jsx-runtime': resolve(__dirname, './src/jsx-runtime.ts'),
      '@dotdo/react/jsx-dev-runtime': resolve(__dirname, './src/jsx-dev-runtime.ts'),
    },
  },
})
