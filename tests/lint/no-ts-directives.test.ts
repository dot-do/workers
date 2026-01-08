/**
 * RED Phase Test: Verify no TypeScript directive suppressions in source code
 *
 * Issue: workers-jqc43 - RED: ts-directive tests verify no type suppressions
 * Epic: workers-lsgq - TypeScript Improvements
 *
 * This test enforces that source code does not use @ts-expect-error or @ts-ignore
 * directives to suppress type errors. These directives hide type safety issues
 * that should be fixed with proper types.
 *
 * Allowed exceptions:
 * - Test files (*.test.ts, *.spec.ts, __tests__/*) - testing invalid inputs is legitimate
 * - Directives with descriptions explaining why suppression is necessary
 *
 * Current violations (to be fixed in GREEN phase):
 * - sdks/org.ai/src/auth.ts:84 - @ts-ignore (cloudflare:workers import)
 * - primitives/packages/ai-functions/src/batch/bedrock.ts:189,191 - @ts-expect-error (optional deps)
 * - packages/claude/packages/sdk/src/server/index.ts:206 - @ts-expect-error (sandbox property)
 */

import { describe, test, expect } from 'vitest'
import { execSync } from 'child_process'
import { join } from 'path'

const ROOT_DIR = join(__dirname, '..', '..')

// Directories to scan for ts-directives in source files
const SOURCE_DIRS = [
  'sdks',
  'packages',
  'primitives',
  'workers',
  'agents',
  'roles',
  'humans',
  'teams',
  'workflows',
  'objects',
  'middleware',
  'auth',
  'plugins',
]

// File patterns to exclude (tests are allowed to use ts-directives)
const EXCLUDED_PATTERNS = [
  '*.test.ts',
  '*.spec.ts',
  '__tests__/*',
  'test/*',
  'tests/*',
  'node_modules/*',
]

describe('TypeScript Directive Suppression Audit', () => {
  test('should not have @ts-expect-error directives in source files', () => {
    const results = scanForTsDirectives('@ts-expect-error')

    // RED phase: This test SHOULD FAIL because we have known violations
    // When GREEN phase fixes are applied, this assertion will pass
    expect(results).toHaveLength(0)
  })

  test('should not have @ts-ignore directives in source files', () => {
    const results = scanForTsDirectives('@ts-ignore')

    // RED phase: This test SHOULD FAIL because we have known violations
    // When GREEN phase fixes are applied, this assertion will pass
    expect(results).toHaveLength(0)
  })

  test('should not have @ts-nocheck directives in source files', () => {
    const results = scanForTsDirectives('@ts-nocheck')

    // This should already pass (no known @ts-nocheck usages)
    expect(results).toHaveLength(0)
  })

  test('should document all current ts-directive violations', () => {
    const expectErrors = scanForTsDirectives('@ts-expect-error')
    const ignores = scanForTsDirectives('@ts-ignore')
    const noChecks = scanForTsDirectives('@ts-nocheck')

    const allViolations = [...expectErrors, ...ignores, ...noChecks]

    // Log all violations for visibility
    if (allViolations.length > 0) {
      console.log('\n=== TypeScript Directive Violations ===')
      console.log('The following source files use ts-directives to suppress type errors:')
      console.log('')
      allViolations.forEach((violation) => {
        console.log(`  ${violation}`)
      })
      console.log('')
      console.log(`Total: ${allViolations.length} violations`)
      console.log('These should be fixed with proper types in the GREEN phase.')
      console.log('========================================\n')
    }

    // This test always passes but logs violations for visibility
    // The individual directive tests above enforce the actual constraints
    expect(true).toBe(true)
  })
})

describe('ESLint Configuration Validation', () => {
  test('should have ban-ts-comment rule configured', () => {
    // Read the ESLint config and verify the rule exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    const eslintConfigPath = join(ROOT_DIR, 'eslint.config.mjs')

    const configContent = fs.readFileSync(eslintConfigPath, 'utf-8')

    // RED phase: The ban-ts-comment rule is NOT yet configured
    // This test verifies it should be added
    expect(configContent).toContain('@typescript-eslint/ban-ts-comment')
  })

  test('should fail ESLint on files with ts-directives', async () => {
    // Try to run ESLint on a known file with ts-directives
    // RED phase: ESLint may not fail because the rule isn't configured yet

    try {
      // Run ESLint on the org.ai auth.ts file which has @ts-ignore
      execSync(
        `npx eslint "${join(ROOT_DIR, 'sdks/org.ai/src/auth.ts')}" --no-eslintrc --config "${join(ROOT_DIR, 'eslint.config.mjs')}" 2>&1`,
        { encoding: 'utf-8', cwd: ROOT_DIR }
      )

      // If we get here, ESLint passed - which means the rule isn't enforcing
      // In RED phase, this is expected to fail because rule isn't configured
      // After GREEN phase, ESLint should error on this file
    } catch (error) {
      // ESLint failed - check if it's due to ban-ts-comment rule
      const output = (error as { stdout?: string; message?: string }).stdout || (error as Error).message || ''

      // RED phase: We expect the rule NOT to be configured yet
      // GREEN phase: This should catch ban-ts-comment errors
      if (output.includes('ban-ts-comment') || output.includes('@ts-ignore')) {
        // Good - ESLint caught the ts-directive
        expect(true).toBe(true)
        return
      }

      // Some other ESLint error - log it
      console.log('ESLint error (not ban-ts-comment):', output)
    }

    // RED phase assertion: The rule should be configured but isn't yet
    // This will fail until the ESLint config is updated
    expect.fail(
      'ESLint ban-ts-comment rule is not catching @ts-ignore directives. ' +
        'Configure @typescript-eslint/ban-ts-comment in eslint.config.mjs'
    )
  })
})

/**
 * Scan source directories for TypeScript directive patterns
 *
 * @param directive - The directive pattern to search for (e.g., '@ts-expect-error')
 * @returns Array of file:line:content strings for each match
 */
function scanForTsDirectives(directive: string): string[] {
  const results: string[] = []

  for (const dir of SOURCE_DIRS) {
    const fullPath = join(ROOT_DIR, dir)

    try {
      // Use grep to find the directive, excluding test files and node_modules
      const excludeArgs = EXCLUDED_PATTERNS.map((p) => `--exclude='${p}'`).join(' ')

      const cmd = `grep -rn "${directive}" "${fullPath}" --include="*.ts" --include="*.tsx" ${excludeArgs} 2>/dev/null || true`
      const output = execSync(cmd, { encoding: 'utf-8', cwd: ROOT_DIR })

      if (output.trim()) {
        // Filter out test files more thoroughly
        const lines = output
          .trim()
          .split('\n')
          .filter((line) => {
            const lowerLine = line.toLowerCase()
            return (
              !lowerLine.includes('.test.ts') &&
              !lowerLine.includes('.spec.ts') &&
              !lowerLine.includes('__tests__') &&
              !lowerLine.includes('/test/') &&
              !lowerLine.includes('/tests/') &&
              !lowerLine.includes('node_modules')
            )
          })

        results.push(...lines)
      }
    } catch {
      // Directory doesn't exist or grep failed - skip silently
    }
  }

  return results
}
