/**
 * @dotdo/mdx-worker - MDX-as-Worker Build Pipeline
 *
 * Compiles MDX files into Cloudflare Workers by:
 * 1. Parsing MDX frontmatter -> generating wrangler.json
 * 2. Extracting dependencies -> updating package.json
 * 3. Compiling code -> dist/*.js
 * 4. Optionally generating docs from prose
 *
 * Supports fenced code blocks with 'export' marker for executable code.
 *
 * @example
 * ```typescript
 * import { buildMdxWorker, parseMdx, generateWranglerConfig } from '@dotdo/mdx-worker'
 *
 * // Build a single MDX file
 * const result = await buildMdxWorker('./my-worker.mdx')
 *
 * // Parse MDX and extract components
 * const parsed = await parseMdx(mdxSource)
 * console.log(parsed.frontmatter)  // Worker configuration
 * console.log(parsed.codeBlocks)   // Executable code
 * console.log(parsed.prose)        // Documentation
 * ```
 */

import { compile } from '@mdx-js/mdx'
import * as yaml from 'yaml'

// ============================================================================
// Types
// ============================================================================

/**
 * MDX frontmatter for Worker configuration
 */
export interface WorkerFrontmatter {
  /** Worker name (required) */
  name: string
  /** Main entry point (default: 'index.ts') */
  main?: string
  /** Compatibility date for Cloudflare Workers */
  compatibility_date?: string
  /** Compatibility flags */
  compatibility_flags?: string[]
  /** Route pattern */
  route?: string | { pattern: string; zone_name?: string; custom_domain?: boolean }
  /** Custom domain */
  custom_domain?: string
  /** Usage model ('bundled' | 'unbound') */
  usage_model?: 'bundled' | 'unbound'
  /** Service bindings */
  services?: Array<{
    binding: string
    service: string
    environment?: string
  }>
  /** KV namespace bindings */
  kv_namespaces?: Array<{
    binding: string
    id: string
    preview_id?: string
  }>
  /** Durable Object bindings */
  durable_objects?: {
    bindings: Array<{
      name: string
      class_name: string
      script_name?: string
    }>
  }
  /** D1 database bindings */
  d1_databases?: Array<{
    binding: string
    database_id: string
    database_name?: string
  }>
  /** R2 bucket bindings */
  r2_buckets?: Array<{
    binding: string
    bucket_name: string
    preview_bucket_name?: string
  }>
  /** Environment variables */
  vars?: Record<string, string>
  /** Secrets (names only) */
  secrets?: string[]
  /** Package dependencies to install */
  dependencies?: Record<string, string>
  /** Dev dependencies */
  devDependencies?: Record<string, string>
  /** Description for generated docs */
  description?: string
  /** Tags/labels */
  tags?: string[]
}

/**
 * Parsed code block from MDX
 */
export interface CodeBlock {
  /** Language identifier (e.g., 'typescript', 'ts', 'tsx') */
  language: string
  /** Whether this code should be exported to the worker */
  export: boolean
  /** The code content */
  content: string
  /** Optional filename for the code block */
  filename?: string
  /** Meta string (everything after the language) */
  meta?: string
}

/**
 * Parsed MDX document
 */
export interface ParsedMdx {
  /** Extracted frontmatter */
  frontmatter: WorkerFrontmatter | null
  /** All code blocks */
  codeBlocks: CodeBlock[]
  /** Exportable code blocks only */
  exportableCode: CodeBlock[]
  /** Prose content (markdown without code blocks) */
  prose: string
  /** Raw MDX source */
  raw: string
  /** Compiled MDX output (optional) */
  compiled?: string
}

/**
 * Generated wrangler.json configuration
 */
export interface WranglerConfig {
  name: string
  main: string
  compatibility_date: string
  compatibility_flags?: string[]
  route?: string | { pattern: string; zone_name?: string; custom_domain?: boolean }
  routes?: Array<{ pattern: string; zone_name?: string; custom_domain?: boolean }>
  usage_model?: 'bundled' | 'unbound'
  services?: Array<{ binding: string; service: string; environment?: string }>
  kv_namespaces?: Array<{ binding: string; id: string; preview_id?: string }>
  durable_objects?: { bindings: Array<{ name: string; class_name: string; script_name?: string }> }
  d1_databases?: Array<{ binding: string; database_id: string; database_name?: string }>
  r2_buckets?: Array<{ binding: string; bucket_name: string; preview_bucket_name?: string }>
  vars?: Record<string, string>
}

/**
 * Generated package.json
 */
export interface PackageJson {
  name: string
  version: string
  type: 'module'
  main: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

/**
 * Build result
 */
export interface BuildResult {
  /** Success status */
  success: boolean
  /** Output files generated */
  files: Record<string, string>
  /** Generated wrangler.json */
  wranglerConfig: WranglerConfig | null
  /** Generated package.json */
  packageJson: PackageJson | null
  /** Compiled worker code */
  workerCode: string
  /** Generated documentation (if any) */
  documentation?: string
  /** Build errors */
  errors: BuildError[]
  /** Build warnings */
  warnings: string[]
}

/**
 * Build error
 */
export interface BuildError {
  message: string
  line?: number
  column?: number
  file?: string
}

/**
 * Build options
 */
export interface BuildOptions {
  /** Output directory (default: 'dist') */
  outDir?: string
  /** Generate documentation from prose (default: true) */
  generateDocs?: boolean
  /** Minify output (default: false) */
  minify?: boolean
  /** Generate source maps (default: true) */
  sourcemap?: boolean
  /** Custom compatibility date */
  compatibilityDate?: string
  /** Base package.json to extend */
  basePackageJson?: Partial<PackageJson>
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse YAML frontmatter from MDX source
 */
export function parseFrontmatter(source: string): { frontmatter: WorkerFrontmatter | null; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/
  const match = source.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content: source }
  }

  try {
    const frontmatter = yaml.parse(match[1]) as WorkerFrontmatter
    const content = source.slice(match[0].length)
    return { frontmatter, content }
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error)
    return { frontmatter: null, content: source }
  }
}

/**
 * Extract code blocks from MDX content
 *
 * Supports the 'export' marker in fenced code blocks:
 * ```typescript export
 * // This code will be included in the worker
 * ```
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)([^\n]*)\n([\s\S]*?)```/g
  const blocks: CodeBlock[] = []

  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1]
    const meta = match[2]?.trim() || ''
    const code = match[3]

    // Check for 'export' marker in meta
    const isExport = meta.includes('export')

    // Extract filename if present (e.g., ```ts filename="worker.ts" export```)
    const filenameMatch = meta.match(/filename=["']([^"']+)["']/)
    const filename = filenameMatch?.[1]

    blocks.push({
      language,
      export: isExport,
      content: code.trim(),
      filename,
      meta,
    })
  }

  return blocks
}

/**
 * Extract prose content (markdown without code blocks)
 */
export function extractProse(content: string): string {
  // Remove code blocks
  const withoutCode = content.replace(/```[\s\S]*?```/g, '')
  // Trim extra whitespace
  return withoutCode.trim()
}

/**
 * Parse an MDX file and extract all components
 */
export async function parseMdx(source: string): Promise<ParsedMdx> {
  const { frontmatter, content } = parseFrontmatter(source)
  const codeBlocks = extractCodeBlocks(content)
  const exportableCode = codeBlocks.filter(block => block.export)
  const prose = extractProse(content)

  let compiled: string | undefined
  try {
    const result = await compile(source, {
      outputFormat: 'function-body',
    })
    compiled = String(result)
  } catch {
    // MDX compilation is optional for our purposes
  }

  return {
    frontmatter,
    codeBlocks,
    exportableCode,
    prose,
    raw: source,
    compiled,
  }
}

// ============================================================================
// Generation Functions
// ============================================================================

/**
 * Generate wrangler.json configuration from frontmatter
 */
export function generateWranglerConfig(
  frontmatter: WorkerFrontmatter,
  options?: BuildOptions
): WranglerConfig {
  const config: WranglerConfig = {
    name: frontmatter.name,
    main: frontmatter.main || 'dist/index.js',
    compatibility_date: frontmatter.compatibility_date || options?.compatibilityDate || new Date().toISOString().split('T')[0],
  }

  // Add optional fields
  if (frontmatter.compatibility_flags) {
    config.compatibility_flags = frontmatter.compatibility_flags
  }

  if (frontmatter.route) {
    config.route = frontmatter.route
  }

  if (frontmatter.usage_model) {
    config.usage_model = frontmatter.usage_model
  }

  if (frontmatter.services) {
    config.services = frontmatter.services
  }

  if (frontmatter.kv_namespaces) {
    config.kv_namespaces = frontmatter.kv_namespaces
  }

  if (frontmatter.durable_objects) {
    config.durable_objects = frontmatter.durable_objects
  }

  if (frontmatter.d1_databases) {
    config.d1_databases = frontmatter.d1_databases
  }

  if (frontmatter.r2_buckets) {
    config.r2_buckets = frontmatter.r2_buckets
  }

  if (frontmatter.vars) {
    config.vars = frontmatter.vars
  }

  return config
}

/**
 * Generate package.json from frontmatter
 */
export function generatePackageJson(
  frontmatter: WorkerFrontmatter,
  options?: BuildOptions
): PackageJson {
  const base = options?.basePackageJson || {}

  return {
    name: `@dotdo/${frontmatter.name}`,
    version: base.version || '0.0.1',
    type: 'module',
    main: frontmatter.main || 'dist/index.js',
    scripts: {
      dev: 'wrangler dev',
      deploy: 'wrangler deploy',
      build: 'tsup src/index.ts --format esm --clean',
      test: 'vitest run',
      ...(base.scripts || {}),
    },
    dependencies: {
      ...frontmatter.dependencies,
      ...(base.dependencies || {}),
    },
    devDependencies: {
      '@cloudflare/workers-types': '^4.20240925.0',
      typescript: '^5.6.0',
      tsup: '^8.5.1',
      vitest: '^3.2.4',
      wrangler: '^4.54.0',
      ...frontmatter.devDependencies,
      ...(base.devDependencies || {}),
    },
  }
}

/**
 * Combine exportable code blocks into a single worker file
 */
export function combineExportableCode(blocks: CodeBlock[]): string {
  if (blocks.length === 0) {
    return ''
  }

  // Group by filename or combine into index.ts
  const fileGroups = new Map<string, string[]>()

  for (const block of blocks) {
    const filename = block.filename || 'index.ts'
    if (!fileGroups.has(filename)) {
      fileGroups.set(filename, [])
    }
    fileGroups.get(filename)!.push(block.content)
  }

  // For now, return the combined index.ts content
  const indexContent = fileGroups.get('index.ts') || []
  return indexContent.join('\n\n')
}

/**
 * Generate documentation from prose content
 */
export function generateDocumentation(
  frontmatter: WorkerFrontmatter | null,
  prose: string
): string {
  const lines: string[] = []

  if (frontmatter) {
    lines.push(`# ${frontmatter.name}`)
    lines.push('')
    if (frontmatter.description) {
      lines.push(frontmatter.description)
      lines.push('')
    }
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      lines.push(`**Tags:** ${frontmatter.tags.join(', ')}`)
      lines.push('')
    }
  }

  if (prose) {
    lines.push('## Overview')
    lines.push('')
    lines.push(prose)
  }

  return lines.join('\n')
}

// ============================================================================
// Build Pipeline
// ============================================================================

/**
 * Build an MDX file into a Cloudflare Worker
 *
 * @param source - MDX source content
 * @param options - Build options
 * @returns Build result with generated files
 */
export async function buildMdxWorker(
  source: string,
  options: BuildOptions = {}
): Promise<BuildResult> {
  const errors: BuildError[] = []
  const warnings: string[] = []
  const files: Record<string, string> = {}

  // Parse the MDX
  const parsed = await parseMdx(source)

  // Validate frontmatter
  if (!parsed.frontmatter) {
    errors.push({
      message: 'Missing frontmatter with worker configuration. Add a YAML frontmatter block with at least a "name" field.',
    })
    return {
      success: false,
      files,
      wranglerConfig: null,
      packageJson: null,
      workerCode: '',
      errors,
      warnings,
    }
  }

  if (!parsed.frontmatter.name) {
    errors.push({
      message: 'Frontmatter must include a "name" field for the worker.',
    })
    return {
      success: false,
      files,
      wranglerConfig: null,
      packageJson: null,
      workerCode: '',
      errors,
      warnings,
    }
  }

  // Check for exportable code
  if (parsed.exportableCode.length === 0) {
    warnings.push('No code blocks marked with "export" found. Worker will have no code.')
  }

  // Generate wrangler.json
  const wranglerConfig = generateWranglerConfig(parsed.frontmatter, options)
  files['wrangler.json'] = JSON.stringify(wranglerConfig, null, 2)

  // Generate package.json
  const packageJson = generatePackageJson(parsed.frontmatter, options)
  files['package.json'] = JSON.stringify(packageJson, null, 2)

  // Combine exportable code
  const workerCode = combineExportableCode(parsed.exportableCode)
  if (workerCode) {
    files['src/index.ts'] = workerCode
  }

  // Generate documentation if requested
  let documentation: string | undefined
  if (options.generateDocs !== false) {
    documentation = generateDocumentation(parsed.frontmatter, parsed.prose)
    files['README.md'] = documentation
  }

  return {
    success: errors.length === 0,
    files,
    wranglerConfig,
    packageJson,
    workerCode,
    documentation,
    errors,
    warnings,
  }
}

/**
 * Parse and extract dependencies from code blocks
 *
 * Scans import statements and re-exports to detect external dependencies.
 */
export function extractDependencies(code: string): string[] {
  // Match both import and export ... from statements
  const importRegex = /(?:import|export)\s+(?:(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
  const deps = new Set<string>()

  let match
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1]
    // Skip relative imports
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      continue
    }
    // Extract package name (handle scoped packages)
    const packageName = importPath.startsWith('@')
      ? importPath.split('/').slice(0, 2).join('/')
      : importPath.split('/')[0]

    if (packageName) {
      deps.add(packageName)
    }
  }

  return Array.from(deps)
}

/**
 * Merge extracted dependencies into package.json
 */
export function mergeDependencies(
  packageJson: PackageJson,
  extractedDeps: string[],
  defaultVersions: Record<string, string> = {}
): PackageJson {
  const merged = { ...packageJson }
  const newDeps: Record<string, string> = {}

  for (const dep of extractedDeps) {
    // Skip if already in dependencies
    if (merged.dependencies[dep] || merged.devDependencies[dep]) {
      continue
    }
    // Use provided version or default to 'latest'
    newDeps[dep] = defaultVersions[dep] || 'latest'
  }

  return {
    ...merged,
    dependencies: {
      ...merged.dependencies,
      ...newDeps,
    },
  }
}

// ============================================================================
// Export All
// ============================================================================

export {
  // Re-export compile from @mdx-js/mdx for convenience
  compile as compileMdx,
}
