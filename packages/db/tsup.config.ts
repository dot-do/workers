import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'rpc/index': 'src/rpc/index.ts',
    'mcp/index': 'src/mcp/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['agents', 'wrangler'],
})
