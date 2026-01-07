# Teradata on Cloudflare Durable Objects - TDD Issue Breakdown

## Overview

This document provides a comprehensive TDD (Test-Driven Development) breakdown for reimplementing Teradata's MPP (Massively Parallel Processing) architecture on Cloudflare's serverless infrastructure.

### Architecture Mapping

| Teradata Component | Cloudflare Implementation |
|-------------------|--------------------------|
| **AMP (Access Module Processor)** | Hash-sharded Durable Objects with SQLite |
| **PE (Parsing Engine)** | Edge Workers for query coordination |
| **BYNET** | Cloudflare's global network + DO RPC |
| **Disk Arrays** | R2 Object Storage (warm/cold tiers) |
| **Spool Space** | Ephemeral SQLite tables in DOs |
| **Data Dictionary (DBC)** | Metadata DO with catalog views |
| **Unity** | Federation DO for cross-system queries |

### TDD Pattern

Each feature follows the RED -> GREEN -> REFACTOR cycle:

- **[RED]** Write failing tests that define expected behavior
- **[GREEN]** Implement minimal code to pass tests
- **[REFACTOR]** Improve code quality while maintaining passing tests

---

## Epic Hierarchy

```
teradata-1ja: Teradata on Cloudflare Durable Objects
|
+-- teradata-dtt: Phase 1: Core Infrastructure (P1)
+-- teradata-duh: Phase 2: PE and Query Processing (P1)
+-- teradata-co9: Phase 3: Query Optimizer (P2)
+-- teradata-wpj: Phase 4: Execution Engine (P1)
+-- teradata-cvn: Phase 5: Index Support (P2)
+-- teradata-zk5: Phase 6: Workload Management (P2)
+-- teradata-fki: Phase 7: Bi-Temporal Tables (P2)
+-- teradata-hky: Phase 8: Data Dictionary DBC (P2)
+-- teradata-95b: Phase 9: Unity Federation (P3)
+-- teradata-90h: Phase 10: Tiered Storage (P2)
+-- teradata-kh1: Phase 11: Client SDK (P1)
+-- teradata-ufr: Phase 12: MCP Tools (P2)
```

---

## Phase 1: Core Infrastructure

**Epic:** `teradata-dtt`
**Priority:** P1 (Critical Path)
**Dependencies:** None (Foundation)

### 1.1 Hash Distribution Module

The hash distribution module is the foundation of Teradata's data distribution. It ensures rows are evenly distributed across AMPs based on the Primary Index (PI).

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-vdh` | [RED] | Hash function distributes rows evenly across AMPs | M | None |
| `teradata-q2f` | [GREEN] | Implement consistent hash using primary index | M | teradata-vdh |
| `teradata-zpf` | [REFACTOR] | Optimize hash computation with SIMD | S | teradata-q2f |

**Acceptance Criteria (teradata-vdh):**
- Test that hash function produces deterministic output for same input
- Test that distribution across N AMPs has variance < 5%
- Test that NULL PI values hash consistently
- Test that composite PI columns produce correct hash

### 1.2 AMP Durable Object

Each AMP is a Durable Object containing a SQLite database for local storage.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-1ze` | [RED] | AMP DO initializes with SQLite schema for rows and blocks | M | None |
| `teradata-0a9` | [GREEN] | Implement AMP DO with table storage schema | L | teradata-1ze |
| `teradata-o5u` | [REFACTOR] | Add lazy initialization and connection pooling | S | teradata-0a9 |

**Acceptance Criteria (teradata-1ze):**
- Test that AMP DO creates required SQLite tables on first request
- Test that schema includes: rows, blocks, indexes, spool
- Test that multiple concurrent requests don't cause schema conflicts
- Test that AMP ID is persisted and recoverable

### 1.3 Block Storage

Teradata stores data in fixed-size blocks organized into cylinders.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-a3t` | [RED] | Block manager allocates and tracks data blocks | M | teradata-0a9 |
| `teradata-ddg` | [GREEN] | Implement block allocation with cylinder index | M | teradata-a3t |
| `teradata-54f` | [REFACTOR] | Add block pooling and pre-allocation | S | teradata-ddg |

**Acceptance Criteria (teradata-a3t):**
- Test that blocks are allocated in fixed sizes (default 64KB)
- Test that cylinder index tracks block locations
- Test that free block list is maintained
- Test that block fragmentation is tracked

### 1.4 Row Operations

Core CRUD operations on individual rows with hash-based routing.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-96q` | [RED] | Row insert routes to correct AMP via hash | M | teradata-q2f |
| `teradata-t0t` | [GREEN] | Implement row INSERT with hash distribution | M | teradata-96q |
| `teradata-bfi` | [RED] | Row UPDATE modifies existing rows by PI | M | teradata-t0t |
| `teradata-953` | [GREEN] | Implement row UPDATE with PI lookup | M | teradata-bfi |
| `teradata-s9w` | [RED] | Row DELETE removes rows by PI | M | teradata-953 |
| `teradata-kzq` | [GREEN] | Implement row DELETE with block compaction | M | teradata-s9w |
| `teradata-8xw` | [REFACTOR] | Add batch row operations for MLOAD | L | teradata-kzq |

**Acceptance Criteria (teradata-96q):**
- Test that INSERT routes to AMP determined by PI hash
- Test that row data arrives intact at target AMP
- Test that duplicate UPI is rejected
- Test that NUPI allows duplicates on same AMP

---

## Phase 2: PE and Query Processing

**Epic:** `teradata-duh`
**Priority:** P1 (Critical Path)
**Dependencies:** Phase 1

### 2.1 SQL Parser Core

Standard SQL parsing with AST generation.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-cw7` | [RED] | Parse SELECT statement with columns and FROM clause | M | None |
| `teradata-eb2` | [GREEN] | Implement SELECT parser with AST generation | L | teradata-cw7 |
| `teradata-f9g` | [RED] | Parse WHERE clause with predicates | M | teradata-eb2 |
| `teradata-bib` | [GREEN] | Implement predicate parser with operator precedence | M | teradata-f9g |
| `teradata-b2z` | [RED] | Parse JOIN syntax including INNER LEFT RIGHT FULL | M | teradata-bib |
| `teradata-duo` | [GREEN] | Implement JOIN clause parsing | M | teradata-b2z |
| `teradata-bee` | [REFACTOR] | Extract reusable AST node types | S | teradata-duo |

**Acceptance Criteria (teradata-cw7):**
- Test parsing: `SELECT col1, col2 FROM table1`
- Test parsing: `SELECT * FROM db.table`
- Test parsing: `SELECT a.col, b.col FROM a, b`
- Test that invalid syntax produces clear error messages

### 2.2 Teradata Dialect Support

Teradata-specific SQL extensions.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-0bo` | [RED] | Parse QUALIFY clause for window function filtering | M | teradata-duo |
| `teradata-sv2` | [GREEN] | Implement QUALIFY with ROW_NUMBER RANK support | M | teradata-0bo |
| `teradata-vc5` | [RED] | Parse SAMPLE clause for random sampling | S | teradata-sv2 |
| `teradata-882` | [GREEN] | Implement SAMPLE with stratified sampling | M | teradata-vc5 |
| `teradata-45f` | [RED] | Parse NORMALIZE for temporal normalization | M | teradata-882 |
| `teradata-2b2` | [GREEN] | Implement NORMALIZE ON period columns | M | teradata-45f |
| `teradata-jm6` | [REFACTOR] | Unify window function handling | S | teradata-2b2 |

**Acceptance Criteria (teradata-0bo):**
- Test: `SELECT * FROM t QUALIFY ROW_NUMBER() OVER (PARTITION BY a ORDER BY b) = 1`
- Test: `SELECT * FROM t QUALIFY RANK() OVER (ORDER BY sales DESC) <= 10`
- Test that QUALIFY without window function produces error
- Test QUALIFY with multiple window functions

### 2.3 PE Durable Object

The Parsing Engine coordinates query execution.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-2up` | [RED] | PE DO initializes and accepts query requests | M | None |
| `teradata-ifh` | [GREEN] | Implement PE DO with session management | M | teradata-2up |
| `teradata-5m9` | [RED] | PE routes parsed queries to optimizer | M | teradata-ifh |
| `teradata-mbc` | [GREEN] | Implement query routing pipeline | M | teradata-5m9 |
| `teradata-hgn` | [REFACTOR] | Add query caching in PE | S | teradata-mbc |

**Acceptance Criteria (teradata-2up):**
- Test that PE creates session on first request
- Test that session maintains state across requests
- Test that session timeout releases resources
- Test concurrent sessions are isolated

---

## Phase 3: Query Optimizer

**Epic:** `teradata-co9`
**Priority:** P2
**Dependencies:** Phase 2

### 3.1 Statistics Collection

Teradata's optimizer relies heavily on statistics.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-n8n` | [RED] | COLLECT STATISTICS gathers column cardinality | M | Phase 2 |
| `teradata-0gc` | [GREEN] | Implement statistics collection with histograms | L | teradata-n8n |
| `teradata-8af` | [REFACTOR] | Add incremental statistics refresh | M | teradata-0gc |

**Acceptance Criteria (teradata-n8n):**
- Test: `COLLECT STATISTICS ON table COLUMN col1`
- Test that cardinality, distinct values, NULLs are captured
- Test histogram generation for numeric columns
- Test statistics on composite columns

### 3.2 Cost Model

Cost-based optimization for query plans.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-n0a` | [RED] | Cost estimator calculates IO and CPU costs | M | teradata-0gc |
| `teradata-8qu` | [GREEN] | Implement cost-based plan selection | L | teradata-n0a |
| `teradata-e9m` | [RED] | Histogram-based selectivity estimation | M | teradata-8qu |
| `teradata-lp9` | [GREEN] | Implement histogram interpolation for predicates | M | teradata-e9m |
| `teradata-5e8` | [REFACTOR] | Add cost model calibration | S | teradata-lp9 |

**Acceptance Criteria (teradata-n0a):**
- Test IO cost calculation based on block count
- Test CPU cost for predicate evaluation
- Test network cost for redistribution
- Test that total cost reflects all components

### 3.3 Join Optimization

Teradata's join optimization is critical for MPP performance.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-6za` | [RED] | Join reordering minimizes intermediate result size | L | teradata-8qu |
| `teradata-cia` | [GREEN] | Implement dynamic programming join optimizer | L | teradata-6za |
| `teradata-ctw` | [RED] | Join method selection merge vs hash vs nested | M | teradata-cia |
| `teradata-0rq` | [GREEN] | Implement join method cost comparison | M | teradata-ctw |
| `teradata-09m` | [REFACTOR] | Support star schema optimization | M | teradata-0rq |

**Acceptance Criteria (teradata-6za):**
- Test that 3-table join finds optimal order
- Test that statistics influence join order
- Test that cross-products are avoided when possible
- Test N-way join with N=5 completes in < 1s

---

## Phase 4: Execution Engine

**Epic:** `teradata-wpj`
**Priority:** P1 (Critical Path)
**Dependencies:** Phase 3

### 4.1 All-AMP Operations

Full table scans distributed across all AMPs.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-amy` | [RED] | All-AMP scan distributes work to all AMPs | M | Phase 1 |
| `teradata-xxp` | [GREEN] | Implement parallel full table scan | L | teradata-amy |
| `teradata-5sh` | [RED] | All-AMP aggregation combines partial results | M | teradata-xxp |
| `teradata-x74` | [GREEN] | Implement distributed GROUP BY with merge | L | teradata-5sh |
| `teradata-btw` | [REFACTOR] | Add early filtering pushdown | M | teradata-x74 |

**Acceptance Criteria (teradata-amy):**
- Test that scan request reaches all AMPs
- Test that responses are collected in parallel
- Test that AMP failure is handled gracefully
- Test that partial results are usable

### 4.2 Single-AMP Operations

Direct access via Primary Index.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-v4x` | [RED] | Single-AMP access by primary index value | M | teradata-q2f |
| `teradata-3a5` | [GREEN] | Implement direct PI lookup | M | teradata-v4x |
| `teradata-bnf` | [REFACTOR] | Optimize hash computation for PI access | S | teradata-3a5 |

**Acceptance Criteria (teradata-v4x):**
- Test that PI lookup hits exactly one AMP
- Test that response time < 10ms for single row
- Test that non-existent PI returns empty result
- Test composite PI lookup

### 4.3 Redistribution

Moving data between AMPs for join operations.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-55r` | [RED] | Redistribution moves rows between AMPs for joins | L | teradata-xxp |
| `teradata-6hh` | [GREEN] | Implement row redistribution by join key | L | teradata-55r |
| `teradata-98n` | [RED] | Duplication replicates small tables to all AMPs | M | teradata-6hh |
| `teradata-4ks` | [GREEN] | Implement broadcast join for small tables | M | teradata-98n |
| `teradata-93i` | [REFACTOR] | Minimize network traffic in redistribution | M | teradata-4ks |

**Acceptance Criteria (teradata-55r):**
- Test that rows are redistributed by join column hash
- Test that all matching rows end up on same AMP
- Test redistribution of 1M rows < 5s
- Test that network utilization is efficient

### 4.4 Spool Management

Intermediate results storage.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-cyt` | [RED] | Spool space allocates intermediate results | M | teradata-0a9 |
| `teradata-dju` | [GREEN] | Implement spool allocation per query step | M | teradata-cyt |
| `teradata-71u` | [RED] | Spool overflow spills to R2 storage | M | teradata-dju |
| `teradata-3on` | [GREEN] | Implement spool spill to R2 | M | teradata-71u |
| `teradata-90w` | [REFACTOR] | Add spool reuse optimization | S | teradata-3on |

**Acceptance Criteria (teradata-cyt):**
- Test that spool space is allocated per step
- Test that spool is released after step completes
- Test that spool limit triggers spill
- Test that spilled data is recoverable

---

## Phase 5: Index Support

**Epic:** `teradata-cvn`
**Priority:** P2
**Dependencies:** Phase 1

### 5.1 Primary Index

UPI (Unique) and NUPI (Non-Unique) Primary Indexes.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-359` | [RED] | UPI enforces uniqueness on primary index | M | teradata-t0t |
| `teradata-6pq` | [GREEN] | Implement UPI constraint validation | M | teradata-359 |
| `teradata-5ik` | [RED] | NUPI allows duplicate primary index values | M | teradata-6pq |
| `teradata-1ko` | [GREEN] | Implement NUPI with hash collision handling | M | teradata-5ik |
| `teradata-3qv` | [REFACTOR] | Optimize PI storage layout | S | teradata-1ko |

**Acceptance Criteria (teradata-359):**
- Test that duplicate UPI insert is rejected
- Test that error message includes constraint name
- Test that transaction is rolled back on violation
- Test that concurrent inserts both fail if duplicate

### 5.2 Secondary Index

USI (Unique Secondary Index) and NUSI (Non-Unique Secondary Index).

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-2ai` | [RED] | USI provides unique secondary access path | M | teradata-1ko |
| `teradata-okl` | [GREEN] | Implement USI with subtable | L | teradata-2ai |
| `teradata-0sv` | [RED] | NUSI provides non-unique secondary access | M | teradata-okl |
| `teradata-77j` | [GREEN] | Implement NUSI with bitmap optimization | L | teradata-0sv |
| `teradata-dv2` | [REFACTOR] | Add automatic index maintenance | M | teradata-77j |

**Acceptance Criteria (teradata-2ai):**
- Test USI lookup returns single row
- Test USI lookup is all-AMP then single-AMP
- Test USI on nullable column
- Test USI maintenance on UPDATE

### 5.3 Join Index

Pre-materialized join results.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-9gt` | [RED] | Join index pre-materializes join results | L | teradata-77j |
| `teradata-8zk` | [GREEN] | Implement join index with automatic refresh | L | teradata-9gt |
| `teradata-g8o` | [REFACTOR] | Add selective join index refresh | M | teradata-8zk |

**Acceptance Criteria (teradata-9gt):**
- Test that CREATE JOIN INDEX materializes results
- Test that queries use join index when beneficial
- Test that base table changes trigger refresh
- Test join index on 3+ tables

---

## Phase 6: Workload Management

**Epic:** `teradata-zk5`
**Priority:** P2
**Dependencies:** Phase 4

### 6.1 Priority Classes

Query prioritization.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-14z` | [RED] | Priority queue orders queries by class | M | Phase 4 |
| `teradata-bhl` | [GREEN] | Implement Rush High Medium Low Background queues | M | teradata-14z |
| `teradata-u47` | [REFACTOR] | Add dynamic priority adjustment | S | teradata-bhl |

**Acceptance Criteria (teradata-14z):**
- Test that Rush queries execute before High
- Test that Background queries yield to all others
- Test fair scheduling within same priority
- Test priority escalation for waiting queries

### 6.2 Service Level Goals

SLG monitoring and enforcement.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-91i` | [RED] | SLG monitors query response time targets | M | teradata-bhl |
| `teradata-iqr` | [GREEN] | Implement SLG tracking with alerts | M | teradata-91i |
| `teradata-5ub` | [RED] | SLG triggers throttling when exceeded | M | teradata-iqr |
| `teradata-gnr` | [GREEN] | Implement auto-throttling for SLG compliance | M | teradata-5ub |
| `teradata-pcw` | [REFACTOR] | Add SLG prediction model | L | teradata-gnr |

**Acceptance Criteria (teradata-91i):**
- Test that response time is tracked per workload
- Test that SLG breach triggers alert
- Test percentile calculations (p50, p95, p99)
- Test SLG over time windows (1m, 5m, 1h)

### 6.3 Resource Groups

AMP capacity allocation.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-8ow` | [RED] | Resource groups allocate AMP capacity | M | teradata-gnr |
| `teradata-t4s` | [GREEN] | Implement resource group assignment | M | teradata-8ow |
| `teradata-qtg` | [REFACTOR] | Add fair-share scheduling across groups | M | teradata-t4s |

**Acceptance Criteria (teradata-8ow):**
- Test that resource groups have capacity limits
- Test that queries are assigned to groups
- Test that group capacity is enforced
- Test multi-tenant isolation

---

## Phase 7: Bi-Temporal Tables

**Epic:** `teradata-fki`
**Priority:** P2
**Dependencies:** Phase 1

### 7.1 System Time

Transaction time versioning.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-gf2` | [RED] | System time tracks transaction timestamps | M | Phase 1 |
| `teradata-68a` | [GREEN] | Implement system versioning with history | L | teradata-gf2 |
| `teradata-bg2` | [REFACTOR] | Optimize history table storage | M | teradata-68a |

**Acceptance Criteria (teradata-gf2):**
- Test that INSERT sets system_start automatically
- Test that UPDATE creates history row
- Test that DELETE sets system_end
- Test that system times are tamper-proof

### 7.2 Valid Time

Business time periods.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-a5m` | [RED] | Valid time tracks business time periods | M | teradata-68a |
| `teradata-m49` | [GREEN] | Implement VALIDTIME column type | M | teradata-a5m |
| `teradata-qhz` | [RED] | Period overlap detection prevents conflicts | M | teradata-m49 |
| `teradata-d4f` | [GREEN] | Implement period overlap constraints | M | teradata-qhz |
| `teradata-kqr` | [REFACTOR] | Add period coalescing optimization | S | teradata-d4f |

**Acceptance Criteria (teradata-a5m):**
- Test PERIOD FOR valid_time (start_date, end_date)
- Test that valid time is user-controlled
- Test open-ended periods (UNTIL_CHANGED)
- Test period intersection queries

### 7.3 Temporal Queries

Time-travel and temporal predicates.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-wo6` | [RED] | AS OF queries return point-in-time data | M | teradata-d4f |
| `teradata-9hu` | [GREEN] | Implement AS OF temporal predicate | M | teradata-wo6 |
| `teradata-z0e` | [RED] | SEQUENCED queries apply predicates across periods | L | teradata-9hu |
| `teradata-in2` | [GREEN] | Implement SEQUENCED and NONSEQUENCED semantics | L | teradata-z0e |
| `teradata-ege` | [REFACTOR] | Add index-based temporal access paths | M | teradata-in2 |

**Acceptance Criteria (teradata-wo6):**
- Test: `SELECT * FROM t AS OF TIMESTAMP '2024-01-01'`
- Test: `SELECT * FROM t AS OF SYSTEM TIME '2024-01-01'`
- Test: `SELECT * FROM t FOR BUSINESS_TIME AS OF DATE '2024-01-01'`
- Test combined system and valid time AS OF

---

## Phase 8: Data Dictionary (DBC)

**Epic:** `teradata-hky`
**Priority:** P2
**Dependencies:** Phase 1

### 8.1 Tables Catalog

Table metadata views.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-1su` | [RED] | DBC.TablesV returns table metadata | M | Phase 1 |
| `teradata-e0n` | [GREEN] | Implement table catalog view | M | teradata-1su |
| `teradata-0u0` | [REFACTOR] | Add catalog cache invalidation | S | teradata-e0n |

**Acceptance Criteria (teradata-1su):**
- Test: `SELECT * FROM DBC.TablesV WHERE DatabaseName = 'mydb'`
- Test that TableKind distinguishes tables/views
- Test that row count estimates are available
- Test that create timestamp is tracked

### 8.2 Columns Catalog

Column metadata views.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-9og` | [RED] | DBC.ColumnsV returns column metadata | M | teradata-e0n |
| `teradata-gep` | [GREEN] | Implement column catalog with types | M | teradata-9og |
| `teradata-agk` | [REFACTOR] | Add type inference helpers | S | teradata-gep |

**Acceptance Criteria (teradata-9og):**
- Test column name, type, nullable, default
- Test character set for string columns
- Test precision/scale for numeric
- Test computed column expressions

### 8.3 Statistics Catalog

Statistics metadata views.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-za8` | [RED] | DBC.StatsV returns statistics metadata | M | teradata-gep |
| `teradata-tdl` | [GREEN] | Implement statistics catalog view | M | teradata-za8 |
| `teradata-bzg` | [REFACTOR] | Add histogram storage optimization | M | teradata-tdl |

**Acceptance Criteria (teradata-za8):**
- Test statistics name and collection date
- Test unique values and NULL count
- Test histogram bucket boundaries
- Test statistics age tracking

---

## Phase 9: Unity Federation

**Epic:** `teradata-95b`
**Priority:** P3
**Dependencies:** Phase 4

### 9.1 Unity Director

Federation coordinator.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-w7y` | [RED] | Unity director routes federated queries | L | Phase 4 |
| `teradata-yi7` | [GREEN] | Implement Unity DO for federation | L | teradata-w7y |
| `teradata-4p1` | [REFACTOR] | Add connection pooling for remote systems | M | teradata-yi7 |

**Acceptance Criteria (teradata-w7y):**
- Test query routing to remote systems
- Test credentials management
- Test connection health checking
- Test failover handling

### 9.2 Remote Table Access

Foreign data wrapper.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-vy2` | [RED] | Foreign tables query remote systems | M | teradata-yi7 |
| `teradata-9dy` | [GREEN] | Implement foreign table wrapper | L | teradata-vy2 |
| `teradata-pya` | [RED] | Query pushdown optimizes remote execution | M | teradata-9dy |
| `teradata-ii9` | [GREEN] | Implement predicate pushdown to remote | M | teradata-pya |
| `teradata-fwm` | [REFACTOR] | Add remote statistics caching | M | teradata-ii9 |

**Acceptance Criteria (teradata-vy2):**
- Test CREATE FOREIGN TABLE syntax
- Test SELECT from foreign table
- Test JOIN local and foreign tables
- Test UPDATE/DELETE on foreign tables

### 9.3 Data Movement

Bulk transfer between systems.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-48b` | [RED] | Bulk data transfer between systems | M | teradata-ii9 |
| `teradata-8t9` | [GREEN] | Implement bulk data movement with compression | M | teradata-48b |
| `teradata-fk6` | [REFACTOR] | Add streaming data transfer | M | teradata-8t9 |

**Acceptance Criteria (teradata-48b):**
- Test INSERT...SELECT across systems
- Test data type mapping
- Test transfer of 1GB in < 60s
- Test resumable transfer on failure

---

## Phase 10: Tiered Storage

**Epic:** `teradata-90h`
**Priority:** P2
**Dependencies:** Phase 1

### 10.1 Hot Storage (SQLite)

In-DO storage for active data.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-jjp` | [RED] | Hot tier stores recent data in SQLite | M | Phase 1 |
| `teradata-9k8` | [GREEN] | Implement SQLite hot storage layer | M | teradata-jjp |
| `teradata-1mf` | [REFACTOR] | Add memory-mapped file optimization | S | teradata-9k8 |

**Acceptance Criteria (teradata-jjp):**
- Test that recent data is in SQLite
- Test read latency < 1ms
- Test write durability guarantees
- Test storage limit enforcement

### 10.2 Warm Storage (R2)

R2 for less frequently accessed data.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-a1k` | [RED] | Warm tier stores older data in R2 | M | teradata-9k8 |
| `teradata-q39` | [GREEN] | Implement R2 warm storage layer | M | teradata-a1k |
| `teradata-1ob` | [RED] | Automatic tier migration based on access patterns | M | teradata-q39 |
| `teradata-269` | [GREEN] | Implement tiered storage migration | L | teradata-1ob |
| `teradata-2il` | [REFACTOR] | Add prefetch optimization for warm data | M | teradata-269 |

**Acceptance Criteria (teradata-a1k):**
- Test that data older than threshold moves to R2
- Test transparent access to warm data
- Test read latency < 100ms for warm
- Test migration doesn't block reads

### 10.3 Cold Storage

Archive tier for historical data.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-wos` | [RED] | Cold tier archives historical data | M | teradata-269 |
| `teradata-ns8` | [GREEN] | Implement archive tier with lazy loading | M | teradata-wos |
| `teradata-4wv` | [REFACTOR] | Add archive compression | M | teradata-ns8 |

**Acceptance Criteria (teradata-wos):**
- Test that cold data is compressed
- Test cold retrieval < 5s
- Test cold data is read-only
- Test cold restore to warm/hot

---

## Phase 11: Client SDK

**Epic:** `teradata-kh1`
**Priority:** P1 (Critical Path)
**Dependencies:** Phase 2

### 11.1 Connection Management

Session pooling and lifecycle.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-qmg` | [RED] | Session pool manages database connections | M | Phase 2 |
| `teradata-c7r` | [GREEN] | Implement session pool with auto-reconnect | M | teradata-qmg |
| `teradata-3yn` | [REFACTOR] | Add connection health monitoring | S | teradata-c7r |

**Acceptance Criteria (teradata-qmg):**
- Test connection pool creation
- Test connection checkout/checkin
- Test idle connection timeout
- Test pool size limits

### 11.2 Query Interface

Typed query execution.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-066` | [RED] | Query execution returns typed results | M | teradata-c7r |
| `teradata-zwi` | [GREEN] | Implement typed query interface | M | teradata-066 |
| `teradata-02m` | [RED] | Streaming results for large datasets | M | teradata-zwi |
| `teradata-psq` | [GREEN] | Implement streaming result cursor | M | teradata-02m |
| `teradata-dyz` | [REFACTOR] | Add query result caching | S | teradata-psq |

**Acceptance Criteria (teradata-066):**
- Test that column types are inferred
- Test TypeScript generic type inference
- Test NULL handling
- Test date/time type conversion

### 11.3 Batch Operations

Multi-statement execution.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-toi` | [RED] | Multi-statement requests execute atomically | M | teradata-psq |
| `teradata-ary` | [GREEN] | Implement multi-statement batching | M | teradata-toi |
| `teradata-p9u` | [RED] | Parameterized queries prevent SQL injection | M | teradata-ary |
| `teradata-dh4` | [GREEN] | Implement parameterized query binding | M | teradata-p9u |
| `teradata-u29` | [REFACTOR] | Add request pipelining | M | teradata-dh4 |

**Acceptance Criteria (teradata-toi):**
- Test multiple statements in single request
- Test transaction wrapping
- Test partial failure rollback
- Test result set ordering

---

## Phase 12: MCP Tools

**Epic:** `teradata-ufr`
**Priority:** P2
**Dependencies:** Phase 11

### 12.1 Query Tool

SQL execution for AI agents.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-lix` | [RED] | MCP execute_query tool runs SQL queries | M | Phase 11 |
| `teradata-u5t` | [GREEN] | Implement execute_query MCP tool | M | teradata-lix |
| `teradata-55x` | [RED] | MCP explain_query shows execution plan | M | teradata-u5t |
| `teradata-dnr` | [GREEN] | Implement explain_query with EXPLAIN output | M | teradata-55x |
| `teradata-cagx` | [REFACTOR] | Add query history tracking | S | teradata-dnr |

**Acceptance Criteria (teradata-lix):**
- Test MCP tool schema is valid
- Test query execution returns results
- Test error handling for invalid SQL
- Test timeout handling for long queries

### 12.2 Schema Tool

Database exploration.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-81b1` | [RED] | MCP list_tables shows database tables | M | teradata-dnr |
| `teradata-dk69` | [GREEN] | Implement list_tables MCP tool | M | teradata-81b1 |
| `teradata-ard6` | [RED] | MCP describe_table shows column details | M | teradata-dk69 |
| `teradata-bo4i` | [GREEN] | Implement describe_table MCP tool | M | teradata-ard6 |
| `teradata-frmk` | [REFACTOR] | Add schema search and filtering | S | teradata-bo4i |

**Acceptance Criteria (teradata-81b1):**
- Test list_tables returns all tables
- Test filtering by database
- Test filtering by table type
- Test pagination for large schemas

### 12.3 Statistics Tool

Statistics management.

| ID | Type | Title | Complexity | Dependencies |
|----|------|-------|------------|--------------|
| `teradata-qr49` | [RED] | MCP collect_statistics gathers table stats | M | teradata-bo4i |
| `teradata-m5jj` | [GREEN] | Implement collect_statistics MCP tool | M | teradata-qr49 |
| `teradata-vmt9` | [RED] | MCP show_statistics displays histograms | M | teradata-m5jj |
| `teradata-ifp7` | [GREEN] | Implement show_statistics MCP tool | M | teradata-vmt9 |
| `teradata-co6a` | [REFACTOR] | Add selective statistics refresh | S | teradata-ifp7 |

**Acceptance Criteria (teradata-qr49):**
- Test collect_statistics triggers COLLECT STATISTICS
- Test progress reporting for long collections
- Test column selection parameter
- Test sample size parameter

---

## Summary Statistics

| Phase | Epic ID | Priority | RED | GREEN | REFACTOR | Total |
|-------|---------|----------|-----|-------|----------|-------|
| 1. Core Infrastructure | teradata-dtt | P1 | 7 | 7 | 4 | 18 |
| 2. PE and Query Processing | teradata-duh | P1 | 8 | 8 | 3 | 19 |
| 3. Query Optimizer | teradata-co9 | P2 | 5 | 5 | 3 | 13 |
| 4. Execution Engine | teradata-wpj | P1 | 7 | 7 | 4 | 18 |
| 5. Index Support | teradata-cvn | P2 | 5 | 5 | 3 | 13 |
| 6. Workload Management | teradata-zk5 | P2 | 5 | 5 | 3 | 13 |
| 7. Bi-Temporal Tables | teradata-fki | P2 | 5 | 5 | 3 | 13 |
| 8. Data Dictionary | teradata-hky | P2 | 3 | 3 | 3 | 9 |
| 9. Unity Federation | teradata-95b | P3 | 5 | 5 | 3 | 13 |
| 10. Tiered Storage | teradata-90h | P2 | 4 | 4 | 3 | 11 |
| 11. Client SDK | teradata-kh1 | P1 | 6 | 6 | 3 | 15 |
| 12. MCP Tools | teradata-ufr | P2 | 6 | 6 | 3 | 15 |
| **TOTAL** | | | **66** | **66** | **38** | **170** |

Plus 5 epic issues = **175 total issues**

---

## Recommended Execution Order

### Sprint 1-2: Foundation (P1 Critical Path)
1. Phase 1.1-1.3: Hash, AMP DO, Blocks
2. Phase 2.1: SQL Parser Core
3. Phase 11.1: Connection Management

### Sprint 3-4: Query Pipeline (P1)
1. Phase 1.4: Row Operations
2. Phase 2.2-2.3: Teradata Dialect, PE DO
3. Phase 4.1-4.2: All-AMP, Single-AMP

### Sprint 5-6: Optimization (P2)
1. Phase 3: Query Optimizer
2. Phase 4.3-4.4: Redistribution, Spool
3. Phase 5.1-5.2: Primary and Secondary Indexes

### Sprint 7-8: Advanced Features (P2)
1. Phase 6: Workload Management
2. Phase 7: Bi-Temporal Tables
3. Phase 8: Data Dictionary

### Sprint 9-10: Storage and SDK (P2)
1. Phase 10: Tiered Storage
2. Phase 11.2-11.3: Query Interface, Batch
3. Phase 12: MCP Tools

### Sprint 11-12: Federation (P3)
1. Phase 9: Unity Federation
2. Phase 5.3: Join Indexes
3. All remaining REFACTOR tasks

---

## Getting Started

```bash
# Navigate to teradata rewrite
cd rewrites/teradata

# View ready tasks
bd ready

# Start with foundation
bd update teradata-vdh --status in_progress

# After writing failing test
bd close teradata-vdh
bd update teradata-q2f --status in_progress

# Continue TDD cycle...
```
