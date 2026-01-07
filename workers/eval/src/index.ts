/**
 * @dotdo/workers-eval - eval.do Secure Sandbox Code Evaluation
 *
 * Provides secure sandboxed code evaluation with:
 * - JavaScript execution in isolated environment
 * - Async code support
 * - Code validation
 * - Security constraints
 * - Timeout and memory limits
 * - Multi-transport support: HTTP REST and RPC
 */

export { EvalDO } from './eval.js'
export type {
  ExecutionResult,
  EvalOptions,
} from '../test/helpers.js'
