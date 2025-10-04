import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env {
  db: any
  yaml: any
  DEPLOY_SERVICE: any
  DB_SERVICE: any
}

interface MCPServer {
  namespace: string
  name: string
  version: string
  description: string
  author?: {
    name: string
    email?: string
    url?: string
  }
  repository?: {
    type: string
    url: string
  }
  homepage?: string
  license?: string
  capabilities?: {
    tools?: string[]
    resources?: string[]
    prompts?: string[]
  }
  platform?: string[]
  tags?: string[]
}

interface PublicAPIEntry {
  API: string
  Description: string
  Auth: string
  HTTPS: boolean
  Cors: string
  Link: string
  Category: string
}

export default class LoadService extends WorkerEntrypoint<Env> {
  /**
   * Fetch all models from OpenRouter API and store in database
   */
  async models() {
    try {
      const response = await fetch('https://prxy.do/openrouter.ai/api/frontend/models/find')
      const { data } = await response.json() as any

      if (!data || !data.models) {
        throw new Error('Invalid response from OpenRouter API')
      }

      // Upsert each model individually
      const results = []
      for (const modelData of data.models) {
        try {
          const result = await this.env.db.upsert({
            ns: 'models.do',
            id: modelData.slug,
            type: 'Model',
            data: modelData,
            content: `# ${modelData.name}\n\n${modelData.description || ''}`,
          })
          results.push(result)
        } catch (err) {
          console.error(`[Load] Error upserting model ${modelData.slug}:`, err)
        }
      }

      console.log(`[Load] Upserted ${results.length} models`)
      return data.models
    } catch (error) {
      console.error('[Load] Error fetching models:', error)
      throw error
    }
  }

  /**
   * Get list of model slugs/names only
   */
  async modelNames() {
    const models = await this.models()
    return models.map((model: any) => model.slug)
  }

  /**
   * Import MCP servers from registry
   */
  async importMCP() {
    console.log('[Load] Starting MCP import...')

    try {
      // Fetch MCP servers from registry
      const servers = await this.fetchMCPServers()

      // Import servers into database
      const serverResults = []
      for (const server of servers) {
        try {
          const result = await this.env.DB_SERVICE.upsert({
            ns: 'mcp',
            id: `${server.namespace}/${server.name}`,
            type: 'SoftwareApplication',
            content: server.description,
            data: {
              '@type': 'SoftwareApplication',
              namespace: server.namespace,
              name: server.name,
              version: server.version,
              author: server.author,
              repository: server.repository,
              homepage: server.homepage,
              license: server.license,
              capabilities: server.capabilities,
              operatingSystem: server.platform,
              tags: server.tags,
            },
            visibility: 'public',
          })
          serverResults.push(result)
        } catch (err) {
          console.error(`[Load] Error upserting MCP server ${server.namespace}/${server.name}:`, err)
        }
      }

      // Import tools
      const toolResults = []
      for (const server of servers) {
        const tools = server.capabilities?.tools || []
        for (const toolName of tools) {
          try {
            const result = await this.env.DB_SERVICE.upsert({
              ns: 'mcp',
              id: `${server.namespace}/${toolName}`,
              type: 'Action',
              content: `Tool from ${server.name} MCP server`,
              data: {
                '@type': 'Action',
                name: toolName,
                parentServer: `${server.namespace}/${server.name}`,
                namespace: server.namespace,
              },
              visibility: 'public',
            })
            toolResults.push(result)
          } catch (err) {
            console.error(`[Load] Error upserting MCP tool ${server.namespace}/${toolName}:`, err)
          }
        }
      }

      console.log(`[Load] ✅ MCP import complete: ${serverResults.length} servers, ${toolResults.length} tools`)

      return {
        servers: serverResults,
        tools: toolResults,
      }
    } catch (error) {
      console.error('[Load] ❌ MCP import failed:', error)
      throw error
    }
  }

  /**
   * Fetch MCP servers from registry API
   */
  private async fetchMCPServers(): Promise<MCPServer[]> {
    try {
      const response = await fetch('https://registry.modelcontextprotocol.io/api/servers')
      if (!response.ok) {
        throw new Error(`MCP registry returned ${response.status}`)
      }

      const data = await response.json() as any
      return data.servers || []
    } catch (error) {
      console.warn('[Load] MCP registry unavailable, using fallback servers')

      // Fallback to official Anthropic servers
      return [
        {
          namespace: 'com.anthropic',
          name: 'filesystem',
          version: '1.0.0',
          description: 'Secure local file system access and operations',
          author: { name: 'Anthropic', url: 'https://anthropic.com' },
          repository: { type: 'git', url: 'https://github.com/anthropics/mcp-servers' },
          license: 'MIT',
          capabilities: {
            tools: ['read_file', 'write_file', 'list_directory', 'create_directory', 'move_file', 'delete_file'],
          },
          platform: ['macOS', 'Windows', 'Linux'],
          tags: ['filesystem', 'files', 'local'],
        },
        {
          namespace: 'com.anthropic',
          name: 'github',
          version: '1.0.0',
          description: 'GitHub API integration for repository management',
          author: { name: 'Anthropic', url: 'https://anthropic.com' },
          repository: { type: 'git', url: 'https://github.com/anthropics/mcp-servers' },
          license: 'MIT',
          capabilities: {
            tools: ['create_issue', 'list_issues', 'create_pr', 'list_prs', 'search_repos'],
          },
          platform: ['macOS', 'Windows', 'Linux'],
          tags: ['github', 'git', 'version-control'],
        },
        {
          namespace: 'com.anthropic',
          name: 'postgres',
          version: '1.0.0',
          description: 'PostgreSQL database integration',
          author: { name: 'Anthropic', url: 'https://anthropic.com' },
          repository: { type: 'git', url: 'https://github.com/anthropics/mcp-servers' },
          license: 'MIT',
          capabilities: {
            tools: ['query', 'execute', 'list_tables', 'describe_table'],
          },
          platform: ['macOS', 'Windows', 'Linux'],
          tags: ['database', 'postgres', 'sql'],
        },
      ]
    }
  }

  /**
   * Import public APIs from directories
   */
  async importAPIs() {
    console.log('[Load] Starting public APIs import...')

    try {
      // Fetch from Public APIs directory
      const apis = await this.fetchPublicAPIs()

      // Import APIs into database
      const apiResults = []
      for (const api of apis) {
        try {
          const result = await this.env.DB_SERVICE.upsert({
            ns: 'api',
            id: `${this.slugify(api.Category)}/${this.slugify(api.API)}`,
            type: 'WebAPI',
            content: api.Description,
            data: {
              '@type': 'WebAPI',
              name: api.API,
              description: api.Description,
              category: api.Category,
              documentation: api.Link,
              protocol: 'REST',
              format: ['JSON'],
              authentication: {
                type: this.normalizeAuthType(api.Auth),
                required: api.Auth !== '' && api.Auth !== 'No',
              },
              https: api.HTTPS,
              cors: api.Cors,
              tags: [api.Category.toLowerCase()],
              source: 'public-apis',
              status: 'active',
            },
            visibility: 'public',
          })
          apiResults.push(result)
        } catch (err) {
          console.error(`[Load] Error upserting API ${api.API}:`, err)
        }
      }

      // Extract categories
      const categorySet = new Set<string>()
      for (const api of apis) {
        categorySet.add(api.Category)
      }

      // Import categories
      const categoryResults = []
      for (const category of Array.from(categorySet)) {
        try {
          const result = await this.env.DB_SERVICE.upsert({
            ns: 'api',
            id: `category/${this.slugify(category)}`,
            type: 'DefinedTerm',
            content: `Category for ${category} APIs`,
            data: {
              '@type': 'DefinedTerm',
              name: category,
              termCode: this.slugify(category),
            },
            visibility: 'public',
          })
          categoryResults.push(result)
        } catch (err) {
          console.error(`[Load] Error upserting category ${category}:`, err)
        }
      }

      console.log(`[Load] ✅ API import complete: ${apiResults.length} APIs, ${categoryResults.length} categories`)

      return {
        apis: apiResults,
        categories: categoryResults,
      }
    } catch (error) {
      console.error('[Load] ❌ API import failed:', error)
      throw error
    }
  }

  /**
   * Fetch public APIs from directory
   */
  private async fetchPublicAPIs(): Promise<PublicAPIEntry[]> {
    try {
      const response = await fetch('https://api.publicapis.org/entries')
      if (!response.ok) {
        throw new Error(`Public APIs returned ${response.status}`)
      }

      const data = await response.json() as any
      return data.entries || []
    } catch (error) {
      console.error('[Load] Public APIs unavailable:', error)
      return []
    }
  }

  /**
   * Normalize authentication type
   */
  private normalizeAuthType(auth: string): string {
    const authMap: Record<string, string> = {
      '': 'None',
      No: 'None',
      apiKey: 'apiKey',
      OAuth: 'OAuth',
      'X-Mashape-Key': 'X-Mashape-Key',
      'User-Agent': 'User-Agent',
    }
    return authMap[auth] || auth
  }

  /**
   * Generate slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * HTTP endpoint - returns model names as YAML
   */
  async fetch(request: Request) {
    try {
      const models = await this.modelNames()
      const yamlContent = await this.env.yaml.stringify(models)

      return new Response(yamlContent, {
        headers: {
          'Content-Type': 'text/yaml; charset=utf-8',
        },
      })
    } catch (error) {
      console.error('[Load] Fetch error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to load models',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }
}
