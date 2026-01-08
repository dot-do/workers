[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EVENT\_STORE\_SCHEMA\_SQL

# Variable: EVENT\_STORE\_SCHEMA\_SQL

> `const` **EVENT\_STORE\_SCHEMA\_SQL**: "\n-- Events table for stream-based event sourcing\nCREATE TABLE IF NOT EXISTS events (\n  id TEXT PRIMARY KEY,\n  stream\_id TEXT NOT NULL,\n  type TEXT NOT NULL,\n  version INTEGER NOT NULL,\n  timestamp INTEGER NOT NULL,\n  payload TEXT NOT NULL,\n  metadata TEXT,\n  UNIQUE(stream\_id, version)\n);\n\n-- Index for efficient stream queries\nCREATE INDEX IF NOT EXISTS idx\_events\_stream ON events(stream\_id, version);\n\n-- Index for time-based queries\nCREATE INDEX IF NOT EXISTS idx\_events\_timestamp ON events(timestamp);\n\n-- Index for event type queries\nCREATE INDEX IF NOT EXISTS idx\_events\_type ON events(type);\n"

Defined in: [packages/do-core/src/event-store.ts:461](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L461)

SQL schema for the events table.

Key features:
- UNIQUE(stream_id, version) ensures monotonic versioning per stream
- timestamp allows time-based queries
- metadata stored as JSON for flexibility

## Remarks

The schema uses IF NOT EXISTS for idempotent creation.
