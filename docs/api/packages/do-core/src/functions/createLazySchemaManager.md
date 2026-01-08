[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / createLazySchemaManager

# Function: createLazySchemaManager()

> **createLazySchemaManager**(`storage`, `options`): [`LazySchemaManager`](../classes/LazySchemaManager.md)

Defined in: [packages/do-core/src/schema.ts:417](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L417)

Factory function to create a LazySchemaManager

## Parameters

### storage

[`DOStorage`](../interfaces/DOStorage.md)

DO storage instance

### options

[`SchemaInitOptions`](../interfaces/SchemaInitOptions.md) = `{}`

Optional configuration

## Returns

[`LazySchemaManager`](../classes/LazySchemaManager.md)

A new LazySchemaManager instance

## Example

```typescript
const manager = createLazySchemaManager(ctx.storage, {
  state: ctx,
  cacheStrategy: 'weak'
})
```
