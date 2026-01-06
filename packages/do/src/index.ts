/**
 * @dotdo/do - Core DO Package
 *
 * An agentic database that can DO anything.
 *
 * Base DO class for Cloudflare Workers with:
 * - Multi-transport RPC (Workers RPC, HTTP, WebSocket, MCP)
 * - Simple CRUD operations (ai-database compatible)
 * - MCP tools (search, fetch, do)
 * - WebSocket hibernation support
 * - HATEOAS REST API
 * - Monaco Editor UI
 */

export { DO } from './do'
export * from './types'
export * from './rpc'
export * from './mcp'
