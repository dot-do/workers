[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IRepository

# Interface: IRepository\<T\>

Defined in: [packages/do-core/src/repository.ts:137](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L137)

Base repository interface defining the data access contract.

All repositories must implement these core operations.
Type parameter T represents the entity type being stored.

## Example

```typescript
interface User { id: string; name: string; email: string }

class UserRepository implements IRepository<User> {
  async get(id: string): Promise<User | null> { ... }
  async save(entity: User): Promise<User> { ... }
  async delete(id: string): Promise<boolean> { ... }
  async find(query: QueryOptions<User>): Promise<User[]> { ... }
}
```

## Extended by

- [`IBatchRepository`](IBatchRepository.md)

## Type Parameters

### T

`T`

## Methods

### get()

> **get**(`id`): `Promise`\<`T` \| `null`\>

Defined in: [packages/do-core/src/repository.ts:144](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L144)

Get a single entity by ID

#### Parameters

##### id

`string`

Entity identifier

#### Returns

`Promise`\<`T` \| `null`\>

The entity or null if not found

***

### save()

> **save**(`entity`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/repository.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L152)

Save (create or update) an entity

#### Parameters

##### entity

`T`

Entity to save

#### Returns

`Promise`\<`T`\>

The saved entity

***

### delete()

> **delete**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/repository.ts:160](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L160)

Delete an entity by ID

#### Parameters

##### id

`string`

Entity identifier

#### Returns

`Promise`\<`boolean`\>

true if deleted, false if not found

***

### find()

> **find**(`query?`): `Promise`\<`T`[]\>

Defined in: [packages/do-core/src/repository.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L168)

Find entities matching query criteria

#### Parameters

##### query?

[`QueryOptions`](QueryOptions.md)\<`T`\>

Query options for filtering and pagination

#### Returns

`Promise`\<`T`[]\>

Array of matching entities
