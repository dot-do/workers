/**
 * Claude Code Service - AI-powered code generation and analysis
 *
 * Provides RPC methods for:
 * - Code generation from prompts
 * - Code analysis and explanation
 * - Code refactoring
 * - Bug fixing
 * - MCP integration
 */

import { WorkerEntrypoint } from 'cloudflare:workers'

// ===== Types =====

export interface Env {
  ANTHROPIC_API_KEY: string
  DB: any // Service binding to db worker
}

export interface CodeGenOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  system?: string
}

export interface CodeGeneration {
  code: string
  generationId: string
  model?: string
  tokensUsed?: number
}

export interface AnalysisResult {
  analysis: string
  code: string
}

// ===== ClaudeCodeService RPC Class =====

export class ClaudeCodeService extends WorkerEntrypoint<Env> {
  /**
   * Generate code from a prompt using Claude API
   */
  async generateCode(prompt: string, options?: CodeGenOptions): Promise<CodeGeneration> {
    const model = options?.model || 'claude-sonnet-4-5-20250929'
    const maxTokens = options?.maxTokens || 4096
    const temperature = options?.temperature || 0.7
    const system = options?.system || 'You are an expert code generator. Generate clean, production-ready code with proper error handling and documentation.'

    const messages = [{ role: 'user' as const, content: prompt }]

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature, messages, system })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic API error: ${response.status} ${error}`)
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }>; usage?: { input_tokens: number; output_tokens: number } }
      const code = data.content[0]?.text || ''
      const tokensUsed = data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined

      // Store generation in database
      const generationId = crypto.randomUUID()
      try {
        await this.env.DB.createThing({
          ns: 'generation',
          id: generationId,
          type: 'CodeGeneration',
          data: { prompt, code, model, tokensUsed, timestamp: new Date().toISOString() },
          visibility: 'private'
        })
      } catch (dbError) {
        console.error('Failed to store generation:', dbError)
        // Continue even if DB fails
      }

      return { code, generationId, model, tokensUsed }
    } catch (error) {
      console.error('Code generation error:', error)
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze code with a specific focus
   */
  async analyzeCode(code: string, analysis: string): Promise<AnalysisResult> {
    const prompt = `Analyze the following code for: ${analysis}\n\n\`\`\`\n${code}\n\`\`\``

    const response = await this.generateCode(prompt, {
      system: 'You are an expert code analyzer. Provide detailed technical analysis with specific recommendations. Focus on correctness, performance, security, and maintainability.'
    })

    return { analysis: response.code, code }
  }

  /**
   * Explain what code does
   */
  async explainCode(code: string): Promise<string> {
    const result = await this.analyzeCode(code, 'explanation of what this code does, its purpose, and how it works step by step')
    return result.analysis
  }

  /**
   * Refactor code based on instructions
   */
  async refactorCode(code: string, instructions: string): Promise<string> {
    const prompt = `Refactor this code based on: ${instructions}\n\nOriginal code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide ONLY the refactored code, no explanations.`

    const result = await this.generateCode(prompt, {
      system: 'You are an expert code refactorer. Return only the refactored code without any explanations or markdown formatting unless the code itself requires it.'
    })

    return result.code
  }

  /**
   * Fix broken code with error message
   */
  async fixCode(code: string, error: string): Promise<string> {
    const prompt = `Fix this code that has the following error:\n${error}\n\nBroken code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide ONLY the fixed code, no explanations.`

    const result = await this.generateCode(prompt, {
      system: 'You are an expert debugger. Return only the fixed code without any explanations. Ensure the fix addresses the root cause.'
    })

    return result.code
  }

  /**
   * Review code for issues
   */
  async reviewCode(code: string, focus?: string): Promise<{ issues: string[]; suggestions: string[]; rating: number }> {
    const focusText = focus ? `Focus specifically on: ${focus}` : 'Review comprehensively'
    const prompt = `${focusText}\n\nCode to review:\n\`\`\`\n${code}\n\`\`\`\n\nProvide a JSON response with: {"issues": ["..."], "suggestions": ["..."], "rating": 0-10}`

    const result = await this.generateCode(prompt, {
      system: 'You are an expert code reviewer. Return ONLY a JSON object with arrays of issues and suggestions, plus a numeric rating.'
    })

    try {
      return JSON.parse(result.code)
    } catch {
      // Fallback if response isn't valid JSON
      return { issues: ['Failed to parse review'], suggestions: [], rating: 0 }
    }
  }

  /**
   * MCP tool call interface
   */
  async mcpToolCall(tool: string, args: any): Promise<any> {
    switch (tool) {
      case 'generate_code':
        return await this.generateCode(args.prompt, args.options)

      case 'analyze_code':
        return await this.analyzeCode(args.code, args.analysis)

      case 'explain_code':
        return await this.explainCode(args.code)

      case 'refactor_code':
        return await this.refactorCode(args.code, args.instructions)

      case 'fix_code':
        return await this.fixCode(args.code, args.error)

      case 'review_code':
        return await this.reviewCode(args.code, args.focus)

      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }

  /**
   * HTTP fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Route to appropriate handler
      if (path === '/generate' && request.method === 'POST') {
        const { prompt, options } = await request.json() as { prompt: string; options?: CodeGenOptions }
        const result = await this.generateCode(prompt, options)
        return Response.json(result, { headers: corsHeaders })
      }

      if (path === '/analyze' && request.method === 'POST') {
        const { code, analysis } = await request.json() as { code: string; analysis: string }
        const result = await this.analyzeCode(code, analysis)
        return Response.json(result, { headers: corsHeaders })
      }

      if (path === '/explain' && request.method === 'POST') {
        const { code } = await request.json() as { code: string }
        const result = await this.explainCode(code)
        return Response.json({ explanation: result }, { headers: corsHeaders })
      }

      if (path === '/refactor' && request.method === 'POST') {
        const { code, instructions } = await request.json() as { code: string; instructions: string }
        const result = await this.refactorCode(code, instructions)
        return Response.json({ code: result }, { headers: corsHeaders })
      }

      if (path === '/fix' && request.method === 'POST') {
        const { code, error } = await request.json() as { code: string; error: string }
        const result = await this.fixCode(code, error)
        return Response.json({ code: result }, { headers: corsHeaders })
      }

      if (path === '/review' && request.method === 'POST') {
        const { code, focus } = await request.json() as { code: string; focus?: string }
        const result = await this.reviewCode(code, focus)
        return Response.json(result, { headers: corsHeaders })
      }

      // Health check
      if (path === '/health') {
        return Response.json({ status: 'ok', service: 'claude-code' }, { headers: corsHeaders })
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    } catch (error) {
      console.error('Request error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500, headers: corsHeaders }
      )
    }
  }
}

// Export for Cloudflare Workers
export default ClaudeCodeService
