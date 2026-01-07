/**
 * Database Types - Re-exports from primitives/ai-database
 *
 * @packageDocumentation
 */

// Re-export all from primitives
export type {
  // Thing types
  ThingFlat,
  ThingExpanded,

  // Schema types
  PrimitiveType,
  FieldDefinition,
  EntitySchema,
  DatabaseSchema,
  ParsedField,
  ParsedEntity,
  ParsedSchema,

  // Semantic types
  Verb,
  Noun,
  NounProperty,
  NounRelationship,
  TypeMeta,

  // Graph types
  EntityId,
  Thing,
  Relationship,

  // Query types
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,

  // Event/Action/Artifact types
  Event,
  ActionStatus,
  Action,
  ArtifactType,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,

  // Client interfaces
  DBClient,
  DBClientExtended,

  // Document database types
  DocListOptions,
  DocWithScore,
  DocListResult,
  DocSearchOptions,
  DocSearchResult,
  DocGetOptions,
  DocSetOptions,
  DocSetResult,
  DocDeleteOptions,
  DocDeleteResult,
  Document,
  DocumentDatabase,
  DocumentDatabaseConfig,
  CreateDocumentDatabase,

  // View types
  ViewEntityItem,
  ViewComponent,
  ViewDocument,
  ViewContext,
  ViewRenderResult,
  ViewRelationshipMutation,
  ViewSyncResult,
  ViewManager,
  DocumentDatabaseWithViews,
} from 'ai-database'

// Re-export Verbs constant
export { Verbs } from 'ai-database'

// Re-export utility functions
export { toExpanded, toFlat, resolveUrl, resolveShortUrl, parseUrl } from 'ai-database'
