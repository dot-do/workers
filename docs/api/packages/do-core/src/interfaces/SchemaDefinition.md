[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SchemaDefinition

# Interface: SchemaDefinition

Defined in: [packages/do-core/src/schema.ts:126](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L126)

Complete schema definition

The root configuration object containing all tables and schema version.

## Extended by

- [`InitializedSchema`](InitializedSchema.md)

## Properties

### tables

> **tables**: [`TableDefinition`](TableDefinition.md)[]

Defined in: [packages/do-core/src/schema.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L128)

Tables in the schema

***

### version?

> `optional` **version**: `number`

Defined in: [packages/do-core/src/schema.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L130)

Schema version number
