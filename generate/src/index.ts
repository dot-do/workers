import { Hono } from 'hono'
import { streamText, streamObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOpenAI } from '@ai-sdk/openai'
import { stringify, parse } from 'yaml'
import { z } from 'zod'
import { ulid } from 'ulid'
import { env } from 'cloudflare:workers'
import type { TokenUsage } from 'ai-generation'
import { calculateCost, MODEL_PRICING } from 'ai-generation'
// import { url } from './lib/url'
// import { markdownStreamResponse, fencedMarkdownStream } from './lib/streams'


const app = new Hono()

const schema = z
  .object({
    q: z.string().optional(),
    seed: z.string().optional(),
    model: z.string().default('google/gemini-2.5-flash'),
    output: z.enum(['markdown', 'json']).default('markdown'),
    system: z.string().optional(),
    prompt: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional(),
  })
  .refine((data) => data.q || data.seed || data.prompt, {
    message: "At least one of 'q', 'seed', or 'prompt' must be provided",
  })

/**
 *  /stream-text
 *  Responds with YAML + streamed Markdown
 */
app.get('*', async (c, next) => {
  await next()
  if (c.error) return new Response(c.error.message, { status: 400 })
})

app.get('*', async (c) => {
  const { hostname, origin } = new URL(c.req.url)

  const { q, model, output, prompt, seed, system, temperature, maxTokens, topP, topK } = schema.parse(c.req.query())

  const generationId = ulid()
  const generationUrl = new URL(c.req.url)
  generationUrl.pathname = `/${generationId}`

  const finalPrompt = prompt || q || 'Give an overview of Markdown, its use cases, and history'

  const openrouter = createOpenRouter({
    apiKey: env.AI_GATEWAY_TOKEN,
    baseURL: 'https://gateway.ai.cloudflare.com/v1/b6641681fe423910342b9ffa1364c76d/functions-do/openrouter',
    headers: {
      'HTTP-Referer': 'https://do.industries',
      'X-Title': '.do Business-as-Code',
    },
  })

  const result = await streamText({
    model: openrouter(model) as any,
    system,
    prompt: finalPrompt,
    seed: seed ? parseInt(seed) : undefined,
    temperature,
    maxTokens,
    topP,
    topK,
    onFinish: async (result) => {
      console.log(result)
      // c.executionCtx.waitUntil(
      await env.pipeline.send([result])
      // )
    }
  })

  const url = (options: Record<string, string | number>) => {
    const actionUrl = new URL(generationUrl)
    Object.entries(options).forEach(([key, value]) => {
      actionUrl.searchParams.set(key, value.toString())
    })
    return actionUrl.toString()
  }

  const markdown = `---\n${stringify({
    $id: generationUrl.toString(),
    $type: output,
    $context: origin,
    system,
    prompt: finalPrompt,
    model,
    seed,
    temperature,
    maxTokens,
    topP,
    topK,
    actions: {
      model: {
        'anthropic/claude-opus-4': url({ model: 'anthropic/claude-opus-4' }),
        'anthropic/claude-sonnet-4': url({ model: 'anthropic/claude-sonnet-4' }),
        'google/gemini-2.5-pro': url({ model: 'google/gemini-2.5-pro' }),
        'google/gemini-2.5-flash': url({ model: 'google/gemini-2.5-flash' }),
        'google/gemini-2.5-flash-lite-preview-06-17': url({ model: 'google/gemini-2.5-flash-lite-preview-06-17' }),
        'openai/gpt-4.1': url({ model: 'openai/gpt-4.1' }),
        'openai/gpt-4.1-mini': url({ model: 'openai/gpt-4.1-mini' }),
        'openai/gpt-4.1-nano': url({ model: 'openai/gpt-4.1-nano' }),
        'openai/o3': url({ model: 'openai/o3' }),
        'openai/o3-pro': url({ model: 'openai/o3-pro' }),
        'openai/o4-mini': url({ model: 'openai/o4-mini' }),
        'openai/o4-mini-high': url({ model: 'openai/o4-mini-high' }),
        // 'perplexity/sonar-pro': url({ model: 'perplexity/sonar-pro' }),
        // 'perplexity/sonar-reasoning-pro': url({ model: 'perplexity/sonar-reasoning-pro' }),
        // 'perplexity/sonar': url({ model: 'perplexity/sonar' }),
        // 'perplexity/sonar-reasoning': url({ model: 'perplexity/sonar-reasoning' }),
      },
    },
  })}---\n\n\n`

  // Stream the YAML front-matter + generated markdown back to the client
  const encoder = new TextEncoder()
  let fullContent = markdown // Start with YAML frontmatter

  const stream = new ReadableStream({
    async start(controller) {
      // Send the YAML front-matter first
      controller.enqueue(encoder.encode(markdown))

      try {
        let reasoning = false
        let startedReasoning = false
        let latency
        let thinkingTime
        let start = Date.now()
        for await (const chunk of result.fullStream) {
          console.log(chunk)
          let chunkText = ''
          switch (chunk.type) {
            case 'reasoning':
              if (!startedReasoning) {
                if (!latency) {
                  latency = Date.now() - start
                }
                chunkText = `<thinking>\n\n`
                reasoning = true
                startedReasoning = true
              }
              chunkText += chunk.textDelta
              break
            case 'text-delta':
              if (reasoning) {
                reasoning = false
                thinkingTime = Date.now() - start
                chunkText = `\n\n</thinking>\n\n\n`
              }
              if (!latency) {
                latency = Date.now() - start
              }
              chunkText += chunk.textDelta
              break
            case 'finish':
              const totalTime = Date.now() - start
              const tokensPerSecond = Math.round(chunk.usage.totalTokens / (totalTime / 1000))
              // Calculate cost using ai-generation package
              const usage: TokenUsage = {
                promptTokens: chunk.usage.promptTokens,
                completionTokens: chunk.usage.completionTokens,
                totalTokens: chunk.usage.totalTokens,
              }
              const cost = calculateCost(usage, model)
              const costFormatted = cost > 0 ? `$${cost.toFixed(6)}` : 'N/A'
              chunkText = `\n\n<usage>\n${stringify({ latency, thinkingTime, totalTime, tokensPerSecond, cost: costFormatted, ...chunk.usage })}</usage>`
              break
          }

          if (chunkText) {
            fullContent += chunkText
            controller.enqueue(encoder.encode(chunkText))
          }
        }


        // await env.pipeline.send([
        //   {
        //     ulid: generationId,
        //     url: c.req.url,
        //     generationUrl,
        //     finalPrompt,
        //     model,
        //     seed,
        //     system,
        //     temperature,
        //     maxTokens,
        //     topP,
        //     topK,
        //     fullContent,
        //   },
        // ])

        // await env.r2.put(generationId, fullContent, {
        //   customMetadata: {
        //     model,
        //     prompt: finalPrompt.substring(0, 100), // Truncate for metadata
        //     timestamp: new Date().toISOString(),
        //   },
        // })

        // try {
        //   const dbxResponse = await env.DBX_MD.fetch(`https://ai.apis.do/${generationId}`, {
        //     method: 'PUT',
        //     headers: {
        //       'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //       content: fullContent,
        //       type: 'GeneratedContent',
        //       visibility: 'public',
        //       data: {
        //         model,
        //         prompt: finalPrompt.substring(0, 100),
        //         timestamp: new Date().toISOString(),
        //       },
        //     }),
        //   })

        //   if (!dbxResponse.ok) {
        //     console.error('Failed to save to dbx-md:', await dbxResponse.text())
        //   }
        // } catch (error) {
        //   console.error('Error saving to dbx-md:', error)
        // }
      } catch (err) {
        console.error('Error while streaming markdown', err)
        controller.error(err as unknown as Error)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
})

export default app
