/**
 * MCP (Model Context Protocol) Tools for AI Service
 * Exposes AI capabilities as tools for LLM agents
 */

import type AIService from './index'
import type { GenerateOptions } from 'ai-generation'
import type { EmbeddingOptions } from 'ai-embeddings'

/**
 * MCP Tool Definition
 */
interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * AI Service MCP Tools
 */
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'generate_text',
    description: 'Generate text using AI models (OpenAI, Anthropic, Workers AI). Supports GPT-5, Claude Sonnet 4.5, and open-source models with automatic fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The text prompt to generate from',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'workers-ai'],
          description: 'AI provider to use (default: openai)',
        },
        model: {
          type: 'string',
          description: 'Specific model to use (e.g., gpt-5, claude-sonnet-4.5, @cf/meta/llama-3.1-8b-instruct)',
        },
        systemPrompt: {
          type: 'string',
          description: 'System prompt to guide model behavior',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature 0-1 (default: 0.7)',
          minimum: 0,
          maximum: 1,
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens to generate (default: 2048)',
        },
        fallback: {
          type: 'boolean',
          description: 'Enable automatic fallback to other providers on error (default: true)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'analyze_content',
    description: 'Analyze content using AI models. Performs intelligent analysis based on the provided analysis criteria (e.g., "sentiment", "key points", "grammar errors").',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to analyze',
        },
        analysis: {
          type: 'string',
          description: 'What to analyze for (e.g., "sentiment", "key topics", "accuracy")',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'workers-ai'],
          description: 'AI provider to use (default: openai)',
        },
        model: {
          type: 'string',
          description: 'Specific model to use (default: gpt-4o)',
        },
        systemPrompt: {
          type: 'string',
          description: 'System prompt to guide analysis',
        },
      },
      required: ['content', 'analysis'],
    },
  },
  {
    name: 'embed_text',
    description: 'Generate embedding vectors for text using OpenAI or Workers AI. Returns a high-dimensional vector representation suitable for semantic search, clustering, or similarity comparison.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to generate embeddings for',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'workers-ai'],
          description: 'Embedding provider to use (default: openai). Note: Anthropic does not support embeddings.',
        },
        model: {
          type: 'string',
          description: 'Embedding model to use (e.g., text-embedding-3-small, @cf/baai/bge-base-en-v1.5)',
        },
        dimensions: {
          type: 'number',
          description: 'Number of dimensions for OpenAI embeddings (optional)',
        },
      },
      required: ['text'],
    },
  },
]

/**
 * Execute MCP tool
 */
export async function executeMCPTool(service: AIService, toolName: string, args: Record<string, any>): Promise<any> {
  switch (toolName) {
    case 'generate_text': {
      const { prompt, ...options } = args as { prompt: string } & GenerateOptions
      return await service.generate(prompt, options)
    }

    case 'analyze_content': {
      const { content, analysis, ...options } = args as { content: string; analysis: string } & GenerateOptions
      return await service.analyze(content, analysis, options)
    }

    case 'embed_text': {
      const { text, ...options } = args as { text: string } & EmbeddingOptions
      return await service.embed(text, options)
    }

    default:
      throw new Error(`Unknown MCP tool: ${toolName}`)
  }
}

/**
 * Get all MCP tools
 */
export function getMCPTools(): MCPTool[] {
  return MCP_TOOLS
}

/**
 * Handle MCP JSON-RPC request
 */
export async function handleMCPRequest(service: AIService, request: Request): Promise<Response> {
  try {
    const body = await request.json() as any

    // tools/list - List available tools
    if (body.method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: MCP_TOOLS,
        },
      })
    }

    // tools/call - Execute tool
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params

      const result = await executeMCPTool(service, name, args)

      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      })
    }

    return Response.json(
      {
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      },
      { status: 400 }
    )
  } catch (error) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      },
      { status: 500 }
    )
  }
}
