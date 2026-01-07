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
      console.log(`  ${pkg.name} (private)`)
      continue
    }

    if (isPublishedOnNpm(pkg.name, pkg.version)) {
      console.log(`  ${pkg.name}@${pkg.version} (already published)`)
    } else {
      console.log(`  ${pkg.name}@${pkg.version} (needs publish)`)
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
    console.log(`\n  Publishing ${name}@${version}...`)
    const result = spawnSync('npm', ['publish', '--access', 'public'], {
      cwd: dir,
      stdio: 'inherit'
    })

    if (result.status !== 0) {
      console.error(`  Failed to publish ${name}@${version}`)
      failed = true
      break
    }
    console.log(`  Published ${name}@${version}`)
  }

  // Restore original package.json files
  console.log('\nRestoring package.json files...')
  for (const [path, content] of originalContents) {
    writeFileSync(path, content)
  }

  if (failed) {
    process.exit(1)
  }

  console.log('\n  All packages published!')
}

main()
