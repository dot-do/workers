import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Code Execution Tools
 * Execute TypeScript code in secure V8 isolates via DO worker
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'code_execute',
      description: 'Execute TypeScript code in a secure V8 isolate. Use this for complex logic, data transformations, or when you need to run code with access to platform services (db, ai, mcp). Returns the result, console logs, and execution metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'TypeScript code to execute. Must be valid TypeScript. Use `return` to return a value. Console.log is captured.'
          },
          bindings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Service bindings to provide to the code. Available: db, ai, mcp. Example: ["db", "ai"]',
            default: []
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in milliseconds (default: 30000, max: 30000)',
            default: 30000,
            maximum: 30000
          },
          cacheKey: {
            type: 'string',
            description: 'Optional cache key. If provided, results are cached for 1 hour.'
          },
          captureConsole: {
            type: 'boolean',
            description: 'Capture console.log output (default: true)',
            default: true
          },
          captureFetch: {
            type: 'boolean',
            description: 'Capture network requests made by the code (default: false)',
            default: false
          }
        },
        required: ['code']
      }
    },
    {
      name: 'code_generate',
      description: 'Generate TypeScript code from a natural language prompt using AI, then optionally execute it. Returns the generated code and optionally the execution result.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Natural language description of what the code should do'
          },
          execute: {
            type: 'boolean',
            description: 'Whether to execute the generated code immediately (default: false)',
            default: false
          },
          bindings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Service bindings for execution (if execute is true)',
            default: []
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'code_test',
      description: 'Execute TypeScript code and verify it produces expected output. Useful for testing and validation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'TypeScript code to test'
          },
          expectedOutput: {
            description: 'Expected output (any type). Will be compared with actual output using deep equality.'
          },
          bindings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Service bindings to provide',
            default: []
          }
        },
        required: ['code', 'expectedOutput']
      }
    }
  ]
}

/**
 * Execute TypeScript code in V8 isolate (with authorization)
 */
export async function code_execute(
  args: {
    code: string
    bindings?: string[]
    timeout?: number
    cacheKey?: string
    captureConsole?: boolean
    captureFetch?: boolean
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const env = c.env

  // Validate DO service is available
  if (!env.DO) {
    throw new Error('Code execution service not available')
  }

  // Build service context for authorization
  const context = user ? {
    auth: {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'public',
        permissions: []
      }
    },
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    metadata: {}
  } : undefined

  // Call DO service via RPC with context for authorization
  const result = await env.DO.execute({
    code: args.code,
    bindings: args.bindings || [],
    timeout: args.timeout || 30000,
    cacheKey: args.cacheKey,
    captureConsole: args.captureConsole ?? true,
    captureFetch: args.captureFetch ?? false
  }, context)

  return result
}

/**
 * Generate code from prompt and optionally execute
 */
export async function code_generate(
  args: {
    prompt: string
    execute?: boolean
    bindings?: string[]
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const env = c.env

  // Validate AI service is available
  if (!env.AI) {
    throw new Error('AI service not available for code generation')
  }

  // Generate code using AI
  const systemPrompt = `You are a TypeScript code generator. Generate clean, efficient TypeScript code based on the user's request.
Only output the code itself, no explanations or markdown formatting. The code will be executed in a Cloudflare Workers environment.
Available bindings: db (database), ai (AI models), mcp (Model Context Protocol).
Use return to return a value. Console.log is captured.`

  const aiResult = await env.AI.generate({
    prompt: args.prompt,
    system: systemPrompt,
    model: 'llama-3.1-8b',
    maxTokens: 2048,
    temperature: 0.3
  })

  const code = aiResult.text

  // Execute if requested
  if (args.execute) {
    if (!env.DO) {
      return {
        code,
        error: 'Code execution service not available'
      }
    }

    const executionResult = await env.DO.execute({
      code,
      bindings: args.bindings || [],
      timeout: 30000,
      captureConsole: true
    })

    return {
      code,
      execution: executionResult
    }
  }

  return { code }
}

/**
 * Test code execution with expected output (with authorization)
 */
export async function code_test(
  args: {
    code: string
    expectedOutput: any
    bindings?: string[]
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const env = c.env

  if (!env.DO) {
    throw new Error('Code execution service not available')
  }

  // Build service context for authorization
  const context = user ? {
    auth: {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'public',
        permissions: []
      }
    },
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    metadata: {}
  } : undefined

  // Execute the code with context
  const result = await env.DO.execute({
    code: args.code,
    bindings: args.bindings || [],
    timeout: 30000,
    captureConsole: true
  }, context)

  // Compare output
  const passed = JSON.stringify(result.result) === JSON.stringify(args.expectedOutput)

  return {
    passed,
    actual: result.result,
    expected: args.expectedOutput,
    logs: result.logs,
    executionTime: result.executionTime
  }
}
