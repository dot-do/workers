/**
 * @dotdo/airbyte
 *
 * Airbyte on Cloudflare - ELT data integration with 300+ connectors
 *
 * @example
 * ```typescript
 * import { Airbyte } from '@dotdo/airbyte'
 *
 * const airbyte = new Airbyte({ workspace: 'my-workspace' })
 *
 * // Create source
 * const github = await airbyte.sources.create({
 *   name: 'github-source',
 *   type: 'github',
 *   config: { repositories: ['myorg/myrepo'] }
 * })
 *
 * // Create destination
 * const snowflake = await airbyte.destinations.create({
 *   name: 'snowflake-dest',
 *   type: 'snowflake',
 *   config: { database: 'analytics' }
 * })
 *
 * // Create connection and sync
 * const connection = await airbyte.connections.create({
 *   source: github.id,
 *   destination: snowflake.id,
 *   streams: [{ name: 'commits', syncMode: 'incremental' }]
 * })
 *
 * await airbyte.connections.sync(connection.id)
 * ```
 */

export { Airbyte, type AirbyteOptions } from './sdk/airbyte'
export type {
  Source,
  SourceConfig,
  Destination,
  DestinationConfig,
  Connection,
  ConnectionConfig,
  Stream,
  StreamConfig,
  SyncMode,
  DestinationSyncMode,
  SyncJob,
  SyncStatus,
  SchemaDiscoveryResult,
  ConnectorSpec,
  CheckResult
} from './sdk/types'
