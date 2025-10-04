import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import type { PayloadAdapterConfig } from './types'

/**
 * Create a Payload database adapter using Cloudflare D1
 *
 * D1 is Cloudflare's serverless SQLite database.
 * This is the default adapter for admin.do production deployment.
 */
export function createD1Adapter(config: PayloadAdapterConfig) {
  const { d1 } = config

  if (!d1 || !d1.binding) {
    throw new Error('D1 binding required for D1 adapter')
  }

  const adapter = sqliteD1Adapter({
    binding: d1.binding,
  })

  return adapter
}
