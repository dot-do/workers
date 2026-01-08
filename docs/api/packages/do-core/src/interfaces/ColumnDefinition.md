[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ColumnDefinition

# Interface: ColumnDefinition

Defined in: [packages/do-core/src/schema.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L78)

Column definition for schema tables

Defines a single column in a database table with SQLite-compatible types.

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/schema.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L80)

Column name

***

### type

> **type**: `"TEXT"` \| `"INTEGER"` \| `"REAL"` \| `"BLOB"`

Defined in: [packages/do-core/src/schema.ts:82](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L82)

SQLite column type (TEXT, INTEGER, REAL, BLOB)

***

### primaryKey?

> `optional` **primaryKey**: `boolean`

Defined in: [packages/do-core/src/schema.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L84)

Whether this column is the primary key

***

### notNull?

> `optional` **notNull**: `boolean`

Defined in: [packages/do-core/src/schema.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L86)

Whether this column allows NULL values

***

### defaultValue?

> `optional` **defaultValue**: `unknown`

Defined in: [packages/do-core/src/schema.ts:88](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L88)

Default value for the column

***

### unique?

> `optional` **unique**: `boolean`

Defined in: [packages/do-core/src/schema.ts:90](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L90)

Whether this column should be unique
