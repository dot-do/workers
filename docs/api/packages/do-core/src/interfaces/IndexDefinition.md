[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IndexDefinition

# Interface: IndexDefinition

Defined in: [packages/do-core/src/schema.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L112)

Index definition for schema tables

Defines an index on one or more columns for query optimization.

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/schema.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L114)

Index name

***

### columns

> **columns**: `string`[]

Defined in: [packages/do-core/src/schema.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L116)

Columns included in the index

***

### unique?

> `optional` **unique**: `boolean`

Defined in: [packages/do-core/src/schema.ts:118](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L118)

Whether this is a unique index
