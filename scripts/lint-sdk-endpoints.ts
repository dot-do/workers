#!/usr/bin/env node
/**
 * SDK Endpoint Consistency Lint Script
 *
 * Verifies all SDKs use consistent endpoint format in createClient() calls.
 *
 * Standard format (recommended): Full URL
 *   createClient<XClient>('https://x.do', options)
 *
 * Non-standard format: Service name only
 *   createClient<XClient>('x', options)
 *
 * Usage:
 *   npx tsx scripts/lint-sdk-endpoints.ts
 *   npx tsx scripts/lint-sdk-endpoints.ts --fix  # Future: auto-fix inconsistencies
 *
 * Exit codes:
 *   0 - All SDKs consistent
 *   1 - Inconsistencies found
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface EndpointInfo {
  sdk: string
  file: string
  endpoint: string
  format: 'full-url' | 'service-name'
  line: number
  match: string
}

interface LintResult {
  consistent: boolean
  endpoints: EndpointInfo[]
  fullUrlCount: number
  serviceNameCount: number
  noCreateClientSdks: string[]
  errors: Array<{ sdk: string; error: string }>
}

/**
 * Discover all SDK directories that have an index.ts file
 */
function discoverSdks(): string[] {
  const sdksDir = join(rootDir, 'sdks')
  if (!existsSync(sdksDir)) {
    console.error('Error: sdks/ directory not found')
    process.exit(1)
  }

  return readdirSync(sdksDir)
    .filter(name => {
      const path = join(sdksDir, name)
      try {
        return statSync(path).isDirectory() &&
               existsSync(join(path, 'index.ts'))
      } catch {
        return false
      }
    })
    .sort()
}

/**
 * Parse an SDK's index.ts file and extract createClient() calls
 */
function parseCreateClientCalls(sdkName: string): EndpointInfo[] {
  const sdksDir = join(rootDir, 'sdks')
  const indexPath = join(sdksDir, sdkName, 'index.ts')

  if (!existsSync(indexPath)) {
    throw new Error(`index.ts not found for SDK: ${sdkName}`)
  }

  const content = readFileSync(indexPath, 'utf-8')
  const lines = content.split('\n')
  const results: EndpointInfo[] = []

  // Pattern to match createClient<...>('endpoint', ...)
  // Handles both single and double quotes, and multiline with proper TypeScript
  const createClientPattern = /createClient<[^>]+>\s*\(\s*['"]([^'"]+)['"]/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match: RegExpExecArray | null

    // Reset lastIndex for global regex
    createClientPattern.lastIndex = 0

    while ((match = createClientPattern.exec(line)) !== null) {
      const endpoint = match[1]
      const isFullUrl = endpoint.startsWith('https://') || endpoint.startsWith('http://')

      results.push({
        sdk: sdkName,
        file: indexPath,
        endpoint,
        format: isFullUrl ? 'full-url' : 'service-name',
        line: i + 1,
        match: match[0]
      })
    }
  }

  return results
}

/**
 * Run the lint check on all SDKs
 */
function lintSdkEndpoints(): LintResult {
  const sdks = discoverSdks()
  const endpoints: EndpointInfo[] = []
  const errors: Array<{ sdk: string; error: string }> = []
  const noCreateClientSdks: string[] = []

  for (const sdk of sdks) {
    try {
      const calls = parseCreateClientCalls(sdk)
      if (calls.length === 0) {
        noCreateClientSdks.push(sdk)
      } else {
        endpoints.push(...calls)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ sdk, error: message })
    }
  }

  const fullUrlEndpoints = endpoints.filter(e => e.format === 'full-url')
  const serviceNameEndpoints = endpoints.filter(e => e.format === 'service-name')

  // Consistent if all use the same format
  const consistent = fullUrlEndpoints.length === 0 || serviceNameEndpoints.length === 0

  return {
    consistent,
    endpoints,
    fullUrlCount: fullUrlEndpoints.length,
    serviceNameCount: serviceNameEndpoints.length,
    noCreateClientSdks,
    errors
  }
}

/**
 * Format the output for terminal display
 */
function printResults(result: LintResult): void {
  const sdks = discoverSdks()

  console.log('SDK Endpoint Format Lint\n')
  console.log('='.repeat(60))
  console.log(`Checking ${sdks.length} SDKs...\n`)

  // Group by format
  const fullUrl = result.endpoints.filter(e => e.format === 'full-url')
  const serviceName = result.endpoints.filter(e => e.format === 'service-name')

  // Print all endpoints sorted by SDK name
  const sortedEndpoints = [...result.endpoints].sort((a, b) => a.sdk.localeCompare(b.sdk))

  for (const ep of sortedEndpoints) {
    const icon = ep.format === 'full-url' ? '\u2713' : '\u2717'
    const formatLabel = ep.format === 'full-url' ? 'full URL' : 'service name only'
    console.log(`${icon} ${ep.sdk}: ${ep.endpoint} (${formatLabel})`)
  }

  // Print errors if any
  if (result.errors.length > 0) {
    console.log('\nErrors:')
    for (const err of result.errors) {
      console.log(`  ! ${err.sdk}: ${err.error}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Summary\n')

  console.log(`Total SDKs scanned: ${sdks.length}`)
  console.log(`SDKs with createClient calls: ${result.endpoints.length}`)
  console.log(`  - Full URL format: ${result.fullUrlCount}`)
  console.log(`  - Service name format: ${result.serviceNameCount}`)

  if (result.noCreateClientSdks.length > 0) {
    console.log(`SDKs without createClient: ${result.noCreateClientSdks.length}`)
    console.log(`  (${result.noCreateClientSdks.join(', ')})`)
  }

  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`)
  }

  console.log('')

  if (result.consistent) {
    console.log('All SDKs use consistent endpoint format.')
  } else {
    console.log(`Found ${result.serviceNameCount} inconsistent endpoints (using service name instead of full URL)`)
    console.log('\nInconsistent SDKs (need full URL):')
    for (const ep of serviceName) {
      console.log(`  - ${ep.sdk}: '${ep.endpoint}' -> 'https://${ep.endpoint}.do' (line ${ep.line})`)
    }
  }
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2)
  const showHelp = args.includes('--help') || args.includes('-h')

  if (showHelp) {
    console.log(`
Usage: npx tsx scripts/lint-sdk-endpoints.ts [options]

Options:
  --help, -h     Show this help message
  --json         Output results as JSON
  --quiet        Only output errors and inconsistencies

Checks all SDKs in sdks/*/ for consistent createClient() endpoint format.
Recommended format: Full URL (e.g., 'https://llm.do')
`)
    process.exit(0)
  }

  const jsonOutput = args.includes('--json')
  const quiet = args.includes('--quiet')

  const result = lintSdkEndpoints()

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2))
  } else if (!quiet || !result.consistent) {
    printResults(result)
  }

  // Exit with error code if inconsistent
  process.exit(result.consistent ? 0 : 1)
}

main()
