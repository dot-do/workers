/**
 * function.do/rpc - Function DO that expects dependencies as RPC Worker bindings
 *
 * Light bundle, offloads heavy deps to RPC workers.
 * Requires conventional binding names:
 * - env.ESBUILD - Code bundling
 * - env.EVAL - Sandboxed execution
 * - env.LLM - AI-powered function generation
 */

export { FunctionDO, FunctionDO as DO, schema } from './index'
export type {
  FunctionRecord,
  ExecutionRecord,
  LogRecord,
  MetricsRecord,
  RateLimitConfig,
  ExecutionResult,
  FunctionMetrics,
} from './index'
