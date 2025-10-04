import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'
import * as database from './database'
import * as ai from './ai'
import * as auth from './auth'
import * as search from './search'
import * as queue from './queue'
import * as workflows from './workflows'
import * as cli from './cli'
import * as code from './code'

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
  cli,
  code
}

/**
 * List all available tools (filtered by authentication)
 */
export function listTools(authenticated: boolean): MCPTool[] {
  const allTools: MCPTool[] = []

  for (const [category, tools] of Object.entries(toolCategories)) {
    const categoryTools = tools.getTools()
    allTools.push(...categoryTools)
  }

  // Filter tools based on authentication
  if (!authenticated) {
    const publicTools = [
      'db_search',
      'cli_status',
      'cli_login_url'
    ]
    return allTools.filter(tool => publicTools.includes(tool.name))
  }

  return allTools
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
