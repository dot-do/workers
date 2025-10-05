/**
 * MCP (Model Context Protocol) Tools for Database Service
 * Exposes database operations as tools for AI agents
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  handler: (input: any, env: Env) => Promise<any>
}

/**
 * db_query - Execute SQL query
 */
export const dbQuery: McpTool = {
  name: 'db_query',
  description: 'Execute a SQL query on the database (PostgreSQL or ClickHouse)',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL query to execute',
      },
      database: {
        type: 'string',
        enum: ['postgres', 'clickhouse'],
        description: 'Which database to query (default: postgres)',
      },
      params: {
        type: 'object',
        description: 'Query parameters for parameterized queries',
      },
    },
    required: ['query'],
  },
  handler: async (input, env) => {
    const { query, database = 'postgres', params } = input

    if (database === 'clickhouse') {
      const clickhouse = env.DB.clickhouse()
      const result = await clickhouse.query({ query, format: 'JSON', query_params: params })
      return result.json()
    } else {
      return env.DB.query(query, params)
    }
  },
}

/**
 * db_get - Get entity by namespace and ID
 */
export const dbGet: McpTool = {
  name: 'db_get',
  description: 'Get a single entity by namespace and ID',
  inputSchema: {
    type: 'object',
    properties: {
      ns: {
        type: 'string',
        description: 'Namespace (e.g., onet, naics, schema)',
      },
      id: {
        type: 'string',
        description: 'Entity ID',
      },
      includeRelationships: {
        type: 'boolean',
        description: 'Include relationships in response',
      },
    },
    required: ['ns', 'id'],
  },
  handler: async (input, env) => {
    const { ns, id, includeRelationships } = input

    const thing = await env.DB.get(ns, id)
    if (!thing) {
      throw new Error(`Entity not found: ${ns}:${id}`)
    }

    if (includeRelationships) {
      const rels = await env.DB.getRelationships(ns, id)
      return { ...thing, relationships: rels }
    }

    return thing
  },
}

/**
 * db_search - Search entities
 */
export const dbSearch: McpTool = {
  name: 'db_search',
  description: 'Search entities using full-text, vector, or hybrid search',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query text',
      },
      embedding: {
        type: 'array',
        items: { type: 'number' },
        description: 'Vector embedding for semantic search',
      },
      ns: {
        type: 'string',
        description: 'Filter by namespace',
      },
      type: {
        type: 'string',
        description: 'Filter by entity type',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default: 20)',
      },
      searchMode: {
        type: 'string',
        enum: ['text', 'vector', 'hybrid'],
        description: 'Search mode (default: hybrid if embedding provided, else text)',
      },
    },
    required: ['query'],
  },
  handler: async (input, env) => {
    const { query, embedding, ns, type, limit, searchMode } = input

    const options = { ns, type, limit }

    if (searchMode === 'vector' && embedding) {
      return env.DB.vectorSearch(embedding, options)
    } else if (searchMode === 'text' || !embedding) {
      return env.DB.search(query, undefined, options)
    } else {
      // Hybrid search
      return env.DB.search(query, embedding, options)
    }
  },
}

/**
 * db_list - List entities by namespace
 */
export const dbList: McpTool = {
  name: 'db_list',
  description: 'List entities in a namespace with pagination and filters',
  inputSchema: {
    type: 'object',
    properties: {
      ns: {
        type: 'string',
        description: 'Namespace to list',
      },
      type: {
        type: 'string',
        description: 'Filter by entity type',
      },
      visibility: {
        type: 'string',
        enum: ['public', 'private', 'unlisted'],
        description: 'Filter by visibility',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default: 100, max: 1000)',
      },
      offset: {
        type: 'number',
        description: 'Pagination offset (default: 0)',
      },
    },
    required: ['ns'],
  },
  handler: async (input, env) => {
    return env.DB.list(input.ns, input)
  },
}

/**
 * db_stats - Get database statistics
 */
export const dbStats: McpTool = {
  name: 'db_stats',
  description: 'Get database statistics (counts, types, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      includeClickHouse: {
        type: 'boolean',
        description: 'Include ClickHouse analytics (default: true)',
      },
    },
  },
  handler: async (input, env) => {
    const stats = await env.DB.stats()
    if (input.includeClickHouse !== false) {
      const clickhouseStats = await env.DB.clickhouseStats()
      return { ...stats, clickhouse: clickhouseStats }
    }
    return stats
  },
}

/**
 * All MCP tools exported as array
 */
export const mcpTools: McpTool[] = [dbQuery, dbGet, dbSearch, dbList, dbStats]
