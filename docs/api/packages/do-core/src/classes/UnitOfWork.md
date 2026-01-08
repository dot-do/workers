[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / UnitOfWork

# Class: UnitOfWork

Defined in: [packages/do-core/src/repository.ts:632](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L632)

Unit of work for transactional operations across repositories.

Collects changes and commits them atomically.

## Example

```typescript
const uow = new UnitOfWork(storage)
uow.registerNew(userRepo, newUser)
uow.registerDirty(userRepo, existingUser)
uow.registerDeleted(orderRepo, oldOrderId)
await uow.commit()
```

## Constructors

### Constructor

> **new UnitOfWork**(`storage`): `UnitOfWork`

Defined in: [packages/do-core/src/repository.ts:638](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L638)

#### Parameters

##### storage

[`DOStorage`](../interfaces/DOStorage.md)

#### Returns

`UnitOfWork`

## Methods

### registerNew()

> **registerNew**\<`T`\>(`repository`, `entity`): `void`

Defined in: [packages/do-core/src/repository.ts:645](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L645)

Register a new entity to be created

#### Type Parameters

##### T

`T`

#### Parameters

##### repository

[`IRepository`](../interfaces/IRepository.md)\<`T`\>

##### entity

`T`

#### Returns

`void`

***

### registerDirty()

> **registerDirty**\<`T`\>(`repository`, `entity`): `void`

Defined in: [packages/do-core/src/repository.ts:654](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L654)

Register an entity to be updated

#### Type Parameters

##### T

`T`

#### Parameters

##### repository

[`IRepository`](../interfaces/IRepository.md)\<`T`\>

##### entity

`T`

#### Returns

`void`

***

### registerDeleted()

> **registerDeleted**\<`T`\>(`repository`, `id`): `void`

Defined in: [packages/do-core/src/repository.ts:663](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L663)

Register an entity to be deleted

#### Type Parameters

##### T

`T`

#### Parameters

##### repository

[`IRepository`](../interfaces/IRepository.md)\<`T`\>

##### id

`string`

#### Returns

`void`

***

### commit()

> **commit**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/repository.ts:672](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L672)

Commit all changes atomically

#### Returns

`Promise`\<`void`\>

***

### rollback()

> **rollback**(): `void`

Defined in: [packages/do-core/src/repository.ts:703](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L703)

Rollback (clear) all pending changes

#### Returns

`void`
