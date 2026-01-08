[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / THINGS\_SCHEMA\_SQL

# Variable: THINGS\_SCHEMA\_SQL

> `const` **THINGS\_SCHEMA\_SQL**: "\n-- Things table (graph nodes with rowid for lightweight relationships)\nCREATE TABLE IF NOT EXISTS things (\n  rowid INTEGER PRIMARY KEY AUTOINCREMENT,\n  ns TEXT NOT NULL DEFAULT 'default',\n  type TEXT NOT NULL,\n  id TEXT NOT NULL,\n  url TEXT,\n  data TEXT NOT NULL,\n  context TEXT,\n  created\_at INTEGER NOT NULL,\n  updated\_at INTEGER NOT NULL,\n  UNIQUE(ns, type, id)\n);\n\n-- Indexes for Things\nCREATE INDEX IF NOT EXISTS idx\_things\_url ON things(url);\nCREATE INDEX IF NOT EXISTS idx\_things\_type ON things(ns, type);\nCREATE INDEX IF NOT EXISTS idx\_things\_ns ON things(ns);\n"

Defined in: [packages/do-core/src/things-repository.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L21)

SQL statements for Things table initialization
