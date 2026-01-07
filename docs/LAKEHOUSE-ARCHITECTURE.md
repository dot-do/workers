# Event-Sourced Lakehouse Platform Architecture

> AI-native data platform on Cloudflare combining event sourcing with tiered lakehouse storage

## Executive Summary

This document outlines the architecture for building an AI-native data platform that powers rewrites of enterprise data platforms (Snowflake, Databricks, Teradata, Cloudera, Firebolt, SAP HANA) on Cloudflare's primitives.

**Core Innovation:** Durable Objects with SQLite provide the "hot tier" for event sourcing, while Apache Iceberg on R2 provides the "cold tier" for analytical queries. AI agents are first-class citizens with natural language query capabilities.

## Architecture Overview

```
                     ┌─────────────────────────────────────────┐
                     │           Agent Layer                    │
                     │  priya`analyze sales` → NL-to-SQL → DO  │
                     └─────────────────────────────────────────┘
                                        │
                     ┌─────────────────────────────────────────┐
                     │           Query Router                   │
                     │  Analyze query → Route to optimal tier  │
                     └─────────────────────────────────────────┘
                           │              │              │
              ┌────────────┴──┐    ┌──────┴──────┐    ┌──┴────────────┐
              │   HOT TIER    │    │  WARM TIER  │    │   COLD TIER   │
              │  DO SQLite    │    │ R2 Parquet  │    │  R2 Iceberg   │
              │  (0-72 hrs)   │    │ (3-90 days) │    │   (90+ days)  │
              │               │    │             │    │               │
              │ • Events      │    │ • Row groups│    │ • Snapshots   │
              │ • Projections │    │ • Statistics│    │ • Time travel │
              │ • HNSW vectors│    │ • Clustering│    │ • Schema evol │
              └───────────────┘    └─────────────┘    └───────────────┘
                     │                   │                   │
                     └───────────────────┼───────────────────┘
                                        │
                     ┌─────────────────────────────────────────┐
                     │          CDC Pipeline                    │
                     │  Events → Parquet → Iceberg → R2 SQL   │
                     └─────────────────────────────────────────┘
```

## Data Architecture

### 1. Event Model

Extended `DomainEvent` with lakehouse semantics:

```typescript
interface LakehouseEvent<T> extends DomainEvent<T> {
  // Partitioning for efficient cold storage
  partitionKey: string           // e.g., "2024-01-15"
  clusteringKeys?: string[]      // Within-partition ordering

  // Schema evolution
  schemaVersion: number
  schemaId?: string

  // Tiering hints
  tierHint?: 'hot' | 'warm' | 'cold'
  ttlSeconds?: number

  // Vector embedding for AI operations
  embedding?: Float32Array       // MRL embedding (1024 dims)
}
```

### 2. Three-Tier Storage

| Tier | Storage | Latency | Use Case |
|------|---------|---------|----------|
| **Hot** | DO SQLite | <10ms | Events, projections, point queries |
| **Warm** | R2 Parquet | 100-500ms | Recent aggregations, scans |
| **Cold** | R2 Iceberg | 500ms-2s | Historical analytics, time travel |

### 3. Query Routing

```typescript
class QueryRouter {
  route(query: LakehouseQuery): QueryPlan {
    const timeRange = extractTimeRange(query)
    const now = Date.now()

    const tiers = []

    // Hot: last 72 hours
    if (timeRange.end > now - 72 * 3600 * 1000) {
      tiers.push({ tier: 'hot', ... })
    }

    // Warm: 72 hours to 90 days
    if (timeRange.overlaps(warmWindow)) {
      tiers.push({ tier: 'warm', ... })
    }

    // Cold: older than 90 days
    if (timeRange.start < now - 90 * 24 * 3600 * 1000) {
      tiers.push({ tier: 'cold', ... })
    }

    return { tiers, mergeStrategy: 'time_ordered' }
  }
}
```

## Compute Architecture

### Durable Object Hierarchy

```
LakehouseCoordinator (singleton)
├── DatabaseDO (per database)
│   ├── TableDO (per table)
│   │   └── PartitionDO (per partition)
│   └── ViewDO (materialized views)
├── QueryDO (per query)
├── PipelineDO (per pipeline)
└── AgentDO (per agent)
```

### Sharding Strategies

**Geographic Sharding:**
```typescript
routeByLocation(location: CFLocation): DONamespace {
  const region = mapColoToRegion(location.colo)
  return env[`LAKEHOUSE_${region}`]
}
```

**Tenant Sharding:**
```typescript
routeByTenant(tenantId: string): DONamespace {
  const shardKey = consistentHash(tenantId) % 256
  return env.LAKEHOUSE.idFromName(`shard-${shardKey}`)
}
```

**Time-Based Sharding:**
```typescript
routeByTime(timestamp: number): DONamespace {
  const shardKey = alignToHourBoundary(timestamp)
  return env.LAKEHOUSE.idFromName(`hour-${shardKey}`)
}
```

## Vector Search Architecture

### MRL (Matryoshka Representation Learning)

Truncatable embeddings for efficient multi-resolution search:

```typescript
interface MRLEmbedding {
  full: Float32Array          // 1024 dimensions
  prefixes: {
    d64: Float32Array         // Coarse filtering
    d128: Float32Array
    d256: Float32Array
    d512: Float32Array
  }
}
```

### Tiered Vector Search

| Tier | Index Type | Dimensions | Use Case |
|------|-----------|------------|----------|
| Hot | HNSW | 1024 | Real-time search |
| Warm | IVF + PQ | 256 | Recent history |
| Cold | Clustered scan | 64 | Deep history |

## Agent Architecture

### Natural Language Queries

```typescript
const warehouse = snowflake.warehouse('analytics')

// Agent-first interface
await warehouse`top 10 products by revenue this quarter`

// Translates to:
SELECT product_id, SUM(revenue) as total
FROM sales
WHERE timestamp >= DATE_TRUNC('quarter', CURRENT_DATE)
GROUP BY product_id
ORDER BY total DESC
LIMIT 10
```

### Agent Permissions

```typescript
interface AgentPermissions {
  databases: Map<string, DatabasePermission>
  tables: Map<string, TablePermission>
  columns: Map<string, ColumnPermission>  // PII masking
  rowFilters: Map<string, RowFilter>      // Row-level security
}
```

## Platform Rewrites

### Mapping Enterprise Platforms to Cloudflare

| Platform | Key Innovation | Cloudflare Implementation |
|----------|---------------|--------------------------|
| **Snowflake** | Virtual Warehouses | `WarehouseDO` with auto-suspend |
| **Databricks** | Unity Catalog | `CatalogDO` + R2 Iceberg |
| **Teradata** | MPP/AMPs | Hash-sharded DOs |
| **Cloudera** | HDFS/YARN | R2 + DO orchestration |
| **Firebolt** | Sparse indexes | DO bloom filters |
| **SAP HANA** | HTAP | DO SQLite + projections |

### SDK Structure

```
sdks/
  lakehouse.do/     # Core lakehouse SDK
  iceberg.do/       # Iceberg-specific SDK
  snowflake.do/     # Snowflake compatibility
  databricks.do/    # Databricks compatibility
  teradata.do/      # Teradata compatibility
  cloudera.do/      # Cloudera compatibility
  firebolt.do/      # Firebolt compatibility
  hana.do/          # SAP HANA compatibility
```

## Implementation Phases

### Phase 1: Core Foundation (Weeks 1-6)
- [ ] `LakehouseEvent` type with partition keys
- [ ] `TieredStorageMixin` for DO
- [ ] Basic CDC pipeline to warm tier
- [ ] Hot tier query execution

### Phase 2: Vector Search (Weeks 7-12)
- [ ] MRL embedding integration
- [ ] HNSW hot tier index
- [ ] IVF warm tier search
- [ ] Query router implementation

### Phase 3: Agent Integration (Weeks 13-18)
- [ ] NL-to-SQL translation
- [ ] Agent permission model
- [ ] MCP server with tools
- [ ] Collaborative workflows

### Phase 4: Platform Rewrites (Weeks 19-30)
- [ ] Snowflake compatibility
- [ ] Databricks compatibility
- [ ] Teradata/Cloudera/Firebolt/HANA

## Trade-offs

### Why Iceberg over Delta Lake?
- Vendor-neutral with wider ecosystem
- Hidden partitioning (no rewrites)
- Better schema evolution
- R2 SQL compatibility likely

### Why R2 SQL over Custom Engine?
- Managed infrastructure
- Pay-per-query cost model
- Native R2 integration
- Future-proof

### Cross-DO Transactions?
- Saga pattern with compensation
- Design for single-DO aggregates
- Idempotent operations
- Comprehensive logging

## Related Issues

- `workers-4i4k8`: Master Epic - Event-Sourced Lakehouse Platform
- `workers-k9cbj`: rewrites/snowflake
- `workers-gn7jc`: rewrites/databricks
- `workers-ez4jq`: rewrites/teradata
- `workers-jcmhb`: rewrites/cloudera
- `workers-xa1jx`: rewrites/firebolt
- `workers-urifr`: rewrites/hana
- `workers-d6zzp`: sdk/iceberg

## References

- [Apache Iceberg Spec](https://iceberg.apache.org/spec/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [workers.do Architecture](./ARCHITECTURE.md)
