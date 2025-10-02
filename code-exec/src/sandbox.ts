/**
 * Code Sandbox - Secure Code Execution Environment
 */

import type {
  CodeExecEnv,
  SupportedLanguage,
  ExecutionContext,
  ExecutionConfig,
  ExecutionResult,
  ValidationResult,
} from './types'
import { DEFAULT_EXECUTION_CONFIG, BLOCKED_PATTERNS, MAX_CODE_SIZE } from './types'
import { createRuntime } from './runtime'

/**
 * Code Sandbox Class
 */
export class CodeSandbox {
  private env: CodeExecEnv
  private config: Required<ExecutionConfig>

  constructor(env: CodeExecEnv, config: ExecutionConfig = {}) {
    this.env = env
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config }
  }

  /**
   * Execute code in sandbox
   */
  async execute(code: string, language: SupportedLanguage, context: ExecutionContext = {}): Promise<ExecutionResult> {
    const executionId = crypto.randomUUID()
    const startTime = Date.now()

    // Validate code first
    const validation = this.validateCode(code)
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        logs: [],
        metrics: {
          duration: 0,
          startTime,
          endTime: Date.now(),
        },
        executionId,
      }
    }

    // Create runtime API
    const { runtime, logs } = createRuntime(this.env, this.config)

    try {
      let result: any

      switch (language) {
        case 'javascript':
          result = await this.executeJavaScript(code, context, runtime)
          break
        case 'typescript':
          result = await this.executeTypeScript(code, context, runtime)
          break
        case 'python':
          result = await this.executePython(code, context, runtime)
          break
        default:
          throw new Error(`Unsupported language: ${language}`)
      }

      const endTime = Date.now()

      return {
        success: true,
        result,
        logs,
        metrics: {
          duration: endTime - startTime,
          startTime,
          endTime,
        },
        executionId,
      }
    } catch (error) {
      const endTime = Date.now()

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs,
        metrics: {
          duration: endTime - startTime,
          startTime,
          endTime,
        },
        executionId,
      }
    }
  }

  /**
   * Execute JavaScript code
   */
  private async executeJavaScript(code: string, context: ExecutionContext, runtime: any): Promise<any> {
    // Wrap code in async IIFE
    const wrappedCode = `
      'use strict';
      return (async () => {
        ${code}
      })();
    `

    // Create async function with runtime API
    const AsyncFunction = async function () {}.constructor as any
    const fn = new AsyncFunction('ai', 'api', 'db', 'console', 'context', wrappedCode)

    // Execute with timeout
    return await this.executeWithTimeout(fn, runtime, context)
  }

  /**
   * Execute TypeScript code (transpile first)
   */
  private async executeTypeScript(code: string, context: ExecutionContext, runtime: any): Promise<any> {
    // For now, just remove type annotations and treat as JavaScript
    // In production, you'd use a proper TypeScript transpiler
    const jsCode = this.stripTypeAnnotations(code)
    return await this.executeJavaScript(jsCode, context, runtime)
  }

  /**
   * Execute Python code (not implemented yet)
   */
  private async executePython(_code: string, _context: ExecutionContext, _runtime: any): Promise<any> {
    throw new Error('Python execution is not yet implemented. Consider using Cloudflare Container or Workers for Platforms.')
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout(fn: Function, runtime: any, context: ExecutionContext): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${this.config.timeout}ms`)), this.config.timeout)
    })

    const executionPromise = fn(runtime.runtime.ai, runtime.runtime.api, runtime.runtime.db, runtime.runtime.console, context)

    return Promise.race([executionPromise, timeoutPromise])
  }

  /**
   * Validate code for safety
   */
  validateCode(code: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check code size
    if (code.length > MAX_CODE_SIZE) {
      errors.push(`Code exceeds maximum size of ${MAX_CODE_SIZE} bytes`)
    }

    // Check for blocked patterns
    for (const { pattern, message } of BLOCKED_PATTERNS) {
      if (pattern.test(code)) {
        errors.push(message)
      }
    }

    // Check for empty code
    if (!code.trim()) {
      errors.push('Code cannot be empty')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Strip TypeScript type annotations (basic implementation)
   */
  private stripTypeAnnotations(code: string): string {
    // Remove type annotations from function parameters and return types
    let stripped = code
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*=/g, ' =') // : type = -> =
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*\)/g, ')') // : type) -> )
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*;/g, ';') // : type; -> ;
      .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*\{/g, '{') // : type { -> {
      .replace(/interface\s+\w+\s*\{[^}]*\}/g, '') // Remove interfaces
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type aliases

    return stripped
  }

  /**
   * Check if language is supported
   */
  isSupportedLanguage(language: string): language is SupportedLanguage {
    return ['javascript', 'typescript', 'python'].includes(language)
  }
}

/**
 * Standalone validation function
 */
export function validateCode(code: string): ValidationResult {
  const sandbox = new CodeSandbox({} as CodeExecEnv)
  return sandbox.validateCode(code)
}

/**
 * Standalone execute function
 */
export async function executeCode(
  env: CodeExecEnv,
  code: string,
  language: SupportedLanguage = 'javascript',
  context: ExecutionContext = {},
  config: ExecutionConfig = {}
): Promise<ExecutionResult> {
  const sandbox = new CodeSandbox(env, config)
  return await sandbox.execute(code, language, context)
}
