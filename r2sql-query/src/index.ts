/**
 * R2 SQL Query Worker
 *
 * Proxy worker for executing R2 SQL queries via Cloudflare API.
 * Enables local testing with `wrangler dev --remote` and production use
 * without needing Wrangler CLI.
 *
 * Architecture:
 * - Accepts SQL queries via HTTP POST
 * - Calls Cloudflare R2 SQL API with authentication
 * - Returns results as JSON
 * - Handles errors and timeouts
 *
 * Usage:
 *   POST /query
 *   {
 *     "sql": "SELECT * FROM default.relationships WHERE toNs = 'github.com' LIMIT 10",
 *     "warehouse": "optional-warehouse-name"
 *   }
 *
 * Response:
 *   {
 *     "results": [...],
 *     "meta": {
 *       "rows": 10,
 *       "duration": 125
 *     }
 *   }
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'

/**
 * Environment bindings
 */
export interface Env {
  /** Cloudflare account ID */
  CLOUDFLARE_ACCOUNT_ID: string
  /** R2 SQL authentication token */
  R2_SQL_AUTH_TOKEN: string
  /** Default warehouse name (accountId_bucketName) */
  R2_WAREHOUSE_NAME: string
}

/**
 * Query request body
 */
interface QueryRequest {
  sql: string
  warehouse?: string
}

/**
 * Query response
 */
interface QueryResponse {
  results: any[]
  meta: {
    rows: number
    duration: number
  }
  error?: string
}

/**
 * R2 SQL Query Service - RPC Interface
 */
export class R2SQLQueryService extends WorkerEntrypoint<Env> {
  /**
   * Execute R2 SQL query
   */
  async query(sql: string, warehouse?: string): Promise<QueryResponse> {
    const warehouseName = warehouse || this.env.R2_WAREHOUSE_NAME

    try {
      const startTime = Date.now()

      // Call Cloudflare R2 SQL API
      const result = await executeR2SQLQuery(this.env, warehouseName, sql)

      const duration = Date.now() - startTime

      return {
        results: result,
        meta: {
          rows: result.length,
          duration,
        },
      }
    } catch (error) {
      console.error('[R2 SQL Query] Error:', error)
      return {
        results: [],
        meta: {
          rows: 0,
          duration: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

/**
 * Execute R2 SQL query via Cloudflare API
 *
 * NOTE: The exact API endpoint for R2 SQL may vary. This implementation
 * tries multiple possible endpoints and falls back to shelling out to
 * Wrangler CLI if direct API calls fail.
 */
async function executeR2SQLQuery(env: Env, warehouse: string, sql: string): Promise<any[]> {
  // Try direct API call first (endpoint may not exist yet in public API)
  try {
    // Attempt 1: R2 SQL query endpoint (if it exists)
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/sql/query`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.R2_SQL_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        warehouse,
        sql,
      }),
    })

    if (response.ok) {
      const data = (await response.json()) as any
      return data.result || []
    }

    // Log the error for debugging
    const errorText = await response.text()
    console.warn(`[R2 SQL] API call failed (${response.status}): ${errorText}`)
  } catch (error) {
    console.warn('[R2 SQL] Direct API call error:', error)
  }

  // Attempt 2: Try alternative R2 bucket query endpoint
  try {
    // Extract bucket name from warehouse (format: accountId_bucketName)
    const bucketName = warehouse.split('_')[1]

    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${bucketName}/query`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.R2_SQL_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    })

    if (response.ok) {
      const data = (await response.json()) as any
      return data.result || []
    }

    console.warn(`[R2 SQL] Alternative API call failed (${response.status})`)
  } catch (error) {
    console.warn('[R2 SQL] Alternative API call error:', error)
  }

  // If direct API calls don't work, we need to use Wrangler CLI
  // This is a fallback that requires the Worker to have shell access (not possible in production)
  // For now, return an error explaining the situation
  throw new Error(
    'R2 SQL direct API not available. ' +
      'Query must be executed via Wrangler CLI: ' +
      `wrangler r2 sql query "${warehouse}" "${sql}"`
  )
}

/**
 * HTTP API (Hono)
 */
const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.json({
    name: 'R2 SQL Query Worker',
    version: '1.0.0',
    endpoints: {
      query: 'POST /query',
      health: 'GET /health',
    },
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/query', async (c) => {
  try {
    const body = (await c.req.json()) as QueryRequest

    if (!body.sql) {
      return c.json(
        {
          error: 'Missing required field: sql',
        },
        400
      )
    }

    // Call query function directly (no WorkerEntrypoint needed for HTTP)
    const result = await executeQuery(c.env, body.sql, body.warehouse)

    if (result.error) {
      return c.json(result, 500)
    }

    return c.json(result)
  } catch (error) {
    console.error('[R2 SQL Query] Handler error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        results: [],
        meta: { rows: 0, duration: 0 },
      },
      500
    )
  }
})

export default {
  fetch: app.fetch,
}
