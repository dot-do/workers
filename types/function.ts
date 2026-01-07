/**
 * @deprecated Import from './fn.js' or '@dotdo/types/fn' instead.
 *
 * This file re-exports from fn.ts for backwards compatibility.
 * Function types have been unified into fn.ts.
 */

export {
  // Core function types
  Fn,
  AsyncFn,
  RpcFn,

  // With metadata
  FnMeta,
  FnSchema,
  MetaFn,
  AsyncMetaFn,
  RpcMetaFn,

  // Definition & registration
  FnDef,
  FnOptions,
  FnRegistry,

  // Composition
  Pipeline,
  CreatePipeline,

  // AI integration
  AIFn,
  AITool,
  ToAITool,

  // Serialization
  SerializableFnCall,
  FnTransformOptions,

  // Proxy
  FnProxy,
  CreateFnProxy,

  // Builder
  FnBuilder,
  CreateFnBuilder,

  // Utilities
  ToAsync,
  ToRpc,
  FnReturn,
  FnArgs,
  FnConfig,

  // Template extraction
  ExtractParams,
  HasNamedParams,
  ParamsRecord,
  TaggedResult,

  // RPC
  RpcPromise,
} from './fn.js'

// Legacy type aliases
export type { Fn as TypedFunction } from './fn.js'
export type { AsyncFn as AsyncTypedFunction } from './fn.js'
export type { RpcFn as RpcFunction } from './fn.js'
export type { Fn as CallableFunction } from './fn.js'
export type { RpcFn as RpcCallableFunction } from './fn.js'
export type { FnMeta as FunctionMetadata } from './fn.js'
export type { FnDef as FunctionDefinition } from './fn.js'
export type { FnOptions as FunctionOptions } from './fn.js'
export type { FnRegistry as FunctionRegistry } from './fn.js'
export type { FnSchema as FunctionInputSchema } from './fn.js'
export type { FnSchema as FunctionOutputSchema } from './fn.js'
export type { MetaFn as MetadataFunction } from './fn.js'
export type { FnBuilder as FunctionBuilder } from './fn.js'
export type { AIFn as AIFunction } from './fn.js'
export type { AITool as AIToolDefinition } from './fn.js'
export type { Fn as SchemaFunction } from './fn.js'
