# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with the workers.do platform.

## Table of Contents

1. [Deployment Errors](#1-deployment-errors)
2. [Authentication Issues](#2-authentication-issues)
3. [Performance Debugging](#3-performance-debugging)
4. [WebSocket Connection Issues](#4-websocket-connection-issues)
5. [Rate Limiting Errors](#5-rate-limiting-errors)
6. [Database and Storage Issues](#6-database-and-storage-issues)
7. [Custom Domain Problems](#7-custom-domain-problems)
8. [Support Escalation](#8-support-escalation)

---

## 1. Deployment Errors

### Error: "Script too large"

**Symptoms:**
```
Error: Script size exceeds the maximum allowed limit
```

**Cause:** Cloudflare Workers have size limits (1MB for bundled scripts on free plan, 10MB on paid plans).

**Solutions:**

1. **Tree-shake dependencies** - Use the appropriate package entry point:
   ```typescript
   // Use minimal import when possible
   import { agent } from 'agents.do/tiny'  // Instead of 'agents.do'
   ```

2. **Split into multiple workers** - Break large workers into smaller, focused services.

3. **Use external storage** - Move large data to R2 or KV instead of bundling.

4. **Check for duplicate dependencies:**
   ```bash
   pnpm why <package-name>
   ```

### Error: "Durable Object binding not found"

**Symptoms:**
```
Error: Service binding 'MY_DO' is not defined
```

**Cause:** Durable Object not properly declared in wrangler.toml.

**Solution:** Ensure your `wrangler.toml` includes the DO binding:

```toml
[[durable_objects.bindings]]
name = "MY_DO"
class_name = "MyDurableObject"

[[migrations]]
tag = "v1"
new_classes = ["MyDurableObject"]
```

### Error: "Cannot find module"

**Symptoms:**
```
Error: Cannot find module '@dotdo/do-core'
```

**Solutions:**

1. **Install missing dependencies:**
   ```bash
   pnpm install
   ```

2. **Check TypeScript paths** - Ensure `tsconfig.json` has correct path mappings.

3. **Verify package exports** - Some packages require specific entry points:
   ```typescript
   // Correct
   import { DOCore } from '@dotdo/do-core'

   // May fail if package.json exports are misconfigured
   import { DOCore } from '@dotdo/do-core/src/core'
   ```

### Error: "Migration failed"

**Symptoms:**
```
Error: Durable Object migration failed - class MyDO has changed incompatibly
```

**Cause:** Breaking changes to DO state without proper migration.

**Solutions:**

1. **Add a new migration tag:**
   ```toml
   [[migrations]]
   tag = "v2"
   renamed_classes = [{ from = "OldName", to = "NewName" }]
   ```

2. **For development** - Delete DO state (data loss warning):
   ```bash
   wrangler delete-class --class-name MyDurableObject
   ```

---

## 2. Authentication Issues

### Error: "401 Unauthorized"

**Symptoms:**
```json
{ "error": "Unauthorized" }
```

**Diagnostic Steps:**

1. **Verify API key is set:**
   ```bash
   # Check environment variable
   echo $DO_API_KEY
   # Or
   echo $ORG_AI_API_KEY
   ```

2. **Check Authorization header format:**
   ```typescript
   // Correct formats
   headers['Authorization'] = `Bearer ${token}`
   headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`
   ```

3. **Verify token hasn't expired** - JWT tokens have expiration times.

### Error: "403 Forbidden"

**Symptoms:**
```json
{ "error": "Forbidden", "message": "Insufficient permissions" }
```

**Cause:** Valid authentication but insufficient authorization.

**Solutions:**

1. **Check role/scope requirements** - Some endpoints require specific permissions.

2. **Verify organization membership** - Ensure the user belongs to the correct org.

3. **Check resource ownership** - Some resources are scoped to specific users/orgs.

### Error: "Invalid token signature"

**Symptoms:**
```json
{ "error": "Invalid token signature" }
```

**Cause:** JWT signed with wrong key or token was tampered.

**Solutions:**

1. **Regenerate the API key** in your account settings.

2. **Verify JWKS endpoint** - Ensure the JWT issuer's public keys are accessible.

3. **Check clock skew** - Server and client time must be synchronized (within 5 minutes).

### Error: "Token expired"

**Solutions:**

1. **Refresh the token** using your refresh token.

2. **Re-authenticate** if refresh token is also expired.

3. **Check token lifetime configuration** in your auth settings.

---

## 3. Performance Debugging

### Slow Response Times

**Diagnostic Steps:**

1. **Check cold start impact:**
   ```typescript
   // Add timing to your worker
   const start = Date.now()
   // ... your logic
   console.log(`Request processed in ${Date.now() - start}ms`)
   ```

2. **Monitor via Cloudflare dashboard:**
   - Workers > Analytics > Requests
   - Check CPU time and duration metrics

3. **Profile Durable Object operations:**
   ```typescript
   // Time storage operations
   const t0 = Date.now()
   await this.ctx.storage.get('key')
   console.log(`Storage get: ${Date.now() - t0}ms`)
   ```

### High CPU Time

**Causes and Solutions:**

1. **Expensive JSON operations:**
   ```typescript
   // Avoid parsing large JSON repeatedly
   // Cache parsed results
   this.cachedData ??= JSON.parse(largeJson)
   ```

2. **Inefficient loops:**
   ```typescript
   // Use batch operations instead of loops
   // Bad
   for (const key of keys) {
     await storage.get(key)
   }

   // Good
   const results = await storage.get(keys)
   ```

3. **Synchronous crypto operations** - Use Web Crypto API with streaming.

### Memory Issues

**Symptoms:**
```
Error: Memory limit exceeded
```

**Solutions:**

1. **Stream large responses:**
   ```typescript
   // Instead of loading all data
   return new Response(JSON.stringify(hugeArray))

   // Stream it
   const { readable, writable } = new TransformStream()
   // Write chunks to writable
   return new Response(readable)
   ```

2. **Paginate data queries:**
   ```typescript
   const results = await storage.list({ limit: 100, startAfter: cursor })
   ```

3. **Release references** - Set large objects to `null` when done.

---

## 4. WebSocket Connection Issues

### Error: "WebSocket upgrade failed"

**Symptoms:**
```
Error: WebSocket connection to 'wss://...' failed
```

**Diagnostic Steps:**

1. **Verify upgrade headers:**
   ```typescript
   if (request.headers.get('Upgrade') !== 'websocket') {
     return new Response('Expected WebSocket', { status: 426 })
   }
   ```

2. **Check the response:**
   ```typescript
   const { 0: client, 1: server } = new WebSocketPair()

   // Must accept the WebSocket
   this.ctx.acceptWebSocket(server)

   return new Response(null, {
     status: 101,
     webSocket: client,
   })
   ```

### Error: "WebSocket closed unexpectedly"

**Causes:**

1. **Idle timeout** - WebSockets close after 60 seconds of inactivity without hibernation.

2. **Client disconnected** - Network issues on client side.

3. **Server error** - Unhandled exception in message handler.

**Solutions:**

1. **Implement keepalive:**
   ```typescript
   // Client-side
   setInterval(() => ws.send('ping'), 30000)

   // Server-side
   async webSocketMessage(ws, message) {
     if (message === 'ping') {
       ws.send('pong')
       return
     }
   }
   ```

2. **Use hibernation mode** for cost-effective long-lived connections:
   ```typescript
   this.ctx.acceptWebSocket(ws, ['my-tag'])
   this.ctx.setWebSocketAutoResponse({
     request: 'ping',
     response: 'pong',
   })
   ```

### Error: "WebSocket message too large"

**Symptom:**
```
Error: Message size exceeds maximum allowed
```

**Solution:** Chunk large messages:
```typescript
const CHUNK_SIZE = 1024 * 1024 // 1MB chunks

function sendLargeMessage(ws, data) {
  const json = JSON.stringify(data)
  const chunks = Math.ceil(json.length / CHUNK_SIZE)

  for (let i = 0; i < chunks; i++) {
    ws.send(JSON.stringify({
      chunk: i,
      total: chunks,
      data: json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    }))
  }
}
```

### Connection Drops During Deployment

**Cause:** Workers are restarted during deployment, closing all connections.

**Solution:** Implement reconnection logic on the client:
```typescript
function connect() {
  const ws = new WebSocket('wss://...')

  ws.onclose = () => {
    console.log('Connection closed, reconnecting...')
    setTimeout(connect, 1000 + Math.random() * 2000) // Jittered backoff
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    ws.close()
  }
}
```

---

## 5. Rate Limiting Errors

### Error: "429 Too Many Requests"

**Symptoms:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
```

**Diagnostic Steps:**

1. **Check the response headers:**
   - `Retry-After`: Seconds until you can retry
   - `X-RateLimit-Remaining`: How many requests you have left
   - `X-RateLimit-Reset`: Unix timestamp when limit resets

2. **Implement exponential backoff:**
   ```typescript
   async function fetchWithRetry(url, options, maxRetries = 3) {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       const response = await fetch(url, options)

       if (response.status === 429) {
         const retryAfter = response.headers.get('Retry-After') || '1'
         const waitTime = parseInt(retryAfter) * 1000
         await new Promise(resolve => setTimeout(resolve, waitTime))
         continue
       }

       return response
     }
     throw new Error('Max retries exceeded')
   }
   ```

### Rate Limit Strategies

**Token Bucket Algorithm:**
- Allows bursts up to capacity
- Good for APIs with occasional high traffic
- Configure with `capacity` and `refillRate`

**Sliding Window Algorithm:**
- Smooth rate limiting without bursts
- Good for strict rate limiting
- Configure with `limit` and `windowMs`

**Implementation:**
```typescript
import { RateLimiter } from '@dotdo/rate-limiting'

const limiter = RateLimiter.slidingWindow({
  storage: myStorage,
  limit: 100,
  windowMs: 60000, // 1 minute
})

const result = await limiter.check(clientId)
if (!result.allowed) {
  return new Response('Rate limited', {
    status: 429,
    headers: limiter.getHeaders(result),
  })
}
```

---

## 6. Database and Storage Issues

### Error: "Storage operation failed"

**Symptoms:**
```
Error: Failed to write to storage
```

**Causes and Solutions:**

1. **Value too large:**
   ```typescript
   // KV values have a 128KB limit
   // Use R2 for larger objects
   await env.R2.put('large-file', largeData)
   ```

2. **Too many operations in transaction:**
   ```typescript
   // Batch operations have limits
   // Split into multiple batches
   const BATCH_SIZE = 128
   for (let i = 0; i < keys.length; i += BATCH_SIZE) {
     const batch = keys.slice(i, i + BATCH_SIZE)
     await storage.delete(batch)
   }
   ```

### Error: "SQL syntax error"

**Symptoms:**
```
Error: SQLITE_ERROR: near "xxx": syntax error
```

**Diagnostic Steps:**

1. **Validate SQL syntax** - Use a SQL validator.

2. **Check for reserved words:**
   ```typescript
   // Quote reserved words
   sql`SELECT * FROM "order" WHERE "key" = ${key}`
   ```

3. **Verify binding placeholders:**
   ```typescript
   // Correct
   storage.sql.exec('SELECT * FROM users WHERE id = ?', id)

   // Incorrect - no placeholder
   storage.sql.exec(`SELECT * FROM users WHERE id = ${id}`) // SQL injection risk!
   ```

### Error: "Record not found"

**Diagnostic Steps:**

1. **Check the key/ID format:**
   ```typescript
   // IDs are case-sensitive
   await storage.get('User:123')  // Different from
   await storage.get('user:123')
   ```

2. **Verify data exists:**
   ```typescript
   const all = await storage.list({ prefix: 'User:' })
   console.log('Existing keys:', [...all.keys()])
   ```

3. **Check for data corruption:**
   ```typescript
   const raw = await storage.get('key')
   console.log('Raw value:', raw)
   console.log('Type:', typeof raw)
   ```

### R2 Storage Issues

**Error: "Object not found"**
```typescript
// Check if object exists before reading
const obj = await env.R2.head('my-file')
if (!obj) {
  return new Response('Not found', { status: 404 })
}
```

**Error: "Checksum mismatch"**
- Data corrupted during transfer
- Retry the upload with checksums:
```typescript
const checksum = await crypto.subtle.digest('SHA-256', data)
await env.R2.put('file', data, {
  sha256: new Uint8Array(checksum),
})
```

---

## 7. Custom Domain Problems

### Error: "Domain not verified"

**Symptoms:**
```
Error: Domain verification failed for example.com
```

**Solutions:**

1. **Add DNS TXT record:**
   ```
   _cf-custom-hostname.example.com TXT "ca3-abcdef123456"
   ```

2. **Wait for DNS propagation** (up to 24 hours).

3. **Verify with dig:**
   ```bash
   dig TXT _cf-custom-hostname.example.com
   ```

### Error: "SSL certificate pending"

**Cause:** Certificate issuance takes time (minutes to hours).

**Diagnostic Steps:**

1. **Check certificate status** in Cloudflare dashboard.

2. **Verify domain ownership** - Certificate won't issue without verification.

3. **Check CAA records** - Must allow Cloudflare to issue certificates:
   ```
   example.com CAA 0 issue "cloudflare.com"
   ```

### Error: "Domain already in use"

**Cause:** Domain is registered with another Cloudflare account.

**Solutions:**

1. **Remove from other account** first.

2. **Contact support** if you own the domain but can't access the other account.

### Routing Not Working

**Symptoms:** Domain resolves but shows wrong content.

**Diagnostic Steps:**

1. **Check DNS records:**
   ```bash
   dig example.com A
   dig example.com CNAME
   ```

2. **Verify route configuration:**
   ```toml
   # wrangler.toml
   routes = [
     { pattern = "example.com/*", zone_name = "example.com" }
   ]
   ```

3. **Clear browser cache** - Old DNS entries may be cached.

### CORS Errors on Custom Domain

**Symptoms:**
```
Access to fetch at 'https://api.example.com' from origin 'https://app.example.com'
has been blocked by CORS policy
```

**Solution:** Configure CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.example.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// Include in responses
return new Response(body, { headers: { ...corsHeaders, ...otherHeaders } })
```

---

## 8. Support Escalation

### Self-Service Resources

1. **Documentation:** https://developers.cloudflare.com/workers/
2. **Community Forum:** https://community.cloudflare.com/
3. **GitHub Issues:** Report bugs at the relevant repository

### When to Contact Support

- Service outages affecting production
- Security vulnerabilities
- Account/billing issues
- Unexplained data loss

### Information to Include

When escalating, provide:

1. **Account details:**
   - Account ID
   - Worker name(s)
   - Affected domain(s)

2. **Error information:**
   - Full error message
   - HTTP status codes
   - Request ID (from response headers)

3. **Reproduction steps:**
   - Minimal code example
   - Request/response examples
   - Timeline of when issue started

4. **Environment:**
   - Wrangler version: `wrangler --version`
   - Node.js version: `node --version`
   - Operating system

### Example Support Request

```
Subject: 500 errors on production worker

Account ID: abc123
Worker: my-production-worker
Domain: api.example.com

Issue: Intermittent 500 errors started at 2024-01-15 14:30 UTC

Error message from logs:
"Error: Storage operation failed: timeout after 30s"

Request ID: cf-ray-abc123

Reproduction:
1. Send POST to https://api.example.com/users
2. Body: {"name": "test"}
3. Error occurs approximately 1 in 10 requests

Environment:
- Wrangler 3.24.0
- Node.js 20.10.0
- macOS 14.2

Already tried:
- Redeploying worker
- Checking storage limits
- Reviewing recent code changes
```

---

## Quick Reference: Common Error Codes

| HTTP Status | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 | Bad Request | Invalid JSON, missing required fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method (GET vs POST) |
| 408 | Request Timeout | Operation took too long |
| 413 | Payload Too Large | Request body exceeds limits |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception in worker |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Worker overloaded or maintenance |

---

## Quick Reference: Diagnostic Commands

```bash
# Check worker logs
wrangler tail

# Deploy with debug output
wrangler deploy --verbose

# Test locally
wrangler dev

# Check secrets
wrangler secret list

# View KV keys
wrangler kv:key list --binding=MY_KV

# Check R2 buckets
wrangler r2 bucket list

# Verify DNS
dig example.com A
dig example.com CNAME
dig TXT _cf-custom-hostname.example.com
```
