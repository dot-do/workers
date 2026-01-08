import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  extractCodeBlocks,
  extractProse,
  parseMdx,
  generateWranglerConfig,
  generatePackageJson,
  combineExportableCode,
  generateDocumentation,
  buildMdxWorker,
  extractDependencies,
  mergeDependencies,
  type WorkerFrontmatter,
  type CodeBlock,
  type PackageJson,
} from '../src/index.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const sampleMdx = `---
name: my-worker
description: A sample worker for testing
compatibility_date: "2024-01-01"
usage_model: bundled
services:
  - binding: DB
    service: my-database
kv_namespaces:
  - binding: CACHE
    id: abc123
dependencies:
  hono: ^4.0.0
tags:
  - api
  - test
---

# My Worker

This is a sample worker that demonstrates the MDX-as-Worker build pipeline.

## API Endpoints

The worker exposes a simple REST API.

\`\`\`typescript export
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ hello: 'world' })
})

export default app
\`\`\`

## Additional Notes

Some non-exported code for reference:

\`\`\`typescript
// This is just for documentation
const unused = true
\`\`\`
`

const minimalMdx = `---
name: minimal-worker
---

\`\`\`typescript export
export default {
  fetch: () => new Response('Hello')
}
\`\`\`
`

const noFrontmatterMdx = `
# Just some markdown

\`\`\`typescript export
console.log('no frontmatter')
\`\`\`
`

const multiBlockMdx = `---
name: multi-block
---

First code block:

\`\`\`typescript export filename="handler.ts"
export function handle(req: Request) {
  return new Response('handled')
}
\`\`\`

Second code block:

\`\`\`typescript export
import { handle } from './handler'

export default {
  fetch: handle
}
\`\`\`

Non-exported example:

\`\`\`json
{ "example": true }
\`\`\`
`

// ============================================================================
// parseFrontmatter Tests
// ============================================================================

describe('parseFrontmatter', () => {
  it('parses valid YAML frontmatter', () => {
    const { frontmatter, content } = parseFrontmatter(sampleMdx)

    expect(frontmatter).not.toBeNull()
    expect(frontmatter?.name).toBe('my-worker')
    expect(frontmatter?.description).toBe('A sample worker for testing')
    expect(frontmatter?.compatibility_date).toBe('2024-01-01')
    expect(frontmatter?.usage_model).toBe('bundled')
    expect(frontmatter?.services).toHaveLength(1)
    expect(frontmatter?.services?.[0].binding).toBe('DB')
    expect(frontmatter?.kv_namespaces).toHaveLength(1)
    expect(frontmatter?.dependencies?.hono).toBe('^4.0.0')
    expect(frontmatter?.tags).toContain('api')
    expect(content).toContain('# My Worker')
  })

  it('handles missing frontmatter', () => {
    const { frontmatter, content } = parseFrontmatter(noFrontmatterMdx)

    expect(frontmatter).toBeNull()
    expect(content).toContain('# Just some markdown')
  })

  it('handles minimal frontmatter', () => {
    const { frontmatter, content } = parseFrontmatter(minimalMdx)

    expect(frontmatter).not.toBeNull()
    expect(frontmatter?.name).toBe('minimal-worker')
  })
})

// ============================================================================
// extractCodeBlocks Tests
// ============================================================================

describe('extractCodeBlocks', () => {
  it('extracts all code blocks', () => {
    const { content } = parseFrontmatter(sampleMdx)
    const blocks = extractCodeBlocks(content)

    expect(blocks).toHaveLength(2)
  })

  it('identifies export marker', () => {
    const { content } = parseFrontmatter(sampleMdx)
    const blocks = extractCodeBlocks(content)

    const exportBlocks = blocks.filter(b => b.export)
    const nonExportBlocks = blocks.filter(b => !b.export)

    expect(exportBlocks).toHaveLength(1)
    expect(nonExportBlocks).toHaveLength(1)
    expect(exportBlocks[0].language).toBe('typescript')
  })

  it('extracts filename from meta', () => {
    const { content } = parseFrontmatter(multiBlockMdx)
    const blocks = extractCodeBlocks(content)

    const namedBlock = blocks.find(b => b.filename)
    expect(namedBlock).toBeDefined()
    expect(namedBlock?.filename).toBe('handler.ts')
  })

  it('handles multiple export blocks', () => {
    const { content } = parseFrontmatter(multiBlockMdx)
    const blocks = extractCodeBlocks(content)

    const exportBlocks = blocks.filter(b => b.export)
    expect(exportBlocks).toHaveLength(2)
  })

  it('extracts code content correctly', () => {
    const { content } = parseFrontmatter(minimalMdx)
    const blocks = extractCodeBlocks(content)

    expect(blocks).toHaveLength(1)
    expect(blocks[0].content).toContain('export default')
    expect(blocks[0].content).toContain('fetch')
  })
})

// ============================================================================
// extractProse Tests
// ============================================================================

describe('extractProse', () => {
  it('removes code blocks from content', () => {
    const { content } = parseFrontmatter(sampleMdx)
    const prose = extractProse(content)

    expect(prose).toContain('# My Worker')
    expect(prose).toContain('This is a sample worker')
    expect(prose).not.toContain('import { Hono }')
    expect(prose).not.toContain('```')
  })

  it('handles content with only code blocks', () => {
    const { content } = parseFrontmatter(minimalMdx)
    const prose = extractProse(content)

    expect(prose).toBe('')
  })
})

// ============================================================================
// parseMdx Tests
// ============================================================================

describe('parseMdx', () => {
  it('parses complete MDX document', async () => {
    const parsed = await parseMdx(sampleMdx)

    expect(parsed.frontmatter?.name).toBe('my-worker')
    expect(parsed.codeBlocks).toHaveLength(2)
    expect(parsed.exportableCode).toHaveLength(1)
    expect(parsed.prose).toContain('# My Worker')
    expect(parsed.raw).toBe(sampleMdx)
  })

  it('returns null frontmatter when missing', async () => {
    const parsed = await parseMdx(noFrontmatterMdx)

    expect(parsed.frontmatter).toBeNull()
    expect(parsed.exportableCode).toHaveLength(1)
  })
})

// ============================================================================
// generateWranglerConfig Tests
// ============================================================================

describe('generateWranglerConfig', () => {
  it('generates basic config', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
    }

    const config = generateWranglerConfig(frontmatter)

    expect(config.name).toBe('test-worker')
    expect(config.main).toBe('dist/index.js')
    expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('includes all bindings', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
      compatibility_date: '2024-01-01',
      services: [{ binding: 'DB', service: 'database' }],
      kv_namespaces: [{ binding: 'CACHE', id: 'abc123' }],
      d1_databases: [{ binding: 'D1', database_id: 'xyz789' }],
      r2_buckets: [{ binding: 'BUCKET', bucket_name: 'my-bucket' }],
      vars: { API_KEY: 'secret' },
    }

    const config = generateWranglerConfig(frontmatter)

    expect(config.services).toHaveLength(1)
    expect(config.kv_namespaces).toHaveLength(1)
    expect(config.d1_databases).toHaveLength(1)
    expect(config.r2_buckets).toHaveLength(1)
    expect(config.vars?.API_KEY).toBe('secret')
  })

  it('uses custom compatibility date from options', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
    }

    const config = generateWranglerConfig(frontmatter, {
      compatibilityDate: '2023-06-01',
    })

    expect(config.compatibility_date).toBe('2023-06-01')
  })
})

// ============================================================================
// generatePackageJson Tests
// ============================================================================

describe('generatePackageJson', () => {
  it('generates basic package.json', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
    }

    const pkg = generatePackageJson(frontmatter)

    expect(pkg.name).toBe('@dotdo/test-worker')
    expect(pkg.type).toBe('module')
    expect(pkg.main).toBe('dist/index.js')
    expect(pkg.scripts.dev).toBe('wrangler dev')
    expect(pkg.scripts.deploy).toBe('wrangler deploy')
    expect(pkg.devDependencies.typescript).toBeDefined()
    expect(pkg.devDependencies.wrangler).toBeDefined()
  })

  it('includes frontmatter dependencies', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
      dependencies: {
        hono: '^4.0.0',
        zod: '^3.0.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
      },
    }

    const pkg = generatePackageJson(frontmatter)

    expect(pkg.dependencies.hono).toBe('^4.0.0')
    expect(pkg.dependencies.zod).toBe('^3.0.0')
    expect(pkg.devDependencies['@types/node']).toBe('^20.0.0')
  })

  it('merges with base package.json', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'test-worker',
    }

    const pkg = generatePackageJson(frontmatter, {
      basePackageJson: {
        version: '1.2.3',
        scripts: { custom: 'echo custom' },
        dependencies: { existing: '^1.0.0' },
      },
    })

    expect(pkg.version).toBe('1.2.3')
    expect(pkg.scripts.custom).toBe('echo custom')
    expect(pkg.dependencies.existing).toBe('^1.0.0')
  })
})

// ============================================================================
// combineExportableCode Tests
// ============================================================================

describe('combineExportableCode', () => {
  it('combines multiple blocks', () => {
    const blocks: CodeBlock[] = [
      { language: 'typescript', export: true, content: 'const a = 1' },
      { language: 'typescript', export: true, content: 'const b = 2' },
    ]

    const combined = combineExportableCode(blocks)

    expect(combined).toContain('const a = 1')
    expect(combined).toContain('const b = 2')
  })

  it('returns empty string for no blocks', () => {
    const combined = combineExportableCode([])
    expect(combined).toBe('')
  })
})

// ============================================================================
// generateDocumentation Tests
// ============================================================================

describe('generateDocumentation', () => {
  it('generates documentation with frontmatter', () => {
    const frontmatter: WorkerFrontmatter = {
      name: 'my-worker',
      description: 'A test worker',
      tags: ['api', 'test'],
    }

    const docs = generateDocumentation(frontmatter, 'Some prose content.')

    expect(docs).toContain('# my-worker')
    expect(docs).toContain('A test worker')
    expect(docs).toContain('api, test')
    expect(docs).toContain('Some prose content.')
  })

  it('handles missing frontmatter', () => {
    const docs = generateDocumentation(null, 'Just prose.')

    expect(docs).toContain('Just prose.')
    // When there's prose, an Overview heading is added
    expect(docs).toContain('## Overview')
  })
})

// ============================================================================
// buildMdxWorker Tests
// ============================================================================

describe('buildMdxWorker', () => {
  it('builds a valid MDX file', async () => {
    const result = await buildMdxWorker(sampleMdx)

    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.wranglerConfig?.name).toBe('my-worker')
    expect(result.packageJson?.name).toBe('@dotdo/my-worker')
    expect(result.workerCode).toContain('import { Hono }')
    expect(result.files['wrangler.json']).toBeDefined()
    expect(result.files['package.json']).toBeDefined()
    expect(result.files['src/index.ts']).toBeDefined()
    expect(result.files['README.md']).toBeDefined()
  })

  it('fails on missing frontmatter', async () => {
    const result = await buildMdxWorker(noFrontmatterMdx)

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toContain('frontmatter')
  })

  it('fails on missing name', async () => {
    const result = await buildMdxWorker(`---
description: no name
---

\`\`\`typescript export
export default {}
\`\`\`
`)

    expect(result.success).toBe(false)
    expect(result.errors[0].message).toContain('name')
  })

  it('warns on no exportable code', async () => {
    const result = await buildMdxWorker(`---
name: empty-worker
---

Just some text, no export blocks.

\`\`\`typescript
// Not exported
\`\`\`
`)

    expect(result.success).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('No code blocks')
  })

  it('skips docs generation when disabled', async () => {
    const result = await buildMdxWorker(minimalMdx, { generateDocs: false })

    expect(result.success).toBe(true)
    expect(result.files['README.md']).toBeUndefined()
    expect(result.documentation).toBeUndefined()
  })
})

// ============================================================================
// extractDependencies Tests
// ============================================================================

describe('extractDependencies', () => {
  it('extracts npm packages from imports', () => {
    const code = `
import { Hono } from 'hono'
import { z } from 'zod'
import { something } from '@dotdo/rpc'
import { local } from './local'
import { relative } from '../relative'
`

    const deps = extractDependencies(code)

    expect(deps).toContain('hono')
    expect(deps).toContain('zod')
    expect(deps).toContain('@dotdo/rpc')
    expect(deps).not.toContain('./local')
    expect(deps).not.toContain('../relative')
  })

  it('handles re-exports', () => {
    const code = `
export { something } from 'some-package'
export * from 'another-package'
`

    const deps = extractDependencies(code)

    expect(deps).toContain('some-package')
    expect(deps).toContain('another-package')
  })

  it('handles subpath imports', () => {
    const code = `
import { thing } from 'package/subpath'
import { other } from '@scope/package/deep/path'
`

    const deps = extractDependencies(code)

    expect(deps).toContain('package')
    expect(deps).toContain('@scope/package')
    expect(deps).not.toContain('package/subpath')
    expect(deps).not.toContain('@scope/package/deep/path')
  })

  it('returns empty array for no imports', () => {
    const deps = extractDependencies('const x = 1')
    expect(deps).toHaveLength(0)
  })
})

// ============================================================================
// mergeDependencies Tests
// ============================================================================

describe('mergeDependencies', () => {
  it('adds new dependencies', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      type: 'module',
      main: 'index.js',
      scripts: {},
      dependencies: { existing: '^1.0.0' },
      devDependencies: {},
    }

    const merged = mergeDependencies(pkg, ['new-package', 'another'])

    expect(merged.dependencies.existing).toBe('^1.0.0')
    expect(merged.dependencies['new-package']).toBe('latest')
    expect(merged.dependencies.another).toBe('latest')
  })

  it('does not override existing dependencies', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      type: 'module',
      main: 'index.js',
      scripts: {},
      dependencies: { hono: '^4.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }

    const merged = mergeDependencies(pkg, ['hono', 'typescript', 'new-one'])

    expect(merged.dependencies.hono).toBe('^4.0.0')
    expect(merged.devDependencies.typescript).toBe('^5.0.0')
    expect(merged.dependencies['new-one']).toBe('latest')
  })

  it('uses provided default versions', () => {
    const pkg: PackageJson = {
      name: 'test',
      version: '1.0.0',
      type: 'module',
      main: 'index.js',
      scripts: {},
      dependencies: {},
      devDependencies: {},
    }

    const merged = mergeDependencies(pkg, ['hono', 'zod'], {
      hono: '^4.1.0',
      zod: '^3.22.0',
    })

    expect(merged.dependencies.hono).toBe('^4.1.0')
    expect(merged.dependencies.zod).toBe('^3.22.0')
  })
})
