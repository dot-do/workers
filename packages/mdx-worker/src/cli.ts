#!/usr/bin/env node
/**
 * @dotdo/mdx-worker CLI
 *
 * Build MDX files into Cloudflare Workers.
 *
 * Usage:
 *   mdx-worker build <input.mdx> [options]
 *   mdx-worker parse <input.mdx>
 *   mdx-worker init <name>
 *
 * Options:
 *   --out, -o <dir>       Output directory (default: dist)
 *   --no-docs             Skip documentation generation
 *   --minify              Minify output
 *   --sourcemap           Generate source maps
 *   --compat-date <date>  Compatibility date (default: today)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import {
  buildMdxWorker,
  parseMdx,
  extractDependencies,
  mergeDependencies,
  type BuildOptions,
} from './index.js'

// ============================================================================
// CLI Arguments Parser
// ============================================================================

interface CliArgs {
  command: string
  input?: string
  name?: string
  outDir: string
  generateDocs: boolean
  minify: boolean
  sourcemap: boolean
  compatibilityDate?: string
  help: boolean
  version: boolean
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    command: '',
    outDir: 'dist',
    generateDocs: true,
    minify: false,
    sourcemap: true,
    help: false,
    version: false,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    switch (arg) {
      case 'build':
      case 'parse':
      case 'init':
        result.command = arg
        if (arg === 'init') {
          result.name = args[++i]
        } else {
          result.input = args[++i]
        }
        break
      case '--out':
      case '-o':
        result.outDir = args[++i]
        break
      case '--no-docs':
        result.generateDocs = false
        break
      case '--minify':
        result.minify = true
        break
      case '--sourcemap':
        result.sourcemap = true
        break
      case '--no-sourcemap':
        result.sourcemap = false
        break
      case '--compat-date':
        result.compatibilityDate = args[++i]
        break
      case '--help':
      case '-h':
        result.help = true
        break
      case '--version':
      case '-v':
        result.version = true
        break
    }
    i++
  }

  return result
}

// ============================================================================
// Commands
// ============================================================================

function showHelp(): void {
  console.log(`
@dotdo/mdx-worker - Build MDX files into Cloudflare Workers

Usage:
  mdx-worker build <input.mdx> [options]    Build an MDX file into a Worker
  mdx-worker parse <input.mdx>              Parse and analyze an MDX file
  mdx-worker init <name>                    Create a new MDX worker template

Options:
  --out, -o <dir>       Output directory (default: dist)
  --no-docs             Skip documentation generation
  --minify              Minify output
  --sourcemap           Generate source maps (default: true)
  --no-sourcemap        Disable source maps
  --compat-date <date>  Compatibility date (default: today)
  --help, -h            Show this help message
  --version, -v         Show version

Example MDX file:

  ---
  name: my-worker
  description: A sample worker
  services:
    - binding: DB
      service: my-database
  dependencies:
    hono: ^4.0.0
  ---

  # My Worker

  This worker handles API requests.

  \`\`\`typescript export
  import { Hono } from 'hono'

  const app = new Hono()

  app.get('/', (c) => c.json({ hello: 'world' }))

  export default app
  \`\`\`

The 'export' marker on code blocks indicates code that should be
compiled into the worker output.
`)
}

function showVersion(): void {
  console.log('@dotdo/mdx-worker v0.0.1')
}

async function buildCommand(args: CliArgs): Promise<void> {
  if (!args.input) {
    console.error('Error: Missing input file')
    console.error('Usage: mdx-worker build <input.mdx>')
    process.exit(1)
  }

  // Read input file
  let source: string
  try {
    source = readFileSync(args.input, 'utf-8')
  } catch (error) {
    console.error(`Error: Could not read file "${args.input}"`)
    process.exit(1)
  }

  console.log(`Building ${args.input}...`)

  // Build options
  const options: BuildOptions = {
    outDir: args.outDir,
    generateDocs: args.generateDocs,
    minify: args.minify,
    sourcemap: args.sourcemap,
    compatibilityDate: args.compatibilityDate,
  }

  // Build the worker
  const result = await buildMdxWorker(source, options)

  // Report errors
  if (result.errors.length > 0) {
    console.error('\nBuild failed with errors:')
    for (const error of result.errors) {
      console.error(`  - ${error.message}`)
      if (error.line) {
        console.error(`    at line ${error.line}${error.column ? `, column ${error.column}` : ''}`)
      }
    }
    process.exit(1)
  }

  // Report warnings
  if (result.warnings.length > 0) {
    console.warn('\nWarnings:')
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`)
    }
  }

  // Create output directory
  const outDir = args.outDir
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  // Write output files
  for (const [filename, content] of Object.entries(result.files)) {
    const filepath = join(outDir, filename)
    const dir = dirname(filepath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filepath, content)
    console.log(`  Created: ${filepath}`)
  }

  // Extract and merge dependencies from code
  if (result.workerCode) {
    const deps = extractDependencies(result.workerCode)
    if (deps.length > 0) {
      console.log(`\nDetected dependencies: ${deps.join(', ')}`)
      if (result.packageJson) {
        const merged = mergeDependencies(result.packageJson, deps)
        const pkgPath = join(outDir, 'package.json')
        writeFileSync(pkgPath, JSON.stringify(merged, null, 2))
        console.log(`  Updated: ${pkgPath}`)
      }
    }
  }

  console.log('\nBuild complete!')
  console.log(`\nNext steps:`)
  console.log(`  cd ${outDir}`)
  console.log('  npm install')
  console.log('  npx wrangler dev')
}

async function parseCommand(args: CliArgs): Promise<void> {
  if (!args.input) {
    console.error('Error: Missing input file')
    console.error('Usage: mdx-worker parse <input.mdx>')
    process.exit(1)
  }

  // Read input file
  let source: string
  try {
    source = readFileSync(args.input, 'utf-8')
  } catch (error) {
    console.error(`Error: Could not read file "${args.input}"`)
    process.exit(1)
  }

  console.log(`Parsing ${args.input}...\n`)

  const parsed = await parseMdx(source)

  // Display frontmatter
  console.log('=== Frontmatter ===')
  if (parsed.frontmatter) {
    console.log(JSON.stringify(parsed.frontmatter, null, 2))
  } else {
    console.log('(none)')
  }

  // Display code blocks
  console.log('\n=== Code Blocks ===')
  console.log(`Total: ${parsed.codeBlocks.length}`)
  console.log(`Exportable: ${parsed.exportableCode.length}`)
  for (let i = 0; i < parsed.codeBlocks.length; i++) {
    const block = parsed.codeBlocks[i]
    console.log(`\n[${i + 1}] ${block.language}${block.export ? ' (export)' : ''}${block.filename ? ` -> ${block.filename}` : ''}`)
    console.log(`    ${block.content.slice(0, 80)}${block.content.length > 80 ? '...' : ''}`)
  }

  // Display prose
  console.log('\n=== Prose ===')
  if (parsed.prose) {
    console.log(parsed.prose.slice(0, 200) + (parsed.prose.length > 200 ? '...' : ''))
  } else {
    console.log('(none)')
  }

  // Display extracted dependencies
  const allCode = parsed.exportableCode.map(b => b.content).join('\n')
  const deps = extractDependencies(allCode)
  if (deps.length > 0) {
    console.log('\n=== Detected Dependencies ===')
    console.log(deps.join(', '))
  }
}

function initCommand(args: CliArgs): void {
  const name = args.name || 'my-worker'
  const dir = name

  if (existsSync(dir)) {
    console.error(`Error: Directory "${dir}" already exists`)
    process.exit(1)
  }

  console.log(`Creating new MDX worker: ${name}...`)

  // Create directory
  mkdirSync(dir, { recursive: true })

  // Create template MDX file
  const template = `---
name: ${name}
description: A Cloudflare Worker built from MDX
compatibility_date: ${new Date().toISOString().split('T')[0]}
usage_model: bundled
dependencies:
  hono: ^4.0.0
---

# ${name}

This is a Cloudflare Worker built from an MDX file.

## API Endpoints

The worker exposes the following endpoints:

- \`GET /\` - Returns a welcome message
- \`GET /health\` - Health check endpoint

## Implementation

\`\`\`typescript export
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({
    message: 'Hello from ${name}!',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
\`\`\`

## Deployment

\`\`\`bash
# Build the worker
mdx-worker build ${name}.mdx --out dist

# Deploy
cd dist && npx wrangler deploy
\`\`\`
`

  writeFileSync(join(dir, `${name}.mdx`), template)
  console.log(`  Created: ${dir}/${name}.mdx`)

  console.log('\nNext steps:')
  console.log(`  cd ${dir}`)
  console.log(`  mdx-worker build ${name}.mdx`)
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.version) {
    showVersion()
    return
  }

  if (args.help || !args.command) {
    showHelp()
    return
  }

  switch (args.command) {
    case 'build':
      await buildCommand(args)
      break
    case 'parse':
      await parseCommand(args)
      break
    case 'init':
      initCommand(args)
      break
    default:
      console.error(`Unknown command: ${args.command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
