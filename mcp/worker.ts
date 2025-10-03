import { WorkerEntrypoint } from 'cloudflare:workers'
import { experimental_createMCPClient } from 'ai'

// MCP Server Registry
const servers = {
  context7: 'https://context7.liam.sh/sse',
  deepwiki: 'https://mcp.deepwiki.com/sse',
  memory: 'https://mcp.do/memory',
  slack: 'https://mcp.slack.com/sse',
  github: 'internal', // Using internal GitHub implementation
  linear: '',
  stripe: '',
  cloudflare: '',
} as const

type ServerName = keyof typeof servers

// Environment interface
interface Env {
  GITHUB_TOKEN?: string
  KV?: KVNamespace // For memory store persistence
}

// Knowledge Graph Memory Store Types
interface Entity {
  name: string
  entityType: string
  observations: string[]
}

interface Relation {
  from: string
  to: string
  relationType: string
}

interface KnowledgeGraph {
  entities: Entity[]
  relations: Relation[]
}

// In-memory knowledge graph (will be persisted to KV)
class MemoryStore {
  private graph: KnowledgeGraph = { entities: [], relations: [] }
  private kv: KVNamespace | undefined

  constructor(kv?: KVNamespace) {
    this.kv = kv
  }

  async load(): Promise<void> {
    if (this.kv) {
      const stored = await this.kv.get('knowledge-graph', 'json')
      if (stored) {
        this.graph = stored as KnowledgeGraph
      }
    }
  }

  async save(): Promise<void> {
    if (this.kv) {
      await this.kv.put('knowledge-graph', JSON.stringify(this.graph))
    }
  }

  createEntities(entities: Entity[]): Entity[] {
    const created: Entity[] = []
    for (const entity of entities) {
      if (!this.graph.entities.find((e) => e.name === entity.name)) {
        this.graph.entities.push(entity)
        created.push(entity)
      }
    }
    return created
  }

  createRelations(relations: Relation[]): Relation[] {
    const created: Relation[] = []
    for (const relation of relations) {
      const exists = this.graph.relations.find((r) => r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType)
      if (!exists) {
        this.graph.relations.push(relation)
        created.push(relation)
      }
    }
    return created
  }

  addObservations(observations: { entityName: string; contents: string[] }[]): any {
    const results: any = {}
    for (const obs of observations) {
      const entity = this.graph.entities.find((e) => e.name === obs.entityName)
      if (entity) {
        const added = obs.contents.filter((content) => !entity.observations.includes(content))
        entity.observations.push(...added)
        results[obs.entityName] = added
      }
    }
    return results
  }

  deleteEntities(names: string[]): void {
    this.graph.entities = this.graph.entities.filter((e) => !names.includes(e.name))
    this.graph.relations = this.graph.relations.filter((r) => !names.includes(r.from) && !names.includes(r.to))
  }

  deleteObservations(deletions: { entityName: string; observations: string[] }[]): void {
    for (const deletion of deletions) {
      const entity = this.graph.entities.find((e) => e.name === deletion.entityName)
      if (entity) {
        entity.observations = entity.observations.filter((obs) => !deletion.observations.includes(obs))
      }
    }
  }

  deleteRelations(relations: Relation[]): void {
    for (const relation of relations) {
      this.graph.relations = this.graph.relations.filter((r) => !(r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType))
    }
  }

  readGraph(): KnowledgeGraph {
    return this.graph
  }

  searchNodes(query: string): Entity[] {
    const lowerQuery = query.toLowerCase()
    return this.graph.entities.filter(
      (e) => e.name.toLowerCase().includes(lowerQuery) || e.entityType.toLowerCase().includes(lowerQuery) || e.observations.some((obs) => obs.toLowerCase().includes(lowerQuery))
    )
  }
}

export default class MCPProxyWorker extends WorkerEntrypoint<Env> {
  private memoryStore: MemoryStore | null = null

  private async getMemoryStore(): Promise<MemoryStore> {
    if (!this.memoryStore) {
      this.memoryStore = new MemoryStore(this.env.KV)
      await this.memoryStore.load()
    }
    return this.memoryStore
  }

  // RPC: Get tools from a server
  async getTools(server: ServerName = 'deepwiki'): Promise<any> {
    if (server === 'github') {
      return this.getGitHubTools()
    }

    if (server === 'memory') {
      return this.getMemoryTools()
    }

    const serverUrl = servers[server]
    if (!serverUrl || serverUrl === 'internal') {
      throw new Error(`Server ${server} not configured`)
    }

    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: serverUrl,
      },
    })

    return await client.tools()
  }

  // RPC: Call a tool on a server
  async callTool(server: ServerName, toolName: string, args: any): Promise<any> {
    if (server === 'github') {
      return this.callGitHubTool(toolName, args)
    }

    if (server === 'memory') {
      return this.callMemoryTool(toolName, args)
    }

    const serverUrl = servers[server]
    if (!serverUrl || serverUrl === 'internal') {
      throw new Error(`Server ${server} not configured`)
    }

    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: serverUrl,
      },
    })

    return await client.callTool(toolName, args)
  }

  // GitHub MCP Tools
  private getGitHubTools() {
    return {
      tools: [
        {
          name: 'github_search_repositories',
          description: 'Search GitHub repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
        {
          name: 'github_get_file_contents',
          description: 'Get file contents from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string' },
              repo: { type: 'string' },
              path: { type: 'string' },
            },
            required: ['owner', 'repo', 'path'],
          },
        },
        {
          name: 'github_list_issues',
          description: 'List issues in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string' },
              repo: { type: 'string' },
            },
            required: ['owner', 'repo'],
          },
        },
      ],
    }
  }

  private async callGitHubTool(toolName: string, args: any): Promise<any> {
    const token = this.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN not configured')
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Proxy-Worker',
    }

    switch (toolName) {
      case 'github_search_repositories': {
        const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(args.query)}`, { headers })
        return await response.json()
      }

      case 'github_get_file_contents': {
        const response = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`, { headers })
        return await response.json()
      }

      case 'github_list_issues': {
        const response = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/issues`, { headers })
        return await response.json()
      }

      default:
        throw new Error(`Unknown GitHub tool: ${toolName}`)
    }
  }

  // Memory Store MCP Tools (matching Anthropic signature)
  private getMemoryTools() {
    return {
      tools: [
        {
          name: 'create_entities',
          description: 'Create multiple new entities in the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    entityType: { type: 'string' },
                    observations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['name', 'entityType', 'observations'],
                },
              },
            },
            required: ['entities'],
          },
        },
        {
          name: 'create_relations',
          description: 'Create multiple new relations between entities',
          inputSchema: {
            type: 'object',
            properties: {
              relations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    relationType: { type: 'string' },
                  },
                  required: ['from', 'to', 'relationType'],
                },
              },
            },
            required: ['relations'],
          },
        },
        {
          name: 'add_observations',
          description: 'Add new observations to existing entities',
          inputSchema: {
            type: 'object',
            properties: {
              observations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entityName: { type: 'string' },
                    contents: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['entityName', 'contents'],
                },
              },
            },
            required: ['observations'],
          },
        },
        {
          name: 'delete_entities',
          description: 'Remove entities and their relations',
          inputSchema: {
            type: 'object',
            properties: {
              entityNames: { type: 'array', items: { type: 'string' } },
            },
            required: ['entityNames'],
          },
        },
        {
          name: 'delete_observations',
          description: 'Remove specific observations from entities',
          inputSchema: {
            type: 'object',
            properties: {
              deletions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entityName: { type: 'string' },
                    observations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['entityName', 'observations'],
                },
              },
            },
            required: ['deletions'],
          },
        },
        {
          name: 'delete_relations',
          description: 'Remove specific relations from the graph',
          inputSchema: {
            type: 'object',
            properties: {
              relations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    relationType: { type: 'string' },
                  },
                  required: ['from', 'to', 'relationType'],
                },
              },
            },
            required: ['relations'],
          },
        },
        {
          name: 'read_graph',
          description: 'Read the entire knowledge graph',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'search_nodes',
          description: 'Search for nodes based on query',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ],
    }
  }

  private async callMemoryTool(toolName: string, args: any): Promise<any> {
    const store = await this.getMemoryStore()

    let result: any

    switch (toolName) {
      case 'create_entities':
        result = { created: store.createEntities(args.entities) }
        break

      case 'create_relations':
        result = { created: store.createRelations(args.relations) }
        break

      case 'add_observations':
        result = store.addObservations(args.observations)
        break

      case 'delete_entities':
        store.deleteEntities(args.entityNames)
        result = { deleted: args.entityNames }
        break

      case 'delete_observations':
        store.deleteObservations(args.deletions)
        result = { success: true }
        break

      case 'delete_relations':
        store.deleteRelations(args.relations)
        result = { success: true }
        break

      case 'read_graph':
        result = store.readGraph()
        break

      case 'search_nodes':
        result = { entities: store.searchNodes(args.query) }
        break

      default:
        throw new Error(`Unknown memory tool: ${toolName}`)
    }

    await store.save()
    return result
  }

  // HTTP API
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // GET /servers - List available servers
      if (path === '/servers' || path === '/') {
        return Response.json({ servers: Object.keys(servers) })
      }

      // GET /{server}/tools - Get tools for a server
      const toolsMatch = path.match(/^\/([^/]+)\/tools$/)
      if (toolsMatch && request.method === 'GET') {
        const server = toolsMatch[1] as ServerName
        const tools = await this.getTools(server)
        return Response.json(tools)
      }

      // POST /{server}/call - Call a tool
      const callMatch = path.match(/^\/([^/]+)\/call$/)
      if (callMatch && request.method === 'POST') {
        const server = callMatch[1] as ServerName
        const body = await request.json<{ tool: string; args: any }>()
        const result = await this.callTool(server, body.tool, body.args)
        return Response.json({ result })
      }

      // Legacy: GET /{server} - Get tools (backward compat)
      const serverName = path.slice(1) as ServerName
      if (serverName && servers[serverName]) {
        const tools = await this.getTools(serverName)
        return Response.json(tools)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
  }
}