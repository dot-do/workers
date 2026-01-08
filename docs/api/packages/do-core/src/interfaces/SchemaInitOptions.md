[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SchemaInitOptions

# Interface: SchemaInitOptions

Defined in: [packages/do-core/src/schema.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L166)

Options for creating a LazySchemaManager

Configuration options that control initialization behavior.

## Properties

### schema?

> `optional` **schema**: [`SchemaDefinition`](SchemaDefinition.md)

Defined in: [packages/do-core/src/schema.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L168)

Custom schema definition (uses default if not provided)

***

### state?

> `optional` **state**: [`DOState`](DOState.md)

Defined in: [packages/do-core/src/schema.ts:170](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L170)

DO state for blockConcurrencyWhile support

***

### cacheStrategy?

> `optional` **cacheStrategy**: `"strong"` \| `"weak"`

Defined in: [packages/do-core/src/schema.ts:172](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L172)

Cache strategy: 'strong' (default) or 'weak' for memory efficiency
