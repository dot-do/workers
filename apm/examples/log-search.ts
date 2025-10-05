/**
 * Example: Log Search and Analysis
 */

const APM_ENDPOINT = 'https://apm.example.com'

// ============================================================================
// Example 1: Simple Free-Text Search
// ============================================================================

async function searchErrors() {
  const query = {
    query: 'error', // Free-text search in message
    from: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    to: Date.now(),
    limit: 100,
    offset: 0,
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`Found ${total} errors in last 24 hours`)
  logs.slice(0, 5).forEach((log: any) => {
    console.log(`[${new Date(log.timestamp).toISOString()}] ${log.service}: ${log.message}`)
  })
}

// ============================================================================
// Example 2: Field-Based Search
// ============================================================================

async function searchByService() {
  const query = {
    query: 'service:api-gateway level:error', // Field filters
    from: Date.now() - 3 * 60 * 60 * 1000, // Last 3 hours
    to: Date.now(),
    limit: 50,
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`Found ${total} errors in api-gateway`)

  // Group by error message
  const grouped = logs.reduce((acc: any, log: any) => {
    const msg = log.message.substring(0, 50)
    acc[msg] = (acc[msg] || 0) + 1
    return acc
  }, {})

  console.log('\nTop error messages:')
  Object.entries(grouped)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([msg, count]) => {
      console.log(`  ${count}x: ${msg}`)
    })
}

// ============================================================================
// Example 3: Boolean Search
// ============================================================================

async function searchWithBoolean() {
  const query = {
    query: '(level:error OR level:fatal) AND service:payment-service',
    from: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
    to: Date.now(),
    limit: 100,
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`Found ${total} critical logs in payment-service`)
  console.log(`Error rate: ${(total / (7 * 24 * 60)).toFixed(2)} errors/minute`)
}

// ============================================================================
// Example 4: Search by User
// ============================================================================

async function searchByUser(userId: string) {
  const query = {
    query: `user:${userId}`,
    from: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    to: Date.now(),
    limit: 1000,
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`User ${userId} activity:`)
  console.log(`  Total events: ${total}`)

  // Count by level
  const byLevel = logs.reduce((acc: any, log: any) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {})

  console.log('  By level:')
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`    ${level}: ${count}`)
  })

  // Count by service
  const byService = logs.reduce((acc: any, log: any) => {
    acc[log.service] = (acc[log.service] || 0) + 1
    return acc
  }, {})

  console.log('  By service:')
  Object.entries(byService)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([service, count]) => {
      console.log(`    ${service}: ${count}`)
    })
}

// ============================================================================
// Example 5: Get Logs for Trace
// ============================================================================

async function getTraceLogs(traceId: string) {
  const response = await fetch(`${APM_ENDPOINT}/api/logs/trace/${traceId}`)

  const { logs } = await response.json()

  console.log(`Logs for trace ${traceId}:`)
  console.log(`Total logs: ${logs.length}`)

  // Show chronological sequence
  logs.forEach((log: any, i: number) => {
    const timestamp = new Date(log.timestamp).toISOString()
    const elapsed = i > 0 ? `+${log.timestamp - logs[0].timestamp}ms` : '0ms'
    console.log(`  ${i + 1}. [${timestamp}] (${elapsed}) ${log.service}: ${log.message}`)
  })

  // Show services involved
  const services = [...new Set(logs.map((l: any) => l.service))]
  console.log(`\nServices: ${services.join(', ')}`)
}

// ============================================================================
// Example 6: Find Error Patterns
// ============================================================================

async function findErrorPatterns(service: string) {
  const from = Date.now() - 24 * 60 * 60 * 1000
  const to = Date.now()

  const response = await fetch(`${APM_ENDPOINT}/api/logs/patterns/${service}?from=${from}&to=${to}`)

  const { topErrors } = await response.json()

  console.log(`Top error patterns in ${service}:`)
  topErrors.forEach((error: any, i: number) => {
    console.log(`  ${i + 1}. ${error.message} (${error.count}x)`)
  })
}

// ============================================================================
// Example 7: Search Custom Fields
// ============================================================================

async function searchCustomFields() {
  const query = {
    query: 'status:500 AND method:POST', // Custom fields from log.fields
    from: Date.now() - 6 * 60 * 60 * 1000, // Last 6 hours
    to: Date.now(),
    services: ['api-gateway'],
    levels: ['error'],
    limit: 100,
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`Found ${total} POST requests with status 500`)

  // Analyze endpoints
  const endpoints = logs.reduce((acc: any, log: any) => {
    const endpoint = log.fields?.endpoint || 'unknown'
    acc[endpoint] = (acc[endpoint] || 0) + 1
    return acc
  }, {})

  console.log('\nFailures by endpoint:')
  Object.entries(endpoints)
    .sort((a: any, b: any) => b[1] - a[1])
    .forEach(([endpoint, count]) => {
      console.log(`  ${endpoint}: ${count}`)
    })
}

// ============================================================================
// Example 8: Time-Range Analysis
// ============================================================================

async function analyzeTimeRange() {
  const hourAgo = Date.now() - 60 * 60 * 1000
  const now = Date.now()

  // Get all errors in last hour
  const query = {
    query: 'level:error',
    from: hourAgo,
    to: now,
    limit: 10000, // Get all
  }

  const response = await fetch(`${APM_ENDPOINT}/api/logs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })

  const { total, logs } = await response.json()

  console.log(`Error analysis for last hour:`)
  console.log(`  Total errors: ${total}`)
  console.log(`  Error rate: ${(total / 60).toFixed(2)} errors/minute`)

  // Group by 5-minute buckets
  const buckets = logs.reduce((acc: any, log: any) => {
    const bucket = Math.floor(log.timestamp / (5 * 60 * 1000)) * 5 * 60 * 1000
    acc[bucket] = (acc[bucket] || 0) + 1
    return acc
  }, {})

  console.log('\nErrors per 5-minute bucket:')
  Object.entries(buckets)
    .sort((a: any, b: any) => Number(a[0]) - Number(b[0]))
    .forEach(([timestamp, count]) => {
      const time = new Date(Number(timestamp)).toISOString().substring(11, 16)
      const bar = '█'.repeat(Math.ceil((count as number) / 5))
      console.log(`  ${time}: ${bar} ${count}`)
    })
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('Log Search Examples\n' + '='.repeat(80) + '\n')

  console.log('1. Simple Error Search')
  await searchErrors()

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('2. Search by Service')
  await searchByService()

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('3. Boolean Search')
  await searchWithBoolean()

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('4. Search by User')
  await searchByUser('user-12345')

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('5. Trace Logs')
  await getTraceLogs('abc123')

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('6. Error Patterns')
  await findErrorPatterns('api-gateway')

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('7. Custom Field Search')
  await searchCustomFields()

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('8. Time-Range Analysis')
  await analyzeTimeRange()
}

// Uncomment to run:
// runExamples().catch(console.error)
