import { WorkerEntrypoint } from 'cloudflare:workers'
import * as esbuild from 'esbuild-wasm'

let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    await esbuild.initialize({
      worker: true,
      wasmURL: 'https://unpkg.com/esbuild-wasm/esbuild.wasm',
    })
    initialized = true
  }
}

/**
 * ESBuild Service - RPC wrapper for esbuild-wasm compilation
 */
export default class extends WorkerEntrypoint {
  async build(code: string, options: any = {}) {
    await ensureInitialized()
    const result = await esbuild.transform(code, options)
    return result.code
  }

  async transform(code: string, options: any = {}) {
    await ensureInitialized()
    const result = await esbuild.transform(code, options)
    return result
  }

  fetch() {
    return Response.json({ success: true })
  }
}
