/**
 * AI Service - Multi-Provider AI Generation Service
 *
 * Supports OpenAI, Anthropic, and Workers AI with automatic fallback
 * Provides text generation, streaming, embeddings, and content analysis
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { WorkersAIProvider } from './providers/workers-ai'
import type {
  AIServiceEnv,
  AIProvider,
  GenerateOptions,
  GenerateResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  AnalysisResult,
  AIProviderInterface,
  ImageGenerationOptions,
  ImageGenerationResponse,
  SpeechGenerationOptions,
  SpeechGenerationResponse,
  MusicGenerationOptions,
  MusicGenerationResponse,
} from './types'
import { calculateCost } from 'ai-models'

export default class AIService extends WorkerEntrypoint<AIServiceEnv> {
  private providers: Map<AIProvider, AIProviderInterface>

  constructor(ctx: ExecutionContext, env: AIServiceEnv) {
    super(ctx, env)

    // Initialize providers
    this.providers = new Map<AIProvider, AIProviderInterface>([
      ['openai', new OpenAIProvider(env)],
      ['anthropic', new AnthropicProvider(env)],
      ['workers-ai', new WorkersAIProvider(env)],
    ])
  }

  /**
   * Get provider instance
   */
  private getProvider(provider: AIProvider): AIProviderInterface {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`)
    }
    return providerInstance
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: AIProvider): string {
    return this.getProvider(provider).getDefaultModel()
  }

  /**
   * Generate text with automatic fallback
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getDefaultModel(provider)

    try {
      return await this.getProvider(provider).generateText(prompt, { ...options, model })
    } catch (error) {
      // Fallback to different provider if enabled
      if (options?.fallback !== false) {
        return await this.generateWithFallback(prompt, provider, options)
      }
      throw error
    }
  }

  /**
   * Generate text with provider fallback chain
   */
  private async generateWithFallback(prompt: string, failedProvider: AIProvider, options?: GenerateOptions): Promise<string> {
    // Fallback chain: openai -> anthropic -> workers-ai
    const fallbackChain: AIProvider[] = ['openai', 'anthropic', 'workers-ai'].filter(p => p !== failedProvider)

    for (const provider of fallbackChain) {
      try {
        const model = this.getDefaultModel(provider)
        return await this.getProvider(provider).generateText(prompt, { ...options, model })
      } catch (error) {
        console.error(`Fallback to ${provider} failed:`, error)
        continue
      }
    }

    throw new Error('All providers failed to generate text')
  }

  /**
   * Generate streaming response
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream> {
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getDefaultModel(provider)

    return await this.getProvider(provider).generateStream(prompt, { ...options, model })
  }

  /**
   * Generate embedding vector
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getProvider(provider).getDefaultEmbeddingModel()

    try {
      return await this.getProvider(provider).generateEmbedding(text, { ...options, model })
    } catch (error) {
      // Fallback to Workers AI for embeddings if primary fails
      if (provider !== 'workers-ai') {
        const workersAI = this.getProvider('workers-ai')
        return await workersAI.generateEmbedding(text, { ...options, model: workersAI.getDefaultEmbeddingModel() })
      }
      throw error
    }
  }

  /**
   * Analyze content with AI
   */
  async analyzeContent(content: string, analysis: string, options?: GenerateOptions): Promise<string> {
    const prompt = `Analyze the following content for: ${analysis}\n\nContent:\n${content}`
    return await this.generateText(prompt, options)
  }

  /**
   * RPC Method: Generate text with full response metadata
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getDefaultModel(provider)

    const text = await this.generateText(prompt, { ...options, provider, model })

    const latency = Date.now() - startTime

    // Mock usage for now - would need actual response from providers
    const usage = {
      promptTokens: Math.ceil(prompt.length / 4), // Rough estimate
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil((prompt.length + text.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      text,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Generate embedding with full response metadata
   */
  async embed(text: string, options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getProvider(provider).getDefaultEmbeddingModel()

    const embedding = await this.generateEmbedding(text, { ...options, provider, model })

    const latency = Date.now() - startTime

    const usage = {
      tokens: Math.ceil(text.length / 4),
      requests: 1,
    }

    const cost = calculateCost({ promptTokens: usage.tokens, completionTokens: 0 }, model)

    return {
      embedding,
      model,
      provider,
      dimensions: embedding.length,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Analyze content with full response metadata
   */
  async analyze(content: string, analysis: string, options?: GenerateOptions): Promise<AnalysisResult> {
    const startTime = Date.now()
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || this.getDefaultModel(provider)

    const result = await this.analyzeContent(content, analysis, { ...options, provider, model })

    const latency = Date.now() - startTime

    const usage = {
      promptTokens: Math.ceil((content.length + analysis.length) / 4),
      completionTokens: Math.ceil(result.length / 4),
      totalTokens: Math.ceil((content.length + analysis.length + result.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      analysis,
      result,
      content,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Generate image with full response metadata
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResponse> {
    const provider = options?.provider || 'openai'
    const providerInstance = this.getProvider(provider)

    if (!providerInstance.generateImage) {
      throw new Error(`Provider ${provider} does not support image generation`)
    }

    const response = await providerInstance.generateImage(prompt, options)

    // Upload images to R2
    const { downloadAndUploadImage } = await import('./r2')
    const uploadedImages = await Promise.all(
      response.images.map(async (img) => {
        if (img.url) {
          // Download from temporary URL and upload to R2
          const r2Url = await downloadAndUploadImage(this.env, img.url, 'image/png')
          return { ...img, url: r2Url, temporaryUrl: img.url }
        } else if (img.b64_json) {
          // Upload base64 image to R2
          const { uploadImageToR2 } = await import('./r2')
          const r2Url = await uploadImageToR2(this.env, img.b64_json, 'image/png')
          return { ...img, url: r2Url, b64_json: undefined } // Remove base64, use R2 URL
        }
        return img
      })
    )

    return {
      ...response,
      images: uploadedImages,
    }
  }

  /**
   * RPC Method: Generate speech with full response metadata
   */
  async generateSpeech(text: string, options?: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || 'tts-1'
    const voice = options?.voice || 'alloy'
    const format = options?.format || 'mp3'

    const providerInstance = this.getProvider(provider)

    if (!providerInstance.generateSpeech) {
      throw new Error(`Provider ${provider} does not support speech generation`)
    }

    const audio = await providerInstance.generateSpeech(text, options)
    const latency = Date.now() - startTime

    // Calculate cost based on character count
    // OpenAI TTS-1: $0.015 per 1K characters
    // OpenAI TTS-1-HD: $0.030 per 1K characters
    const characters = text.length
    const costPer1K = model === 'tts-1-hd' ? 0.030 : 0.015
    const cost = (characters / 1000) * costPer1K

    // Upload audio to R2
    const { uploadAudioToR2 } = await import('./r2')
    const r2Url = await uploadAudioToR2(this.env, audio, format)

    return {
      audio,
      audioUrl: r2Url, // Add R2 URL
      model,
      provider,
      voice,
      format,
      cost,
      latency,
      usage: {
        characters,
      },
    }
  }

  /**
   * RPC Method: Alias for generateSpeech (more intuitive name)
   */
  async say(text: string, options?: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
    return await this.generateSpeech(text, options)
  }

  /**
   * RPC Method: Generate music with full response metadata
   */
  async generateMusic(prompt: string, options?: MusicGenerationOptions): Promise<MusicGenerationResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'replicate'
    const model = options?.model || 'stability-ai/stable-audio-open-1.0'
    const duration = Math.min(options?.duration || 30, 180) // Max 180 seconds
    const format = options?.format || 'mp3'

    // Initialize Replicate provider
    const { ReplicateProvider } = await import('./providers/replicate')
    const replicateProvider = new ReplicateProvider(this.env)

    // Generate music
    const audio = await replicateProvider.generateMusic(prompt, options)
    const latency = Date.now() - startTime

    // Upload audio to R2
    const { uploadAudioToR2 } = await import('./r2')
    const r2Url = await uploadAudioToR2(this.env, audio, format, 'music')

    return {
      audio,
      audioUrl: r2Url,
      model,
      provider,
      duration,
      format,
      cost: replicateProvider.getEstimatedCost(duration),
      latency,
      usage: {
        seconds: duration,
      },
      metadata: {
        style: options?.style,
        mood: options?.mood,
        bpm: options?.bpm,
        seed: options?.seed,
      },
    }
  }

  /**
   * RPC Method: Generate structured list
   */
  async list(topic: string, options?: import('./types').ListOptions): Promise<import('./types').ListResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getDefaultModel(provider)
    const count = options?.count || 10
    const format = options?.format || 'json'

    // Build prompt for list generation
    let prompt = `Generate a list of ${count} items about: ${topic}\n\n`

    if (options?.criteria && options.criteria.length > 0) {
      prompt += `Criteria:\n${options.criteria.map(c => `- ${c}`).join('\n')}\n\n`
    }

    if (format === 'json') {
      prompt += `Return ONLY a JSON array of strings, no other text. Example: ["item1", "item2", "item3"]`
    } else if (format === 'markdown') {
      prompt += `Return as a markdown list with numbers.`
    } else {
      prompt += `Return as a plain text list, one item per line.`
    }

    const text = await this.generateText(prompt, { ...options, provider, model })
    const latency = Date.now() - startTime

    // Parse items based on format
    let items: string[]
    if (format === 'json') {
      try {
        items = JSON.parse(text.trim())
      } catch {
        // Fallback: split by lines
        items = text.trim().split('\n').filter(line => line.trim())
      }
    } else {
      items = text.trim().split('\n').filter(line => line.trim())
    }

    const usage = {
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil((prompt.length + text.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      items,
      count: items.length,
      topic,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Research topic with synthesis
   */
  async research(topic: string, options?: import('./types').ResearchOptions): Promise<import('./types').ResearchResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || 'gpt-4o'
    const depth = options?.depth || 'medium'
    const sourceCount = options?.sources || 5
    const format = options?.format || 'summary'

    // Multi-query approach based on depth
    const queries: string[] = []
    if (depth === 'shallow') {
      queries.push(`Provide a brief overview of: ${topic}`)
    } else if (depth === 'medium') {
      queries.push(`What are the key aspects of: ${topic}?`)
      queries.push(`What are recent developments in: ${topic}?`)
      queries.push(`What are the main challenges in: ${topic}?`)
    } else {
      // deep
      queries.push(`Provide a comprehensive overview of: ${topic}`)
      queries.push(`What are the historical developments in: ${topic}?`)
      queries.push(`What are current trends and recent breakthroughs in: ${topic}?`)
      queries.push(`What are the main challenges and limitations in: ${topic}?`)
      queries.push(`What are future directions and opportunities in: ${topic}?`)
    }

    // Generate responses for each query
    const responses: string[] = []
    for (const query of queries) {
      const response = await this.generateText(query, { ...options, provider, model })
      responses.push(response)
    }

    // Synthesize findings
    const synthesisPrompt = `Based on the following research findings about "${topic}", create a comprehensive ${format}:\n\n${responses.map((r, i) => `Finding ${i + 1}:\n${r}\n`).join('\n')}\n\nProvide a well-structured ${format} that synthesizes these findings.`

    const summary = await this.generateText(synthesisPrompt, { ...options, provider, model })
    const latency = Date.now() - startTime

    // Extract key findings
    const findings = responses.slice(0, sourceCount)

    // Create mock sources (in real implementation, these would come from actual sources)
    const sources = findings.map((finding, i) => ({
      title: queries[i],
      content: finding.substring(0, 500) + '...',
      relevance: 1 - (i * 0.1), // Simple relevance score
    }))

    const usage = {
      promptTokens: Math.ceil((queries.join('').length + responses.join('').length) / 4),
      completionTokens: Math.ceil(summary.length / 4),
      totalTokens: Math.ceil((queries.join('').length + responses.join('').length + summary.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      summary,
      findings,
      sources,
      topic,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Generate code with best practices
   */
  async code(description: string, options?: import('./types').CodeOptions): Promise<import('./types').CodeResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || 'gpt-4o'
    const language = options?.language || 'typescript'
    const framework = options?.framework
    const style = options?.style || 'production'
    const includeTests = options?.includeTests ?? true

    // Build code generation prompt
    let prompt = `Generate ${language} code for: ${description}\n\n`

    if (framework) {
      prompt += `Framework: ${framework}\n`
    }

    if (style === 'minimal') {
      prompt += `Style: Minimal, concise code with minimal comments.\n`
    } else if (style === 'documented') {
      prompt += `Style: Well-documented code with JSDoc/docstrings and inline comments.\n`
    } else {
      prompt += `Style: Production-ready code with proper error handling, types, and reasonable comments.\n`
    }

    prompt += `\nProvide:\n1. The code implementation\n2. A brief explanation of how it works\n`

    if (includeTests) {
      prompt += `3. Unit tests for the code\n`
    }

    prompt += `\nFormat your response as:\n\n### Code\n\`\`\`${language}\n[code here]\n\`\`\`\n\n### Explanation\n[explanation here]\n`

    if (includeTests) {
      prompt += `\n### Tests\n\`\`\`${language}\n[tests here]\n\`\`\`\n`
    }

    const text = await this.generateText(prompt, { ...options, provider, model })
    const latency = Date.now() - startTime

    // Parse response sections
    const codeMatch = text.match(/###\s*Code\s*\n```[\w]*\n([\s\S]*?)\n```/)
    const explanationMatch = text.match(/###\s*Explanation\s*\n([\s\S]*?)(?=###|$)/)
    const testsMatch = text.match(/###\s*Tests\s*\n```[\w]*\n([\s\S]*?)\n```/)

    const code = codeMatch ? codeMatch[1].trim() : text
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'Code generated successfully'
    const tests = testsMatch ? testsMatch[1].trim() : undefined

    const usage = {
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil((prompt.length + text.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      code,
      language,
      explanation,
      tests,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Decide whether to generate code/text or structured object
   * Uses AI to analyze the method name and arguments to make intelligent routing decisions
   */
  async decideGenerationType(methodName: string, args: any[]): Promise<'text' | 'object'> {
    const prompt = `You are an API routing assistant. Analyze this method call and decide if it should generate unstructured text/code or a structured object.

Method: ${methodName}
Arguments: ${JSON.stringify(args, null, 2)}

Reply with ONLY one word: "text" or "object"

Guidelines:
- "text" for: code generation, explanations, creative writing, natural language responses
- "object" for: data extraction, structured data, lists of items, entity parsing, JSON/structured output

Answer:`

    const result = await this.generateText(prompt, {
      provider: 'workers-ai',
      model: '@cf/openai/gpt-oss-120b',
      temperature: 0,
      maxTokens: 10,
    })

    const decision = result.trim().toLowerCase()
    return decision.includes('object') ? 'object' : 'text'
  }

  /**
   * RPC Method: Generate structured object with JSON schema
   * Returns parsed JSON object based on prompt
   */
  async generateObject(
    prompt: string,
    options?: GenerateOptions & { schema?: Record<string, any> }
  ): Promise<any> {
    const startTime = Date.now()
    const provider = options?.provider || 'workers-ai'
    const model = options?.model || '@cf/openai/gpt-oss-120b'

    // Build JSON generation prompt
    let jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No other text, no markdown, no code blocks. Just pure JSON.`

    if (options?.schema) {
      jsonPrompt += `\n\nExpected JSON structure:\n${JSON.stringify(options.schema, null, 2)}`
    }

    const text = await this.generateText(jsonPrompt, {
      ...options,
      provider,
      model,
      temperature: options?.temperature ?? 0.3,
    })

    const latency = Date.now() - startTime

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim()

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    // Parse JSON
    try {
      const parsed = JSON.parse(jsonText)

      // Validate against schema if provided
      if (options?.schema) {
        // Basic schema validation (could be enhanced with Zod)
        const schemaKeys = Object.keys(options.schema)
        const parsedKeys = Object.keys(parsed)

        const missingKeys = schemaKeys.filter(k => !parsedKeys.includes(k))
        if (missingKeys.length > 0) {
          console.warn(`Generated object missing keys: ${missingKeys.join(', ')}`)
        }
      }

      return {
        object: parsed,
        model,
        provider,
        latency,
        usage: {
          promptTokens: Math.ceil(jsonPrompt.length / 4),
          completionTokens: Math.ceil(text.length / 4),
          totalTokens: Math.ceil((jsonPrompt.length + text.length) / 4),
        },
      }
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse: ${jsonText}`)
    }
  }

  /**
   * HTTP fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const { pathname, searchParams } = url

    try {
      // POST /ai/generate - Generate text
      if (pathname === '/ai/generate' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const response = await this.generate(prompt, options)
        return Response.json(response)
      }

      // POST /ai/stream - Generate streaming text (SSE)
      if (pathname === '/ai/stream' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const stream = await this.generateStream(prompt, options)

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      // POST /ai/embed - Generate embedding
      if (pathname === '/ai/embed' && request.method === 'POST') {
        const body = await request.json() as any
        const { text, ...options } = body

        if (!text) {
          return Response.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await this.embed(text, options)
        return Response.json(response)
      }

      // POST /ai/analyze - Analyze content
      if (pathname === '/ai/analyze' && request.method === 'POST') {
        const body = await request.json() as any
        const { content, analysis, ...options } = body

        if (!content || !analysis) {
          return Response.json({ error: 'Content and analysis are required' }, { status: 400 })
        }

        const response = await this.analyze(content, analysis, options)
        return Response.json(response)
      }

      // POST /ai/generate-image - Generate image
      if (pathname === '/ai/generate-image' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const response = await this.generateImage(prompt, options)
        return Response.json(response)
      }

      // POST /ai/generate-speech - Generate speech
      if (pathname === '/ai/generate-speech' && request.method === 'POST') {
        const body = await request.json() as any
        const { text, ...options } = body

        if (!text) {
          return Response.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await this.generateSpeech(text, options)

        // Return audio with appropriate content type
        const contentType = options.format === 'opus' ? 'audio/opus' :
                           options.format === 'aac' ? 'audio/aac' :
                           options.format === 'flac' ? 'audio/flac' :
                           options.format === 'wav' ? 'audio/wav' :
                           'audio/mpeg' // Default to mp3

        return new Response(response.audio, {
          headers: {
            'Content-Type': contentType,
            'X-AI-Model': response.model,
            'X-AI-Provider': response.provider,
            'X-AI-Voice': response.voice,
            'X-AI-Cost': response.cost?.toString() || '0',
            'X-AI-Latency': response.latency.toString(),
          },
        })
      }

      // POST /ai/say - Alias for generate-speech (more intuitive)
      if (pathname === '/ai/say' && request.method === 'POST') {
        const body = await request.json() as any
        const { text, ...options } = body

        if (!text) {
          return Response.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await this.say(text, options)

        const contentType = options.format === 'opus' ? 'audio/opus' :
                           options.format === 'aac' ? 'audio/aac' :
                           options.format === 'flac' ? 'audio/flac' :
                           options.format === 'wav' ? 'audio/wav' :
                           'audio/mpeg'

        return new Response(response.audio, {
          headers: {
            'Content-Type': contentType,
            'X-AI-Model': response.model,
            'X-AI-Provider': response.provider,
            'X-AI-Voice': response.voice,
            'X-AI-Cost': response.cost?.toString() || '0',
            'X-AI-Latency': response.latency.toString(),
          },
        })
      }

      // POST /ai/generate-music - Generate music
      if (pathname === '/ai/generate-music' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const response = await this.generateMusic(prompt, options)

        // Return full JSON response with metadata
        return Response.json({
          audioUrl: response.audioUrl,
          model: response.model,
          provider: response.provider,
          duration: response.duration,
          format: response.format,
          cost: response.cost,
          latency: response.latency,
          usage: response.usage,
          metadata: response.metadata,
        })
      }

      // POST /ai/list - Generate structured list
      if (pathname === '/ai/list' && request.method === 'POST') {
        const body = await request.json() as any
        const { topic, ...options } = body

        if (!topic) {
          return Response.json({ error: 'Topic is required' }, { status: 400 })
        }

        const response = await this.list(topic, options)
        return Response.json(response)
      }

      // POST /ai/research - Research topic with synthesis
      if (pathname === '/ai/research' && request.method === 'POST') {
        const body = await request.json() as any
        const { topic, ...options } = body

        if (!topic) {
          return Response.json({ error: 'Topic is required' }, { status: 400 })
        }

        const response = await this.research(topic, options)
        return Response.json(response)
      }

      // POST /ai/code - Generate code with best practices
      if (pathname === '/ai/code' && request.method === 'POST') {
        const body = await request.json() as any
        const { description, ...options } = body

        if (!description) {
          return Response.json({ error: 'Description is required' }, { status: 400 })
        }

        const response = await this.code(description, options)
        return Response.json(response)
      }

      // POST /ai/background - Submit background job
      if (pathname === '/ai/background' && request.method === 'POST') {
        const body = await request.json() as any
        const { type, input, options } = body

        if (!type || !input) {
          return Response.json({ error: 'Type and input are required' }, { status: 400 })
        }

        const jobId = crypto.randomUUID()
        const job: import('./types').BackgroundJobRequest = {
          id: jobId,
          type,
          input,
          options,
          createdAt: Date.now(),
        }

        await this.env.AI_QUEUE.send(job)

        return Response.json({
          jobId,
          status: 'queued',
          message: 'Job submitted successfully',
        })
      }

      // POST /ai/batch - Submit batch of jobs
      if (pathname === '/ai/batch' && request.method === 'POST') {
        const body = await request.json() as import('./types').BatchRequest

        if (!body.requests || !Array.isArray(body.requests)) {
          return Response.json({ error: 'Requests array is required' }, { status: 400 })
        }

        const jobs = body.requests.map((req) => ({
          id: req.id || crypto.randomUUID(),
          type: req.type,
          input: req.input,
          options: req.options,
          createdAt: Date.now(),
        }))

        await this.env.AI_QUEUE.sendBatch(jobs)

        return Response.json({
          jobIds: jobs.map((j) => j.id),
          status: 'queued',
          message: `${jobs.length} jobs submitted successfully`,
        })
      }

      // GET /ai/health - Health check
      if (pathname === '/ai/health' && request.method === 'GET') {
        return Response.json({
          status: 'healthy',
          providers: ['openai', 'anthropic', 'workers-ai', 'replicate'],
          capabilities: ['text', 'image', 'speech', 'music', 'embeddings', 'analysis', 'list', 'research', 'code'],
          modes: ['sync', 'async', 'batch'],
          timestamp: new Date().toISOString(),
        })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('AI Service error:', error)
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

// Export queue handler
export { handleQueueBatch as queue } from './queue'

// Export types for consumers
export * from './types'
