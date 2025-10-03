import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * AI Tools
 * Text generation, embeddings, and analysis via AI service
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'ai_generate',
      description: 'Generate text using AI models',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Generation prompt'
          },
          system: {
            type: 'string',
            description: 'System prompt (optional)'
          },
          model: {
            type: 'string',
            description: 'Model to use (default: llama-3.1-8b)',
            default: 'llama-3.1-8b'
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum tokens to generate (default: 1024)',
            default: 1024
          },
          temperature: {
            type: 'number',
            description: 'Temperature 0-1 (default: 0.7)',
            default: 0.7
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'ai_stream',
      description: 'Stream text generation from AI models',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Generation prompt'
          },
          system: {
            type: 'string',
            description: 'System prompt (optional)'
          },
          model: {
            type: 'string',
            description: 'Model to use (default: llama-3.1-8b)',
            default: 'llama-3.1-8b'
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'ai_embed',
      description: 'Generate embeddings for text',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to embed'
          },
          model: {
            type: 'string',
            description: 'Embedding model (default: bge-base-en-v1.5)',
            default: 'bge-base-en-v1.5'
          }
        },
        required: ['text']
      }
    },
    {
      name: 'ai_analyze',
      description: 'Analyze content with structured output',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Content to analyze'
          },
          task: {
            type: 'string',
            description: 'Analysis task (e.g., summarize, extract, classify)'
          },
          schema: {
            type: 'object',
            description: 'Expected output schema (optional)'
          }
        },
        required: ['content', 'task']
      }
    }
  ]
}

export async function ai_generate(
  args: {
    prompt: string
    system?: string
    model?: string
    maxTokens?: number
    temperature?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const ai = c.env.AI
  if (!ai) throw new Error('AI service not available')

  return await ai.generate({
    prompt: args.prompt,
    system: args.system,
    model: args.model || 'llama-3.1-8b',
    maxTokens: args.maxTokens || 1024,
    temperature: args.temperature || 0.7
  })
}

export async function ai_stream(
  args: { prompt: string; system?: string; model?: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const ai = c.env.AI
  if (!ai) throw new Error('AI service not available')

  // Note: Streaming requires different response handling
  // This returns a stream descriptor that can be consumed
  return await ai.stream({
    prompt: args.prompt,
    system: args.system,
    model: args.model || 'llama-3.1-8b'
  })
}

export async function ai_embed(
  args: { text: string; model?: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const ai = c.env.AI
  if (!ai) throw new Error('AI service not available')

  return await ai.embed({
    text: args.text,
    model: args.model || 'bge-base-en-v1.5'
  })
}

export async function ai_analyze(
  args: { content: string; task: string; schema?: any },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const ai = c.env.AI
  if (!ai) throw new Error('AI service not available')

  return await ai.analyze({
    content: args.content,
    task: args.task,
    schema: args.schema
  })
}
