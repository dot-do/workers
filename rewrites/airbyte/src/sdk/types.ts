/**
 * Airbyte SDK Types
 */

// Sync modes
export type SyncMode = 'full_refresh' | 'incremental'
export type DestinationSyncMode = 'overwrite' | 'append' | 'append_dedup'

// Source types
export interface Source {
  id: string
  name: string
  type: string
  config: SourceConfig
  createdAt: string
  updatedAt: string
}

export interface SourceConfig {
  [key: string]: unknown
}

export interface CreateSourceInput {
  name: string
  type: string
  config: SourceConfig
}

// Destination types
export interface Destination {
  id: string
  name: string
  type: string
  config: DestinationConfig
  createdAt: string
  updatedAt: string
}

export interface DestinationConfig {
  [key: string]: unknown
}

export interface CreateDestinationInput {
  name: string
  type: string
  config: DestinationConfig
}

// Stream types
export interface Stream {
  name: string
  jsonSchema?: Record<string, unknown>
  supportedSyncModes?: SyncMode[]
  sourceDefinedCursor?: boolean
  defaultCursorField?: string[]
  sourceDefinedPrimaryKey?: string[][]
}

export interface StreamConfig {
  name: string
  syncMode: SyncMode
  destinationSyncMode?: DestinationSyncMode
  cursorField?: string
  primaryKey?: string[][]
}

// Connection types
export interface Connection {
  id: string
  name: string
  sourceId: string
  destinationId: string
  streams: StreamConfig[]
  schedule?: ConnectionSchedule
  normalization?: NormalizationType
  status: ConnectionStatus
  createdAt: string
  updatedAt: string
}

export interface ConnectionConfig {
  name: string
  source: string
  destination: string
  streams: StreamConfig[]
  schedule?: ConnectionSchedule
  normalization?: NormalizationType
}

export interface ConnectionSchedule {
  cron?: string
  interval?: string
}

export type ConnectionStatus = 'active' | 'inactive' | 'deprecated'
export type NormalizationType = 'basic' | 'raw' | 'none'

// Sync job types
export interface SyncJob {
  id: string
  connectionId: string
  status: SyncStatus
  progress: SyncProgress
  startedAt: string
  completedAt?: string
  error?: string
}

export type SyncStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface SyncProgress {
  [streamName: string]: number
}

// Schema discovery
export interface SchemaDiscoveryResult {
  streams: Stream[]
}

// Connector spec
export interface ConnectorSpec {
  documentationUrl?: string
  connectionSpecification: Record<string, unknown>
  supportsIncremental: boolean
  supportedDestinationSyncModes?: DestinationSyncMode[]
}

// Check result
export interface CheckResult {
  status: 'succeeded' | 'failed'
  message: string
}

// Catalog types
export interface SourceDefinition {
  id: string
  name: string
  dockerRepository?: string
  documentationUrl?: string
  icon?: string
}

export interface DestinationDefinition {
  id: string
  name: string
  dockerRepository?: string
  documentationUrl?: string
  icon?: string
}
