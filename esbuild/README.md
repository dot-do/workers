# esbuild

# ESBuild Worker

A Cloudflare Worker that provides on-demand JavaScript/TypeScript compilation and transformation using esbuild-wasm.

## Features

- ✅ **Fast Compilation** - Ultra-fast TypeScript to JavaScript transformation
- ✅ **Format Conversion** - Convert between ESM, CommonJS, and IIFE
- ✅ **Minification** - Minify JavaScript code
- ✅ **JSX/TSX Support** - Transform React/JSX components
- ✅ **Source Maps** - Generate source maps for debugging
- ✅ **Tree Shaking** - Remove unused code
- ✅ **WASM-Based** - Runs entirely in WebAssembly for portability

## Use Cases

**TypeScript Compilation:**
- Compile TypeScript to JavaScript on-the-fly
- Support for latest TypeScript features
- Fast iteration during development

**Code Transformation:**
- Convert ESM to CommonJS for legacy systems
- Bundle multiple modules into single file
- Minify production code

**Development Tools:**
- Live code playgrounds
- Online TypeScript editors
- Build-free development environments

## API

**Transform Code:**
```javascript
const code = `
  const greeting: string = "Hello, TypeScript!"
  console.log(greeting)
`

const result = await build(code, {
  loader: 'ts',
  format: 'esm',
  target: 'es2020'
})

console.log(result) // Compiled JavaScript
```

**Transform with Options:**
```javascript
await build(code, {
  loader: 'tsx',          // tsx, ts, jsx, js
  format: 'esm',          // esm, cjs, iife
  target: 'es2020',       // es2015, es2020, esnext
  minify: true,           // Minify output
  sourcemap: 'inline',    // Generate source map
  jsx: 'automatic',       // JSX transform mode
})
```

## Usage

This worker is designed to be called via RPC from other workers:

```javascript
// In your wrangler.jsonc
{
  "services": [
    { "binding": "ESBUILD_SERVICE", "service": "esbuild" }
  ]
}

// In your worker
const compiled = await env.ESBUILD_SERVICE.build(code, {
  loader: 'ts',
  format: 'esm'
})
```

## Dependencies

- `esbuild-wasm` (latest) - WebAssembly build of esbuild compiler

## Performance

- **Initialization:** ~50ms (one-time WASM load)
- **Transform:** ~10-50ms per file (depending on size)
- **Memory:** Low footprint, suitable for edge compute

## Limitations

- WASM binary loaded from CDN (https://unpkg.com/esbuild-wasm)
- No file system access (single-file transforms only)
- No plugin support (native esbuild features only)

## Implementation

---

**Generated from:** esbuild.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts esbuild.mdx`
