import * as esbuild from 'esbuild-wasm'

await esbuild.initialize({
  worker: true,
  wasmURL: 'https://unpkg.com/esbuild-wasm/esbuild.wasm',
})

export const build = async (code, options) => {
  const result = await esbuild.transform(code, options)
  return result.code
}
