/**
 * create-do - Programmatic API for creating .do services
 */

import { mkdir, writeFile, readdir, copyFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface CreateDOOptions {
  template?: 'basic' | 'database' | 'messaging' | 'filesystem' | 'analytics'
  dir?: string
  beads?: boolean
  git?: boolean
}

export async function createDO(name: string, options: CreateDOOptions = {}): Promise<void> {
  const {
    template = 'basic',
    dir = `./${name}`,
    beads = true,
    git = true,
  } = options

  console.log(`\n🚀 Creating ${name}.do with template: ${template}\n`)

  // Create directory structure
  await mkdir(dir, { recursive: true })
  await mkdir(join(dir, 'src'), { recursive: true })
  await mkdir(join(dir, 'src', 'core'), { recursive: true })
  await mkdir(join(dir, 'src', 'durable-object'), { recursive: true })
  await mkdir(join(dir, 'src', 'mcp'), { recursive: true })

  // Generate package.json
  const packageJson = generatePackageJson(name, template)
  await writeFile(join(dir, 'package.json'), JSON.stringify(packageJson, null, 2))

  // Generate tsconfig.json
  await writeFile(join(dir, 'tsconfig.json'), generateTsConfig())

  // Generate wrangler.toml
  await writeFile(join(dir, 'wrangler.toml'), generateWranglerToml(name))

  // Generate source files based on template
  const files = await generateTemplateFiles(name, template)
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(dir, path)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content)
  }

  // Generate README.md
  await writeFile(join(dir, 'README.md'), generateReadme(name, template))

  // Generate AGENTS.md
  await writeFile(join(dir, 'AGENTS.md'), generateAgentsMd(name))

  // Initialize beads
  if (beads) {
    await initBeads(dir, name)
  }

  // Initialize git
  if (git) {
    await initGit(dir)
  }

  console.log(`✅ Created ${name}.do in ${dir}`)
  console.log(`
Next steps:
  cd ${dir}
  npm install
  npm run dev

To deploy:
  npm run deploy
`)
}

function generatePackageJson(name: string, template: string): Record<string, unknown> {
  return {
    name: `${name}.do`,
    version: '0.0.1',
    description: `${name} service on Cloudflare Durable Objects`,
    type: 'module',
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
      './do': {
        types: './dist/durable-object/index.d.ts',
        import: './dist/durable-object/index.js',
      },
      './mcp': {
        types: './dist/mcp/index.d.ts',
        import: './dist/mcp/index.js',
      },
    },
    scripts: {
      build: 'tsup',
      dev: 'wrangler dev',
      deploy: 'wrangler deploy',
      test: 'vitest run',
      'test:watch': 'vitest',
    },
    devDependencies: {
      '@cloudflare/workers-types': '^4.20240925.0',
      tsup: '^8.5.1',
      typescript: '^5.6.0',
      vitest: '^3.2.4',
      wrangler: '^3.0.0',
    },
    dependencies: {
      hono: '^4.0.0',
    },
  }
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022'],
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedIndexedAccess: true,
        declaration: true,
        declarationMap: true,
        outDir: './dist',
        types: ['@cloudflare/workers-types'],
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  )
}

function generateWranglerToml(name: string): string {
  const doName = name.charAt(0).toUpperCase() + name.slice(1) + 'DO'
  return `name = "${name}-do"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "${name.toUpperCase()}"
class_name = "${doName}"

[[migrations]]
tag = "v1"
new_classes = ["${doName}"]
`
}

async function generateTemplateFiles(
  name: string,
  template: string
): Promise<Record<string, string>> {
  const doName = name.charAt(0).toUpperCase() + name.slice(1) + 'DO'

  const files: Record<string, string> = {}

  // Core index.ts (entry point)
  files['src/index.ts'] = `export { ${doName} } from './durable-object/index.js'
export { ${name}Tools, invokeTool } from './mcp/index.js'
export * from './core/types.js'
`

  // Types
  files['src/core/types.ts'] = generateTypesFile(name, template)

  // Errors
  files['src/core/errors.ts'] = generateErrorsFile(name)

  // Durable Object
  files['src/durable-object/index.ts'] = generateDOFile(name, doName, template)

  // MCP tools
  files['src/mcp/index.ts'] = generateMCPFile(name, template)

  return files
}

function generateTypesFile(name: string, template: string): string {
  const base = `/**
 * ${name}.do - Type definitions
 */

export interface ${name.charAt(0).toUpperCase() + name.slice(1)}Options {
  /** Timeout for operations in milliseconds */
  timeout?: number
}

export interface Env {
  ${name.toUpperCase()}: DurableObjectNamespace
  R2_BUCKET?: R2Bucket
}
`

  if (template === 'database') {
    return (
      base +
      `
export interface QueryResult<T = unknown> {
  data: T[]
  count: number
}

export interface TableSchema {
  name: string
  columns: ColumnDefinition[]
}

export interface ColumnDefinition {
  name: string
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
}
`
    )
  }

  return base
}

function generateErrorsFile(name: string): string {
  const prefix = name.toUpperCase()
  return `/**
 * ${name}.do - Error classes
 */

export class ${name.charAt(0).toUpperCase() + name.slice(1)}Error extends Error {
  code: string

  constructor(code: string, message: string) {
    super(\`\${code}: \${message}\`)
    this.name = '${name.charAt(0).toUpperCase() + name.slice(1)}Error'
    this.code = code
  }
}

export class ${prefix}_NOT_FOUND extends ${name.charAt(0).toUpperCase() + name.slice(1)}Error {
  constructor(resource: string) {
    super('${prefix}_NOT_FOUND', \`Resource not found: \${resource}\`)
  }
}

export class ${prefix}_INVALID_INPUT extends ${name.charAt(0).toUpperCase() + name.slice(1)}Error {
  constructor(message: string) {
    super('${prefix}_INVALID_INPUT', message)
  }
}
`
}

function generateDOFile(name: string, doName: string, template: string): string {
  return `/**
 * ${name}.do - Durable Object
 */

import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { Env } from '../core/types.js'

const SCHEMA = \`
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);
\`

export class ${doName} extends DurableObject<Env> {
  private app: Hono
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.app = new Hono()
    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.app.post('/rpc', async (c) => {
      const { method, params } = await c.req.json()
      const result = await this.handleMethod(method, params)
      return c.json(result)
    })

    this.app.get('/health', (c) => c.json({ status: 'ok' }))
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    await this.ctx.storage.sql.exec(SCHEMA)
    this.initialized = true
  }

  private async handleMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'ping':
        return { pong: true, timestamp: Date.now() }
      default:
        throw new Error(\`Unknown method: \${method}\`)
    }
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized()
    return this.app.fetch(request)
  }
}
`
}

function generateMCPFile(name: string, template: string): string {
  return `/**
 * ${name}.do - MCP Tools for AI
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const ${name}Tools: McpTool[] = [
  {
    name: '${name}_ping',
    description: 'Check if ${name}.do is running',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

export async function invokeTool(
  name: string,
  params: Record<string, unknown>,
  stub: DurableObjectStub
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const response = await stub.fetch('http://internal/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: name.replace('${name}_', ''), params }),
    })
    const result = await response.json()
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: \`Error: \${error instanceof Error ? error.message : 'Unknown'}\` }],
      isError: true,
    }
  }
}
`
}

function generateReadme(name: string, template: string): string {
  return `# ${name}.do

${name} service on Cloudflare Durable Objects.

## Installation

\`\`\`bash
npm install ${name}.do
\`\`\`

## Quick Start

\`\`\`typescript
import { ${name.charAt(0).toUpperCase() + name.slice(1)}DO } from '${name}.do'

// In your worker
export { ${name.charAt(0).toUpperCase() + name.slice(1)}DO }

export default {
  async fetch(request, env) {
    const id = env.${name.toUpperCase()}.idFromName('default')
    const stub = env.${name.toUpperCase()}.get(id)
    return stub.fetch(request)
  }
}
\`\`\`

## MCP Tools

\`\`\`typescript
import { ${name}Tools, invokeTool } from '${name}.do/mcp'

// List available tools
console.log(${name}Tools.map(t => t.name))

// Invoke a tool
const result = await invokeTool('${name}_ping', {}, stub)
\`\`\`

## Architecture

\`\`\`
+----------------------+
|   ${name}.do Worker    |
+----------------------+
          |
+----------------------+
| ${name.charAt(0).toUpperCase() + name.slice(1)}DO (SQLite+R2) |
+----------------------+
\`\`\`

## License

MIT
`
}

function generateAgentsMd(name: string): string {
  return `# ${name}.do - AI Agent Instructions

## Working on ${name}.do

### Beads Workflow

\`\`\`bash
cd rewrites/${name}
bd ready           # Find available work
bd show <id>       # Review issue details
bd update <id> --status=in_progress  # Claim work
bd close <id>      # Complete work
bd sync            # Push to remote
\`\`\`

### TDD Workflow

All work follows RED-GREEN-REFACTOR:

1. **[RED]** Write failing test first
2. **[GREEN]** Implement minimal code to pass
3. **[REFACTOR]** Clean up without changing behavior

### Session Close Protocol

Before completing work:
\`\`\`bash
git status
bd sync
git add .
git commit -m "feat(${name}): description"
bd sync
git push
\`\`\`
`
}

async function initBeads(dir: string, name: string): Promise<void> {
  const beadsDir = join(dir, '.beads')
  await mkdir(beadsDir, { recursive: true })

  await writeFile(
    join(beadsDir, 'config.yaml'),
    `prefix: ${name}
issue_types:
  - bug
  - feature
  - task
  - epic
  - chore
statuses:
  - open
  - in_progress
  - blocked
  - closed
`
  )

  await writeFile(join(beadsDir, 'issues.jsonl'), '')
  await writeFile(join(beadsDir, 'interactions.jsonl'), '')
  await writeFile(
    join(beadsDir, 'metadata.json'),
    JSON.stringify({ version: 1, created: new Date().toISOString() }, null, 2)
  )

  console.log('📦 Initialized beads issue tracking')
}

async function initGit(dir: string): Promise<void> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    await execAsync('git init', { cwd: dir })
    await writeFile(
      join(dir, '.gitignore'),
      `node_modules/
dist/
.wrangler/
.dev.vars
*.local.*
`
    )
    await writeFile(join(dir, '.gitattributes'), '.beads/issues.jsonl merge=union\n')
    console.log('📦 Initialized git repository')
  } catch {
    console.log('⚠️  Git initialization skipped (git not available)')
  }
}
