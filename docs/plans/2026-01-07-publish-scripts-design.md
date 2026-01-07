# Publish Scripts Design

## Overview

Create a publish workflow for the workers.do monorepo using changesets, with proper handling for:
- Fixed versioning for core packages and SDKs
- Service wrappers that version-match their source packages
- workspace:* protocol replacement before publish
- Skip-if-already-published logic

## Package Structure & Naming

### Consolidation

| Location | Package Name | Notes |
|----------|--------------|-------|
| `objects/do/` | `dotdo` | Main DO package (move from packages/do-core) |
| `packages/rpc/` | `@dotdo/rpc` | RPC utilities |
| `packages/auth/` | `@dotdo/auth` | Consolidated from auth/* |
| `packages/middleware/` | `@dotdo/middleware` | Consolidated from middleware/* |
| `packages/functions/` | `@dotdo/functions` | Functions |
| `packages/workflows/` | `@dotdo/workflows` | Workflows |
| `packages/build/` | `@dotdo/build` | Build utilities |
| `packages/eval/` | `@dotdo/eval` | Eval utilities |
| `workers/stripe/` | `@dotdo/stripe` | Versions match `stripe` |
| `workers/workos/` | `@dotdo/workos` | Versions match `@workos/node` |
| `workers/jose/` | `@dotdo/jose` | Versions match `jose` |
| `workers/esbuild/` | `@dotdo/esbuild` | Versions match `esbuild` |
| `workers/cloudflare/` | `@dotdo/cloudflare` | Versions match `cloudflare` |
| `sdks/llm.do/` | `llm.do` | SDK |
| `sdks/payments.do/` | `payments.do` | SDK |
| `sdks/agent.as/` | `agent.as` | SDK |
| ... | ... | All .do and .as packages |

### Versioning Strategy

| Group | Packages | Strategy |
|-------|----------|----------|
| Core + SDKs | `dotdo`, `@dotdo/*`, all `.do`, all `.as` | Fixed together via changesets |
| Service Wrappers | `@dotdo/stripe`, `@dotdo/workos`, etc. | Match source package version |

## Scripts

### Directory Structure

```
scripts/
  publish.ts              # Main publish with workspace:* handling
  sync-service-versions.ts # Sync @dotdo/stripe to stripe, etc.
  get-npm-versions.ts     # Utility to check published versions
```

### Root package.json Scripts

```json
{
  "scripts": {
    "version": "changeset version && tsx scripts/sync-service-versions.ts",
    "publish": "tsx scripts/publish.ts",
    "release": "pnpm build && pnpm version && pnpm publish",
    "check-versions": "tsx scripts/get-npm-versions.ts"
  }
}
```

### Workflow

```bash
# Step by step
pnpm changeset        # Add changeset describing changes
pnpm run version      # Bump versions (changesets + service sync)
pnpm run build        # Build all packages
pnpm run publish      # Publish to npm

# Or one command
pnpm run release      # Does build + version + publish
```

## Changeset Configuration

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "fixed": [
    [
      "dotdo",
      "@dotdo/rpc",
      "@dotdo/auth",
      "@dotdo/middleware",
      "@dotdo/functions",
      "@dotdo/workflows",
      "@dotdo/build",
      "@dotdo/eval",
      "rpc.do",
      "llm.do",
      "payments.do",
      "agents.do",
      "assistants.do",
      "actions.do",
      "analytics.do",
      "events.do",
      "functions.do",
      "searches.do",
      "services.do",
      "workflows.do",
      "database.do",
      "builder.domains",
      "org.ai",
      "startups.new",
      "startups.studio",
      "startup.games",
      "agent.as",
      "workflow.as",
      "assistant.as",
      "agi.do",
      "agi.as"
    ]
  ],
  "ignore": [
    "@dotdo/stripe",
    "@dotdo/workos",
    "@dotdo/jose",
    "@dotdo/esbuild",
    "@dotdo/cloudflare"
  ]
}
```

## Script Implementations

### publish.ts

```typescript
#!/usr/bin/env node
/**
 * Publish script that:
 * 1. Discovers all publishable packages
 * 2. Checks which versions are already on npm
 * 3. Replaces workspace:* with actual versions
 * 4. Publishes only unpublished packages
 * 5. Restores original package.json files
 */

import { execSync, spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface PackageJson {
  name: string
  version: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const PACKAGE_DIRS = [
  'packages/*',
  'objects/*',
  'workers/*',
  'sdks/*',
]

function globDirs(pattern: string): string[] {
  const [base, glob] = pattern.split('/')
  const baseDir = join(rootDir, base)
  if (!existsSync(baseDir)) return []

  if (glob === '*') {
    return readdirSync(baseDir)
      .map(name => join(baseDir, name))
      .filter(path => {
        try {
          return statSync(path).isDirectory() &&
                 existsSync(join(path, 'package.json'))
        } catch { return false }
      })
  }
  return [baseDir]
}

function discoverPackages(): string[] {
  return PACKAGE_DIRS.flatMap(pattern => globDirs(pattern))
}

function readPackageJson(pkgDir: string): PackageJson {
  return JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'))
}

function writePackageJson(pkgDir: string, pkg: PackageJson): void {
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

function isPublishedOnNpm(name: string, version: string): boolean {
  try {
    execSync(`npm view "${name}@${version}" version`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function replaceWorkspaceProtocol(
  deps: Record<string, string> | undefined,
  versionMap: Map<string, string>
): Record<string, string> | undefined {
  if (!deps) return deps

  const result: Record<string, string> = {}
  for (const [name, version] of Object.entries(deps)) {
    if (version.startsWith('workspace:')) {
      const actualVersion = versionMap.get(name)
      if (!actualVersion) {
        throw new Error(`Could not find version for workspace dependency: ${name}`)
      }
      const prefix = version.replace('workspace:', '').replace('*', '')
      result[name] = prefix + actualVersion
    } else {
      result[name] = version
    }
  }
  return result
}

async function main() {
  const dirs = discoverPackages()
  const versionMap = new Map<string, string>()
  const originalContents = new Map<string, string>()
  const toPublish: { dir: string; name: string; version: string }[] = []

  // First pass: collect versions and check what needs publishing
  console.log('Checking which packages need publishing...\n')

  for (const dir of dirs) {
    const pkg = readPackageJson(dir)
    versionMap.set(pkg.name, pkg.version)

    if (pkg.private) {
      console.log(`⏭️  ${pkg.name} (private)`)
      continue
    }

    if (isPublishedOnNpm(pkg.name, pkg.version)) {
      console.log(`✅ ${pkg.name}@${pkg.version} (already published)`)
    } else {
      console.log(`📦 ${pkg.name}@${pkg.version} (needs publish)`)
      toPublish.push({ dir, name: pkg.name, version: pkg.version })
    }
  }

  if (toPublish.length === 0) {
    console.log('\nAll packages are already published!')
    return
  }

  // Save original package.json contents and replace workspace:*
  console.log('\nPreparing packages for publish...')

  for (const { dir } of toPublish) {
    const pkgJsonPath = join(dir, 'package.json')
    originalContents.set(pkgJsonPath, readFileSync(pkgJsonPath, 'utf-8'))

    const pkg = readPackageJson(dir)
    pkg.dependencies = replaceWorkspaceProtocol(pkg.dependencies, versionMap)
    pkg.devDependencies = replaceWorkspaceProtocol(pkg.devDependencies, versionMap)
    pkg.peerDependencies = replaceWorkspaceProtocol(pkg.peerDependencies, versionMap)
    writePackageJson(dir, pkg)
  }

  console.log(`\nPublishing ${toPublish.length} package(s)...\n`)

  let failed = false
  for (const { dir, name, version } of toPublish) {
    console.log(`\n📤 Publishing ${name}@${version}...`)
    const result = spawnSync('npm', ['publish', '--access', 'public'], {
      cwd: dir,
      stdio: 'inherit'
    })

    if (result.status !== 0) {
      console.error(`❌ Failed to publish ${name}@${version}`)
      failed = true
      break
    }
    console.log(`✅ Published ${name}@${version}`)
  }

  // Restore original package.json files
  console.log('\nRestoring package.json files...')
  for (const [path, content] of originalContents) {
    writeFileSync(path, content)
  }

  if (failed) {
    process.exit(1)
  }

  console.log('\n🎉 All packages published!')
}

main()
```

### sync-service-versions.ts

```typescript
#!/usr/bin/env node
/**
 * Syncs service wrapper package versions to match their source packages.
 * e.g., @dotdo/stripe version should match the installed stripe version
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface PackageJson {
  name: string
  version: string
  [key: string]: unknown
}

const SERVICE_MAPPINGS: Record<string, { source: string; path: string }> = {
  '@dotdo/stripe': { source: 'stripe', path: 'workers/stripe' },
  '@dotdo/workos': { source: '@workos/node', path: 'workers/workos' },
  '@dotdo/jose': { source: 'jose', path: 'workers/jose' },
  '@dotdo/esbuild': { source: 'esbuild', path: 'workers/esbuild' },
  '@dotdo/cloudflare': { source: 'cloudflare', path: 'workers/cloudflare' },
}

function getInstalledVersion(pkg: string): string | null {
  const pkgPath = pkg.startsWith('@')
    ? join(rootDir, 'node_modules', ...pkg.split('/'), 'package.json')
    : join(rootDir, 'node_modules', pkg, 'package.json')

  if (!existsSync(pkgPath)) {
    console.warn(`⚠️  Source package not installed: ${pkg}`)
    return null
  }

  const pkgJson: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  return pkgJson.version
}

function readPackageJson(path: string): PackageJson {
  return JSON.parse(readFileSync(join(rootDir, path, 'package.json'), 'utf-8'))
}

function writePackageJson(path: string, pkg: PackageJson): void {
  writeFileSync(
    join(rootDir, path, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n'
  )
}

function main() {
  console.log('Syncing service wrapper versions...\n')

  let updated = 0

  for (const [wrapper, { source, path }] of Object.entries(SERVICE_MAPPINGS)) {
    const sourceVersion = getInstalledVersion(source)
    if (!sourceVersion) continue

    try {
      const pkg = readPackageJson(path)

      if (pkg.version !== sourceVersion) {
        console.log(`${wrapper}: ${pkg.version} → ${sourceVersion}`)
        pkg.version = sourceVersion
        writePackageJson(path, pkg)
        updated++
      } else {
        console.log(`${wrapper}: ${pkg.version} (up to date)`)
      }
    } catch (err) {
      console.warn(`⚠️  Could not read ${path}/package.json`)
    }
  }

  console.log(`\n✅ Updated ${updated} service wrapper(s)`)
}

main()
```

### get-npm-versions.ts

```typescript
#!/usr/bin/env node
/**
 * Utility to check current published versions on npm for all packages
 */

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface PackageJson {
  name: string
  version: string
  private?: boolean
}

const PACKAGE_DIRS = ['packages/*', 'objects/*', 'workers/*', 'sdks/*']

function globDirs(pattern: string): string[] {
  const [base, glob] = pattern.split('/')
  const baseDir = join(rootDir, base)
  if (!existsSync(baseDir)) return []

  if (glob === '*') {
    return readdirSync(baseDir)
      .map(name => join(baseDir, name))
      .filter(path => {
        try {
          return statSync(path).isDirectory() &&
                 existsSync(join(path, 'package.json'))
        } catch { return false }
      })
  }
  return [baseDir]
}

function getNpmVersion(name: string): string | null {
  try {
    return execSync(`npm view "${name}" version`, { stdio: 'pipe' })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function main() {
  const dirs = PACKAGE_DIRS.flatMap(pattern => globDirs(pattern))

  console.log('Package versions (local → npm):\n')

  for (const dir of dirs) {
    const pkg: PackageJson = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf-8')
    )

    if (pkg.private) {
      console.log(`⏭️  ${pkg.name} (private)`)
      continue
    }

    const npmVersion = getNpmVersion(pkg.name)

    if (!npmVersion) {
      console.log(`🆕 ${pkg.name}: ${pkg.version} (not on npm)`)
    } else if (npmVersion === pkg.version) {
      console.log(`✅ ${pkg.name}: ${pkg.version}`)
    } else {
      console.log(`📦 ${pkg.name}: ${pkg.version} (npm: ${npmVersion})`)
    }
  }
}

main()
```

## Implementation Steps

1. Create `scripts/` directory
2. Add `@changesets/cli` and `tsx` to devDependencies
3. Create `.changeset/config.json`
4. Create `scripts/publish.ts`
5. Create `scripts/sync-service-versions.ts`
6. Create `scripts/get-npm-versions.ts`
7. Update root `package.json` with new scripts
8. Consolidate packages (rename/move as needed)
9. Remove `private: true` from packages that should be published
10. Test with `pnpm run check-versions`
