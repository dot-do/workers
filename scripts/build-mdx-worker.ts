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
  $type: string
  $id: string
  name: string
  main?: string
  compatibility_date?: string
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

  // Validate it's a Worker type
  if (frontmatter.$type !== 'Worker') {
    throw new Error(`File ${filePath} is not a Worker (type: ${frontmatter.$type})`)
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
  const header = `/**\n * ${frontmatter.name} Worker Configuration\n * Generated from ${path.basename(frontmatter.filePath || '')}\n */\n`

  return header + jsonc
}

/**
 * Build a worker from an MDX file
 */
function buildWorker(mdxPath: string, outputDir?: string): void {
  console.log(`Building worker from: ${mdxPath}`)

  // Parse MDX file
  const extracted = parseMdxWorker(mdxPath)

  // Determine output directory
  const workerName = extracted.frontmatter.name
  const outputPath = outputDir || path.join(path.dirname(mdxPath), workerName)

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

  console.log(`\n✅ Worker built successfully: ${outputPath}`)
  console.log(`\nDeploy with: cd ${path.relative(process.cwd(), outputPath)} && wrangler deploy`)
}

/**
 * Find all .mdx worker files
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
        // Check if it's a Worker type
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          if (content.includes('$type: Worker')) {
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
Build Cloudflare Workers from .mdx files

Usage:
  tsx scripts/build-mdx-worker.ts <path-to-worker.mdx>
  tsx scripts/build-mdx-worker.ts --all

Options:
  --all       Build all .mdx workers in workers/ directory
  --help      Show this help message

Examples:
  tsx scripts/build-mdx-worker.ts workers/examples/hello-world.mdx
  tsx scripts/build-mdx-worker.ts --all
`)
    process.exit(0)
  }

  if (args.includes('--all')) {
    // Build all workers
    const workersDir = path.join(process.cwd(), 'workers')
    const mdxFiles = findMdxWorkers(workersDir)

    console.log(`Found ${mdxFiles.length} .mdx worker(s)\n`)

    for (const mdxFile of mdxFiles) {
      try {
        buildWorker(mdxFile)
        console.log()
      } catch (err) {
        console.error(`❌ Failed to build ${mdxFile}:`, err)
        console.log()
      }
    }

    console.log(`✅ Built ${mdxFiles.length} worker(s)`)
  } else {
    // Build single worker
    const mdxPath = path.resolve(args[0])

    if (!fs.existsSync(mdxPath)) {
      console.error(`Error: File not found: ${mdxPath}`)
      process.exit(1)
    }

    try {
      buildWorker(mdxPath)
    } catch (err) {
      console.error(`❌ Failed to build worker:`, err)
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
