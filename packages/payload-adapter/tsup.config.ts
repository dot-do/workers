import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Skip TypeScript declarations for now due to RPC adapter type issues
  clean: true,
  sourcemap: true,
  external: [
    'payload',
    '@payloadcms/db-sqlite',
    '@payloadcms/db-d1-sqlite',
    'drizzle-orm',
    'libsql',
    'gray-matter',
    'zod'
  ]
})
