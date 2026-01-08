[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TableDefinition

# Interface: TableDefinition

Defined in: [packages/do-core/src/schema.ts:98](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L98)

Table definition for schema

Represents a complete table with its columns and optional indexes.

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/schema.ts:100](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L100)

Table name

***

### columns

> **columns**: [`ColumnDefinition`](ColumnDefinition.md)[]

Defined in: [packages/do-core/src/schema.ts:102](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L102)

Column definitions

***

### indexes?

> `optional` **indexes**: [`IndexDefinition`](IndexDefinition.md)[]

Defined in: [packages/do-core/src/schema.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L104)

Optional indexes
