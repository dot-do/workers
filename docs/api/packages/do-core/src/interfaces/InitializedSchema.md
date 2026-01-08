[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / InitializedSchema

# Interface: InitializedSchema

Defined in: [packages/do-core/src/schema.ts:139](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L139)

Initialized schema with version information

Extended schema definition returned after successful initialization,
includes guaranteed version number and initialization timestamp.

## Extends

- [`SchemaDefinition`](SchemaDefinition.md)

## Properties

### tables

> **tables**: [`TableDefinition`](TableDefinition.md)[]

Defined in: [packages/do-core/src/schema.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L128)

Tables in the schema

#### Inherited from

[`SchemaDefinition`](SchemaDefinition.md).[`tables`](SchemaDefinition.md#tables)

***

### version

> **version**: `number`

Defined in: [packages/do-core/src/schema.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L141)

Schema version (always present after initialization)

#### Overrides

[`SchemaDefinition`](SchemaDefinition.md).[`version`](SchemaDefinition.md#version)

***

### initializedAt

> **initializedAt**: `number`

Defined in: [packages/do-core/src/schema.ts:143](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L143)

Timestamp of initialization
