import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'
import * as database from './database'
import * as ai from './ai'
import * as auth from './auth'
import * as search from './search'
import * as queue from './queue'
import * as workflows from './workflows'
import * as sandbox from './sandbox'
import * as code from './code'
import * as runtime from './runtime'
import * as memory from './memory'

/**
 * Tool Registry
 * All tools organized by category
 */
const toolCategories = {
  database,
  ai,
  auth,
  search,
  queue,
  workflows,
  sandbox,
  code,
  runtime,
  memory
}

/**
 * List all available tools (filtered by authentication)
 *
 * TEMPORARILY DISABLED: All tools are public since there's no data in the DB yet
 *
 * TODO: Re-enable authentication filtering once OAuth is fully implemented:
 * - Free tools: db_search, memory_*, search_docs, ai_models
 * - Authenticated tools: ai_generate, ai_stream, ai_embed, ai_analyze, code_*, runtime_*, sandbox_*, workflow_*, queue_*
 * - Admin-only tools: auth_*, db_upsert, db_delete
 */
export function listTools(authenticated: boolean): MCPTool[] {
  const allTools: MCPTool[] = []

  for (const [category, tools] of Object.entries(toolCategories)) {
    const categoryTools = tools.getTools()
    allTools.push(...categoryTools)
  }

  // TEMPORARILY: Return all tools regardless of authentication
  return allTools

  // ORIGINAL CODE (to be restored):
  // if (!authenticated) {
  //   const publicTools = [
  //     'db_search',
  //     'memory_create_entities', 'memory_create_relations', 'memory_add_observations',
  //     'memory_delete_entities', 'memory_delete_observations', 'memory_delete_relations',
  //     'memory_read_graph', 'memory_search_nodes',
  //     'search_docs',
  //     'ai_models'
  //   ]
  //   return allTools.filter(tool => publicTools.includes(tool.name))
  // }
  // return allTools
}

/**
 * Execute a tool by name
 */
export async function callTool(
  name: string,
  args: any,
  c: Context<{ Bindings: Env }>,
  user: User | null,
  authenticated: boolean
): Promise<any> {
  // Find tool handler
  for (const [category, tools] of Object.entries(toolCategories)) {
    const handler = (tools as any)[name]
    if (handler && typeof handler === 'function') {
      return await handler(args, c, user)
    }
  }

  throw new Error(`Unknown tool: ${name}`)
}
