#!/usr/bin/env tsx
/**
 * Lint SDK package.json files for npm publish validity
 *
 * Checks for issues that would prevent successful npm publish:
 * 1. workspace:* in peerDependencies (npm doesn't understand workspace protocol)
 * 2. workspace:* in dependencies (invalid for npm publish)
 * 3. Missing required fields for npm (name, version, description)
 * 4. Invalid semver in dependencies
 *
 * Usage:
 *   tsx scripts/lint-package-json.ts           # Check all SDKs
 *   tsx scripts/lint-package-json.ts --fix     # Show what would be fixed (doesn't modify files)
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

interface Issue {
  severity: 'error' | 'warning'
  message: string
  field: string
  value?: string
}

interface PackageResult {
  path: string
  name: string
  issues: Issue[]
}

interface PackageJson {
  name?: string
  version?: string
  description?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  [key: string]: unknown
}

const WORKSPACE_PATTERN = /^workspace:/

function isValidSemver(version: string): boolean {
  // Allow workspace: protocol (we check for it separately)
  if (version.startsWith('workspace:')) return true
  // Allow npm: protocol
  if (version.startsWith('npm:')) return true
  // Allow git URLs
  if (version.startsWith('git')) return true
  // Allow file: protocol
  if (version.startsWith('file:')) return true
  // Allow link: protocol
  if (version.startsWith('link:')) return true
  // Allow tarball URLs
  if (version.startsWith('http://') || version.startsWith('https://')) return true

  // Basic semver pattern (simplified - allows ^, ~, >=, <=, >, <, =, *)
  const semverPattern = /^[\^~>=<*]?\d+(\.\d+)?(\.\d+)?(-[\w.]+)?(\+[\w.]+)?$/
  // Range pattern (e.g., ">=1.0.0 <2.0.0")
  const rangePattern = /^[\^~>=<]?\d+(\.\d+)?(\.\d+)?(\s+([\^~>=<]?\d+(\.\d+)?(\.\d+)?))*$/
  // X-range pattern (e.g., "1.x", "1.2.x")
  const xRangePattern = /^\d+(\.\d+)?\.x$/
  // Or pattern (e.g., "1 || 2")
  const orPattern = /\|\|/

  if (semverPattern.test(version)) return true
  if (rangePattern.test(version)) return true
  if (xRangePattern.test(version)) return true
  if (orPattern.test(version)) return true
  if (version === '*' || version === 'latest' || version === 'next') return true

  return false
}

function checkDependencies(
  deps: Record<string, string> | undefined,
  fieldName: string,
  isPublishable: boolean
): Issue[] {
  if (!deps) return []

  const issues: Issue[] = []

  for (const [pkg, version] of Object.entries(deps)) {
    // Check for workspace: protocol
    if (WORKSPACE_PATTERN.test(version)) {
      // workspace:* in peerDependencies is always an error for publishing
      if (fieldName === 'peerDependencies') {
        issues.push({
          severity: 'error',
          message: `uses "workspace:*" - invalid for npm publish`,
          field: `${fieldName}.${pkg}`,
          value: version
        })
      }
      // workspace:* in regular dependencies is also an error for publishing
      else if (fieldName === 'dependencies' && isPublishable) {
        issues.push({
          severity: 'error',
          message: `uses "workspace:*" - invalid for npm publish`,
          field: `${fieldName}.${pkg}`,
          value: version
        })
      }
      // workspace:* in devDependencies is okay (not published)
      // but warn anyway for visibility
      else if (fieldName === 'devDependencies') {
        // Don't warn about devDependencies - they're not published
      }
      // optionalDependencies with workspace: is an error
      else if (fieldName === 'optionalDependencies') {
        issues.push({
          severity: 'error',
          message: `uses "workspace:*" - invalid for npm publish`,
          field: `${fieldName}.${pkg}`,
          value: version
        })
      }
    }

    // Check for invalid semver (but not for workspace: which we already handled)
    if (!WORKSPACE_PATTERN.test(version) && !isValidSemver(version)) {
      issues.push({
        severity: 'warning',
        message: `has invalid semver version`,
        field: `${fieldName}.${pkg}`,
        value: version
      })
    }
  }

  return issues
}

async function checkPackage(pkgPath: string): Promise<PackageResult> {
  const content = await readFile(pkgPath, 'utf-8')
  let pkg: PackageJson

  try {
    pkg = JSON.parse(content)
  } catch {
    return {
      path: pkgPath,
      name: 'INVALID JSON',
      issues: [{
        severity: 'error',
        message: 'Failed to parse package.json as JSON',
        field: 'root'
      }]
    }
  }

  const issues: Issue[] = []

  // Check required fields
  if (!pkg.name) {
    issues.push({
      severity: 'error',
      message: 'missing "name" field',
      field: 'name'
    })
  }

  if (!pkg.version) {
    issues.push({
      severity: 'error',
      message: 'missing "version" field',
      field: 'version'
    })
  }

  if (!pkg.description) {
    issues.push({
      severity: 'warning',
      message: 'missing "description" field (recommended for npm)',
      field: 'description'
    })
  }

  // Check all dependency types
  const isPublishable = pkg.private !== true

  issues.push(...checkDependencies(pkg.dependencies, 'dependencies', isPublishable))
  issues.push(...checkDependencies(pkg.peerDependencies, 'peerDependencies', isPublishable))
  issues.push(...checkDependencies(pkg.devDependencies, 'devDependencies', isPublishable))
  issues.push(...checkDependencies(pkg.optionalDependencies, 'optionalDependencies', isPublishable))

  return {
    path: pkgPath,
    name: pkg.name ?? 'unknown',
    issues
  }
}

async function main() {
  const sdksDir = join(process.cwd(), 'sdks')

  // Get all SDK directories
  const entries = await readdir(sdksDir, { withFileTypes: true })
  const sdkDirs = entries.filter(e => e.isDirectory()).map(e => e.name)

  console.log(`Checking ${sdkDirs.length} SDK package.json files...\n`)

  const results: PackageResult[] = []

  for (const dir of sdkDirs.sort()) {
    const pkgPath = join(sdksDir, dir, 'package.json')
    try {
      const result = await checkPackage(pkgPath)
      results.push(result)
    } catch (err) {
      results.push({
        path: pkgPath,
        name: dir,
        issues: [{
          severity: 'error',
          message: `Could not read package.json: ${err instanceof Error ? err.message : 'unknown error'}`,
          field: 'root'
        }]
      })
    }
  }

  // Summary counts
  let packagesWithErrors = 0
  let packagesWithWarnings = 0
  let totalErrors = 0
  let totalWarnings = 0
  let workspaceInPeerDeps = 0
  let workspaceInDeps = 0

  // Print results
  for (const result of results) {
    const errors = result.issues.filter(i => i.severity === 'error')
    const warnings = result.issues.filter(i => i.severity === 'warning')

    if (errors.length > 0) packagesWithErrors++
    if (warnings.length > 0) packagesWithWarnings++
    totalErrors += errors.length
    totalWarnings += warnings.length

    // Count workspace: issues
    for (const issue of result.issues) {
      if (issue.value?.startsWith('workspace:')) {
        if (issue.field.startsWith('peerDependencies.')) {
          workspaceInPeerDeps++
        } else if (issue.field.startsWith('dependencies.')) {
          workspaceInDeps++
        }
      }
    }

    const relativePath = relative(process.cwd(), result.path)

    if (result.issues.length === 0) {
      console.log(`${relativePath}:`)
      console.log('  \u2713 No issues\n')
    } else {
      console.log(`${relativePath}:`)
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '\u2717' : '\u26A0'
        const valueStr = issue.value ? ` (${issue.value})` : ''
        console.log(`  ${icon} ${issue.field} ${issue.message}${valueStr}`)
      }
      console.log()
    }
  }

  // Print summary
  console.log('='.repeat(60))
  console.log('Summary:')
  console.log(`  Packages checked: ${results.length}`)
  console.log(`  Packages with errors: ${packagesWithErrors}`)
  console.log(`  Packages with warnings: ${packagesWithWarnings}`)
  console.log(`  Total errors: ${totalErrors}`)
  console.log(`  Total warnings: ${totalWarnings}`)
  console.log()
  console.log('Specific issues:')
  console.log(`  workspace:* in dependencies: ${workspaceInDeps}`)
  console.log(`  workspace:* in peerDependencies: ${workspaceInPeerDeps}`)

  // Exit with error code if there are errors
  if (totalErrors > 0) {
    console.log()
    console.log(`\u2717 ${totalErrors} error(s) found - packages cannot be published to npm as-is`)
    process.exit(1)
  } else {
    console.log()
    console.log('\u2713 All packages are valid for npm publish')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
