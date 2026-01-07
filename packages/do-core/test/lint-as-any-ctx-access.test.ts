/**
 * RED TEST: Lint rule for `as any` ctx access pattern
 *
 * Issue: workers-lsgq.1 - GitStore uses `as any` to access ctx (should fail lint)
 * Epic: workers-lsgq - TypeScript Improvements
 *
 * This test file demonstrates the problematic pattern where a class
 * uses `as any` to bypass TypeScript's visibility modifiers.
 *
 * The pattern occurs when:
 * 1. A base class has a private/protected property (ctx)
 * 2. A composition pattern stores a reference to the DO (this.do)
 * 3. Code accesses ctx via (this.do as any).ctx
 *
 * This file SHOULD FAIL LINT with @typescript-eslint/no-explicit-any
 * until the GREEN phase refactors to use proper typed access.
 *
 * ## Expected Lint Error
 * ```
 * error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
 * ```
 *
 * ## Solution (GREEN phase - workers-lsgq.2)
 * Change ctx from private to protected in the DO base class.
 *
 * ## How to verify RED phase
 * Run: npx eslint packages/do-core/test/lint-as-any-ctx-access.test.ts
 * Expected: Multiple "no-explicit-any" errors
 */

import { describe, it, expect } from 'vitest'
import type { DOState } from '../src/core'

/**
 * Simulates a Durable Object base class with private ctx
 */
class BaseDO {
  // This is currently private in some patterns, causing the `as any` escape
  private ctx: DOState

  constructor(ctx: DOState) {
    this.ctx = ctx
  }

  // Only accessible via `as any` cast from outside
  getCtx(): DOState {
    return this.ctx
  }
}

/**
 * GitStore-like class that composes a DO and needs ctx access
 *
 * This demonstrates the anti-pattern where ctx is accessed via `as any`
 */
class GitStore {
  private _do: BaseDO

  constructor(doInstance: BaseDO) {
    this._do = doInstance
  }

  /**
   * BAD PATTERN: Using `as any` to access private property
   *
   * This line MUST fail lint with @typescript-eslint/no-explicit-any
   */
  getExecutionContext(): DOState {
    // RED TEST: This MUST fail lint - DO NOT add eslint-disable comment
    const ctx = (this._do as any).ctx
    return ctx
  }

  /**
   * Another bad pattern variant
   */
  accessPrivateViaAny(): unknown {
    // RED TEST: This is the pattern that should be caught
    return (this._do as any).ctx
  }
}

describe('RED: as any ctx access pattern', () => {
  /**
   * This test documents the anti-pattern.
   * The test itself passes, but the FILE should fail lint.
   */
  it('demonstrates the problematic as any pattern', () => {
    // Create a mock DOState
    const mockCtx = {
      id: { toString: () => 'test-id', equals: () => true },
      storage: {},
      blockConcurrencyWhile: () => {},
      acceptWebSocket: () => {},
      getWebSockets: () => [],
      setWebSocketAutoResponse: () => {},
    } as DOState

    const baseDO = new BaseDO(mockCtx)
    const gitStore = new GitStore(baseDO)

    // The actual access works at runtime, but is type-unsafe
    const ctx = gitStore.getExecutionContext()
    expect(ctx).toBe(mockCtx)
  })

  it('should be caught by lint rule @typescript-eslint/no-explicit-any', () => {
    // This test serves as documentation that the lint rule is in place
    // Run: npm run lint
    // Expected: This file should produce lint errors for `as any` usage
    expect(true).toBe(true)
  })
})

/**
 * Additional examples of bad `as any` patterns that should be caught
 */
describe('RED: other as any patterns to catch', () => {
  it('demonstrates various as any escape hatches', () => {
    // Pattern 1: Accessing private via any cast
    // RED TEST: DO NOT add eslint-disable
    const badAccess1 = ({} as any).privateField

    // Pattern 2: Bypassing type checking
    // RED TEST: DO NOT add eslint-disable
    const badAccess2: any = { foo: 'bar' }

    // Pattern 3: Function return type escape
    // RED TEST: DO NOT add eslint-disable
    const badFunction = (): any => ({ unsafe: true })

    // Suppress unused variable warnings
    expect(badAccess1).toBeUndefined()
    expect(badAccess2).toBeDefined()
    expect(badFunction()).toBeDefined()
  })
})
