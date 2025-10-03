import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Database Tools
 * Interact with database via DB service
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'db_query',
      description: 'Execute a SQL query against the database',
      inputSchema: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'SQL query to execute'
          },
          params: {
            type: 'array',
            description: 'Query parameters for prepared statements',
            items: { type: 'string' }
          }
        },
        required: ['sql']
      }
    },
    {
      name: 'db_get',
      description: 'Get an entity by namespace and ID',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Entity namespace (e.g., onet, naics, schema)'
          },
          id: {
            type: 'string',
            description: 'Entity ID'
          }
        },
        required: ['namespace', 'id']
      }
    },
    {
      name: 'db_list',
      description: 'List entities with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Filter by namespace'
          },
          type: {
            type: 'string',
            description: 'Filter by type'
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default: 50)',
            default: 50
          },
          offset: {
            type: 'number',
            description: 'Pagination offset (default: 0)',
            default: 0
          }
        }
      }
    },
    {
      name: 'db_upsert',
      description: 'Create or update an entity',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Entity namespace'
          },
          id: {
            type: 'string',
            description: 'Entity ID'
          },
          type: {
            type: 'string',
            description: 'Entity type (Schema.org type)'
          },
          data: {
            type: 'object',
            description: 'Entity data (JSON object)'
          },
          content: {
            type: 'string',
            description: 'Optional markdown content'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'private', 'unlisted'],
            description: 'Visibility level (default: public)',
            default: 'public'
          }
        },
        required: ['namespace', 'id', 'type', 'data']
      }
    },
    {
      name: 'db_delete',
      description: 'Delete an entity',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Entity namespace'
          },
          id: {
            type: 'string',
            description: 'Entity ID'
          },
          hard: {
            type: 'boolean',
            description: 'True for hard delete, false for soft delete (default: false)',
            default: false
          }
        },
        required: ['namespace', 'id']
      }
    }
  ]
}

export async function db_query(
  args: { sql: string; params?: string[] },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.query(args.sql, args.params)
}

export async function db_get(
  args: { namespace: string; id: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.get(args.namespace, args.id)
}

export async function db_list(
  args: { namespace?: string; type?: string; limit?: number; offset?: number },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.list({
    namespace: args.namespace,
    type: args.type,
    limit: args.limit || 50,
    offset: args.offset || 0
  })
}

export async function db_upsert(
  args: {
    namespace: string
    id: string
    type: string
    data: any
    content?: string
    visibility?: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.upsert({
    namespace: args.namespace,
    id: args.id,
    type: args.type,
    data: args.data,
    content: args.content,
    visibility: args.visibility || 'public'
  })
}

export async function db_delete(
  args: { namespace: string; id: string; hard?: boolean },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  return await db.delete(args.namespace, args.id, args.hard || false)
}
