/**
 * Example MCP Client for Mock Server
 *
 * Demonstrates how to interact with the AI-powered mock MCP server
 */

interface MCPRequest {
  jsonrpc: '2.0'
  method: string
  params?: any
  id: number
}

interface MCPResponse {
  jsonrpc: '2.0'
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id: number
}

class MockMCPClient {
  private url: string
  private requestId = 0

  constructor(url: string = 'http://localhost:8787') {
    this.url = url
  }

  private async request(method: string, params?: any): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    const data: MCPResponse = await response.json()

    if (data.error) {
      throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`)
    }

    return data.result
  }

  async initialize() {
    return await this.request('initialize')
  }

  async listTools() {
    return await this.request('tools/list')
  }

  async eval(code: string, context?: any) {
    return await this.request('tools/call', {
      name: 'eval',
      arguments: { code, context }
    })
  }
}

// Example usage
async function main() {
  const client = new MockMCPClient()

  console.log('1. Initializing MCP connection...')
  const init = await client.initialize()
  console.log('Server info:', init.serverInfo)
  console.log()

  console.log('2. Listing available tools...')
  const tools = await client.listTools()
  console.log('Available tools:', tools.tools.map((t: any) => t.name))
  console.log()

  console.log('3. Example: Database search and AI summarization')
  const result1 = await client.eval(`
    const docs = await db.documents.search('machine learning papers', {
      limit: 5,
      vector: true
    })

    const summary = await ai.textGeneration({
      prompt: \`Summarize these documents: \${docs.map(d => d.title).join(', ')}\`,
      max_tokens: 200
    })

    return {
      found: docs.length,
      summary: summary.response
    }
  `)
  console.log('Result:', JSON.stringify(result1, null, 2))
  console.log()

  console.log('4. Example: GitHub API integration')
  const result2 = await client.eval(`
    const repos = await api.github.searchRepositories({
      query: 'cloudflare workers mcp',
      sort: 'stars',
      limit: 3
    })

    const topRepo = repos[0]
    const issues = await api.github.listIssues({
      owner: topRepo.owner,
      repo: topRepo.name,
      state: 'open'
    })

    return {
      repository: topRepo.name,
      stars: topRepo.stars,
      openIssues: issues.length,
      url: topRepo.url
    }
  `)
  console.log('Result:', JSON.stringify(result2, null, 2))
  console.log()

  console.log('5. Example: Multi-step AI pipeline')
  const result3 = await client.eval(`
    // Fetch external data
    const response = await fetch('https://example.com/article.html')
    const html = await response.text()

    // Extract text (simulated)
    const text = html.replace(/<[^>]*>/g, '').slice(0, 5000)

    // Generate embedding
    const embedding = await ai.embedding({ text })

    // Store with metadata
    await db.documents.put('article-456', {
      id: 'article-456',
      url: 'https://example.com/article.html',
      content: text,
      embedding: embedding.data[0],
      createdAt: Date.now()
    })

    // Schedule daily summarization
    every('1 day', async () => {
      const unsummarized = await db.documents.find({ summarized: false })
      for (const doc of unsummarized) {
        const summary = await ai.textGeneration({
          prompt: \`Summarize: \${doc.content}\`
        })
        await db.documents.put(doc.id, {
          ...doc,
          summary: summary.response,
          summarized: true
        })
      }
    })

    return {
      status: 'Article processed and stored',
      embeddingDimensions: embedding.data[0].length,
      scheduledTask: 'Daily summarization'
    }
  `)
  console.log('Result:', JSON.stringify(result3, null, 2))
  console.log()

  console.log('6. Example: Event-driven workflow')
  const result4 = await client.eval(`
    // Listen for webhook events
    on('webhook.github.push', async (event) => {
      const { repository, commits } = event.data

      // Analyze commits with AI
      const analysis = await ai.textGeneration({
        prompt: \`Analyze these git commits: \${commits.map(c => c.message).join(', ')}\`,
        max_tokens: 300
      })

      // Store analysis
      await db.events.put(\`analysis-\${event.id}\`, {
        id: \`analysis-\${event.id}\`,
        repository,
        commitCount: commits.length,
        analysis: analysis.response,
        timestamp: Date.now()
      })

      // Send notification
      await send('analysis.complete', {
        repository,
        commits: commits.length,
        analysis: analysis.response
      })
    })

    return {
      status: 'Event listener registered',
      event: 'webhook.github.push',
      actions: ['AI analysis', 'Store in DB', 'Send notification']
    }
  `)
  console.log('Result:', JSON.stringify(result4, null, 2))
  console.log()

  console.log('Done! All examples completed.')
}

// Run examples
main().catch(console.error)
