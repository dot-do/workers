import { Hono } from 'hono'
import { streamText, streamObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { stringify, parse } from 'yaml'
import { z } from 'zod'
import { ulid } from 'ulid'
import { env } from 'cloudflare:workers'
// import { url } from './lib/url'
// import { markdownStreamResponse, fencedMarkdownStream } from './lib/streams'


const app = new Hono()

const schema = z
  .object({
    q: z.string().optional(),
    seed: z.string().optional(),
    model: z.string().default('google/gemini-2.5-flash-preview-05-20'),
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
app.get('*', async (c) => {
  const { hostname, origin } = new URL(c.req.url)

  const { q, model, output, prompt, seed, system, temperature, maxTokens, topP, topK } = schema.parse(c.req.query())

  const retrievalId = c.req.query('q') || c.req.query('seed')
  if (retrievalId) {
    try {
      const existingObject = await env.r2.get(retrievalId)
      if (existingObject) {
        const existingContent = await existingObject.text()

        const yamlMatch = existingContent.match(/^---\n([\s\S]*?)\n---\n\n\n([\s\S]*)$/)
        if (yamlMatch) {
          const originalSettings = parse(yamlMatch[1])
          const contentBody = yamlMatch[2]

          const newId = ulid()
          const newUrl = new URL(c.req.url)
          newUrl.pathname = `/${newId}`

          const updatedSettings = {
            ...originalSettings,
            $id: newUrl.toString(),
          }

          if (updatedSettings.actions?.model) {
            Object.keys(updatedSettings.actions.model).forEach((modelKey) => {
              const actionUrl = new URL(newUrl)
              actionUrl.searchParams.set('model', modelKey)
              updatedSettings.actions.model[modelKey] = actionUrl.toString()
            })
          }

          const updatedContent = `---\n${stringify(updatedSettings)}---\n\n\n${contentBody}`

          await env.r2.put(newId, updatedContent, {
            customMetadata: {
              originalId: retrievalId,
              model: originalSettings.model || 'unknown',
              timestamp: new Date().toISOString(),
            },
          })

          return new Response(updatedContent, {
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
          })
        }
      }
    } catch (error) {
      console.error('Error retrieving from R2:', error)
    }
  }

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
              if (!reasoning && !startedReasoning) {
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
              chunkText = `\n\n<usage>\n${stringify({ latency, thinkingTime, totalTime, tokensPerSecond, ...chunk.usage })}</usage>`
              break
          }

          if (chunkText) {
            fullContent += chunkText
            controller.enqueue(encoder.encode(chunkText))
          }
        }

        await env.r2.put(generationId, fullContent, {
          customMetadata: {
            model,
            prompt: finalPrompt.substring(0, 100), // Truncate for metadata
            timestamp: new Date().toISOString(),
          },
        })

        try {
          const dbxResponse = await env.DBX_MD.fetch(`https://ai.apis.do/${generationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: fullContent,
              type: 'GeneratedContent',
              visibility: 'public',
              data: {
                model,
                prompt: finalPrompt.substring(0, 100),
                timestamp: new Date().toISOString(),
              },
            }),
          })

          if (!dbxResponse.ok) {
            console.error('Failed to save to dbx-md:', await dbxResponse.text())
          }
        } catch (error) {
          console.error('Error saving to dbx-md:', error)
        }
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
