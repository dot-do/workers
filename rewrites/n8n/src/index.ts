/**
 * @dotdo/n8n - n8n on Cloudflare
 *
 * Fair-code workflow automation with code flexibility running on Durable Objects.
 */

export { N8n } from './sdk/n8n'
export type { N8nConfig, Workflow, WorkflowConfig, Trigger, Node, NodeResult } from './sdk/types'

// Re-export DO classes for wrangler.toml
export { WorkflowDO } from './durable-object/WorkflowDO'
export { ExecutionDO } from './durable-object/ExecutionDO'
export { CredentialDO } from './durable-object/CredentialDO'
