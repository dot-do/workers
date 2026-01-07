/**
 * workers.do - CLI and SDK for Cloudflare Workers deployment
 *
 * Provides programmatic access to:
 * - Snippet deployment (wrangler doesn't support snippets)
 * - Worker deployment
 * - .do service management
 *
 * @example
 * ```typescript
 * import { deploySnippet, listSnippets } from 'workers.do'
 *
 * await deploySnippet({
 *   zoneId: 'your-zone-id',
 *   name: 'my-snippet',
 *   code: 'export default { fetch: (req) => new Response("Hello") }',
 *   apiToken: process.env.CF_API_TOKEN!,
 *   expression: 'http.host eq "example.com"'
 * })
 * ```
 */

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
