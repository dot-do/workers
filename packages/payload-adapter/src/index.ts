/**
 * @dot-do/payload-adapter
 *
 * Payload CMS database adapter package with support for:
 * - D1 (Cloudflare serverless SQLite)
 * - SQLite (libSQL/Turso)
 * - RPC (connects to db worker)
 * - Dynamic collection loading from MDX files
 */

export type {
  PayloadAdapterConfig,
  MDXCollectionFrontmatter,
  MDXField,
  ParsedCollection,
  DbWorkerRPC,
} from './types'

export { parseCollectionMDX, scanCollectionDirectory, loadCollectionsFromMDX } from './mdx-parser'

export { createD1Adapter } from './d1-adapter'
export { createSqliteAdapter, addVectorToCollection } from './sqlite-adapter'
export { createRpcAdapter } from './rpc-adapter'

/**
 * Main factory function to create appropriate adapter based on config
 */
import type { PayloadAdapterConfig } from './types'
import { createD1Adapter } from './d1-adapter'
import { createSqliteAdapter } from './sqlite-adapter'
import { createRpcAdapter } from './rpc-adapter'

export function createPayloadAdapter(config: PayloadAdapterConfig) {
  switch (config.type) {
    case 'd1':
      return createD1Adapter(config)
    case 'sqlite':
      return createSqliteAdapter(config)
    case 'rpc':
      return createRpcAdapter(config)
    default:
      throw new Error(`Unknown adapter type: ${config.type}`)
  }
}
