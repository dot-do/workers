import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['**/*.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  target: 'es2022',
  // outfile: 'out.js',
})