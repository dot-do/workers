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
  '@dotdo/worker-stripe': { source: 'stripe', path: 'workers/stripe' },
  '@dotdo/worker-workos': { source: '@workos-inc/node', path: 'workers/workos' },
  '@dotdo/worker-jose': { source: 'jose', path: 'workers/jose' },
  '@dotdo/worker-esbuild': { source: 'esbuild-wasm', path: 'workers/esbuild' },
  '@dotdo/worker-cloudflare': { source: 'cloudflare', path: 'workers/cloudflare' },
}

function getInstalledVersion(pkg: string): string | null {
  const pkgPath = pkg.startsWith('@')
    ? join(rootDir, 'node_modules', ...pkg.split('/'), 'package.json')
    : join(rootDir, 'node_modules', pkg, 'package.json')

  if (!existsSync(pkgPath)) {
    console.warn(`Warning: Source package not installed: ${pkg}`)
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
        console.log(`${wrapper}: ${pkg.version} -> ${sourceVersion}`)
        pkg.version = sourceVersion
        writePackageJson(path, pkg)
        updated++
      } else {
        console.log(`${wrapper}: ${pkg.version} (up to date)`)
      }
    } catch (err) {
      console.warn(`Warning: Could not read ${path}/package.json`)
    }
  }

  console.log(`\nUpdated ${updated} service wrapper(s)`)
}

main()
