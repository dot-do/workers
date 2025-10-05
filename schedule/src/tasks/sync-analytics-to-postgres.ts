/**
 * Sync Analytics from ClickHouse to PostgreSQL
 * Runs hourly to sync aggregated analytics from ClickHouse materialized views to PostgreSQL
 */

interface Env {
  DB: any // DB service binding
}

export async function syncAnalyticsToPostgres(env: Env) {
  const startTime = Date.now()

  try {
    const db = env.DB as any

    // Get ClickHouse client
    const clickhouse = await db.getClickHouseClient()

    // Sync hourly analytics
    const hourlyStats = await syncHourlyAnalytics(clickhouse, db)

    // Sync daily analytics
    const dailyStats = await syncDailyAnalytics(clickhouse, db)

    // Sync UTM campaign analytics
    const utmStats = await syncUTMAnalytics(clickhouse, db)

    // Sync API performance metrics
    const apiStats = await syncAPIPerformance(clickhouse, db)

    // Sync user activity metrics
    const userStats = await syncUserActivity(clickhouse, db)

    return {
      success: true,
      stats: {
        hourly: hourlyStats,
        daily: dailyStats,
        utm: utmStats,
        api: apiStats,
        users: userStats,
      },
      duration: Date.now() - startTime,
      message: 'Analytics synced to PostgreSQL successfully',
    }
  } catch (error: any) {
    console.error('Error syncing analytics to PostgreSQL:', error)
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}

async function syncHourlyAnalytics(clickhouse: any, db: any) {
  // Get last sync timestamp from PostgreSQL
  const lastSync = await db.query(
    `SELECT MAX(hour) as last_hour FROM analytics_hourly`
  )

  const lastHour = lastSync.rows[0]?.last_hour || '2025-01-01 00:00:00'

  // Query ClickHouse for new hourly data
  const result = await clickhouse.query({
    query: `
      SELECT
        hour,
        type,
        namespace,
        event_count,
        unique_entities,
        unique_users,
        avg_duration_ms,
        p50_duration_ms,
        p95_duration_ms,
        p99_duration_ms,
        error_count,
        first_event,
        last_event
      FROM analytics_hourly
      WHERE hour > '${lastHour}'
      ORDER BY hour ASC
      LIMIT 10000
    `,
    format: 'JSONEachRow',
  })

  const rows = await result.json()

  if (rows.data && rows.data.length > 0) {
    // Batch insert into PostgreSQL
    for (const row of rows.data) {
      await db.execute(
        `INSERT INTO analytics_hourly (
          hour, type, namespace, event_count, unique_entities, unique_users,
          avg_duration_ms, p50_duration_ms, p95_duration_ms, p99_duration_ms,
          error_count, first_event, last_event
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (hour, type, namespace) DO UPDATE SET
          event_count = EXCLUDED.event_count,
          unique_entities = EXCLUDED.unique_entities,
          unique_users = EXCLUDED.unique_users,
          avg_duration_ms = EXCLUDED.avg_duration_ms,
          p50_duration_ms = EXCLUDED.p50_duration_ms,
          p95_duration_ms = EXCLUDED.p95_duration_ms,
          p99_duration_ms = EXCLUDED.p99_duration_ms,
          error_count = EXCLUDED.error_count,
          first_event = EXCLUDED.first_event,
          last_event = EXCLUDED.last_event
        `,
        row.hour,
        row.type,
        row.namespace,
        row.event_count,
        row.unique_entities,
        row.unique_users,
        row.avg_duration_ms,
        row.p50_duration_ms,
        row.p95_duration_ms,
        row.p99_duration_ms,
        row.error_count,
        row.first_event,
        row.last_event
      )
    }
  }

  return { synced: rows.data?.length || 0 }
}

async function syncDailyAnalytics(clickhouse: any, db: any) {
  const lastSync = await db.query(
    `SELECT MAX(day) as last_day FROM analytics_daily`
  )

  const lastDay = lastSync.rows[0]?.last_day || '2025-01-01'

  const result = await clickhouse.query({
    query: `
      SELECT
        day,
        type,
        namespace,
        event_count,
        unique_entities,
        unique_users,
        avg_duration_ms,
        p50_duration_ms,
        p95_duration_ms,
        p99_duration_ms,
        error_count,
        first_event,
        last_event
      FROM analytics_daily
      WHERE day > '${lastDay}'
      ORDER BY day ASC
      LIMIT 10000
    `,
    format: 'JSONEachRow',
  })

  const rows = await result.json()

  if (rows.data && rows.data.length > 0) {
    for (const row of rows.data) {
      await db.execute(
        `INSERT INTO analytics_daily (
          day, type, namespace, event_count, unique_entities, unique_users,
          avg_duration_ms, p50_duration_ms, p95_duration_ms, p99_duration_ms,
          error_count, first_event, last_event
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (day, type, namespace) DO UPDATE SET
          event_count = EXCLUDED.event_count,
          unique_entities = EXCLUDED.unique_entities,
          unique_users = EXCLUDED.unique_users,
          avg_duration_ms = EXCLUDED.avg_duration_ms,
          p50_duration_ms = EXCLUDED.p50_duration_ms,
          p95_duration_ms = EXCLUDED.p95_duration_ms,
          p99_duration_ms = EXCLUDED.p99_duration_ms,
          error_count = EXCLUDED.error_count,
          first_event = EXCLUDED.first_event,
          last_event = EXCLUDED.last_event
        `,
        row.day,
        row.type,
        row.namespace,
        row.event_count,
        row.unique_entities,
        row.unique_users,
        row.avg_duration_ms,
        row.p50_duration_ms,
        row.p95_duration_ms,
        row.p99_duration_ms,
        row.error_count,
        row.first_event,
        row.last_event
      )
    }
  }

  return { synced: rows.data?.length || 0 }
}

async function syncUTMAnalytics(clickhouse: any, db: any) {
  const lastSync = await db.query(
    `SELECT MAX(day) as last_day FROM analytics_utm`
  )

  const lastDay = lastSync.rows[0]?.last_day || '2025-01-01'

  const result = await clickhouse.query({
    query: `
      SELECT
        day,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        visit_count,
        unique_visitors,
        session_count,
        conversion_count,
        avg_session_duration
      FROM analytics_utm
      WHERE day > '${lastDay}'
      ORDER BY day ASC
      LIMIT 10000
    `,
    format: 'JSONEachRow',
  })

  const rows = await result.json()

  if (rows.data && rows.data.length > 0) {
    for (const row of rows.data) {
      await db.execute(
        `INSERT INTO analytics_utm (
          day, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          visit_count, unique_visitors, session_count, conversion_count, avg_session_duration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (day, utm_source, utm_medium, utm_campaign) DO UPDATE SET
          visit_count = EXCLUDED.visit_count,
          unique_visitors = EXCLUDED.unique_visitors,
          session_count = EXCLUDED.session_count,
          conversion_count = EXCLUDED.conversion_count,
          avg_session_duration = EXCLUDED.avg_session_duration
        `,
        row.day,
        row.utm_source,
        row.utm_medium,
        row.utm_campaign,
        row.utm_term,
        row.utm_content,
        row.visit_count,
        row.unique_visitors,
        row.session_count,
        row.conversion_count,
        row.avg_session_duration
      )
    }
  }

  return { synced: rows.data?.length || 0 }
}

async function syncAPIPerformance(clickhouse: any, db: any) {
  const lastSync = await db.query(
    `SELECT MAX(hour) as last_hour FROM analytics_api_performance`
  )

  const lastHour = lastSync.rows[0]?.last_hour || '2025-01-01 00:00:00'

  const result = await clickhouse.query({
    query: `
      SELECT
        hour,
        endpoint,
        method,
        status_code,
        request_count,
        avg_response_time,
        p50_response_time,
        p95_response_time,
        p99_response_time,
        error_count,
        total_bytes_sent,
        total_bytes_received
      FROM analytics_api_performance
      WHERE hour > '${lastHour}'
      ORDER BY hour ASC
      LIMIT 10000
    `,
    format: 'JSONEachRow',
  })

  const rows = await result.json()

  if (rows.data && rows.data.length > 0) {
    for (const row of rows.data) {
      await db.execute(
        `INSERT INTO analytics_api_performance (
          hour, endpoint, method, status_code, request_count,
          avg_response_time, p50_response_time, p95_response_time, p99_response_time,
          error_count, total_bytes_sent, total_bytes_received
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (hour, endpoint, method, status_code) DO UPDATE SET
          request_count = EXCLUDED.request_count,
          avg_response_time = EXCLUDED.avg_response_time,
          p50_response_time = EXCLUDED.p50_response_time,
          p95_response_time = EXCLUDED.p95_response_time,
          p99_response_time = EXCLUDED.p99_response_time,
          error_count = EXCLUDED.error_count,
          total_bytes_sent = EXCLUDED.total_bytes_sent,
          total_bytes_received = EXCLUDED.total_bytes_received
        `,
        row.hour,
        row.endpoint,
        row.method,
        row.status_code,
        row.request_count,
        row.avg_response_time,
        row.p50_response_time,
        row.p95_response_time,
        row.p99_response_time,
        row.error_count,
        row.total_bytes_sent,
        row.total_bytes_received
      )
    }
  }

  return { synced: rows.data?.length || 0 }
}

async function syncUserActivity(clickhouse: any, db: any) {
  const lastSync = await db.query(
    `SELECT MAX(day) as last_day FROM analytics_user_activity`
  )

  const lastDay = lastSync.rows[0]?.last_day || '2025-01-01'

  const result = await clickhouse.query({
    query: `
      SELECT
        day,
        user_id,
        event_count,
        session_count,
        first_activity,
        last_activity,
        activity_duration_minutes,
        event_types,
        namespaces_accessed
      FROM analytics_user_activity
      WHERE day > '${lastDay}'
      ORDER BY day ASC
      LIMIT 10000
    `,
    format: 'JSONEachRow',
  })

  const rows = await result.json()

  if (rows.data && rows.data.length > 0) {
    for (const row of rows.data) {
      await db.execute(
        `INSERT INTO analytics_user_activity (
          day, user_id, event_count, session_count,
          first_activity, last_activity, activity_duration_minutes,
          event_types, namespaces_accessed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (day, user_id) DO UPDATE SET
          event_count = EXCLUDED.event_count,
          session_count = EXCLUDED.session_count,
          first_activity = EXCLUDED.first_activity,
          last_activity = EXCLUDED.last_activity,
          activity_duration_minutes = EXCLUDED.activity_duration_minutes,
          event_types = EXCLUDED.event_types,
          namespaces_accessed = EXCLUDED.namespaces_accessed
        `,
        row.day,
        row.user_id,
        row.event_count,
        row.session_count,
        row.first_activity,
        row.last_activity,
        row.activity_duration_minutes,
        JSON.stringify(row.event_types),
        JSON.stringify(row.namespaces_accessed)
      )
    }
  }

  return { synced: rows.data?.length || 0 }
}
