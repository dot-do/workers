/**
 * Graph API - Core CRUD operations for Things & Relationships
 *
 * This is the production API that all import scripts and graph operations use.
 */

// Export all Thing operations
export {
  createThing,
  getThing,
  updateThing,
  deleteThing,
  queryThings,
  bulkCreateThings,
  type ThingDatabase,
  type PreparedStatement,
} from './things.js'

// Export all Relationship operations
export {
  createRelationship,
  getInboundRelationships,
  getOutboundRelationships,
  queryRelationships,
  deleteRelationship,
  deleteThingRelationships,
  bulkCreateRelationships,
} from './relationships.js'

// Re-export types
export type * from '@dot-do/graph-types'

// Export database adapters
export { createR2SQLDatabase, initR2SQLSchemas, R2SQLDatabase } from './adapters/r2sql.js'
export { createClickHouseDatabase, initClickHouseSchemas, ClickHouseDatabase } from './adapters/clickhouse.js'
