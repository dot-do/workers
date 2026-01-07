/**
 * @dotdo/composio - AI agent tool integration platform with managed auth
 *
 * Composio on Cloudflare - 150+ tool integrations for AI agents with managed OAuth/API key auth,
 * tool execution sandbox, and first-class MCP support.
 */

export { Composio, type ComposioConfig, type ComposioClient } from './sdk/composio'
export type {
  App,
  Action,
  Connection,
  Entity,
  Trigger,
  ExecutionResult,
  ConnectOptions,
  ExecuteOptions,
  GetToolsOptions,
} from './sdk/types'
