import { ClickHouseClient, createClient } from '@clickhouse/client-web'

// Lazy-init a singleton ClickHouse client so we only create it once per worker instance
let _client: ClickHouseClient | undefined

function getClient() {
  if (_client) return _client

  _client = createClient({
    url: process.env.CLICKHOUSE_URL,
    database: process.env.CLICKHOUSE_DATABASE,
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
  })
  return _client
}

/**
 * Tagged-template helper that converts
 *
 *   sql`SELECT * FROM users WHERE id = ${userId}`
 *
 * into a parameterised ClickHouse query that avoids SQL-injection.
 * Each interpolated value becomes a named parameter (`p0`, `p1`, …).
 *
 * The query is executed immediately and the parsed JSON result is returned.
 *
 * If you need more control (streaming, custom settings, etc.) you can still
 * fall back to the full client API.
 */
export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  // Build query with named parameters
  const params: Record<string, unknown> = {}
  let query = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) {
    const key = `p${i}`
    const value = values[i]

    // Infer a simple ClickHouse type based on JS value
    const placeholderType = inferType(value)
    query += `{${key}:${placeholderType}}${strings[i + 1] ?? ''}`
    params[key] = value
  }

  const client = getClient()
  const resultSet = await (client as any).query({
    query,
    format: 'JSON',
    query_params: params,
  })

  // Return fully parsed JSON result rows
  return resultSet.json()
}

function inferType(v: unknown): string {
  switch (typeof v) {
    case 'number':
      // ClickHouse distinguishes between Float/Int but Int64 is a safe default
      return Number.isInteger(v as number) ? 'Int64' : 'Float64'
    case 'boolean':
      return 'Bool'
    case 'string':
      return 'String'
    default:
      // Fallback to JSON-encoded string
      return 'String'
  }
}

// Re-export the client for advanced usage
export const clickhouse = getClient()
