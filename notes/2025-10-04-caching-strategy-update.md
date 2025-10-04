# Caching Strategy Update - R2 SQL + Cache Layer

**Date:** 2025-10-04
**Status:** Complete
**Previous:** Phase 1 MVP Implementation
**Update:** Added Direct Lookup benchmark and caching strategy

## Summary

Based on user feedback that **ClickHouse can return md/html files from ns+id in < 100ms**, we've added a critical Direct Lookup benchmark and a middle-ground architecture option using Cloudflare Cache API with Stale-While-Revalidate (SWR) pattern.

## User Requirements

**Critical Insight:**
> "clickhouse will return an md/html file from ns/id in < 100ms ... i'm sure r2 sql will be slower, but if its more than 500ms i will be concerned"
>
> "now if we can solve it with a good cloudflare caching layer + swr, we may still be able to use r2 sql, but i need to understand where we sit"
>
> "(assuming from us east 1"

**Key Takeaways:**
1. Direct ns+id lookup is the MOST CRITICAL operation
2. ClickHouse baseline: < 100ms
3. R2 SQL threshold: < 500ms acceptable
4. Region: us-east-1
5. Caching layer with SWR could solve latency issues even if R2 SQL is slower

## Changes Made

### 1. Added Direct Lookup Benchmark (MOST CRITICAL)

**New Benchmark 1:**
```sql
SELECT
  ulid, timestamp, mutation_type,
  content_json, content_code, content_markdown, content_html, content_ast,
  content_length, content_hash, content_language
FROM events
WHERE event_type = 'content'
  AND entity_ns = 'en.wikipedia.org'
  AND entity_id = 'TypeScript'
ORDER BY timestamp DESC
LIMIT 1
```

**Threshold:** < 500ms (ClickHouse does this in < 100ms)

### 2. Updated Recent Content Threshold

**Old:** < 1 second
**New:** < 500ms (adjusted for us-east-1 region)

### 3. Renumbered Benchmarks

- Benchmark 1: Direct Lookup (NEW) ⭐ MOST CRITICAL
- Benchmark 2: Recent Content (was 1)
- Benchmark 3: Full-Text Search (was 2)
- Benchmark 4: Aggregations (was 3)
- Benchmark 5: Deduplication (was 4)
- Benchmark 6: Historical Queries (was 5)

### 4. Added 3 Architecture Options

#### Option 1: R2 SQL Only ($34/month)

**Condition:** Direct Lookup < 500ms

**Latency:**
- Direct Lookup: < 500ms (cold)
- Recent Content: < 500ms
- Full-Text Search: < 5s

**Best for:** Low traffic, cold data, batch processing

#### Option 2: R2 SQL + Cache Layer ($34/month) ⭐ RECOMMENDED

**Condition:** Direct Lookup 500-2000ms

**Strategy:** Cloudflare Cache API with Stale-While-Revalidate (SWR)

**Latency:**
- Direct Lookup: 500-2000ms (cold, first hit)
- Direct Lookup: < 50ms (hot, from edge cache)
- Cache hit ratio: ~80-90% for popular content

**Implementation:**
```typescript
// Cache-first with SWR pattern
const cache = caches.default
const cacheKey = new Request(`https://cache/${ns}/${id}`)

// Try cache first
let response = await cache.match(cacheKey)

if (response) {
  // Cache hit - return immediately
  // Optionally: revalidate in background if stale
  return response
}

// Cache miss - fetch from R2 SQL
response = await fetchFromR2SQL(ns, id)

// Cache for 1 hour, stale-while-revalidate for 24 hours
response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
await cache.put(cacheKey, response.clone())

return response
```

**Cost Breakdown:**
- R2 SQL: $34/month (same as Option 1)
- Cache storage: ~$0.50/month (10 GB popular content)
- **Total: ~$35/month**

**Key Benefits:**
- Near-ClickHouse performance for popular content (< 50ms)
- 10x cheaper than ClickHouse ($35 vs $432)
- Acceptable first-hit latency (500-2000ms) for rare content
- Cloudflare Cache API is free (only pay for storage)

**Best for:** Medium-high traffic, popular content gets cached, acceptable first-hit latency

#### Option 3: ClickHouse + R2 SQL ($432/month)

**Condition:** Direct Lookup > 2000ms OR Full-Text Search > 5000ms

**Strategy:** Hot data in ClickHouse, cold data in R2 SQL

**Latency:**
- Direct Lookup: < 100ms (ClickHouse hot data)
- Full-Text Search: < 1000ms (ClickHouse)
- Cold Data: < 5000ms (R2 SQL archive)

**Data Flow:**
```
Pipeline → ClickHouse (last 30 days, hot queries)
         ↘ R2 SQL (all data, cold archive)

Queries:
- Recent/Popular → ClickHouse (< 100ms)
- Historical/Rare → R2 SQL (< 5000ms)
```

**Cost:** $432/month

**Best for:** High traffic, real-time analytics, sub-100ms latency required

## Decision Framework

```
┌─────────────────────────────────────┐
│ Direct Lookup Benchmark Results     │
└─────────────────────────────────────┘
              ↓
         < 500ms?
              ↓
        Yes ──┴── No
         ↓          ↓
    Option 1    500-2000ms?
    R2 SQL           ↓
    $34/mo     Yes ──┴── No
                ↓          ↓
           Option 2   Option 3
           + Cache    ClickHouse
           $35/mo     $432/mo
```

## Why Option 2 is Recommended

### Cost Efficiency

**Option 2 vs Option 3:**
- **12x cheaper:** $35/month vs $432/month
- **Same effective latency** for 80-90% of queries (cached)
- **Only marginal degradation** for cache misses (500-2000ms vs 100ms)

### Real-World Traffic Patterns

**80/20 Rule:**
- 80% of queries are for 20% of content (popular pages)
- Cache hit ratio: ~80-90% with proper TTLs
- First-hit penalty: Only 10-20% of queries

**Example:**
- 100,000 queries/day
- 80,000 cache hits: < 50ms (same as ClickHouse)
- 20,000 cache misses: 500-2000ms (still acceptable)

### Cloudflare Edge Cache Benefits

1. **Global Distribution:** Content cached at 300+ edge locations
2. **Free Cache API:** Only pay for storage (~$0.50/month)
3. **Automatic Invalidation:** TTL and stale-while-revalidate
4. **No Infrastructure:** Fully managed, zero maintenance

### When to Use ClickHouse Instead

Only if:
1. **Direct Lookup > 2000ms** - Even with caching, first-hit too slow
2. **Full-Text Search > 5000ms** - Can't cache search results effectively
3. **Real-time analytics required** - Need sub-100ms for all queries
4. **Very high traffic (10M+ queries/day)** - Cache miss volume too high

## Implementation Plan

### Phase 1: Benchmark R2 SQL (Current)
1. ✅ Create benchmark worker
2. ⏳ Configure R2 Data Catalog
3. ⏳ Generate 10K test pages
4. ⏳ Run Direct Lookup benchmark
5. ⏳ Measure actual latency from us-east-1

### Phase 2A: If Direct Lookup < 500ms → Option 1
- Deploy R2 SQL only
- No caching needed
- **Cost: $34/month**

### Phase 2B: If Direct Lookup 500-2000ms → Option 2 (LIKELY)
- Deploy R2 SQL
- Implement Cache API with SWR
- Monitor cache hit ratio
- **Cost: $35/month**

### Phase 2C: If Direct Lookup > 2000ms → Option 3
- Deploy ClickHouse + R2 SQL
- Hot data in ClickHouse (30 days)
- Cold data in R2 SQL (archive)
- **Cost: $432/month**

## Cache Implementation Details

### Cache Key Design

```typescript
// Use consistent cache keys
const cacheKey = new Request(`https://cache.internal/${ns}/${id}`)

// Support variants
const cacheKeyVariant = new Request(`https://cache.internal/${ns}/${id}#${variant}`)
```

### Cache TTLs

```typescript
// Popular content (high traffic)
'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
// 1 hour fresh, 24 hours stale

// Regular content (medium traffic)
'Cache-Control': 'public, max-age=1800, stale-while-revalidate=43200'
// 30 min fresh, 12 hours stale

// Rare content (low traffic)
'Cache-Control': 'public, max-age=600, stale-while-revalidate=7200'
// 10 min fresh, 2 hours stale
```

### Background Revalidation

```typescript
// Serve stale content immediately, revalidate in background
if (response && isStale(response)) {
  // Return stale content immediately
  ctx.waitUntil(revalidateInBackground(ns, id))
  return response
}
```

### Cache Invalidation

```typescript
// On content update (mutation)
await cache.delete(cacheKey)
await cache.delete(cacheKeyVariant)

// Or use versioned cache keys
const versionedKey = new Request(`https://cache.internal/${ns}/${id}?v=${timestamp}`)
```

## Expected Performance

### Option 2: R2 SQL + Cache (Assuming 500-2000ms R2 SQL latency)

**Traffic Pattern:** 100,000 queries/day
- **80,000 cache hits (80%):**
  - Latency: < 50ms
  - Source: Edge cache
  - Experience: Same as ClickHouse

- **20,000 cache misses (20%):**
  - Latency: 500-2000ms (avg 1000ms)
  - Source: R2 SQL
  - Experience: Acceptable for first hit

**Average Latency:**
```
(80,000 × 50ms + 20,000 × 1000ms) / 100,000
= (4,000,000ms + 20,000,000ms) / 100,000
= 24,000,000ms / 100,000
= 240ms average
```

**vs ClickHouse:**
```
100,000 × 100ms / 100,000 = 100ms average
```

**Trade-off:**
- 2.4x slower on average (240ms vs 100ms)
- But 12x cheaper ($35 vs $432)
- Still very acceptable for most use cases

## Next Steps

1. ✅ Add Direct Lookup benchmark
2. ✅ Define 3 architecture options
3. ✅ Document caching strategy
4. ⏳ Configure R2 Data Catalog
5. ⏳ Run benchmarks
6. ⏳ Measure Direct Lookup latency
7. ⏳ Implement chosen option
8. ⏳ Monitor cache hit ratio

## Success Criteria

### Benchmarking Phase
- Direct Lookup latency measured from us-east-1
- All 6 benchmarks executed with real data
- Results documented for architecture decision

### Implementation Phase (Option 2)
- Cache hit ratio > 80%
- Cache latency < 50ms
- R2 SQL latency < 2000ms
- Total cost < $50/month

## Conclusion

Adding the caching layer strategy provides a middle ground between R2 SQL only and ClickHouse, offering near-ClickHouse performance for popular content at 1/12th the cost. This is the recommended approach if R2 SQL Direct Lookup is 500-2000ms, which is likely.

The key insight is that **most queries are for popular content** (80/20 rule), so caching at the edge solves the latency problem for the majority of traffic while keeping costs low.

**Decision pending:** Run benchmarks to measure actual R2 SQL Direct Lookup latency from us-east-1.

---

**Updated:** 2025-10-04
**By:** Claude Code
**Commits:** 97c9562, 5cfcdf9
**Files Changed:** 3 files, 231 insertions, 31 deletions
