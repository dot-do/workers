import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/node.ts', 'src/cli.ts'],
	format: ['esm'],
	dts: {
		entry: ['src/index.ts', 'src/node.ts'],
	},
	splitting: false,
	sourcemap: true,
	clean: true,
	treeshake: true,
	minify: false,
	outDir: 'dist',
	// Don't bundle native modules or heavy dependencies - they must be required at runtime
	external: ['keytar', 'open'],
})
