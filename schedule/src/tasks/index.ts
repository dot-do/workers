/**
 * Task Registry
 * Central registry of all scheduled tasks
 */

import { cleanupExpiredSessions, cleanupExpiredApiKeys, cleanupOldGenerations } from './cleanup'
import { generateMissingEmbeddings, generateMissingChunkEmbeddings } from './embeddings'
import { updateAnalytics, backupDatabase } from './analytics'
import { healthCheckServices, checkRateLimits } from './monitoring'
import { importMCPServers, importPublicAPIs, importAllSources, verifyImportedData } from './imports'
import type { TaskRegistry } from '../types'

/**
 * Registry of all available task handlers
 */
export const taskRegistry: TaskRegistry = {
  // Cleanup tasks
  'cleanup-expired-sessions': cleanupExpiredSessions,
  'cleanup-expired-api-keys': cleanupExpiredApiKeys,
  'cleanup-old-generations': cleanupOldGenerations,

  // Embeddings tasks
  'generate-missing-embeddings': generateMissingEmbeddings,
  'generate-missing-chunk-embeddings': generateMissingChunkEmbeddings,

  // Analytics tasks
  'update-analytics': updateAnalytics,
  'backup-database': backupDatabase,

  // Monitoring tasks
  'health-check-services': healthCheckServices,
  'check-rate-limits': checkRateLimits,

  // Import tasks
  'import-mcp-servers': importMCPServers,
  'import-public-apis': importPublicAPIs,
  'import-all-sources': importAllSources,
  'verify-imported-data': verifyImportedData,
}

/**
 * Default task definitions
 * These are registered automatically when the service starts
 */
export const defaultTasks = [
  {
    name: 'cleanup-expired-sessions',
    schedule: '@hourly',
    handler: 'cleanup-expired-sessions',
    enabled: true,
    metadata: {
      description: 'Delete expired user sessions',
      category: 'cleanup',
    },
  },
  {
    name: 'cleanup-expired-api-keys',
    schedule: '@daily',
    handler: 'cleanup-expired-api-keys',
    enabled: true,
    metadata: {
      description: 'Delete expired API keys',
      category: 'cleanup',
    },
  },
  {
    name: 'cleanup-old-generations',
    schedule: '@weekly',
    handler: 'cleanup-old-generations',
    enabled: true,
    metadata: {
      description: 'Delete AI generations older than 30 days',
      category: 'cleanup',
    },
  },
  {
    name: 'generate-missing-embeddings',
    schedule: '@daily',
    handler: 'generate-missing-embeddings',
    enabled: true,
    metadata: {
      description: 'Generate embeddings for entities without them (ClickHouse)',
      category: 'ai',
    },
  },
  {
    name: 'generate-missing-chunk-embeddings',
    schedule: '@daily',
    handler: 'generate-missing-chunk-embeddings',
    enabled: true,
    metadata: {
      description: 'Generate embeddings for document chunks without them (ClickHouse)',
      category: 'ai',
    },
  },
  {
    name: 'update-analytics',
    schedule: '@hourly',
    handler: 'update-analytics',
    enabled: true,
    metadata: {
      description: 'Compute and store platform analytics',
      category: 'analytics',
    },
  },
  {
    name: 'backup-database',
    schedule: '@daily',
    handler: 'backup-database',
    enabled: true,
    metadata: {
      description: 'Backup database to external storage',
      category: 'maintenance',
    },
  },
  {
    name: 'health-check-services',
    schedule: 'every 5 minutes',
    handler: 'health-check-services',
    enabled: true,
    metadata: {
      description: 'Ping all services and alert if down',
      category: 'monitoring',
    },
  },
  {
    name: 'check-rate-limits',
    schedule: '@hourly',
    handler: 'check-rate-limits',
    enabled: true,
    metadata: {
      description: 'Monitor API rate limit usage',
      category: 'monitoring',
    },
  },
  {
    name: 'import-mcp-servers',
    schedule: '0 2 * * *',
    handler: 'import-mcp-servers',
    enabled: true,
    metadata: {
      description: 'Import MCP servers from registry (daily at 2am)',
      category: 'imports',
    },
  },
  {
    name: 'import-public-apis',
    schedule: '0 3 * * *',
    handler: 'import-public-apis',
    enabled: true,
    metadata: {
      description: 'Import public APIs from directories (daily at 3am)',
      category: 'imports',
    },
  },
  {
    name: 'import-all-sources',
    schedule: '0 4 * * 0',
    handler: 'import-all-sources',
    enabled: true,
    metadata: {
      description: 'Comprehensive import of all data sources (weekly on Sunday at 4am)',
      category: 'imports',
    },
  },
  {
    name: 'verify-imported-data',
    schedule: '0 5 * * *',
    handler: 'verify-imported-data',
    enabled: true,
    metadata: {
      description: 'Verify data integrity after imports (daily at 5am)',
      category: 'imports',
    },
  },
]

/**
 * Get a task handler by name
 */
export function getTaskHandler(handlerName: string) {
  const handler = taskRegistry[handlerName]
  if (!handler) {
    throw new Error(`Task handler not found: ${handlerName}`)
  }
  return handler
}

/**
 * Check if a task handler exists
 */
export function hasTaskHandler(handlerName: string): boolean {
  return handlerName in taskRegistry
}

/**
 * Get all task handler names
 */
export function getAllTaskHandlers(): string[] {
  return Object.keys(taskRegistry)
}
