import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

/**
 * Mock MCP Server POC
 *
 * Uses Cloudflare Workers AI to generate mock responses for an "eval" tool
 * All requests are processed through AI Gateway for observability
 */

interface Env {
  AI: Ai
  AI_GATEWAY_URL?: string
  AI_GATEWAY_TOKEN?: string
}

interface MCPMessage {
  jsonrpc: '2.0'
  method: string
  params?: any
  id: string | number | null
}

interface MCPSession {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
}

// In-memory session storage (use Durable Objects for production)
const sessions = new Map<string, MCPSession>()

// TypeScript API definitions to include in tool description
const API_TYPES = `
/**
 * Platform API Types - Available in eval context
 */

// Fetch API (standard Web API)
declare function fetch(url: string | URL | Request, init?: RequestInit): Promise<Response>

// AI API - Text generation, embeddings, image generation
interface AI {
  textGeneration(args: { prompt: string; max_tokens?: number; temperature?: number }): Promise<{ response: string }>
  embedding(args: { text: string | string[] }): Promise<{ data: number[][] }>
  imageGeneration(args: { prompt: string; num_steps?: number }): Promise<{ image: ArrayBuffer }>
  objectGeneration(args: { prompt: string; schema: object }): Promise<{ object: any }>
  speechRecognition(args: { audio: ArrayBuffer }): Promise<{ text: string }>
  translation(args: { text: string; source_lang: string; target_lang: string }): Promise<{ translated_text: string }>
}
declare const ai: AI

// API Providers - External API integrations
interface APIProvider {
  [action: string]: (args: any) => Promise<any>
}

interface API {
  openai: APIProvider
  anthropic: APIProvider
  google: APIProvider
  github: APIProvider
  stripe: APIProvider
  slack: APIProvider
  [provider: string]: APIProvider
}
declare const api: API

// Database Collections - CRUD operations
interface Collection<T = any> {
  get(id: string): Promise<T | null>
  find(query: object, options?: { limit?: number; offset?: number }): Promise<T[]>
  search(query: string, options?: { limit?: number; vector?: boolean }): Promise<T[]>
  put(id: string, data: T): Promise<void>
  delete(id: string): Promise<void>
  list(options?: { limit?: number; cursor?: string }): Promise<{ items: T[]; cursor?: string }>
}

interface Database {
  users: Collection<{ id: string; email: string; name: string }>
  documents: Collection<{ id: string; title: string; content: string; embedding?: number[] }>
  events: Collection<{ id: string; type: string; data: any; timestamp: number }>
  [collection: string]: Collection
}
declare const db: Database

// Event System - Subscribe to and emit events
declare function on(event: string, callback: (data: any) => void | Promise<void>): void

// Scheduled Tasks - Run code at intervals
declare function every(interval: string | number, callback: () => void | Promise<void>): void

// Event Emitter - Send events to other workers/clients
declare function send(event: string, data?: any): Promise<void>

// Environment Variables
declare const env: {
  [key: string]: string
}
`

const EVAL_TOOL_DEFINITION = {
  name: 'eval',
  description: \`Execute code in a sandboxed environment with full platform API access.

This tool provides access to the complete platform API surface:
- \\\`fetch()\\\` - Make HTTP requests (standard Web API)
- \\\`ai.*\\\` - AI operations (text generation, embeddings, images, etc.)
- \\\`api.*\\\` - External API integrations (OpenAI, Anthropic, GitHub, Stripe, etc.)
- \\\`db.*\\\` - Database collections (get, find, search, put, delete, list)
- \\\`on(event, callback)\\\` - Subscribe to events
- \\\`every(interval, callback)\\\` - Schedule recurring tasks
- \\\`send(event, data)\\\` - Emit events
- \\\`env\\\` - Environment variables

TypeScript API Reference:
\\\`\\\`\\\`typescript
\${API_TYPES}
\\\`\\\`\\\`

Examples:
\\\`\\\`\\\`javascript
// Fetch external data
const response = await fetch('https://api.example.com/data')
const data = await response.json()

// Generate text with AI
const result = await ai.textGeneration({
  prompt: 'Summarize this data: ' + JSON.stringify(data),
  max_tokens: 500
})

// Store in database
await db.documents.put('doc-123', {
  id: 'doc-123',
  title: 'API Summary',
  content: result.response,
  timestamp: Date.now()
})

// Search documents
const docs = await db.documents.search('API summary', { limit: 10 })

// Call external APIs
const repos = await api.github.searchRepositories({ query: 'cloudflare workers' })

// Schedule task
every('1 hour', async () => {
  const count = await db.documents.find({ processed: false })
  await send('processing.pending', { count: count.length })
})
\\\`\\\`\\\`
\`,
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript/TypeScript code to execute. Has access to fetch, ai, api, db, on, every, send, and env.'
      },
      context: {
        type: 'object',
        description: 'Optional context/variables to pass to the execution environment'
      }
    },
    required: ['code']
  }
}

export class MockMCPServer extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>()

    app.use('*', cors())

    // REST API Proxy - Simple GET endpoint
    app.get('/mock/eval', async (c) => {
      const code = c.req.query('code')
      const contextParam = c.req.query('context')

      if (!code) {
        return c.json({ error: 'Missing required parameter: code' }, 400)
      }

      try {
        const context = contextParam ? JSON.parse(contextParam) : undefined
        const sessionId = c.req.query('session') || c.req.header('X-Session-ID') || 'default'

        const result = await this.generateMockResponse(c.env, code, context, sessionId)

        return c.json({
          success: true,
          data: result,
          session: sessionId
        })
      } catch (error) {
        return c.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 500)
      }
    })

    // REST API Proxy - POST endpoint with JSON body
    app.post('/mock/eval', async (c) => {
      try {
        const body = await c.req.json<{ code: string; context?: any; session?: string }>()

        if (!body.code) {
          return c.json({ error: 'Missing required parameter: code' }, 400)
        }

        const sessionId = body.session || c.req.header('X-Session-ID') || 'default'

        const result = await this.generateMockResponse(c.env, body.code, body.context, sessionId)

        return c.json({
          success: true,
          data: result,
          session: sessionId
        })
      } catch (error) {
        return c.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 500)
      }
    })

    // MCP JSON-RPC endpoint
    app.post('/', async (c) => {
      try {
        const mcpRequest: MCPMessage = await c.req.json()
        const { jsonrpc, method, params, id } = mcpRequest

        // Validate JSON-RPC 2.0
        if (jsonrpc !== '2.0') {
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request - must use JSON-RPC 2.0' },
            id
          })
        }

        console.log(\`[Mock MCP] Method: \${method}\`)

        switch (method) {
          case 'initialize':
            return c.json({
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: { listChanged: true }
                },
                serverInfo: {
                  name: 'mock-mcp-server',
                  version: '1.0.0-poc'
                }
              },
              id
            })

          case 'tools/list':
            return c.json({
              jsonrpc: '2.0',
              result: {
                tools: [EVAL_TOOL_DEFINITION]
              },
              id
            })

          case 'tools/call': {
            const { name, arguments: args } = params || {}

            if (name !== 'eval') {
              return c.json({
                jsonrpc: '2.0',
                error: { code: -32601, message: \`Unknown tool: \${name}\` },
                id
              })
            }

            if (!args?.code) {
              return c.json({
                jsonrpc: '2.0',
                error: { code: -32602, message: 'Missing required parameter: code' },
                id
              })
            }

            // Generate mock response using AI
            const result = await this.generateMockResponse(c.env, args.code, args.context, id as string)

            return c.json({
              jsonrpc: '2.0',
              result,
              id
            })
          }

          default:
            return c.json({
              jsonrpc: '2.0',
              error: { code: -32601, message: \`Method not found: \${method}\` },
              id
            })
        }
      } catch (error) {
        console.error('[Mock MCP] Error:', error)
        return c.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          },
          id: null
        }, 500)
      }
    })

    // Health check
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        service: 'mock-mcp-server',
        version: '1.0.0-poc'
      })
    })

    // HATEOAS Root - API Discovery with clickable links
    app.get('/', (c) => {
      const baseUrl = new URL(c.req.url).origin

      return c.json({
        name: 'mock-mcp-server',
        version: '1.0.0-poc',
        description: 'AI-powered mock MCP server for testing and development',
        protocols: ['MCP JSON-RPC 2.0', 'REST API'],
        _links: {
          self: { href: baseUrl },
          health: { href: `${baseUrl}/health`, method: 'GET' },
          mcp: {
            href: baseUrl,
            method: 'POST',
            description: 'MCP JSON-RPC 2.0 endpoint',
            example: {
              jsonrpc: '2.0',
              method: 'tools/call',
              params: {
                name: 'eval',
                arguments: {
                  code: 'const repos = await api.github.searchRepositories({ query: "mcp" }); return repos[0];'
                }
              },
              id: 1
            }
          },
          rest: {
            eval: {
              get: {
                href: `${baseUrl}/mock/eval?code=YOUR_CODE&session=YOUR_SESSION`,
                method: 'GET',
                description: 'Execute code via GET request',
                parameters: {
                  code: 'JavaScript code to execute (required, URL-encoded)',
                  context: 'JSON context object (optional, URL-encoded)',
                  session: 'Session ID for conversation context (optional)'
                },
                examples: [
                  {
                    description: 'Simple GitHub API call',
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const repos = await api.github.searchRepositories({ query: "cloudflare workers" }); return { found: repos.length, top: repos[0].name };')}`
                  },
                  {
                    description: 'Database search with AI',
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const docs = await db.documents.search("machine learning", { limit: 5 }); const summary = await ai.textGeneration({ prompt: "Summarize" }); return { docs: docs.length, summary };')}`
                  },
                  {
                    description: 'Fetch and process data',
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const response = await fetch("https://api.example.com/data"); const data = await response.json(); return data;')}`
                  }
                ]
              },
              post: {
                href: `${baseUrl}/mock/eval`,
                method: 'POST',
                description: 'Execute code via POST request with JSON body',
                contentType: 'application/json',
                body: {
                  code: 'JavaScript code to execute (required)',
                  context: 'Context object (optional)',
                  session: 'Session ID (optional)'
                },
                examples: [
                  {
                    description: 'Multi-step AI pipeline',
                    body: {
                      code: `const response = await fetch('https://example.com/article');
const text = await response.text();
const embedding = await ai.embedding({ text });
await db.documents.put('doc-123', { text, embedding: embedding.data[0] });
return 'Stored with embedding';`,
                      session: 'pipeline-session-1'
                    }
                  },
                  {
                    description: 'Event-driven workflow',
                    body: {
                      code: `on('webhook.github.push', async (event) => {
  const analysis = await ai.textGeneration({ prompt: 'Analyze commits' });
  await send('analysis.complete', { analysis });
});
return 'Event listener registered';`,
                      context: { userId: 'user-123' }
                    }
                  }
                ]
              }
            }
          },
          documentation: {
            quickstart: `${baseUrl}/docs/quickstart`,
            examples: `${baseUrl}/docs/examples`,
            api: `${baseUrl}/docs/api`
          }
        },
        capabilities: {
          tools: ['eval'],
          apis: {
            fetch: 'Standard Web Fetch API',
            ai: ['textGeneration', 'embedding', 'imageGeneration', 'objectGeneration', 'speechRecognition', 'translation'],
            api: ['github', 'stripe', 'slack', 'openai', 'anthropic', 'google', 'and more...'],
            db: ['get', 'find', 'search', 'put', 'delete', 'list'],
            events: ['on', 'every', 'send']
          },
          features: ['conversation-context', 'ai-powered-mocking', 'realistic-responses', 'side-effect-tracking']
        }
      })
    })

    // Documentation endpoints - HATEOAS
    app.get('/docs/quickstart', (c) => {
      const baseUrl = new URL(c.req.url).origin

      return c.json({
        title: 'Quick Start Guide',
        _links: {
          self: { href: `${baseUrl}/docs/quickstart` },
          home: { href: baseUrl },
          examples: { href: `${baseUrl}/docs/examples` },
          api: { href: `${baseUrl}/docs/api` }
        },
        steps: [
          {
            step: 1,
            title: 'Test with a simple GET request',
            action: {
              method: 'GET',
              href: `${baseUrl}/mock/eval?code=${encodeURIComponent('return "Hello from Mock MCP!"')}`,
              clickable: true
            }
          },
          {
            step: 2,
            title: 'Try a GitHub API call',
            action: {
              method: 'GET',
              href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const repos = await api.github.searchRepositories({ query: "mcp" }); return repos[0];')}`,
              clickable: true
            }
          },
          {
            step: 3,
            title: 'Use session for conversation context',
            action: {
              method: 'GET',
              href: `${baseUrl}/mock/eval?code=${encodeURIComponent('await db.users.put("alice", { name: "Alice", role: "engineer" }); return "User created";')}&session=my-session`,
              clickable: true
            },
            followup: {
              method: 'GET',
              href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const alice = await db.users.get("alice"); return alice.role;')}&session=my-session`,
              description: 'AI remembers previous context'
            }
          }
        ]
      })
    })

    app.get('/docs/examples', (c) => {
      const baseUrl = new URL(c.req.url).origin

      return c.json({
        title: 'Example Use Cases',
        _links: {
          self: { href: `${baseUrl}/docs/examples` },
          home: { href: baseUrl },
          quickstart: { href: `${baseUrl}/docs/quickstart` },
          api: { href: `${baseUrl}/docs/api` }
        },
        examples: [
          {
            category: 'Database Operations',
            examples: [
              {
                title: 'Search with vector embeddings',
                description: 'Search documents using semantic search',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const docs = await db.documents.search("machine learning papers", { limit: 5, vector: true }); return { found: docs.length, titles: docs.map(d => d.title) };')}`,
                    method: 'GET'
                  }
                }
              },
              {
                title: 'CRUD operations',
                description: 'Create, read, update documents',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval`,
                    method: 'POST',
                    body: {
                      code: `await db.documents.put('doc-123', { title: 'Test', content: 'Hello' });
const doc = await db.documents.get('doc-123');
return doc;`
                    }
                  }
                }
              }
            ]
          },
          {
            category: 'AI Operations',
            examples: [
              {
                title: 'Text generation',
                description: 'Generate text with AI',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const result = await ai.textGeneration({ prompt: "Write a haiku about coding", max_tokens: 100 }); return result.response;')}`,
                    method: 'GET'
                  }
                }
              },
              {
                title: 'Generate embeddings',
                description: 'Create vector embeddings for text',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const embedding = await ai.embedding({ text: "Hello world" }); return { dimensions: embedding.data[0].length };')}`,
                    method: 'GET'
                  }
                }
              }
            ]
          },
          {
            category: 'External API Integration',
            examples: [
              {
                title: 'GitHub repository search',
                description: 'Search GitHub repositories',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('const repos = await api.github.searchRepositories({ query: "cloudflare workers", sort: "stars", limit: 3 }); return repos.map(r => ({ name: r.name, stars: r.stars }));')}`,
                    method: 'GET'
                  }
                }
              },
              {
                title: 'Multi-API workflow',
                description: 'Combine multiple API calls',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval`,
                    method: 'POST',
                    body: {
                      code: `const repos = await api.github.searchRepositories({ query: "mcp" });
const issues = await api.github.listIssues({ owner: repos[0].owner, repo: repos[0].name });
await send('github.analyzed', { repo: repos[0].name, issues: issues.length });
return { analyzed: repos[0].name };`
                    }
                  }
                }
              }
            ]
          },
          {
            category: 'Event-Driven Patterns',
            examples: [
              {
                title: 'Event listener',
                description: 'Register event handlers',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('on("webhook.received", async (event) => { await db.events.put(event.id, event); }); return "Listener registered";')}`,
                    method: 'GET'
                  }
                }
              },
              {
                title: 'Scheduled tasks',
                description: 'Schedule recurring jobs',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval?code=${encodeURIComponent('every("1 hour", async () => { const pending = await db.documents.find({ processed: false }); }); return "Task scheduled";')}`,
                    method: 'GET'
                  }
                }
              }
            ]
          },
          {
            category: 'Full Pipeline',
            examples: [
              {
                title: 'Complete AI workflow',
                description: 'Fetch, process, embed, and store data',
                _links: {
                  execute: {
                    href: `${baseUrl}/mock/eval`,
                    method: 'POST',
                    body: {
                      code: `const response = await fetch('https://example.com/article.html');
const html = await response.text();
const text = html.replace(/<[^>]*>/g, '').slice(0, 5000);
const embedding = await ai.embedding({ text });
const summary = await ai.textGeneration({ prompt: 'Summarize: ' + text, max_tokens: 200 });
await db.documents.put('article-456', { text, embedding: embedding.data[0], summary: summary.response });
every('1 day', async () => {
  const unsummarized = await db.documents.find({ summarized: false });
  for (const doc of unsummarized) {
    const s = await ai.textGeneration({ prompt: 'Summarize: ' + doc.content });
    await db.documents.put(doc.id, { ...doc, summary: s.response, summarized: true });
  }
});
return 'Pipeline configured and running';`,
                      session: 'pipeline-demo'
                    }
                  }
                }
              }
            ]
          }
        ]
      })
    })

    app.get('/docs/api', (c) => {
      const baseUrl = new URL(c.req.url).origin

      return c.json({
        title: 'API Reference',
        _links: {
          self: { href: `${baseUrl}/docs/api` },
          home: { href: baseUrl },
          quickstart: { href: `${baseUrl}/docs/quickstart` },
          examples: { href: `${baseUrl}/docs/examples` }
        },
        endpoints: {
          'GET /mock/eval': {
            description: 'Execute code via query parameters',
            parameters: {
              code: { type: 'string', required: true, description: 'JavaScript code (URL-encoded)' },
              context: { type: 'string', required: false, description: 'JSON context (URL-encoded)' },
              session: { type: 'string', required: false, description: 'Session ID for context' }
            },
            response: {
              success: 'boolean',
              data: {
                content: [
                  {
                    type: 'text',
                    text: 'JSON string with mock result'
                  }
                ]
              },
              session: 'string'
            },
            example: {
              href: `${baseUrl}/mock/eval?code=${encodeURIComponent('return "Hello"')}`,
              clickable: true
            }
          },
          'POST /mock/eval': {
            description: 'Execute code via JSON body',
            contentType: 'application/json',
            body: {
              code: { type: 'string', required: true },
              context: { type: 'object', required: false },
              session: { type: 'string', required: false }
            },
            response: {
              success: 'boolean',
              data: 'MCP tool response',
              session: 'string'
            }
          },
          'POST /': {
            description: 'MCP JSON-RPC 2.0 endpoint',
            contentType: 'application/json',
            body: {
              jsonrpc: { type: 'string', value: '2.0' },
              method: { type: 'string', enum: ['initialize', 'tools/list', 'tools/call'] },
              params: { type: 'object' },
              id: { type: 'number | string' }
            }
          }
        },
        availableAPIs: API_TYPES
      })
    })

    return app.fetch(request, c.env as Env)
  }

  /**
   * Generate mock response using Cloudflare Workers AI via AI Gateway
   */
  private async generateMockResponse(env: Env, code: string, context: any, sessionId: string): Promise<any> {
    // Get or create session
    let session = sessions.get(sessionId)
    if (!session) {
      session = { messages: [] }
      sessions.set(sessionId, session)
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: \`Execute this code:\n\\\`\\\`\\\`javascript\n\${code}\n\\\`\\\`\\\`\n\nContext: \${JSON.stringify(context || {})}\`,
      timestamp: Date.now()
    })

    // Build conversation context
    const conversationContext = session.messages
      .slice(-10) // Last 10 messages for context
      .map(m => \`\${m.role}: \${m.content}\`)
      .join('\\n\\n')

    // Configure AI provider with AI Gateway
    const baseURL = env.AI_GATEWAY_URL || 'https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/workers-ai'

    const openai = createOpenAI({
      apiKey: env.AI_GATEWAY_TOKEN || 'dummy-key',
      baseURL,
      fetch: (url, init) => {
        // Route through Cloudflare Workers AI
        return fetch(url, {
          ...init,
          headers: {
            ...init?.headers,
            'cf-aig-authorization': \`Bearer \${env.AI_GATEWAY_TOKEN || ''}\`
          }
        })
      }
    })

    try {
      // Generate mock response using AI
      const { object: mockResult } = await generateObject({
        model: openai('gpt-oss-120b'), // Cloudflare's OSS model
        schema: {}, // No schema - use json_object mode
        mode: 'json',
        prompt: \`You are a mock execution environment for a platform API.

The user wants to execute this code:
\\\`\\\`\\\`javascript
\${code}
\\\`\\\`\\\`

Available APIs:
- fetch() - HTTP requests
- ai.* - AI operations (textGeneration, embedding, imageGeneration, etc.)
- api.* - External APIs (github, stripe, slack, etc.)
- db.* - Database (get, find, search, put)
- on(event, callback) - Event listeners
- every(interval, callback) - Scheduled tasks
- send(event, data) - Event emitter

Context: \${JSON.stringify(context || {})}

Previous conversation:
\${conversationContext}

Generate a realistic mock response as if the code actually executed. Return JSON with:
{
  "success": true/false,
  "result": <the return value or result of the execution>,
  "logs": ["log message 1", "log message 2"],
  "sideEffects": [
    { "type": "database", "operation": "put", "collection": "...", "id": "..." },
    { "type": "api", "provider": "...", "action": "..." },
    { "type": "event", "name": "...", "data": {...} }
  ],
  "error": <error message if failed>
}

Be creative and realistic. If the code calls APIs, show what they would return. If it stores data, list the database operations. If it schedules tasks, describe them.\`
      })

      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: JSON.stringify(mockResult),
        timestamp: Date.now()
      })

      // Clean up old sessions (keep last 100)
      if (sessions.size > 100) {
        const firstKey = sessions.keys().next().value
        sessions.delete(firstKey)
      }

      return {
        content: [
          {
            type: 'text',
            text: \`Mock Execution Result:\n\n\${JSON.stringify(mockResult, null, 2)}\`
          }
        ]
      }
    } catch (error) {
      console.error('[Mock MCP] AI generation error:', error)

      // Fallback to simple mock
      return {
        content: [
          {
            type: 'text',
            text: \`Mock Execution Result (Fallback):\n\n\${JSON.stringify({
              success: true,
              result: 'Mock execution completed',
              logs: ['Code received', 'Mock APIs initialized', 'Execution simulated'],
              sideEffects: []
            }, null, 2)}\`
          }
        ]
      }
    }
  }
}

export default MockMCPServer
