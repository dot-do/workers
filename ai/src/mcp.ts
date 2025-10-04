/**
 * MCP (Model Context Protocol) Tools for AI Service
 * Exposes AI capabilities as tools for LLM agents
 */

import type AIService from './index'
import type { GenerateOptions } from 'ai-generation'
import type { EmbeddingOptions } from 'ai-embeddings'
import type { ImageGenerationOptions, SpeechGenerationOptions } from './types'

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
  {
    name: 'generate_image',
    description: 'Generate images using DALL-E 3 or DALL-E 2. Creates high-quality images from text descriptions. Supports various sizes, qualities, and artistic styles.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description of the image to generate',
        },
        provider: {
          type: 'string',
          enum: ['openai'],
          description: 'Image generation provider (default: openai)',
        },
        model: {
          type: 'string',
          enum: ['dall-e-3', 'dall-e-2'],
          description: 'Model to use (default: dall-e-3)',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1792x1024', '1024x1792', '512x512', '256x256'],
          description: 'Image size (DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792)',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
          description: 'Image quality (default: standard). HD costs 2x more.',
        },
        style: {
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'Image style. Vivid = hyper-real, dramatic. Natural = more realistic.',
        },
        n: {
          type: 'number',
          description: 'Number of images to generate (1-10, default: 1)',
          minimum: 1,
          maximum: 10,
        },
        responseFormat: {
          type: 'string',
          enum: ['url', 'b64_json'],
          description: 'Response format (default: url)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generate_speech',
    description: 'Generate speech audio from text using OpenAI TTS. Supports multiple voices and audio formats. Also available via alias "say".',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to convert to speech',
        },
        provider: {
          type: 'string',
          enum: ['openai'],
          description: 'Speech provider (default: openai)',
        },
        model: {
          type: 'string',
          enum: ['tts-1', 'tts-1-hd'],
          description: 'TTS model (default: tts-1). HD has higher quality but costs 2x more.',
        },
        voice: {
          type: 'string',
          enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
          description: 'Voice to use (default: alloy). Each has distinct characteristics.',
        },
        speed: {
          type: 'number',
          description: 'Playback speed (0.25 to 4.0, default: 1.0)',
          minimum: 0.25,
          maximum: 4.0,
        },
        format: {
          type: 'string',
          enum: ['mp3', 'opus', 'aac', 'flac', 'wav'],
          description: 'Audio format (default: mp3)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'say',
    description: 'Alias for generate_speech. Generate speech audio from text using OpenAI TTS.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to convert to speech',
        },
        voice: {
          type: 'string',
          enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
          description: 'Voice to use (default: alloy)',
        },
        speed: {
          type: 'number',
          description: 'Playback speed (0.25 to 4.0, default: 1.0)',
          minimum: 0.25,
          maximum: 4.0,
        },
        format: {
          type: 'string',
          enum: ['mp3', 'opus', 'aac', 'flac', 'wav'],
          description: 'Audio format (default: mp3)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'generate_list',
    description: 'Generate a structured list of items on a topic. Returns a formatted list with a specified number of items in JSON, markdown, or plain text format.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate a list about',
        },
        count: {
          type: 'number',
          description: 'Number of items to generate (default: 10)',
          minimum: 1,
          maximum: 100,
        },
        format: {
          type: 'string',
          enum: ['json', 'markdown', 'plain'],
          description: 'Output format (default: json)',
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filtering criteria for list items',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'workers-ai'],
          description: 'AI provider to use (default: openai)',
        },
        model: {
          type: 'string',
          description: 'Specific model to use',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'research_topic',
    description: 'Research a topic using multi-query synthesis. Generates multiple perspectives and synthesizes findings into a comprehensive report with sources.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to research',
        },
        depth: {
          type: 'string',
          enum: ['shallow', 'medium', 'deep'],
          description: 'Research depth (shallow=1 query, medium=3 queries, deep=5 queries, default: medium)',
        },
        sources: {
          type: 'number',
          description: 'Number of sources to synthesize (default: 5)',
          minimum: 1,
          maximum: 20,
        },
        format: {
          type: 'string',
          enum: ['summary', 'detailed', 'outline'],
          description: 'Output format (default: summary)',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'workers-ai'],
          description: 'AI provider to use (default: openai)',
        },
        model: {
          type: 'string',
          description: 'Specific model to use',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_code',
    description: 'Generate code based on a description. Supports multiple programming languages, frameworks, and styles. Returns code with explanation and optional tests.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of what the code should do',
        },
        language: {
          type: 'string',
          description: 'Programming language (e.g., typescript, python, rust, go)',
        },
        framework: {
          type: 'string',
          description: 'Framework or library to use (e.g., react, fastapi, actix)',
        },
        style: {
          type: 'string',
          enum: ['minimal', 'production', 'documented'],
          description: 'Code style (default: production)',
        },
        includeTests: {
          type: 'boolean',
          description: 'Whether to include unit tests (default: false)',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'workers-ai'],
          description: 'AI provider to use (default: openai)',
        },
        model: {
          type: 'string',
          description: 'Specific model to use',
        },
      },
      required: ['description'],
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

    case 'generate_image': {
      const { prompt, ...options } = args as { prompt: string } & ImageGenerationOptions
      return await service.generateImage(prompt, options)
    }

    case 'generate_speech': {
      const { text, ...options } = args as { text: string } & SpeechGenerationOptions
      const result = await service.generateSpeech(text, options)
      // Convert ArrayBuffer to base64 for JSON response
      const uint8Array = new Uint8Array(result.audio)
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)))
      return {
        ...result,
        audio: base64Audio, // Return as base64 string for JSON compatibility
        audioFormat: result.format,
      }
    }

    case 'say': {
      const { text, ...options } = args as { text: string } & SpeechGenerationOptions
      const result = await service.say(text, options)
      // Convert ArrayBuffer to base64 for JSON response
      const uint8Array = new Uint8Array(result.audio)
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)))
      return {
        ...result,
        audio: base64Audio,
        audioFormat: result.format,
      }
    }

    case 'generate_list': {
      const { topic, ...options } = args as any
      return await service.list(topic, options)
    }

    case 'research_topic': {
      const { topic, ...options } = args as any
      return await service.research(topic, options)
    }

    case 'generate_code': {
      const { description, ...options } = args as any
      return await service.code(description, options)
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
