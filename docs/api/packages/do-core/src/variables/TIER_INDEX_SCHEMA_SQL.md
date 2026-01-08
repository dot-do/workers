[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TIER\_INDEX\_SCHEMA\_SQL

# Variable: TIER\_INDEX\_SCHEMA\_SQL

> `const` **TIER\_INDEX\_SCHEMA\_SQL**: "\n-- Tier Index table (tracks data location across storage tiers)\nCREATE TABLE IF NOT EXISTS tier\_index (\n  id TEXT PRIMARY KEY,\n  source\_table TEXT NOT NULL,\n  tier TEXT NOT NULL CHECK(tier IN ('hot', 'warm', 'cold')),\n  location TEXT,\n  created\_at INTEGER NOT NULL,\n  migrated\_at INTEGER,\n  accessed\_at INTEGER,\n  access\_count INTEGER DEFAULT 0\n);\n\n-- Index for tier queries\nCREATE INDEX IF NOT EXISTS idx\_tier\_index\_tier ON tier\_index(tier);\n\n-- Index for source table queries\nCREATE INDEX IF NOT EXISTS idx\_tier\_index\_source ON tier\_index(source\_table);\n\n-- Index for migration eligibility queries (finding stale items)\nCREATE INDEX IF NOT EXISTS idx\_tier\_index\_accessed ON tier\_index(accessed\_at);\n"

Defined in: [packages/do-core/src/tier-index.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L21)

SQL statements for TierIndex table initialization
