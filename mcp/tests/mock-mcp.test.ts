/**
 * Mock MCP Server Tests using AI SDK MCP Client
 *
 * Tests the AI-powered Mock MCP Server using Vercel AI SDK's experimental_createMCPClient
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { experimental_createMCPClient } from 'ai'
import type { UnstableDevWorker } from 'wrangler'

// Mock server will be started via wrangler dev
let worker: UnstableDevWorker
let serverUrl: string

describe('Mock MCP Server - AI SDK Client Integration', () => {
  beforeAll(async () => {
    // Server is started by vitest pool workers using wrangler.mock.jsonc
    // Default local URL
    serverUrl = 'http://localhost:8787'

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  describe('MCP Protocol Compliance', () => {
    it('should create MCP client with SSE transport', async () => {
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: serverUrl,
        },
      })

      expect(client).toBeDefined()
      expect(client.tools).toBeDefined()
    })

    it('should list available tools', async () => {
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: serverUrl,
        },
      })

      const tools = await client.tools()

      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)

      // Should have the eval tool
      const evalTool = tools.find((t) => t.name === 'eval')
      expect(evalTool).toBeDefined()
      expect(evalTool?.description).toContain('Execute code')
    })

    it('should retrieve eval tool with complete API documentation', async () => {
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: serverUrl,
        },
      })

      const tools = await client.tools()
      const evalTool = tools.find((t) => t.name === 'eval')

      expect(evalTool).toBeDefined()
      expect(evalTool?.description).toContain('fetch()')
      expect(evalTool?.description).toContain('ai.')
      expect(evalTool?.description).toContain('api.')
      expect(evalTool?.description).toContain('db.')
      expect(evalTool?.description).toContain('on(')
      expect(evalTool?.description).toContain('every(')
      expect(evalTool?.description).toContain('send(')

      // Should have proper input schema
      expect(evalTool?.parameters).toBeDefined()
      expect(evalTool?.parameters.type).toBe('object')
      expect(evalTool?.parameters.properties?.code).toBeDefined()
    })
  })

  describe('Tool Execution - Simple Cases', () => {
    it('should execute simple return statement', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'return "Hello from Mock MCP!";',
        }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.content).toBeDefined()
      expect(result.data.content[0].type).toBe('text')

      // Parse the mock result
      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.success).toBe(true)
      expect(mockResult.result).toBeDefined()
    })

    it('should execute arithmetic operations', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'return 2 + 2;',
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.success).toBe(true)
      expect(mockResult.logs).toBeDefined()
      expect(Array.isArray(mockResult.logs)).toBe(true)
    })

    it('should handle string concatenation', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'const greeting = "Hello"; const name = "World"; return greeting + " " + name;',
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Tool Execution - Database Operations', () => {
    it('should mock database search', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const docs = await db.documents.search("machine learning", { limit: 5 }); return { found: docs.length };`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.success).toBe(true)
      expect(mockResult.result).toBeDefined()
      expect(mockResult.sideEffects).toBeDefined()

      // Should track database operation
      const dbOperation = mockResult.sideEffects.find((e: any) => e.type === 'database')
      expect(dbOperation).toBeDefined()
    })

    it('should mock database put operation', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `await db.documents.put('doc-123', { title: 'Test', content: 'Hello World' }); return 'Created';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.sideEffects).toBeDefined()

      const putOperation = mockResult.sideEffects.find((e: any) => e.type === 'database' && e.operation === 'put')
      expect(putOperation).toBeDefined()
    })

    it('should mock database get and find operations', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const doc = await db.documents.get('doc-123'); const all = await db.documents.find({ published: true }); return { doc, count: all.length };`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Tool Execution - AI Operations', () => {
    it('should mock AI text generation', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const result = await ai.textGeneration({ prompt: 'Write a haiku', max_tokens: 100 }); return result.response;`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.sideEffects).toBeDefined()

      const aiOperation = mockResult.sideEffects.find((e: any) => e.type === 'ai')
      expect(aiOperation).toBeDefined()
    })

    it('should mock AI embedding generation', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const embedding = await ai.embedding({ text: 'Hello world' }); return { dimensions: embedding.data[0].length };`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should mock multi-step AI pipeline', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const text = "Sample text"; const embedding = await ai.embedding({ text }); const summary = await ai.textGeneration({ prompt: 'Summarize: ' + text }); await db.documents.put('doc-456', { text, embedding: embedding.data[0], summary: summary.response }); return 'Processed';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.sideEffects.length).toBeGreaterThan(2) // Should have AI + DB operations
    })
  })

  describe('Tool Execution - External API Integration', () => {
    it('should mock GitHub API repository search', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const repos = await api.github.searchRepositories({ query: 'cloudflare workers' }); return { found: repos.length, top: repos[0].name };`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      expect(mockResult.sideEffects).toBeDefined()

      const apiOperation = mockResult.sideEffects.find((e: any) => e.type === 'api' && e.provider === 'github')
      expect(apiOperation).toBeDefined()
    })

    it('should mock multi-API workflow', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const repos = await api.github.searchRepositories({ query: 'mcp' }); const issues = await api.github.listIssues({ owner: repos[0].owner, repo: repos[0].name }); await send('github.analyzed', { repo: repos[0].name, issues: issues.length }); return { analyzed: repos[0].name };`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)

      // Should have multiple side effects
      const apiCalls = mockResult.sideEffects.filter((e: any) => e.type === 'api')
      const events = mockResult.sideEffects.filter((e: any) => e.type === 'event')

      expect(apiCalls.length).toBeGreaterThan(0)
      expect(events.length).toBeGreaterThan(0)
    })

    it('should mock fetch API', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const response = await fetch('https://api.example.com/data'); const data = await response.json(); return data;`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      const httpOperation = mockResult.sideEffects.find((e: any) => e.type === 'http')
      expect(httpOperation).toBeDefined()
    })
  })

  describe('Tool Execution - Event-Driven Patterns', () => {
    it('should mock event listeners', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `on('webhook.received', async (event) => { await db.events.put(event.id, event); }); return 'Listener registered';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should mock scheduled tasks', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `every('1 hour', async () => { const pending = await db.documents.find({ processed: false }); }); return 'Task scheduled';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)

      const mockResult = JSON.parse(result.data.content[0].text)
      const scheduleOperation = mockResult.sideEffects.find((e: any) => e.type === 'schedule')
      expect(scheduleOperation).toBeDefined()
    })

    it('should mock event emission', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `await send('data.processed', { count: 42, status: 'complete' }); return 'Event sent';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Session Management', () => {
    it('should maintain session context across requests', async () => {
      const sessionId = 'test-session-' + Date.now()

      // First request: Create user
      const response1 = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `await db.users.put('alice', { name: 'Alice', role: 'engineer' }); return 'User created';`,
          session: sessionId,
        }),
      })

      const result1 = await response1.json()
      expect(result1.success).toBe(true)
      expect(result1.session).toBe(sessionId)

      // Second request: Query user (AI should remember context)
      const response2 = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `const alice = await db.users.get('alice'); return alice.role;`,
          session: sessionId,
        }),
      })

      const result2 = await response2.json()
      expect(result2.success).toBe(true)
      expect(result2.session).toBe(sessionId)

      // AI should generate consistent mock responses based on context
      const mockResult = JSON.parse(result2.data.content[0].text)
      expect(mockResult.success).toBe(true)
    })

    it('should support session via header', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'header-session-123',
        },
        body: JSON.stringify({
          code: `return 'Session via header';`,
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.session).toBe('header-session-123')
    })

    it('should use different sessions for different IDs', async () => {
      const session1 = 'session-1-' + Date.now()
      const session2 = 'session-2-' + Date.now()

      const response1 = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `return 'Session 1';`,
          session: session1,
        }),
      })

      const response2 = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `return 'Session 2';`,
          session: session2,
        }),
      })

      const result1 = await response1.json()
      const result2 = await response2.json()

      expect(result1.session).toBe(session1)
      expect(result2.session).toBe(session2)
      expect(result1.session).not.toBe(result2.session)
    })
  })

  describe('Context Parameter', () => {
    it('should pass context to execution environment', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `return 'User ' + context.userId + ' is ' + context.role;`,
          context: { userId: 'user-123', role: 'admin' },
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should handle complex context objects', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `return context.user.permissions.includes('write');`,
          context: {
            user: {
              id: 'user-123',
              name: 'Alice',
              permissions: ['read', 'write', 'admin'],
            },
          },
        }),
      })

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing code parameter', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle empty code', async () => {
      const response = await fetch(`${serverUrl}/mock/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '' }),
      })

      const result = await response.json()
      expect(result.success).toBe(false)
    })
  })

  describe('REST API - GET Endpoint', () => {
    it('should execute code via GET request', async () => {
      const code = encodeURIComponent('return "Hello from GET";')
      const response = await fetch(`${serverUrl}/mock/eval?code=${code}`)

      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should support session in GET request', async () => {
      const code = encodeURIComponent('return "Session test";')
      const response = await fetch(`${serverUrl}/mock/eval?code=${code}&session=get-session`)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.session).toBe('get-session')
    })

    it('should handle complex code in GET request', async () => {
      const code = encodeURIComponent('const repos = await api.github.searchRepositories({ query: "workers" }); return repos.length;')
      const response = await fetch(`${serverUrl}/mock/eval?code=${code}`)

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('HATEOAS - API Discovery', () => {
    it('should provide HATEOAS root with links', async () => {
      const response = await fetch(`${serverUrl}/`)
      const result = await response.json()

      expect(result._links).toBeDefined()
      expect(result._links.rest).toBeDefined()
      expect(result._links.documentation).toBeDefined()
      expect(result.capabilities).toBeDefined()
    })

    it('should provide quickstart guide with clickable examples', async () => {
      const response = await fetch(`${serverUrl}/docs/quickstart`)
      const result = await response.json()

      expect(result.steps).toBeDefined()
      expect(Array.isArray(result.steps)).toBe(true)
      expect(result.steps[0].action.href).toBeDefined()
      expect(result.steps[0].action.clickable).toBe(true)
    })

    it('should provide examples catalog', async () => {
      const response = await fetch(`${serverUrl}/docs/examples`)
      const result = await response.json()

      expect(result.examples).toBeDefined()
      expect(Array.isArray(result.examples)).toBe(true)
      expect(result.examples.length).toBeGreaterThan(0)
    })

    it('should provide API reference', async () => {
      const response = await fetch(`${serverUrl}/docs/api`)
      const result = await response.json()

      expect(result.endpoints).toBeDefined()
      expect(result.endpoints['GET /mock/eval']).toBeDefined()
      expect(result.endpoints['POST /mock/eval']).toBeDefined()
    })
  })
})
