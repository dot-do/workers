#!/usr/bin/env node
/**
 * SDK API Key Resolution Lint Script
 *
 * Verifies that all SDKs use consistent API key resolution via rpc.do's
 * global environment system instead of direct process.env access.
 *
 * BAD pattern (direct process.env access):
 * ```typescript
 * export const agents = Agents({
 *   apiKey: typeof process !== 'undefined' ? process.env?.AGENTS_API_KEY : undefined
 * })
 * ```
 *
 * GOOD pattern (uses rpc.do's env system):
 * ```typescript
 * export const llm = LLM()  // Uses rpc.do's getDefaultApiKeySync internally
 * ```
 *
 * The rpc.do module handles API key resolution via getDefaultApiKeySync() which checks:
 * 1. Explicit envOverride parameter
 * 2. Global env set via setEnv()
 * 3. Node.js process.env (auto-detected)
 *
 * @see https://github.com/workers-do/workers/issues/workers-ak1z
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface LintResult {
  sdk: string
  path: string
  line: number
  content: string
  issue: string
}

interface SummaryResult {
  sdk: string
  status: 'pass' | 'fail'
  issues: LintResult[]
}

// Pattern to detect direct process.env access for API keys in default instance exports
// This pattern is BAD because it bypasses rpc.do's centralized env resolution
const PROCESS_ENV_PATTERN = /process\.env\??\.\w+_API_KEY|process\.env\??\.\w+_TOKEN|process\.env\??\.\bDO_API_KEY\b|process\.env\??\.\bDO_TOKEN\b|process\.env\??\.\bORG_AI_API_KEY\b/g

// Files that are explicitly allowed to use process.env (CLI tools, tests, etc.)
const ALLOWED_FILES = [
  'cli.ts',
  'cli.js',
  '.test.ts',
  '.test.js',
  '.spec.ts',
  '.spec.js',
]

// SDKs that are explicitly allowed to have their own env resolution
// (e.g., org.ai which wraps WorkOS and needs special handling)
const ALLOWED_SDKS = [
  'org.ai',      // Auth SDK with WorkOS - has special env resolution needs
  'oauth.do',   // OAuth CLI tool - needs direct env access for config
  'workers.do', // CLI tool for Workers deployment
]

function discoverSdkPackages(): string[] {
  const sdksDir = join(rootDir, 'sdks')
  if (!existsSync(sdksDir)) return []

  return readdirSync(sdksDir)
    .map(name => join(sdksDir, name))
    .filter(path => {
      try {
        return statSync(path).isDirectory() &&
               existsSync(join(path, 'package.json'))
      } catch { return false }
    })
}

function isAllowedFile(filePath: string): boolean {
  const fileName = basename(filePath)
  return ALLOWED_FILES.some(pattern => fileName.endsWith(pattern))
}

function findTsFiles(dir: string): string[] {
  const files: string[] = []

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir)
      for (const entry of entries) {
        // Skip node_modules and dist directories
        if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue

        const fullPath = join(currentDir, entry)
        try {
          const stat = statSync(fullPath)
          if (stat.isDirectory()) {
            walk(fullPath)
          } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
            files.push(fullPath)
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  walk(dir)
  return files
}

function lintFile(filePath: string, sdkName: string): LintResult[] {
  const results: LintResult[] = []

  // Skip allowed files
  if (isAllowedFile(filePath)) return results

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Skip comments
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
        continue
      }

      // Check for process.env API key pattern
      const matches = line.match(PROCESS_ENV_PATTERN)
      if (matches) {
        for (const match of matches) {
          results.push({
            sdk: sdkName,
            path: filePath,
            line: lineNumber,
            content: line.trim(),
            issue: `Direct process.env access: ${match}`,
          })
        }
      }
    }
  } catch {
    // Skip unreadable files
  }

  return results
}

function lintSdk(sdkPath: string): SummaryResult {
  const sdkName = basename(sdkPath)

  // Check if SDK is in allow list
  if (ALLOWED_SDKS.includes(sdkName)) {
    return {
      sdk: sdkName,
      status: 'pass',
      issues: [],
    }
  }

  const files = findTsFiles(sdkPath)
  const allIssues: LintResult[] = []

  for (const file of files) {
    const issues = lintFile(file, sdkName)
    allIssues.push(...issues)
  }

  return {
    sdk: sdkName,
    status: allIssues.length > 0 ? 'fail' : 'pass',
    issues: allIssues,
  }
}

function main() {
  console.log('SDK API Key Resolution Lint\n')
  console.log('Checking for direct process.env access in SDK default instances...\n')

  const sdkPaths = discoverSdkPackages()

  if (sdkPaths.length === 0) {
    console.log('No SDKs found in sdks/ directory.')
    process.exit(0)
  }

  console.log(`Found ${sdkPaths.length} SDK(s) to check.\n`)

  const results: SummaryResult[] = []

  for (const sdkPath of sdkPaths) {
    const result = lintSdk(sdkPath)
    results.push(result)
  }

  // Group results
  const passed = results.filter(r => r.status === 'pass')
  const failed = results.filter(r => r.status === 'fail')

  // Print detailed issues first
  if (failed.length > 0) {
    console.log('=' .repeat(80))
    console.log('Issues Found')
    console.log('=' .repeat(80))
    console.log('')

    for (const result of failed) {
      console.log(`SDK: ${result.sdk}`)
      console.log('-'.repeat(40))

      for (const issue of result.issues) {
        const relativePath = issue.path.replace(rootDir + '/', '')
        console.log(`  ${relativePath}:${issue.line}`)
        console.log(`    Issue: ${issue.issue}`)
        console.log(`    Code:  ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`)
        console.log('')
      }
    }
  }

  // Print summary
  console.log('=' .repeat(80))
  console.log('Summary')
  console.log('=' .repeat(80))
  console.log('')

  // Print passed SDKs
  if (passed.length > 0) {
    console.log(`Passed (${passed.length}):`)
    for (const r of passed.sort((a, b) => a.sdk.localeCompare(b.sdk))) {
      const isAllowed = ALLOWED_SDKS.includes(r.sdk)
      console.log(`  [PASS] ${r.sdk}${isAllowed ? ' (allowed list)' : ''}`)
    }
    console.log('')
  }

  // Print failed SDKs
  if (failed.length > 0) {
    console.log(`Failed (${failed.length}):`)
    for (const r of failed.sort((a, b) => a.sdk.localeCompare(b.sdk))) {
      console.log(`  [FAIL] ${r.sdk} (${r.issues.length} issue${r.issues.length > 1 ? 's' : ''})`)
    }
    console.log('')
  }

  // Final verdict
  console.log('-'.repeat(80))

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length} SDK(s) have direct process.env access.\n`)
    console.log('To fix: Remove direct process.env access from default instance exports.')
    console.log('Use rpc.do\'s env system instead:\n')
    console.log('  // GOOD: Let rpc.do handle env resolution')
    console.log('  export const myService = MyService()')
    console.log('')
    console.log('  // Also GOOD: Pass env explicitly')
    console.log('  export function MyService(options?: ClientOptions) {')
    console.log('    return createClient<MyServiceClient>("https://my-service.do", options)')
    console.log('  }')
    console.log('')
    console.log('Users can set env via:')
    console.log('  - import "rpc.do/env" (Workers)')
    console.log('  - import "rpc.do/env/node" (Node.js)')
    console.log('  - MyService({ apiKey: "xxx" }) (explicit)')
    console.log('')
    process.exit(1)
  }

  console.log('\nAll SDK API key resolution checks passed!')
  process.exit(0)
}

main()
