import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { DoMCPAgent } from './mcp-agent'
import { OAuthHandler } from './oauth-handler'

/**
 * MCP Server with OAuth 2.1 Authentication
 *
 * Architecture:
 * - OAuth endpoints: oauth.do/authorize, oauth.do/token, oauth.do/callback, oauth.do/register
 * - MCP SSE endpoint: mcp.do/sse (requires authentication)
 * - Each authenticated user gets a Durable Object instance (DoMCPAgent)
 * - Tools are filtered by user permissions via WorkOS AuthKit
 *
 * Setup:
 * 1. Create WorkOS account at https://dashboard.workos.com
 * 2. Add redirect URI: https://oauth.do/callback (already configured)
 * 3. Set environment variables:
 *    - WORKOS_CLIENT_ID
 *    - WORKOS_CLIENT_SECRET
 *
 * Usage with ChatGPT:
 * 1. Add connector: https://mcp.do/sse
 * 2. ChatGPT redirects to oauth.do for authentication
 * 3. After auth, ChatGPT can call tools via MCP protocol
 */

// Export Durable Object classes
export { Sandbox } from '@cloudflare/sandbox'
export { DoMCPAgent }

// Export default OAuth provider
export default new OAuthProvider({
  apiRoute: '/sse',
  apiHandler: DoMCPAgent.mount('/sse') as any,
  defaultHandler: OAuthHandler as any,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
