import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../schema'

/**
 * PostgreSQL client for Neon database
 * Lazy-initialized singleton to reuse connections across requests
 */
let _client: ReturnType<typeof drizzle<typeof schema>> | undefined

export function getPostgresClient(connectionString?: string) {
  if (_client) return _client

  const connStr = connectionString || process.env.DATABASE_URL
  if (!connStr) throw new Error('DATABASE_URL not configured')

  const sql = neon(connStr)
  _client = drizzle(sql, { schema })
  return _client
}

/**
 * Execute raw SQL query on PostgreSQL
 * For simple queries without ORM
 */
export async function executeRawSQL(query: string, params?: Record<string, any>) {
  const client = getPostgresClient()
  // Neon HTTP driver supports parameterized queries
  return (client as any).execute(query, params)
}

/**
 * Health check for PostgreSQL connection
 */
export async function checkPostgresHealth() {
  try {
    const client = getPostgresClient()
    const result = await (client as any).execute('SELECT 1 as health')
    return { status: 'ok', result }
  } catch (error: any) {
    return { status: 'error', message: error.message }
  }
}
