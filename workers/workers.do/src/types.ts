/**
 * Worker type definitions for workers.do
 *
 * Worker extends dotdo's Thing type schema for storage compatibility.
 * See: https://github.com/dot-do/dotdo/blob/main/types/Thing.ts
 */

/**
 * Thing base type - mirrors dotdo's ThingData interface.
 * All entities stored in dotdo's Thing storage system extend this.
 *
 * This local definition ensures type compatibility without requiring
 * dotdo's declaration files at compile time.
 */
export interface Thing {
  // Fully qualified URLs for unambiguous identity
  $id: string      // URL: 'https://workers.do/my-worker'
  $type: string    // Type discriminator: 'Worker', 'Agent', etc.

  // Version for append-only/CRDTs
  $version?: number

  // Timestamps (using Date in storage, ISO string in serialization)
  createdAt: Date | string
  updatedAt?: Date | string
  deletedAt?: Date | string
}

/**
 * Worker extends Thing which provides $id and $type.
 * Additional fields track worker lifecycle and folder associations.
 */
export interface Worker extends Thing {
  $type: 'Worker'
  name: string
  url: string
  createdAt: string  // ISO timestamp
  deployedAt?: string  // ISO timestamp
  accessedAt?: string  // ISO timestamp
  linkedFolders?: string[]
}

/**
 * Options for listing workers
 */
export interface ListOptions {
  sortBy?: 'created' | 'deployed' | 'accessed'
  limit?: number
}

/**
 * Options for linking a folder to a worker
 */
export interface LinkOptions {
  folder: string
}
