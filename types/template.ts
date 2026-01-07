/**
 * @deprecated Import from './fn.js' or '@dotdo/types/fn' instead.
 *
 * This file re-exports from fn.ts for backwards compatibility.
 * The tagged template types have been unified into fn.ts.
 */

export {
  ExtractParams,
  HasNamedParams,
  ParamsRecord,
  TaggedResult,
  Fn,
  AsyncFn,
  RpcFn,
} from './fn.js'

// Legacy aliases for backwards compatibility
export type { Fn as TaggedCallable } from './fn.js'
export type { Fn as TypedTaggedCallable } from './fn.js'

// Legacy helper types
export type { ParamsRecord as RequiredParams } from './fn.js'

// Re-export template parsing types (keep for clarity)
export interface ParsedTemplate {
  parts: string[]
  params: string[]
  source: string
}

export interface TemplateParseOptions {
  syntax?: 'braces' | 'dollar' | 'both'
  allowNested?: boolean
  pattern?: RegExp
}
