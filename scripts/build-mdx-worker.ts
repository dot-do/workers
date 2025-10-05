#!/usr/bin/env tsx
/**
 * Build MDX Workers
 *
 * Extracts Cloudflare Workers from .mdx files where:
 * - YAML frontmatter contains wrangler configuration
 * - TypeScript code blocks contain the worker implementation
 * - Markdown content is the documentation
 *
 * Usage:
 *   tsx scripts/build-mdx-worker.ts workers/examples/hello-world.mdx
 *   tsx scripts/build-mdx-worker.ts --all  # Build all .mdx workers
 *
 * Output:
 *   workers/hello-world/
 *   ├── wrangler.jsonc      (extracted from frontmatter)
 *   ├── src/
 *   │   └── index.ts        (extracted from code blocks)
 *   └── README.md           (extracted from markdown)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'

interface WorkerFrontmatter {
  $type: 'Worker' | 'Snippet'
  $id: string
  name: string
  main?: string
  compatibility_date?: string
  version?: string
  tier?: 'internal' | 'public' | 'tenant' // 3-tier namespace
  environment?: 'production' | 'staging' | 'development' // Legacy environment
  observability?: any
  services?: any[]
  vars?: Record<string, any>
  [key: string]: any
}

interface ExtractedWorker {
  frontmatter: WorkerFrontmatter
  code: string
  documentation: string
  filePath: string
}

/**
 * Parse an MDX file and extract worker components
 */
function parseMdxWorker(filePath: string): ExtractedWorker {
  const content = fs.readFileSync(filePath, 'utf-8')

  // Extract frontmatter (between --- delimiters)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    throw new Error(`No frontmatter found in ${filePath}`)
  }

  const frontmatterYaml = frontmatterMatch[1]
  const frontmatter = yaml.parse(frontmatterYaml) as WorkerFrontmatter

  // Validate it's a Worker or Snippet type
  if (frontmatter.$type !== 'Worker' && frontmatter.$type !== 'Snippet') {
    throw new Error(`File ${filePath} is not a Worker or Snippet (type: ${frontmatter.$type})`)
  }

  // Extract TypeScript code blocks
  const codeBlockRegex = /```typescript\n([\s\S]*?)```/g
  const codeBlocks: string[] = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push(match[1])
  }

  if (codeBlocks.length === 0) {
    throw new Error(`No TypeScript code blocks found in ${filePath}`)
  }

  // Combine all code blocks (separated by newlines)
  const code = codeBlocks.join('\n\n')

  // Extract markdown content (everything after frontmatter, code blocks removed)
  let documentation = content.replace(frontmatterMatch[0], '').trim()

  // Remove code blocks from documentation
  documentation = documentation.replace(/```typescript\n[\s\S]*?```/g, '').trim()

  return {
    frontmatter,
    code,
    documentation,
    filePath,
  }
}

/**
 * Generate wrangler.jsonc from frontmatter
 */
function generateWranglerConfig(frontmatter: WorkerFrontmatter): string {
  // Extract known wrangler fields
  const config: Record<string, any> = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: frontmatter.name,
    main: frontmatter.main || 'src/index.ts',
    compatibility_date: frontmatter.compatibility_date || '2025-01-01',
  }

  // Add version field if present
  if (frontmatter.version) {
    config.version = frontmatter.version
  }

  // Copy optional fields
  if (frontmatter.account_id) config.account_id = frontmatter.account_id
  if (frontmatter.observability) config.observability = frontmatter.observability
  if (frontmatter.ai) config.ai = frontmatter.ai
  if (frontmatter.assets) config.assets = frontmatter.assets
  if (frontmatter.build) config.build = frontmatter.build
  if (frontmatter.compatibility_flags) config.compatibility_flags = frontmatter.compatibility_flags
  if (frontmatter.node_compat !== undefined) config.node_compat = frontmatter.node_compat
  if (frontmatter.workers_dev !== undefined) config.workers_dev = frontmatter.workers_dev
  if (frontmatter.services) config.services = frontmatter.services
  if (frontmatter.vars) config.vars = frontmatter.vars
  if (frontmatter.env) config.env = frontmatter.env
  if (frontmatter.routes) config.routes = frontmatter.routes
  if (frontmatter.tail_consumers) config.tail_consumers = frontmatter.tail_consumers
  if (frontmatter.kv_namespaces) config.kv_namespaces = frontmatter.kv_namespaces
  if (frontmatter.r2_buckets) config.r2_buckets = frontmatter.r2_buckets
  if (frontmatter.d1_databases) config.d1_databases = frontmatter.d1_databases
  if (frontmatter.queues) config.queues = frontmatter.queues
  if (frontmatter.dispatch_namespaces) config.dispatch_namespaces = frontmatter.dispatch_namespaces
  if (frontmatter.placement) config.placement = frontmatter.placement
  if (frontmatter.pipelines) config.pipelines = frontmatter.pipelines
  if (frontmatter.rules) config.rules = frontmatter.rules

  // Format as JSONC with comments
  const jsonc = JSON.stringify(config, null, '\t')
  const versionNote = frontmatter.version ? ` (version: ${frontmatter.version})` : ''
  const header = `/**\n * ${frontmatter.name} Worker Configuration${versionNote}\n * Generated from ${path.basename(frontmatter.filePath || '')}\n */\n`

  return header + jsonc
}

/**
 * Build a worker or snippet from an MDX file
 */
function buildWorker(mdxPath: string, outputDir?: string): void {
  // Parse MDX file
  const extracted = parseMdxWorker(mdxPath)
  const type = extracted.frontmatter.$type
  const name = extracted.frontmatter.name

  console.log(`Building ${type} from: ${mdxPath}`)

  // Determine output directory
  const outputPath = outputDir || path.join(path.dirname(mdxPath), name)

  if (type === 'Worker') {
    // Build full Cloudflare Worker
    buildFullWorker(outputPath, extracted, mdxPath)
  } else if (type === 'Snippet') {
    // Build ultra-lightweight Cloudflare Snippet
    buildSnippet(outputPath, extracted, mdxPath)
  }
}

/**
 * Build a full Cloudflare Worker
 */
function buildFullWorker(outputPath: string, extracted: ExtractedWorker, mdxPath: string): void {
  const workerName = extracted.frontmatter.name

  // Create directories
  const srcDir = path.join(outputPath, 'src')
  fs.mkdirSync(srcDir, { recursive: true })

  // Write wrangler.jsonc
  const wranglerPath = path.join(outputPath, 'wrangler.jsonc')
  const wranglerConfig = generateWranglerConfig({ ...extracted.frontmatter, filePath: mdxPath })
  fs.writeFileSync(wranglerPath, wranglerConfig)
  console.log(`  ✓ Generated ${wranglerPath}`)

  // Write src/index.ts
  const indexPath = path.join(srcDir, 'index.ts')
  fs.writeFileSync(indexPath, extracted.code)
  console.log(`  ✓ Generated ${indexPath}`)

  // Write README.md
  const readmePath = path.join(outputPath, 'README.md')
  const readmeContent = `# ${workerName}\n\n${extracted.documentation}\n\n---\n\n**Generated from:** ${path.basename(mdxPath)}\n\n**Build command:** \`tsx scripts/build-mdx-worker.ts ${path.relative(process.cwd(), mdxPath)}\`\n`
  fs.writeFileSync(readmePath, readmeContent)
  console.log(`  ✓ Generated ${readmePath}`)

  // Generate deployment metadata
  const tier = extracted.frontmatter.tier
  const environment = extracted.frontmatter.environment
  const version = extracted.frontmatter.version

  if (tier || environment || version) {
    const metadata = {
      type: 'Worker',
      name: workerName,
      tier,
      environment,
      version,
      source: path.basename(mdxPath),
      generatedAt: new Date().toISOString(),
    }

    const metadataPath = path.join(outputPath, '.mdx-metadata.json')
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
    console.log(`  ✓ Generated ${metadataPath}`)
  }

  console.log(`\n✅ Worker built successfully: ${outputPath}`)
  console.log(`\nDeploy with: cd ${path.relative(process.cwd(), outputPath)} && wrangler deploy`)
}

/**
 * Build an ultra-lightweight Cloudflare Snippet
 */
function buildSnippet(outputPath: string, extracted: ExtractedWorker, mdxPath: string): void {
  const snippetName = extracted.frontmatter.name

  // Create output directory
  fs.mkdirSync(outputPath, { recursive: true })

  // Write snippet code directly (no src/ directory needed)
  const snippetPath = path.join(outputPath, 'snippet.js')
  fs.writeFileSync(snippetPath, extracted.code)
  console.log(`  ✓ Generated ${snippetPath}`)

  // Write README.md with deployment instructions
  const readmePath = path.join(outputPath, 'README.md')
  const readmeContent = `# ${snippetName} (Cloudflare Snippet)

${extracted.documentation}

## Deployment Instructions

Cloudflare Snippets must be deployed manually via the Cloudflare Dashboard:

1. **Go to Cloudflare Dashboard**
   - Navigate to: Workers & Pages > Snippets
   - Click "Create Snippet"

2. **Configure Snippet**
   - Name: \`${snippetName}\`
   - Code: Paste contents from \`snippet.js\`

3. **Set Triggers**
   - URL Pattern: \`/*\` (or specific paths)
   - Zone: Select your domain
   - Placement: Before or After cache

4. **Enable & Deploy**
   - Click "Save and Deploy"
   - Test the snippet on your domain

---

**Type:** Snippet
**Generated from:** ${path.basename(mdxPath)}
**Build command:** \`tsx scripts/build-mdx-worker.ts ${path.relative(process.cwd(), mdxPath)}\`

**Size Limit:** 32KB (Snippets are ultra-lightweight)
`
  fs.writeFileSync(readmePath, readmeContent)
  console.log(`  ✓ Generated ${readmePath}`)

  // Generate snippet metadata
  const metadata = {
    type: 'Snippet',
    name: snippetName,
    size: Buffer.from(extracted.code).length,
    maxSize: 32768, // 32KB limit for snippets
    source: path.basename(mdxPath),
    generatedAt: new Date().toISOString(),
    deploymentMethod: 'manual', // Snippets require manual dashboard deployment
  }

  const metadataPath = path.join(outputPath, '.mdx-metadata.json')
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  console.log(`  ✓ Generated ${metadataPath}`)

  // Size check
  const sizeKB = (metadata.size / 1024).toFixed(2)
  const maxSizeKB = (metadata.maxSize / 1024).toFixed(0)
  console.log(`\n✅ Snippet built successfully: ${outputPath}`)
  console.log(`📦 Size: ${sizeKB}KB / ${maxSizeKB}KB limit`)

  if (metadata.size > metadata.maxSize) {
    console.log(`\n⚠️  WARNING: Snippet size exceeds 32KB limit!`)
    console.log(`   Consider using a full Worker instead.`)
  }

  console.log(`\n📋 Deploy manually via Cloudflare Dashboard (Workers & Pages > Snippets)`)
}

/**
 * Find all .mdx worker/snippet files
 */
function findMdxWorkers(dir: string): string[] {
  const mdxFiles: string[] = []

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        // Check if it's a Worker or Snippet type
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          if (content.includes('$type: Worker') || content.includes('$type: Snippet')) {
            mdxFiles.push(fullPath)
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }

  scan(dir)
  return mdxFiles
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Build Cloudflare Workers and Snippets from .mdx files

Supports:
  - $type: Worker   → Full Cloudflare Worker (wrangler.jsonc + src/index.ts)
  - $type: Snippet  → Ultra-lightweight Snippet (snippet.js, <32KB)

Usage:
  tsx scripts/build-mdx-worker.ts <path-to-file.mdx>
  tsx scripts/build-mdx-worker.ts --all

Options:
  --all       Build all .mdx workers/snippets in workers/ directory
  --help      Show this help message

Examples:
  tsx scripts/build-mdx-worker.ts workers/examples/hello-world.mdx
  tsx scripts/build-mdx-worker.ts workers/examples/analytics-snippet.mdx
  tsx scripts/build-mdx-worker.ts --all

Output Formats:
  Worker:   <name>/wrangler.jsonc, <name>/src/index.ts, <name>/README.md
  Snippet:  <name>/snippet.js, <name>/README.md, <name>/.mdx-metadata.json
`)
    process.exit(0)
  }

  if (args.includes('--all')) {
    // Build all workers/snippets
    const workersDir = path.join(process.cwd(), 'workers')
    const mdxFiles = findMdxWorkers(workersDir)

    console.log(`Found ${mdxFiles.length} .mdx worker(s)/snippet(s)\n`)

    for (const mdxFile of mdxFiles) {
      try {
        buildWorker(mdxFile)
        console.log()
      } catch (err) {
        console.error(`❌ Failed to build ${mdxFile}:`, err)
        console.log()
      }
    }

    console.log(`✅ Built ${mdxFiles.length} worker(s)/snippet(s)`)
  } else {
    // Build single worker/snippet
    const mdxPath = path.resolve(args[0])

    if (!fs.existsSync(mdxPath)) {
      console.error(`Error: File not found: ${mdxPath}`)
      process.exit(1)
    }

    try {
      buildWorker(mdxPath)
    } catch (err) {
      console.error(`❌ Failed to build worker/snippet:`, err)
      process.exit(1)
    }
  }
}

export { parseMdxWorker, generateWranglerConfig, buildWorker, findMdxWorkers }

// Run if executed directly
// In ESM, we need to check import.meta.url
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  main()
}
