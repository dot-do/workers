[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / LazySchemaManager

# Class: LazySchemaManager

Defined in: [packages/do-core/src/schema.ts:202](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L202)

LazySchemaManager - Lazy initialization for DO schemas

Provides lazy schema initialization that:
- Defers initialization until first use
- Caches schema after initialization
- Validates schema definitions
- Uses blockConcurrencyWhile for thread safety

## Example

```typescript
const manager = new LazySchemaManager(storage)

// Schema is NOT initialized yet
console.log(manager.isInitialized()) // false

// First access triggers initialization
await manager.ensureInitialized()

// Now initialized and cached
console.log(manager.isInitialized()) // true
```

## Constructors

### Constructor

> **new LazySchemaManager**(`storage`, `options`): `LazySchemaManager`

Defined in: [packages/do-core/src/schema.ts:214](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L214)

#### Parameters

##### storage

[`DOStorage`](../interfaces/DOStorage.md)

##### options

[`SchemaInitOptions`](../interfaces/SchemaInitOptions.md) = `{}`

#### Returns

`LazySchemaManager`

## Methods

### isInitialized()

> **isInitialized**(): `boolean`

Defined in: [packages/do-core/src/schema.ts:224](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L224)

Check if schema has been initialized

#### Returns

`boolean`

true if schema is initialized, false otherwise

***

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/schema.ts:283](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L283)

Ensure schema is initialized (lazy initialization)

If schema is already initialized, returns immediately.
Otherwise, initializes the schema using blockConcurrencyWhile
to ensure thread safety.

#### Returns

`Promise`\<`void`\>

#### Throws

Error if schema validation fails

#### Throws

Error if SQL execution fails

***

### getSchema()

> **getSchema**(): `Promise`\<[`InitializedSchema`](../interfaces/InitializedSchema.md)\>

Defined in: [packages/do-core/src/schema.ts:371](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L371)

Get the initialized schema

Triggers initialization if not already done.
Returns cached schema on subsequent calls.

#### Returns

`Promise`\<[`InitializedSchema`](../interfaces/InitializedSchema.md)\>

The initialized schema with version information

***

### reset()

> **reset**(): `void`

Defined in: [packages/do-core/src/schema.ts:382](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L382)

Reset the manager to allow re-initialization

Used primarily for testing or schema migrations.
After reset, the next access will trigger re-initialization.

#### Returns

`void`

***

### getStats()

> **getStats**(): [`SchemaStats`](../interfaces/SchemaStats.md)

Defined in: [packages/do-core/src/schema.ts:393](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L393)

Get statistics about schema initialization

#### Returns

[`SchemaStats`](../interfaces/SchemaStats.md)

Statistics including initialization count and timing
