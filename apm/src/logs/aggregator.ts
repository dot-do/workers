import type { Env, LogEntry, LogQuery, LogSearchResult } from '../types'

/**
 * Log Aggregator and Search Engine
 * Collects, indexes, and searches logs with Lucene-style queries
 */
export class LogAggregator {
  constructor(private env: Env) {}

  /**
   * Ingest log entries
   */
  async ingest(logs: LogEntry[]): Promise<void> {
    for (const log of logs) {
      await this.writeLog(log)
    }
  }

  /**
   * Write single log entry
   */
  private async writeLog(log: LogEntry): Promise<void> {
    // Write to Analytics Engine for long-term storage and analysis
    this.env.LOGS.writeDataPoint({
      blobs: [
        log.service,
        log.environment,
        log.level,
        log.message,
        log.traceId || '',
        log.spanId || '',
        log.userId || '',
        log.requestId || '',
        JSON.stringify(log.fields),
      ],
      doubles: [log.timestamp],
      indexes: [log.service, log.environment, log.level],
    })

    // Write to D1 for fast searching (last 7 days)
    await this.env.DB.prepare(
      `INSERT INTO logs (
        timestamp, level, service, environment, message, trace_id, span_id,
        user_id, request_id, fields, stack
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        Math.floor(log.timestamp / 1000),
        log.level,
        log.service,
        log.environment,
        log.message.substring(0, 1000), // Limit message length
        log.traceId || null,
        log.spanId || null,
        log.userId || null,
        log.requestId || null,
        JSON.stringify(log.fields),
        log.stack || null
      )
      .run()

    // Archive to R2 for long-term storage (every 1000 logs)
    const logKey = `${log.service}/${log.environment}/${new Date(log.timestamp).toISOString().split('T')[0]}`
    await this.archiveToR2(logKey, log)
  }

  /**
   * Archive logs to R2 for long-term storage
   */
  private async archiveToR2(key: string, log: LogEntry): Promise<void> {
    // In production, batch logs and write to R2 periodically
    // For now, just append to existing file
    try {
      const existing = await this.env.LOGS_ARCHIVE.get(key)
      const existingData = existing ? await existing.text() : ''
      const newData = existingData + JSON.stringify(log) + '\n'

      await this.env.LOGS_ARCHIVE.put(key, newData, {
        httpMetadata: {
          contentType: 'application/x-ndjson',
        },
      })
    } catch (error) {
      console.error('Failed to archive log to R2:', error)
    }
  }

  /**
   * Search logs with Lucene-style query
   */
  async search(query: LogQuery): Promise<LogSearchResult> {
    // Parse query into SQL conditions
    const { conditions, params } = this.parseQuery(query)

    // Build SQL query
    let sql = `SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ?`
    const sqlParams: any[] = [Math.floor(query.from / 1000), Math.floor(query.to / 1000)]

    // Add parsed conditions
    if (conditions) {
      sql += ` AND (${conditions})`
      sqlParams.push(...params)
    }

    // Add service filter
    if (query.services && query.services.length > 0) {
      sql += ` AND service IN (${query.services.map(() => '?').join(', ')})`
      sqlParams.push(...query.services)
    }

    // Add level filter
    if (query.levels && query.levels.length > 0) {
      sql += ` AND level IN (${query.levels.map(() => '?').join(', ')})`
      sqlParams.push(...query.levels)
    }

    // Order and limit
    sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    sqlParams.push(query.limit, query.offset)

    // Execute query
    const result = await this.env.DB.prepare(sql).bind(...sqlParams).all()

    // Get total count
    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '')
    const countResult = await this.env.DB.prepare(countSql)
      .bind(...sqlParams.slice(0, -2))
      .first()

    const logs: LogEntry[] = result.results.map((row: any) => ({
      timestamp: row.timestamp * 1000,
      level: row.level,
      message: row.message,
      service: row.service,
      environment: row.environment,
      traceId: row.trace_id,
      spanId: row.span_id,
      userId: row.user_id,
      requestId: row.request_id,
      fields: JSON.parse(row.fields || '{}'),
      stack: row.stack,
    }))

    return {
      total: (countResult as any)?.total || 0,
      logs,
    }
  }

  /**
   * Parse Lucene-style query into SQL conditions
   * Examples:
   * - "error" -> message LIKE '%error%'
   * - "service:api" -> service = 'api'
   * - "status:500" -> fields LIKE '%"status":500%'
   * - "user:john AND level:error" -> ...
   */
  private parseQuery(query: LogQuery): { conditions: string; params: any[] } {
    const queryStr = query.query.trim()
    if (!queryStr) {
      return { conditions: '1=1', params: [] }
    }

    // Simple parser for basic queries
    // In production, use a proper Lucene parser
    const tokens = queryStr.split(/\s+/)
    const conditions: string[] = []
    const params: any[] = []

    let operator = 'AND'

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token === 'AND' || token === 'OR') {
        operator = token
        continue
      }

      if (token === 'NOT') {
        // Handle NOT operator
        continue
      }

      if (token.includes(':')) {
        // Field:value query
        const [field, value] = token.split(':')

        switch (field.toLowerCase()) {
          case 'service':
            conditions.push('service = ?')
            params.push(value)
            break
          case 'level':
            conditions.push('level = ?')
            params.push(value)
            break
          case 'trace':
          case 'traceid':
            conditions.push('trace_id = ?')
            params.push(value)
            break
          case 'user':
          case 'userid':
            conditions.push('user_id = ?')
            params.push(value)
            break
          case 'request':
          case 'requestid':
            conditions.push('request_id = ?')
            params.push(value)
            break
          default:
            // Search in fields JSON
            conditions.push('fields LIKE ?')
            params.push(`%"${field}":${value}%`)
            break
        }
      } else {
        // Free-text search in message
        conditions.push('message LIKE ?')
        params.push(`%${token}%`)
      }
    }

    return {
      conditions: conditions.join(` ${operator} `),
      params,
    }
  }

  /**
   * Get log patterns and aggregations
   */
  async getPatterns(service: string, from: number, to: number): Promise<any> {
    // This would use Analytics Engine to find common log patterns
    // For now, return top error messages

    const result = await this.env.DB.prepare(
      `SELECT message, COUNT(*) as count
       FROM logs
       WHERE service = ? AND level = 'error'
         AND timestamp >= ? AND timestamp <= ?
       GROUP BY message
       ORDER BY count DESC
       LIMIT 20`
    )
      .bind(service, Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    return {
      topErrors: result.results.map((row: any) => ({
        message: row.message,
        count: row.count,
      })),
    }
  }

  /**
   * Get logs for a specific trace
   */
  async getTraceLogs(traceId: string): Promise<LogEntry[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM logs
       WHERE trace_id = ?
       ORDER BY timestamp ASC`
    )
      .bind(traceId)
      .all()

    return result.results.map((row: any) => ({
      timestamp: row.timestamp * 1000,
      level: row.level,
      message: row.message,
      service: row.service,
      environment: row.environment,
      traceId: row.trace_id,
      spanId: row.span_id,
      userId: row.user_id,
      requestId: row.request_id,
      fields: JSON.parse(row.fields || '{}'),
      stack: row.stack,
    }))
  }

  /**
   * Stream logs in real-time (for tail -f functionality)
   */
  async *streamLogs(service: string, level?: string): AsyncGenerator<LogEntry> {
    // In production, this would use Server-Sent Events or WebSocket
    // For now, poll D1 every second
    let lastTimestamp = Date.now() / 1000

    while (true) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM logs
         WHERE service = ? ${level ? 'AND level = ?' : ''}
           AND timestamp > ?
         ORDER BY timestamp ASC
         LIMIT 100`
      )
        .bind(service, ...(level ? [level, lastTimestamp] : [lastTimestamp]))
        .all()

      for (const row of result.results as any[]) {
        lastTimestamp = row.timestamp
        yield {
          timestamp: row.timestamp * 1000,
          level: row.level,
          message: row.message,
          service: row.service,
          environment: row.environment,
          traceId: row.trace_id,
          spanId: row.span_id,
          userId: row.user_id,
          requestId: row.request_id,
          fields: JSON.parse(row.fields || '{}'),
          stack: row.stack,
        }
      }

      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

/**
 * Durable Object for real-time log aggregation
 */
export class LogAggregatorDO {
  private state: DurableObjectState
  private env: Env
  private buffer: LogEntry[] = []
  private flushInterval: number = 5000 // 5 seconds

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.startFlushTimer()
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/ingest') {
      const logs: LogEntry[] = await request.json()
      this.buffer.push(...logs)

      // Flush if buffer is large
      if (this.buffer.length >= 100) {
        await this.flush()
      }

      return new Response('OK')
    }

    return new Response('Not Found', { status: 404 })
  }

  private startFlushTimer() {
    setInterval(() => {
      this.flush().catch(console.error)
    }, this.flushInterval)
  }

  private async flush() {
    if (this.buffer.length === 0) return

    const logs = [...this.buffer]
    this.buffer = []

    const aggregator = new LogAggregator(this.env)
    await aggregator.ingest(logs)
  }
}
