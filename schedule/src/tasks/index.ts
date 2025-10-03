/**
 * Task Registry
 * Central registry of all scheduled tasks
 */

import { cleanupExpiredSessions, cleanupExpiredApiKeys, cleanupOldGenerations } from './cleanup'
import { generateMissingEmbeddings } from './embeddings'
import { updateAnalytics, backupDatabase } from './analytics'
import { healthCheckServices, checkRateLimits } from './monitoring'
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

  // Analytics tasks
  'update-analytics': updateAnalytics,
  'backup-database': backupDatabase,

  // Monitoring tasks
  'health-check-services': healthCheckServices,
  'check-rate-limits': checkRateLimits,
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
      description: 'Generate embeddings for entities without them',
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
