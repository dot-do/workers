/**
 * Code Execution Service - Secure Code Execution with Sandboxing
 *
 * Provides secure execution of user code (JavaScript, TypeScript, Python)
 * with sandboxed runtime APIs (AI, HTTP, database, console)
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import type { CodeExecEnv, SupportedLanguage, ExecutionContext, ExecutionConfig, ExecutionResult, ExecutionRecord } from './types'
import { CodeSandbox, validateCode } from './sandbox'

/**
 * Code Execution Service RPC Class
 */
export default class CodeExecService extends WorkerEntrypoint<CodeExecEnv> {
  /**
   * Execute code and return result
   */
  async executeCode(code: string, language: SupportedLanguage = 'javascript', context?: ExecutionContext, config?: ExecutionConfig): Promise<ExecutionResult> {
    const sandbox = new CodeSandbox(this.env, config)

    // Validate language
    if (!sandbox.isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}. Supported: javascript, typescript, python`)
    }

    // Execute code
    const result = await sandbox.execute(code, language, context || {})

    // Store execution record in database
    if (result.executionId) {
      await this.storeExecution(code, language, context, config, result)
    }

    return result
  }

  /**
   * Validate code without executing
   */
  async validateCode(code: string) {
    return validateCode(code)
  }

  /**
   * Get execution history by ID
   */
  async getExecution(executionId: string): Promise<ExecutionRecord | null> {
    if (!this.env.EXECUTIONS_DB) {
      throw new Error('Executions database not configured')
    }

    try {
      const result = await this.env.EXECUTIONS_DB.prepare('SELECT * FROM executions WHERE id = ?').bind(executionId).first<ExecutionRecord>()
      return result || null
    } catch (error) {
      console.error('Failed to get execution:', error)
      return null
    }
  }

  /**
   * List execution history with pagination
   */
  async listExecutions(limit: number = 10, offset: number = 0): Promise<ExecutionRecord[]> {
    if (!this.env.EXECUTIONS_DB) {
      throw new Error('Executions database not configured')
    }

    try {
      const { results } = await this.env.EXECUTIONS_DB.prepare('SELECT * FROM executions ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all<ExecutionRecord>()
      return results || []
    } catch (error) {
      console.error('Failed to list executions:', error)
      return []
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return ['javascript', 'typescript', 'python']
  }

  /**
   * Check if language is supported
   */
  async isSupportedLanguage(language: string): Promise<boolean> {
    const sandbox = new CodeSandbox(this.env)
    return sandbox.isSupportedLanguage(language)
  }

  /**
   * Store execution record in database
   */
  private async storeExecution(
    code: string,
    language: SupportedLanguage,
    context: ExecutionContext | undefined,
    config: ExecutionConfig | undefined,
    result: ExecutionResult
  ): Promise<void> {
    if (!this.env.EXECUTIONS_DB) {
      return // Database not configured
    }

    try {
      await this.env.EXECUTIONS_DB.prepare(
        `INSERT INTO executions (id, code, language, context, config, success, result, error, logs, duration, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          result.executionId,
          code,
          language,
          context ? JSON.stringify(context) : null,
          config ? JSON.stringify(config) : null,
          result.success ? 1 : 0,
          result.result ? JSON.stringify(result.result) : null,
          result.error || null,
          result.logs ? JSON.stringify(result.logs) : null,
          result.metrics.duration,
          Date.now()
        )
        .run()
    } catch (error) {
      console.error('Failed to store execution:', error)
      // Don't throw - execution succeeded, storage failure shouldn't block
    }
  }

  /**
   * HTTP fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    try {
      // POST /execute - Execute code
      if (pathname === '/execute' && request.method === 'POST') {
        const body = (await request.json()) as any
        const { code, language = 'javascript', context, config } = body

        if (!code || typeof code !== 'string') {
          return Response.json({ error: 'Code is required and must be a string' }, { status: 400 })
        }

        const result = await this.executeCode(code, language, context, config)
        return Response.json(result)
      }

      // POST /validate - Validate code
      if (pathname === '/validate' && request.method === 'POST') {
        const body = (await request.json()) as any
        const { code } = body

        if (!code || typeof code !== 'string') {
          return Response.json({ error: 'Code is required and must be a string' }, { status: 400 })
        }

        const validation = await this.validateCode(code)
        return Response.json(validation)
      }

      // GET /executions/:id - Get execution by ID
      if (pathname.startsWith('/executions/') && request.method === 'GET') {
        const executionId = pathname.split('/')[2]
        if (!executionId) {
          return Response.json({ error: 'Execution ID is required' }, { status: 400 })
        }

        const execution = await this.getExecution(executionId)
        if (!execution) {
          return Response.json({ error: 'Execution not found' }, { status: 404 })
        }

        return Response.json(execution)
      }

      // GET /executions - List executions
      if (pathname === '/executions' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '10')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const executions = await this.listExecutions(limit, offset)
        return Response.json({ executions, limit, offset })
      }

      // GET /languages - Get supported languages
      if (pathname === '/languages' && request.method === 'GET') {
        const languages = await this.getSupportedLanguages()
        return Response.json({ languages })
      }

      // GET /health - Health check
      if (pathname === '/health' && request.method === 'GET') {
        return Response.json({
          status: 'healthy',
          service: 'code-exec',
          languages: ['javascript', 'typescript', 'python'],
          timestamp: new Date().toISOString(),
        })
      }

      // GET /docs - Runtime API documentation
      if (pathname === '/docs' && request.method === 'GET') {
        return Response.json({
          runtime: {
            ai: {
              description: 'Execute AI model inference',
              signature: 'ai(model: string, input: object): Promise<AiResponse>',
              example: "await ai('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: 'Hello' }] })",
            },
            api: {
              description: 'Make controlled HTTP API requests',
              signature: 'api(url: string, options?: ApiOptions): Promise<ApiResponse>',
              example: "await api('https://api.example.com/data', { method: 'GET' })",
            },
            db: {
              description: 'Execute database queries',
              signature: 'db(query: DbQuery): Promise<DbResult>',
              example: "await db({ select: { from: 'things', where: { ns: 'test' } } })",
            },
            console: {
              description: 'Captured console object for logging',
              methods: ['log', 'info', 'warn', 'error', 'debug'],
              example: "console.log('Processing started')",
            },
          },
          security: {
            timeout: '30s default',
            blockedPatterns: ['require()', 'import', 'eval()', 'Function()', 'process', '__dirname', '__filename'],
            maxCodeSize: '100KB',
          },
        })
      }

      // GET / or unknown routes - API info
      return Response.json({
        service: 'code-exec',
        version: '1.0.0',
        endpoints: {
          execute: 'POST /execute - Execute code',
          validate: 'POST /validate - Validate code',
          getExecution: 'GET /executions/:id - Get execution by ID',
          listExecutions: 'GET /executions - List executions',
          languages: 'GET /languages - Get supported languages',
          docs: 'GET /docs - Runtime API documentation',
          health: 'GET /health - Health check',
        },
      })
    } catch (error) {
      console.error('Code execution service error:', error)
      return Response.json(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

// Export types for consumers
export * from './types'
export { CodeSandbox, validateCode } from './sandbox'
export { createRuntime, getLogs } from './runtime'
