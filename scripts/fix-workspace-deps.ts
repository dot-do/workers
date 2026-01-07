#!/usr/bin/env tsx
/**
 * Fix workspace:* references in package.json files for npm publish
 *
 * Replaces "workspace:*" with "^0.1.0" for internal packages.
 * This is needed because npm doesn't understand the workspace: protocol.
 *
 * Usage:
 *   npx tsx scripts/fix-workspace-deps.ts           # Fix all packages
 *   npx tsx scripts/fix-workspace-deps.ts --dry-run # Show what would be fixed
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

interface PackageJson {
  name?: string
  version?: string
  private?: boolean
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  [key: string]: unknown
}

// All directories to scan for package.json files
const DIRECTORIES_TO_SCAN = [
  'sdks',
  'packages',
  'middleware',
  'objects',
  'workers',
  'apps',
  'auth',
  'plugins',
  'snippets',
  'types',
]

// Replacement version for workspace:* references
const REPLACEMENT_VERSION = '^0.1.0'

const dryRun = process.argv.includes('--dry-run')

async function getPackageJsonPaths(baseDir: string): Promise<string[]> {
  const paths: string[] = []

  // Check if directory exists
  if (!existsSync(baseDir)) {
    return paths
  }

  // Check for package.json in the directory itself
  const rootPkgPath = join(baseDir, 'package.json')
  if (existsSync(rootPkgPath)) {
    paths.push(rootPkgPath)
  }

  // Check subdirectories
  try {
    const entries = await readdir(baseDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const pkgPath = join(baseDir, entry.name, 'package.json')
        if (existsSync(pkgPath)) {
          paths.push(pkgPath)
        }
      }
    }
  } catch {
    // Directory might not exist or be readable
  }

  return paths
}

async function fixPackageJson(pkgPath: string): Promise<{ fixed: number; changes: string[] }> {
  const content = await readFile(pkgPath, 'utf-8')
  let pkg: PackageJson

  try {
    pkg = JSON.parse(content)
  } catch {
    console.error(`  Error: Could not parse ${pkgPath}`)
    return { fixed: 0, changes: [] }
  }

  let fixed = 0
  const changes: string[] = []

  // Fix all dependency types (excluding devDependencies since they're not published)
  const depTypes = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const

  for (const depType of depTypes) {
    const deps = pkg[depType]
    if (!deps) continue

    for (const [pkgName, version] of Object.entries(deps)) {
      if (version === 'workspace:*') {
        deps[pkgName] = REPLACEMENT_VERSION
        fixed++
        changes.push(`${depType}.${pkgName}: workspace:* -> ${REPLACEMENT_VERSION}`)
      }
    }
  }

  if (fixed > 0 && !dryRun) {
    // Pretty print with 2-space indentation and trailing newline
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  }

  return { fixed, changes }
}

async function main() {
  const cwd = process.cwd()
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Fixing workspace:* references in package.json files...\n`)

  let totalFiles = 0
  let totalFixed = 0
  const allChanges: { path: string; changes: string[] }[] = []

  for (const dir of DIRECTORIES_TO_SCAN) {
    const fullPath = join(cwd, dir)
    const pkgPaths = await getPackageJsonPaths(fullPath)

    for (const pkgPath of pkgPaths) {
      totalFiles++
      const { fixed, changes } = await fixPackageJson(pkgPath)

      if (fixed > 0) {
        totalFixed += fixed
        allChanges.push({ path: pkgPath.replace(cwd + '/', ''), changes })
      }
    }
  }

  // Print results
  if (allChanges.length === 0) {
    console.log('No workspace:* references found in dependencies or peerDependencies.')
  } else {
    for (const { path, changes } of allChanges) {
      console.log(`${path}:`)
      for (const change of changes) {
        console.log(`  - ${change}`)
      }
      console.log()
    }
  }

  // Summary
  console.log('='.repeat(60))
  console.log('Summary:')
  console.log(`  Files scanned: ${totalFiles}`)
  console.log(`  Files modified: ${allChanges.length}`)
  console.log(`  Total fixes: ${totalFixed}`)

  if (dryRun && totalFixed > 0) {
    console.log('\nRun without --dry-run to apply these fixes.')
  } else if (totalFixed > 0) {
    console.log('\nAll fixes applied. Run the lint script to verify:')
    console.log('  npx tsx scripts/lint-package-json.ts')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
