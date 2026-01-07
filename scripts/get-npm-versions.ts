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

  console.log('Package versions (local -> npm):\n')

  for (const dir of dirs) {
    const pkg: PackageJson = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf-8')
    )

    if (pkg.private) {
      console.log(`\u23ed\ufe0f  ${pkg.name} (private)`)
      continue
    }

    const npmVersion = getNpmVersion(pkg.name)

    if (!npmVersion) {
      console.log(`\ud83c\udd95 ${pkg.name}: ${pkg.version} (not on npm)`)
    } else if (npmVersion === pkg.version) {
      console.log(`\u2705 ${pkg.name}: ${pkg.version}`)
    } else {
      console.log(`\ud83d\udce6 ${pkg.name}: ${pkg.version} (npm: ${npmVersion})`)
    }
  }
}

main()
