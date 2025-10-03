import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Search Tools
 * Full-text, vector, and hybrid search
 */

export function getTools(): MCPTool[] {
  return [
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
