/**
 * Type Tests for tsconfig strict options
 *
 * RED PHASE: These tests demonstrate unsafe patterns that are currently allowed
 * due to missing strict tsconfig options. When the GREEN phase adds the options,
 * these tests will need to be updated to use safer patterns.
 *
 * Missing strict options in current tsconfig.json:
 * - exactOptionalPropertyTypes: true
 * - noPropertyAccessFromIndexSignature: true
 * - noImplicitOverride: true
 *
 * NOTE: noUncheckedIndexedAccess is already enabled in the root tsconfig.json
 *
 * Run with: npx tsc --noEmit tests/types/tsconfig-strict.test-d.ts
 */

// =============================================================================
// TEST 1: exactOptionalPropertyTypes (MISSING)
// =============================================================================
// Without exactOptionalPropertyTypes, you can assign `undefined` to optional
// properties, which conflates "property not present" with "property is undefined"

interface ConfigWithOptionalDebug {
  name: string
  debug?: boolean // Optional means "may not be present", not "can be undefined"
}

// UNSAFE: This should fail with exactOptionalPropertyTypes: true
// Explicitly setting debug to undefined is different from not setting it
const unsafeConfig: ConfigWithOptionalDebug = {
  name: 'test',
  debug: undefined, // BUG: conflates missing property with undefined value
}

// This pattern hides bugs when you check for property existence:
function checkConfig(config: ConfigWithOptionalDebug): string {
  // 'debug' in config would be true even though debug is undefined
  // This is a semantic bug that exactOptionalPropertyTypes prevents
  if ('debug' in config) {
    // Developer expects debug to be boolean here, but it could be undefined
    return config.debug ? 'debug on' : 'debug off'
  }
  return 'no debug setting'
}

// With current config, this passes but gives wrong result
const result = checkConfig(unsafeConfig) // Returns 'debug off', but semantically wrong

// =============================================================================
// TEST 2: noPropertyAccessFromIndexSignature (MISSING)
// =============================================================================
// Without this option, you can use dot notation to access index signatures,
// which doesn't make it clear that the property might not exist

interface DataWithIndexSignature {
  [key: string]: string
  knownProperty: string // This is definitely present
}

declare const data: DataWithIndexSignature

// UNSAFE: These should require bracket notation with noPropertyAccessFromIndexSignature: true
// Dot access makes it look like 'unknownProp' is a known property
const unsafeAccess = data.unknownProp // Looks like a definite property
const saferAccess = data['unknownProp'] // Bracket notation signals uncertainty

// The danger is that developers might think 'unknownProp' is guaranteed to exist
// when it's actually just an index signature access
function processData(d: DataWithIndexSignature): void {
  // These look equivalent but have different semantics
  console.log(d.knownProperty) // Definitely exists
  console.log(d.someDynamicKey) // Might not exist - should use bracket notation!
}

// =============================================================================
// TEST 3: noImplicitOverride (MISSING)
// =============================================================================
// Without this option, you can accidentally override parent methods without
// explicitly marking them, which can lead to subtle bugs when parent changes

class BaseWorker {
  fetch(request: Request): Response {
    return new Response('base')
  }

  process(data: unknown): void {
    console.log('base processing')
  }

  // Note: this method signature might change in future
  initialize(): void {
    console.log('initializing')
  }
}

// UNSAFE: Should require 'override' keyword with noImplicitOverride: true
class DerivedWorker extends BaseWorker {
  // This overrides BaseWorker.fetch but doesn't use 'override' keyword
  // If BaseWorker.fetch signature changes, this silently breaks
  fetch(request: Request): Response {
    return new Response('derived')
  }

  // Same issue - implicit override
  process(data: unknown): void {
    console.log('derived processing')
  }

  // If someone renames BaseWorker.initialize to setup(), this method
  // silently stops being an override with no compiler warning
  initialize(): void {
    console.log('derived initializing')
  }
}

// =============================================================================
// TEST 4: Combined Pattern - Real-world Worker Example
// =============================================================================
// This shows how these missing options combine to create unsafe patterns

interface WorkerEnv {
  CACHE?: { get: (key: string) => Promise<string | null> } // KV-like interface
  DEBUG?: boolean
  [key: string]: unknown // Index signature for unknown env vars
}

class RealWorldWorker extends BaseWorker {
  private env: WorkerEnv

  constructor(env: WorkerEnv) {
    super()
    this.env = env
  }

  // UNSAFE: implicit override
  fetch(request: Request): Response {
    // UNSAFE: dot notation on index signature
    const apiKey = this.env.API_KEY as string | undefined

    // UNSAFE: setting optional to undefined instead of deleting
    const config: ConfigWithOptionalDebug = {
      name: 'worker',
      debug: undefined, // Should use: { name: 'worker' } without debug
    }

    return new Response('ok')
  }
}

// =============================================================================
// Verification: These tests compile without errors currently (RED state)
// When tsconfig options are added (GREEN phase), compilation will fail
// until the code is refactored to use safer patterns
// =============================================================================

export {
  unsafeConfig,
  result,
  unsafeAccess,
  saferAccess,
  processData,
  DerivedWorker,
  RealWorldWorker,
}
