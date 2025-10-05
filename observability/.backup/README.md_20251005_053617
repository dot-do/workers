# Observability Worker

**Centralized logging, error tracking, and service health monitoring.**

## Overview

The observability worker provides a centralized platform for:
- **Log Aggregation** - Collect logs from all services
- **Error Tracking** - Track errors and crashes across services
- **Health Monitoring** - Monitor service health in real-time
- **Metrics** - Aggregate metrics and analytics
- **Log Streaming** - Real-time log streaming via SSE

## Features

### Log Collection
```bash
# Log an entry
curl -X POST https://observability.do/log \
  -H "Content-Type: application/json" \
  -d '{
    "service": "gateway",
    "level": "info",
    "message": "Request processed successfully",
    "timestamp": 1234567890,
    "metadata": {
      "method": "GET",
      "path": "/api/users",
      "statusCode": 200
    }
  }'
```

### Query Logs
```bash
# Get logs for a service
curl https://observability.do/logs/gateway?level=error&limit=50

# Get all errors
curl https://observability.do/errors?service=db&limit=100
```

### Service Health
```bash
# Check health of all services
curl https://observability.do/status
```

### Metrics
```bash
# Get aggregated metrics
curl https://observability.do/metrics
```

### Real-Time Streaming
```bash
# Stream logs in real-time (SSE)
curl https://observability.do/stream?service=gateway&level=error
```

## Log Entry Format

```typescript
interface LogEntry {
  timestamp: number           // Unix timestamp
  service: string            // Service name (e.g., "gateway", "db")
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string            // Log message
  metadata?: Record<string, any>  // Additional data
  error?: {
    name: string
    message: string
    stack?: string
  }
  requestId?: string         // Request correlation ID
  userId?: string            // User ID (if applicable)
}
```

## Storage

Logs are stored in **Cloudflare Analytics Engine** which provides:
- ✅ High write throughput
- ✅ Low storage costs
- ✅ SQL-like queries
- ✅ Real-time analytics
- ✅ Automatic retention policies

## Endpoints

### Health Check
```
GET /health
```

Returns observability worker health status.

### Log Entry
```
POST /log
Content-Type: application/json
Body: LogEntry
```

Store a new log entry.

### Query Logs
```
GET /logs/:service?level=error&limit=100&since=2025-01-01T00:00:00Z
```

Query logs for a specific service with optional filters.

### Get Errors
```
GET /errors?service=gateway&limit=50
```

Get all error-level logs, optionally filtered by service.

### Service Status
```
GET /status
```

Check health status of all services.

### Metrics
```
GET /metrics
```

Get aggregated metrics and statistics.

### Stream Logs
```
GET /stream?service=gateway&level=error
```

Stream logs in real-time using Server-Sent Events (SSE).

## Integration

### From Other Workers

```typescript
// Log from any worker
await fetch('https://observability.do/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service: 'gateway',
    level: 'error',
    message: 'Database connection failed',
    timestamp: Date.now(),
    metadata: { attempt: 3, timeout: 5000 },
    error: {
      name: 'ConnectionError',
      message: 'Failed to connect to database',
      stack: error.stack
    }
  })
})
```

### Via Service Binding

```typescript
// In wrangler.jsonc
{
  "services": [
    { "binding": "OBSERVABILITY", "service": "observability" }
  ]
}

// In worker code
await env.OBSERVABILITY.fetch('http://observability/log', {
  method: 'POST',
  body: JSON.stringify(logEntry)
})
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Deploy to production
pnpm deploy
```

## Querying Analytics Engine

Analytics Engine data can be queried using SQL:

```sql
SELECT
  index1 as service,
  index2 as level,
  blob1 as message,
  double1 as timestamp,
  COUNT(*) as count
FROM LOGS
WHERE
  index1 = 'gateway'
  AND index2 = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service, level, message
ORDER BY count DESC
LIMIT 100
```

## Future Enhancements

- [ ] Implement Analytics Engine SQL queries
- [ ] Add real-time log streaming (SSE)
- [ ] Create dashboard UI for log visualization
- [ ] Add alerting for critical errors
- [ ] Implement log retention policies
- [ ] Add structured logging helpers
- [ ] Create client SDKs for easy integration
- [ ] Add distributed tracing support

## See Also

- [Cloudflare Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Workers Analytics Engine](https://developers.cloudflare.com/workers/observability/analytics-engine/)
