/**
 * RED TEST: TypeScript Strict Mode Verification
 *
 * Issue: workers-lsgq.6 - RED: Strict type checking not enabled
 *
 * This test verifies that TypeScript strict mode is properly configured
 * and will fail until all strict mode violations are fixed.
 *
 * Current Status: RED (failing)
 * - strictNullChecks: enabled but has violations
 * - strictFunctionTypes: enabled but has violations
 * - strictBindCallApply: enabled
 * - strictPropertyInitialization: enabled but has violations
 *
 * Violations by Package (as of 2026-01-07):
 *
 * packages/build/src/index.ts:
 *   - TS2307: Cannot find module 'esbuild-wasm'
 *   - TS2484: Export declaration conflicts (5 errors)
 *
 * packages/deployment/src/deployment-health.ts:
 *   - TS6133: 'lastHealthy' declared but never used
 *
 * packages/do-core/src/:
 *   - crud-mixin.ts: TS2345 type assignment errors (2 errors)
 *   - events.ts: TS6196 'DOStorage' never used
 *   - json-rpc.ts: TS2304 Cannot find name 'HeadersInit' (2 errors)
 *   - things-mixin.ts: TS6133, TS2545, TS2508, TS2345 mixin constructor errors (4 errors)
 *
 * packages/eval/src/index.ts:
 *   - TS6133: Unused variables (4 errors)
 *   - TS2352: Type conversion errors (5 errors)
 *   - TS2484: Export declaration conflicts (7 errors)
 *
 * packages/observability/src/index.ts:
 *   - TS6133: 'hooks' declared but never used
 *   - TS2304: Cannot find name 'ExecutionContext' (3 errors)
 *
 * packages/security/src/index.ts:
 *   - TS6133: 'lowerInput' declared but never used
 *
 * packages/test-utils/src/mocks/index.ts:
 *   - TS2304: Cannot find name 'BodyInit', 'DurableObjectId', 'ExecutionContext' (12 errors)
 *   - TS2322: Type assignment errors (3 errors)
 *   - TS2345: Argument type errors (1 error)
 *   - TS2353: Unknown property errors (2 errors)
 *   - TS6133: Unused variables (2 errors)
 *
 * Total: ~350 strict mode violations (as of 2026-01-07)
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import * as path from 'path'

describe('TypeScript Strict Mode Verification', () => {
  const workspaceRoot = path.resolve(__dirname, '../../..')

  describe('tsconfig.json strict settings', () => {
    it('should have strict: true in root tsconfig', () => {
      const tsconfig = require(path.join(workspaceRoot, 'tsconfig.json'))
      expect(tsconfig.compilerOptions.strict).toBe(true)
    })

    it('should have strictNullChecks enabled (via strict: true)', () => {
      const tsconfig = require(path.join(workspaceRoot, 'tsconfig.json'))
      // When strict: true, strictNullChecks is implicitly enabled
      expect(tsconfig.compilerOptions.strict).toBe(true)
    })

    it('should have strictFunctionTypes enabled (via strict: true)', () => {
      const tsconfig = require(path.join(workspaceRoot, 'tsconfig.json'))
      expect(tsconfig.compilerOptions.strict).toBe(true)
    })

    it('should have strictBindCallApply enabled (via strict: true)', () => {
      const tsconfig = require(path.join(workspaceRoot, 'tsconfig.json'))
      expect(tsconfig.compilerOptions.strict).toBe(true)
    })

    it('should have strictPropertyInitialization enabled (via strict: true)', () => {
      const tsconfig = require(path.join(workspaceRoot, 'tsconfig.json'))
      expect(tsconfig.compilerOptions.strict).toBe(true)
    })
  })

  describe('strict mode compilation [RED TEST]', () => {
    /**
     * This test runs tsc --noEmit and expects it to succeed.
     * It is currently expected to FAIL because there are strict mode violations.
     *
     * When this test passes, strict mode is fully working and all violations are fixed.
     *
     * Using it.fails() to mark this as a known failing test (RED phase in TDD).
     * When all violations are fixed, this test will "fail to fail" and need to be
     * converted back to a regular it() test.
     */
    it.fails('should compile all packages without errors (expected to FAIL until violations fixed)', () => {
      // Run tsc with project references to check all packages
      let exitCode = 0
      let output = ''

      try {
        output = execSync('npx tsc --noEmit 2>&1', {
          cwd: workspaceRoot,
          encoding: 'utf-8',
          timeout: 120000,
        })
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'status' in error) {
          exitCode = (error as { status: number }).status
        }
        if (error && typeof error === 'object' && 'stdout' in error) {
          output = (error as { stdout: string }).stdout
        }
      }

      // Count errors in output
      const errorMatches = output.match(/error TS\d+:/g) || []
      const errorCount = errorMatches.length

      // This assertion will FAIL until all strict mode violations are fixed
      // Expected: 0 errors, Current: ~350 errors (as of 2026-01-07)
      expect(exitCode).toBe(0)
      expect(errorCount).toBe(0)
    })
  })

  describe('package-level strict mode', () => {
    const packages = [
      'auth',
      'build',
      'circuit-breaker',
      'deployment',
      'do-core',
      'eval',
      'health',
      'observability',
      'rate-limiting',
      'security',
      'sessions',
      'shutdown',
      'test-utils',
    ]

    packages.forEach((pkg) => {
      it(`packages/${pkg} should have strict mode enabled`, () => {
        const tsconfigPath = path.join(workspaceRoot, 'packages', pkg, 'tsconfig.json')
        const tsconfig = require(tsconfigPath)

        // Either has strict: true directly, or extends root config which has it
        const hasStrict = tsconfig.compilerOptions?.strict === true
        const extendsRoot = tsconfig.extends === '../../tsconfig.json'

        expect(hasStrict || extendsRoot).toBe(true)
      })
    })
  })
})

/**
 * Documentation of what needs to be fixed for GREEN:
 *
 * 1. packages/build:
 *    - Add esbuild-wasm types or use different import strategy
 *    - Fix export declaration conflicts
 *
 * 2. packages/deployment:
 *    - Remove or use 'lastHealthy' variable
 *
 * 3. packages/do-core:
 *    - Fix generic type constraints in crud-mixin.ts
 *    - Remove unused DOStorage import in events.ts
 *    - Add HeadersInit type (from lib.dom or workers-types)
 *    - Fix mixin constructor types in things-mixin.ts
 *
 * 4. packages/eval:
 *    - Remove unused variables
 *    - Fix ObjectConstructor/ArrayConstructor type casts
 *    - Fix export declaration conflicts
 *
 * 5. packages/observability:
 *    - Remove or use 'hooks' variable
 *    - Add ExecutionContext type (from @cloudflare/workers-types)
 *
 * 6. packages/security:
 *    - Remove or use 'lowerInput' variable
 *
 * 7. packages/test-utils:
 *    - Add BodyInit, DurableObjectId, ExecutionContext types
 *    - Fix MockKVNamespace type signatures
 *    - Fix MockDurableObjectStub type signatures
 */
