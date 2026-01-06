/**
 * @dotdo/db - Core Database Package
 *
 * Base DB class for Cloudflare Workers with:
 * - Multi-transport RPC (Workers RPC, HTTP, WebSocket, MCP)
 * - Simple CRUD operations (ai-database compatible)
 * - MCP tools (search, fetch, do)
 * - WebSocket hibernation support
 * - HATEOAS REST API
 * - Monaco Editor UI
 */

export { DB } from './db'
export * from './types'
export * from './rpc'
export * from './mcp'
