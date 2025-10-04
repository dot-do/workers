/**
 * Blog Stream Worker
 *
 * Streams AI-generated blog posts on-demand when not found in DB
 * Route pattern: /blog/:slug
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { stream, streamText } from 'hono/streaming'

interface Env {
  DB_SERVICE: any
  AI: any
}

interface BlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string
  author?: string
  published_at?: string
  created_at: string
  updated_at: string
}

// Safety check for blog post titles
function isSafeTitle(slug: string): { safe: boolean; reason?: string } {
  // Check for SQL injection patterns
  if (/['";\\]/i.test(slug)) {
    return { safe: false, reason: 'Title contains SQL injection patterns' }
  }

  // Check for XSS patterns
  if (/<script|<iframe|javascript:|onerror=/i.test(slug)) {
    return { safe: false, reason: 'Title contains XSS patterns' }
  }

  // Check for path traversal
  if (/\.\.|\/\//i.test(slug)) {
    return { safe: false, reason: 'Title contains path traversal patterns' }
  }

  // Check for command injection
  if (/[;&|`$()]/i.test(slug)) {
    return { safe: false, reason: 'Title contains command injection patterns' }
  }

  // Check length (reasonable blog post title)
  if (slug.length > 200) {
    return { safe: false, reason: 'Title too long (max 200 characters)' }
  }

  // Check if it's just dashes or empty
  if (!slug.replace(/-/g, '').trim()) {
    return { safe: false, reason: 'Title is empty or only contains dashes' }
  }

  return { safe: true }
}

// Convert slug to human-readable title
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Generate blog post content using AI
async function generateBlogPost(env: Env, title: string): Promise<ReadableStream> {
  const prompt = `Write a comprehensive, engaging blog post about "${title}".

Structure:
- Start with a compelling introduction
- Include 3-4 main sections with practical insights
- Use markdown formatting (headers, lists, code blocks where appropriate)
- End with a conclusion and key takeaways

Tone: Professional but conversational
Length: ~800-1200 words
Format: Markdown`

  // Use Workers AI with GPT-OSS model
  const messages = [{ role: 'user' as const, content: prompt }]

  return env.AI.run('@cf/openchat/openchat-3.5-0106', {
    messages,
    stream: true
  })
}

const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'blog-stream',
    version: '1.0.0',
    status: 'ready'
  })
})

// Blog post route with streaming generation
app.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug')

  // Validate title safety first
  const safetyCheck = isSafeTitle(slug)
  if (!safetyCheck.safe) {
    return c.json({
      error: 'Invalid blog post title',
      reason: safetyCheck.reason
    }, 400)
  }

  // Check if blog post exists in DB
  try {
    const existing = await c.env.DB_SERVICE.query({
      ns: 'blog.posts',
      type: 'BlogPost',
      filter: { slug }
    })

    if (existing?.data?.length > 0) {
      // Return existing post
      const post = existing.data[0]
      return c.json({
        source: 'database',
        post
      })
    }
  } catch (error) {
    console.error('Database check error:', error)
    // Continue to generation if DB check fails
  }

  // Generate blog post with streaming
  const title = slugToTitle(slug)

  return stream(c, async (stream) => {
    // Send initial metadata
    await stream.write(`data: ${JSON.stringify({
      type: 'start',
      title,
      slug,
      generating: true
    })}\n\n`)

    try {
      // Generate content stream
      const contentStream = await generateBlogPost(c.env, title)
      const reader = contentStream.getReader()
      const decoder = new TextDecoder()

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Workers AI streaming format - chunks are text
        fullContent += chunk
        await stream.write(`data: ${JSON.stringify({
          type: 'content',
          text: chunk
        })}\n\n`)
      }

      // Save to database (fire and forget)
      if (fullContent) {
        c.env.DB_SERVICE.upsert({
          ns: 'blog.posts',
          type: 'BlogPost',
          id: slug,
          data: {
            slug,
            title,
            content: fullContent,
            excerpt: fullContent.split('\n\n')[0].slice(0, 200) + '...',
            author: 'AI Generated',
            published_at: new Date().toISOString(),
            generated: true
          }
        }).catch((err: Error) => console.error('Failed to save to DB:', err))
      }

      // Send completion
      await stream.write(`data: ${JSON.stringify({
        type: 'complete',
        slug,
        title,
        contentLength: fullContent.length
      })}\n\n`)

    } catch (error) {
      console.error('Generation error:', error)
      await stream.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`)
    }
  })
})

// RPC interface for service-to-service calls
export class BlogStreamService extends WorkerEntrypoint<Env> {
  /**
   * Generate a blog post by slug
   */
  async generatePost(slug: string): Promise<{ success: boolean; post?: BlogPost; error?: string }> {
    const safetyCheck = isSafeTitle(slug)
    if (!safetyCheck.safe) {
      return { success: false, error: safetyCheck.reason }
    }

    try {
      // Check DB first
      const existing = await this.env.DB_SERVICE.query({
        ns: 'blog.posts',
        type: 'BlogPost',
        filter: { slug }
      })

      if (existing?.data?.length > 0) {
        return { success: true, post: existing.data[0] }
      }

      // Generate content
      const title = slugToTitle(slug)
      const contentStream = await generateBlogPost(this.env, title)
      const reader = contentStream.getReader()
      const decoder = new TextDecoder()

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
      }

      // Save to DB
      const post: BlogPost = {
        id: slug,
        slug,
        title,
        content: fullContent,
        excerpt: fullContent.split('\n\n')[0].slice(0, 200) + '...',
        author: 'AI Generated',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await this.env.DB_SERVICE.upsert({
        ns: 'blog.posts',
        type: 'BlogPost',
        id: slug,
        data: post
      })

      return { success: true, post }

    } catch (error) {
      console.error('Generate post error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if a blog post exists
   */
  async postExists(slug: string): Promise<boolean> {
    try {
      const result = await this.env.DB_SERVICE.query({
        ns: 'blog.posts',
        type: 'BlogPost',
        filter: { slug }
      })
      return result?.data?.length > 0
    } catch (error) {
      console.error('Post exists check error:', error)
      return false
    }
  }

  /**
   * HTTP fetch handler
   */
  override fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request, this.env)
  }
}

export default BlogStreamService
