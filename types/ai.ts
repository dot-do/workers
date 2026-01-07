/**
 * AI Types - Re-exports from primitives/ai-functions
 *
 * Extends with workers.do-specific types for RPC integration.
 *
 * @packageDocumentation
 */

// Re-export all from primitives
export type {
  AIFunctionDefinition,
  AIGenerateOptions,
  AIGenerateResult,
  AIFunctionCall,
  AIClient,
  ImageOptions,
  ImageResult,
  VideoOptions,
  VideoResult,
  WriteOptions,
  ListItem,
  ListResult,
  NamedList,
  ListsResult,
  JSONSchema,
  TemplateFunction,
  CodeLanguage,
  GenerativeOutputType,
  HumanChannel,
  BaseFunctionDefinition,
  CodeFunctionDefinition,
  CodeFunctionResult,
  GenerativeFunctionDefinition,
  GenerativeFunctionResult,
  AgenticFunctionDefinition,
  AgenticExecutionState,
  HumanFunctionDefinition,
  HumanFunctionResult,
  FunctionDefinition,
  DefinedFunction,
  FunctionRegistry,
  AutoDefineResult,
} from 'ai-functions'

import type { RpcPromise } from './rpc.js'
import type { TaggedCallable } from './tagged-template.js'

// =============================================================================
// RPC-Enhanced AI Client
// =============================================================================

/**
 * AI client with RPC pipelining support.
 *
 * All methods return RpcPromise for efficient pipelining.
 */
export interface RpcAIClient {
  /** Generate text or structured output */
  generate(options: import('ai-functions').AIGenerateOptions): RpcPromise<import('ai-functions').AIGenerateResult>

  /** Execute an action */
  do(action: string, context?: unknown): RpcPromise<unknown>

  /** Type checking / validation */
  is(value: unknown, type: string | import('ai-functions').JSONSchema): RpcPromise<boolean>

  /** Generate code */
  code(prompt: string, language?: string): RpcPromise<string>

  /** Make a decision */
  decide<T extends string>(options: T[], context?: string): RpcPromise<T>

  /** Write/generate text content */
  write(prompt: string, options?: import('ai-functions').WriteOptions): RpcPromise<string>

  /** Generate a list of items */
  list(prompt: string): RpcPromise<import('ai-functions').ListResult>
}

/**
 * AI prompt tagged template.
 *
 * Supports template literal syntax for prompts:
 * ```ts
 * const result = await ai`Summarize this: ${text}`
 * const structured = await ai`Extract data from {content}`({ content })
 * ```
 */
export type AIPrompt = TaggedCallable<RpcPromise<string>>
