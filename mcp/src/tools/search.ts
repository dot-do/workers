import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Search Tools
 * Full-text, vector, and hybrid search
 */

export function getTools(): MCPTool[] {
  return [
    // ChatGPT Deep Research compatible tools
    {
      name: 'search',
      description: 'Search for documents and return top-k results with IDs and metadata. Use this for ChatGPT Deep Research to find relevant content.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 10)',
            default: 10
          },
          namespace: {
            type: 'string',
            description: 'Filter by namespace (e.g., "docs", "memory", "entities")'
          },
          type: {
            type: 'string',
            description: 'Filter by document type (optional)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'fetch',
      description: 'Fetch full document content by IDs. Use this after search to retrieve complete documents with all metadata and content.',
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Document IDs to fetch (from search results)'
          },
          namespace: {
            type: 'string',
            description: 'Namespace where documents are stored'
          }
        },
        required: ['ids']
      }
    },
    // Legacy tools (backwards compatibility)
    {
      name: 'db_search',
      description: 'Full-text and vector search across entities',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          mode: {
            type: 'string',
            enum: ['fulltext', 'vector', 'hybrid'],
            description: 'Search mode (default: hybrid)',
            default: 'hybrid'
          },
          namespace: {
            type: 'string',
            description: 'Filter by namespace (optional)'
          },
          type: {
            type: 'string',
            description: 'Filter by type (optional)'
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default: 10)',
            default: 10
          },
          alpha: {
            type: 'number',
            description: 'Hybrid search weight 0-1 (default: 0.5)',
            default: 0.5
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_docs',
      description: 'Search .do platform documentation',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default: 10)',
            default: 10
          }
        },
        required: ['query']
      }
    }
  ]
}

export async function db_search(
  args: {
    query: string
    mode?: string
    namespace?: string
    type?: string
    limit?: number
    alpha?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.search({
    query: args.query,
    mode: args.mode || 'hybrid',
    namespace: args.namespace,
    type: args.type,
    limit: args.limit || 10,
    alpha: args.alpha || 0.5
  })
}

export async function search_docs(
  args: {
    query: string
    limit?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // Search docs in the 'docs' namespace
  return await db.search({
    query: args.query,
    mode: 'hybrid',
    namespace: 'docs',
    limit: args.limit || 10,
    alpha: 0.5
  })
}

/**
 * ChatGPT Deep Research compatible search tool
 * Returns top-k document IDs with metadata for further fetching
 */
export async function search(
  args: {
    query: string
    limit?: number
    namespace?: string
    type?: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // Perform hybrid search
  const results = await db.search({
    query: args.query,
    mode: 'hybrid',
    namespace: args.namespace,
    type: args.type,
    limit: args.limit || 10,
    alpha: 0.5
  })

  // Transform results to ChatGPT Deep Research format
  // Return IDs with metadata and relevance scores
  if (!results || !results.results) {
    return {
      results: [],
      total: 0,
      query: args.query
    }
  }

  return {
    results: results.results.map((item: any) => ({
      id: item.id,
      namespace: item.ns || args.namespace,
      type: item.type,
      title: item.data?.title || item.data?.name || item.id,
      snippet: item.data?.description || item.data?.content?.substring(0, 200) || '',
      score: item.score || 0,
      metadata: {
        created: item.created_at,
        updated: item.updated_at,
        ...item.metadata
      }
    })),
    total: results.total || results.results.length,
    query: args.query
  }
}

/**
 * ChatGPT Deep Research compatible fetch tool
 * Retrieves full document content by IDs
 */
export async function fetch(
  args: {
    ids: string[]
    namespace?: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // Fetch all documents by ID
  const documents = []
  for (const id of args.ids) {
    try {
      const doc = await db.get({
        ns: args.namespace || 'default',
        id
      })

      if (doc) {
        documents.push({
          id: doc.id,
          namespace: doc.ns,
          type: doc.type,
          content: doc.data,
          metadata: {
            created: doc.created_at,
            updated: doc.updated_at,
            ...doc.metadata
          }
        })
      }
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error)
    }
  }

  return {
    documents,
    total: documents.length,
    requested: args.ids.length
  }
}
