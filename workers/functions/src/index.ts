/**
 * @dotdo/workers-functions - functions.do ai-functions RPC implementation
 *
 * Provides AI primitives (generate, list, extract, classify, summarize, translate, embed)
 * with multi-transport support: HTTP REST, RPC, and batch processing.
 */

export { FunctionsDO } from './functions.js'
export type {
  GenerateOptions,
  GenerateResult,
  ListOptions,
  ExtractSchema,
  ExtractOptions,
  ClassifyOptions,
  ClassifyResult,
  SummarizeOptions,
  TranslateOptions,
  EmbedOptions,
  FunctionDefinition,
  BatchOperation,
  BatchResult,
  BatchOptions,
  EmbedBatchOptions,
  RetryOptions,
  Provider,
  ProviderConfig,
  AIPromise,
} from './functions.js'
