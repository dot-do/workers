# Graph Database Schema - Visual Reference

## Things (Entities)

All entities stored in the `things` table with polymorphic `type` field:

```
┌─────────────────────────────────────────────────────────────┐
│ things                                                      │
├─────────────────────────────────────────────────────────────┤
│ id: TEXT PRIMARY KEY                                        │
│ type: TEXT (model|dataset|experiment|deployment|user|org)   │
│ name: TEXT                                                  │
│ description: TEXT                                           │
│ metadata: JSON (type-specific fields)                       │
│ status: TEXT (active|archived|deprecated)                   │
│ version: TEXT                                               │
│ tags: JSON                                                  │
│ created_at: INTEGER                                         │
│ updated_at: INTEGER                                         │
│ created_by: TEXT                                            │
└─────────────────────────────────────────────────────────────┘
```

### Thing Types

**model** - AI/ML models
```json
{
  "metadata": {
    "framework": "openai|anthropic|cloudflare-ai",
    "model_type": "text-generation|embedding|classification",
    "provider": "openai|anthropic|cloudflare",
    "model_name": "gpt-4-turbo-preview",
    "architecture": "transformer",
    "parameters": 1760000000000,
    "input_schema": {},
    "output_schema": {},
    "r2_path": "s3://bucket/model.bin",
    "vector_id": "embedding-123"
  }
}
```

**dataset** - Training/evaluation data
```json
{
  "metadata": {
    "size_bytes": 1000000000,
    "num_samples": 1000000,
    "split": "train|test|validation",
    "format": "jsonl|parquet|csv",
    "r2_path": "s3://bucket/dataset.jsonl",
    "schema": {}
  }
}
```

**experiment** - A/B tests, trials
```json
{
  "metadata": {
    "experiment_type": "ab_test|hyperparameter_tuning",
    "start_time": 1234567890,
    "end_time": 1234567890,
    "status": "running|completed|failed",
    "results": {}
  }
}
```

**deployment** - Production environments
```json
{
  "metadata": {
    "environment": "production|staging|development",
    "region": "us-west|eu-central",
    "url": "https://api.example.com",
    "status": "active|inactive",
    "traffic_percent": 100
  }
}
```

## Relationships (Edges)

All relationships stored in the `relationships` table:

```
┌─────────────────────────────────────────────────────────────┐
│ relationships                                               │
├─────────────────────────────────────────────────────────────┤
│ id: TEXT PRIMARY KEY                                        │
│ source_id: TEXT → things(id)                                │
│ target_id: TEXT → things(id)                                │
│ type: TEXT (trainedOn|derivedFrom|deployedTo|...)           │
│ properties: JSON (relationship-specific data)               │
│ created_at: INTEGER                                         │
│ created_by: TEXT                                            │
└─────────────────────────────────────────────────────────────┘
```

### Relationship Types

**trainedOn** - Model trained on Dataset
```
Model ──trainedOn──> Dataset
properties: { split: "train", epochs: 10, batch_size: 32 }
```

**derivedFrom** - Model version derived from base Model
```
Model v2.0 ──derivedFrom──> Model v1.0
properties: { version: "2.0.0", changes: "Added fine-tuning" }
```

**deployedTo** - Model deployed to Deployment
```
Model ──deployedTo──> Deployment
properties: { deployed_at: 1234567890, version: "1.0.0" }
```

**replacedBy** - Model replaced by newer Model
```
Model (deprecated) ──replacedBy──> Model (active)
properties: { reason: "performance", replaced_at: 1234567890 }
```

**evaluatedOn** - Model evaluated on Dataset
```
Model ──evaluatedOn──> Dataset
properties: { metrics: { accuracy: 0.95, f1: 0.93 } }
```

**approvedBy** - Model approved by User
```
Model ──approvedBy──> User
properties: { approval_date: 1234567890, compliance_checks: [] }
```

**dependsOn** - Model depends on other Model
```
Model A ──dependsOn──> Model B
properties: { dependency_type: "embedding_model" }
```

**usedBy** - Model used by Experiment/Application
```
Model ──usedBy──> Experiment
properties: { usage_type: "inference", request_count: 1000 }
```

## Graph Patterns

### Pattern 1: Model Lifecycle

```
┌────────────┐
│ Dataset A  │
└─────┬──────┘
      │ trainedOn
      ↓
┌────────────┐  derivedFrom  ┌────────────┐  derivedFrom  ┌────────────┐
│ Model v1.0 │◄──────────────│ Model v2.0 │◄──────────────│ Model v3.0 │
└─────┬──────┘               └─────┬──────┘               └─────┬──────┘
      │ deployedTo                  │ deployedTo                 │ deployedTo
      ↓                             ↓                            ↓
┌────────────┐               ┌────────────┐               ┌────────────┐
│Deployment A│               │Deployment B│               │Deployment C│
│ (archived) │               │ (staging)  │               │   (prod)   │
└────────────┘               └────────────┘               └────────────┘
```

### Pattern 2: Multi-Dataset Training

```
┌────────────┐
│ Dataset A  │─┐
└────────────┘ │
               │
┌────────────┐ │ trainedOn
│ Dataset B  │─┼─────────────> ┌─────────┐
└────────────┘ │               │  Model  │
               │               └────┬────┘
┌────────────┐ │                    │ evaluatedOn
│ Dataset C  │─┘                    ↓
└────────────┘                 ┌────────────┐
                               │ Dataset D  │
                               │ (test set) │
                               └────────────┘
```

### Pattern 3: A/B Testing

```
                     ┌────────────┐
                     │Experiment  │
                     │  AB-001    │
                     └─────┬──────┘
                           │ usedBy
          ┌────────────────┼────────────────┐
          │                │                │
          ↓                ↓                ↓
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │ GPT-4    │     │ Claude 3 │    │ Llama 3  │
    │ Turbo    │     │  Opus    │    │   8B     │
    └────┬─────┘     └────┬─────┘    └────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          │ deployedTo
                          ↓
                    ┌──────────┐
                    │Production│
                    │Deployment│
                    └──────────┘
```

### Pattern 4: Replacement Chain

```
┌────────────┐   replacedBy   ┌────────────┐   replacedBy   ┌────────────┐
│  Model A   │──────────────> │  Model B   │──────────────> │  Model C   │
│(deprecated)│                │ (archived) │                │  (active)  │
└────────────┘                └────────────┘                └────────────┘
```

### Pattern 5: Model Dependency Tree

```
                    ┌──────────────┐
                    │  Base Model  │
                    │   (GPT-4)    │
                    └───────┬──────┘
                            │ dependsOn
            ┌───────────────┼───────────────┐
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Embedding     │ │Fine-tuned    │ │Classification│
    │  Model       │ │  Model       │ │   Model      │
    └──────────────┘ └──────────────┘ └──────────────┘
```

## Traversal Examples

### Get Model Lineage (Upstream Dependencies)

```sql
-- Start from model, traverse backwards through 'derivedFrom' and 'trainedOn'
WITH RECURSIVE lineage AS (
  -- Base case: starting model
  SELECT id, type, name FROM things WHERE id = ?
  
  UNION ALL
  
  -- Recursive case: follow relationships backwards
  SELECT t.id, t.type, t.name
  FROM things t
  JOIN relationships r ON t.id = r.target_id
  JOIN lineage l ON r.source_id = l.id
  WHERE r.type IN ('derivedFrom', 'trainedOn')
)
SELECT * FROM lineage;
```

### Get Impact Analysis (Downstream Dependents)

```sql
-- Start from model, traverse forwards through all relationships
WITH RECURSIVE impact AS (
  -- Base case: starting model
  SELECT id, type, name FROM things WHERE id = ?
  
  UNION ALL
  
  -- Recursive case: follow relationships forwards
  SELECT t.id, t.type, t.name
  FROM things t
  JOIN relationships r ON t.id = r.target_id
  JOIN impact i ON r.source_id = i.id
)
SELECT * FROM impact;
```

### Find Active Production Models

```sql
-- Models currently deployed to production
SELECT DISTINCT m.*
FROM things m
JOIN relationships r ON m.id = r.source_id
JOIN things d ON r.target_id = d.id
WHERE m.type = 'model'
  AND m.status = 'active'
  AND r.type = 'deployedTo'
  AND d.type = 'deployment'
  AND d.metadata->>'environment' = 'production';
```

### Find Models Needing Retraining

```sql
-- Models trained on datasets that have been updated
SELECT m.*, d.name as dataset_name, d.updated_at
FROM things m
JOIN relationships r ON m.id = r.source_id
JOIN things d ON r.target_id = d.id
WHERE m.type = 'model'
  AND r.type = 'trainedOn'
  AND d.type = 'dataset'
  AND d.updated_at > m.created_at;
```

## Indexes

Optimized for common query patterns:

```sql
-- Thing lookup by type (models, datasets, etc.)
CREATE INDEX idx_things_type ON things(type);

-- Thing lookup by status (active, deprecated)
CREATE INDEX idx_things_status ON things(status);

-- Time-based queries (created_at)
CREATE INDEX idx_things_created_at ON things(created_at);

-- Relationship traversal (source → target)
CREATE INDEX idx_relationships_source ON relationships(source_id);

-- Relationship traversal (target → source)
CREATE INDEX idx_relationships_target ON relationships(target_id);

-- Relationship filtering by type
CREATE INDEX idx_relationships_type ON relationships(type);

-- Time-based relationship queries
CREATE INDEX idx_relationships_created_at ON relationships(created_at);
```

## Performance Characteristics

**Thing Queries:**
- Lookup by ID: O(1) - Primary key index
- Filter by type: O(log n) - B-tree index
- Filter by status: O(log n) - B-tree index

**Relationship Queries:**
- Get outgoing edges: O(log n) - source_id index
- Get incoming edges: O(log n) - target_id index
- Filter by type: O(log n) - type index

**Graph Traversal:**
- BFS (3 levels): O(n * m) where n = nodes, m = avg edges
- Typical: < 100ms for 10 nodes, 20 edges
- Max depth: 3 (configurable)

**Aggregations:**
- Count by type: O(n) - Full table scan with type filter
- Group by provider: O(n) - JSON extraction + group
- Time-series bucketing: O(n) - Full scan with date range

## Scaling Considerations

**D1 Limits:**
- Max database size: 10 GB
- Max rows: ~10 billion
- Max query time: 30 seconds
- Max connections: 10 per Worker

**Estimated Capacity:**
- Things: ~10 million (avg 1 KB each)
- Relationships: ~100 million (avg 100 bytes each)
- Metrics: ~1 billion (avg 100 bytes each)
- Costs: ~100 million (avg 100 bytes each)

**Optimization Strategies:**
- Partition by date (archive old data)
- Use Analytics Engine for metrics (time-series)
- Cache frequently accessed things (Durable Objects)
- Batch writes (transactions)
- Denormalize hot paths (model_versions table)

## Comparison to Other Graph DBs

**vs Neo4j:**
- ✅ Simpler schema (just 2 tables)
- ✅ No server management (serverless)
- ✅ Edge execution (low latency)
- ❌ Less expressive queries (no Cypher)
- ❌ Slower traversal (recursive CTEs vs native graph)

**vs DynamoDB Single-Table:**
- ✅ Easier to query (SQL vs key-value)
- ✅ Relationships as first-class (not access patterns)
- ✅ ACID transactions (not eventual consistency)
- ❌ Less flexible schema (vs JSON documents)
- ❌ Smaller scale (10 GB vs unlimited)

**vs PostgreSQL + Foreign Keys:**
- ✅ Polymorphic things (vs many tables)
- ✅ Flexible relationships (vs rigid schema)
- ✅ Edge execution (vs centralized)
- ❌ Less type safety (JSON vs typed columns)
- ❌ Smaller scale (10 GB vs TBs)

## Best Practices

**Thing Design:**
- Keep metadata JSON small (< 1 KB)
- Use tags for filtering, not metadata
- Store large blobs in R2, not metadata
- Index frequently queried JSON fields

**Relationship Design:**
- Keep properties JSON small (< 100 bytes)
- Use type field for filtering
- Create specific relationship types (not generic "related")
- Document relationship semantics

**Query Optimization:**
- Use indexes for all WHERE clauses
- Limit recursion depth (default: 3)
- Cache lineage graphs (Durable Objects)
- Batch reads (prepared statements)

**Schema Evolution:**
- Add new thing types without migration
- Add new relationship types without migration
- Version metadata schemas (metadata.version field)
- Migrate data lazily (on read)
