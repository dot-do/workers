/**
 * workers.do - The complete platform for building on Cloudflare Workers
 *
 * CLI: npx workers.do deploy
 * SDK: import { DO, deploySnippet } from 'workers.do'
 *
 * Tree-shakable imports:
 * - workers.do/middleware → @dotdo/middleware
 * - workers.do/auth → @dotdo/auth
 * - workers.do/rpc → @dotdo/rpc
 * - workers.do/snippets → Snippet deployment functions
 *
 * @example
 * ```typescript
 * import { DO, deploySnippet } from 'workers.do'
 *
 * // Create a Durable Object
 * class MyDO extends DO {
 *   async fetch(req: Request) {
 *     return new Response('Hello from DO!')
 *   }
 * }
 *
 * // Deploy a snippet
 * await deploySnippet({
 *   zoneId: 'your-zone-id',
 *   name: 'my-snippet',
 *   code: 'export default { fetch: (req) => new Response("Hello") }',
 *   apiToken: process.env.CF_API_TOKEN!,
 *   expression: 'http.host eq "example.com"'
 * })
 * ```
 */

// Snippet deployment functions
export {
  deploySnippet,
  listSnippets,
  getSnippetContent,
  deleteSnippet,
  getSnippetRules,
  type DeploySnippetOptions,
  type SnippetDeploymentResult,
  type SnippetMetadata,
  type SnippetRule,
} from './snippets.js'

// Platform re-exports
export { DO } from 'dotdo'
export type { DOConfig, DOEnv } from 'dotdo'

// Version info
export const version = '0.0.1'
