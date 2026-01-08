[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / BaseKVRepository

# Abstract Class: BaseKVRepository\<T\>

Defined in: [packages/do-core/src/repository.ts:261](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L261)

Base repository implementation for KV storage.

Provides CRUD operations using Durable Object KV storage
with prefix-based namespacing.

## Example

```typescript
interface Event { id: string; type: string; data: unknown; timestamp: number }

class EventRepository extends BaseKVRepository<Event> {
  constructor(storage: DOStorage) {
    super(storage, 'events')
  }

  protected getId(entity: Event): string {
    return entity.id
  }
}
```

## Type Parameters

### T

`T` *extends* [`KVEntity`](../interfaces/KVEntity.md)

## Implements

- [`IBatchRepository`](../interfaces/IBatchRepository.md)\<`T`\>

## Constructors

### Constructor

> **new BaseKVRepository**\<`T`\>(`storage`, `prefix`): `BaseKVRepository`\<`T`\>

Defined in: [packages/do-core/src/repository.ts:265](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L265)

#### Parameters

##### storage

[`DOStorage`](../interfaces/DOStorage.md)

##### prefix

`string`

#### Returns

`BaseKVRepository`\<`T`\>

## Properties

### storage

> `protected` `readonly` **storage**: [`DOStorage`](../interfaces/DOStorage.md)

Defined in: [packages/do-core/src/repository.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L262)

***

### prefix

> `protected` `readonly` **prefix**: `string`

Defined in: [packages/do-core/src/repository.ts:263](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L263)

## Methods

### makeKey()

> `protected` **makeKey**(`id`): `string`

Defined in: [packages/do-core/src/repository.ts:273](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L273)

Generate storage key from entity ID

#### Parameters

##### id

`string`

#### Returns

`string`

***

### extractId()

> `protected` **extractId**(`key`): `string`

Defined in: [packages/do-core/src/repository.ts:280](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L280)

Extract entity ID from storage key

#### Parameters

##### key

`string`

#### Returns

`string`

***

### getId()

> `protected` **getId**(`entity`): `string`

Defined in: [packages/do-core/src/repository.ts:288](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L288)

Get entity ID from entity (for polymorphism)
Subclasses can override for custom ID extraction

#### Parameters

##### entity

`T`

#### Returns

`string`

***

### get()

> **get**(`id`): `Promise`\<`T` \| `null`\>

Defined in: [packages/do-core/src/repository.ts:292](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L292)

Get a single entity by ID

#### Parameters

##### id

`string`

Entity identifier

#### Returns

`Promise`\<`T` \| `null`\>

The entity or null if not found

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`get`](../interfaces/IBatchRepository.md#get)

***

### save()

> **save**(`entity`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/repository.ts:298](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L298)

Save (create or update) an entity

#### Parameters

##### entity

`T`

Entity to save

#### Returns

`Promise`\<`T`\>

The saved entity

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`save`](../interfaces/IBatchRepository.md#save)

***

### delete()

> **delete**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/repository.ts:305](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L305)

Delete an entity by ID

#### Parameters

##### id

`string`

Entity identifier

#### Returns

`Promise`\<`boolean`\>

true if deleted, false if not found

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`delete`](../interfaces/IBatchRepository.md#delete)

***

### find()

> **find**(`query?`): `Promise`\<`T`[]\>

Defined in: [packages/do-core/src/repository.ts:310](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L310)

Find entities matching query criteria

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<`T`\>

Query options for filtering and pagination

#### Returns

`Promise`\<`T`[]\>

Array of matching entities

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`find`](../interfaces/IBatchRepository.md#find)

***

### getMany()

> **getMany**(`ids`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/do-core/src/repository.ts:343](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L343)

Get multiple entities by IDs

#### Parameters

##### ids

`string`[]

Array of entity identifiers

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

Map of id to entity (missing entities not included)

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`getMany`](../interfaces/IBatchRepository.md#getmany)

***

### saveMany()

> **saveMany**(`entities`): `Promise`\<`T`[]\>

Defined in: [packages/do-core/src/repository.ts:355](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L355)

Save multiple entities

#### Parameters

##### entities

`T`[]

Array of entities to save

#### Returns

`Promise`\<`T`[]\>

Array of saved entities

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`saveMany`](../interfaces/IBatchRepository.md#savemany)

***

### deleteMany()

> **deleteMany**(`ids`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/repository.ts:366](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L366)

Delete multiple entities by IDs

#### Parameters

##### ids

`string`[]

Array of entity identifiers

#### Returns

`Promise`\<`number`\>

Number of entities deleted

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`deleteMany`](../interfaces/IBatchRepository.md#deletemany)

***

### count()

> **count**(`query?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/repository.ts:371](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L371)

Count entities matching query criteria

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<`T`\>

Optional query options for filtering

#### Returns

`Promise`\<`number`\>

Number of matching entities

#### Implementation of

[`IBatchRepository`](../interfaces/IBatchRepository.md).[`count`](../interfaces/IBatchRepository.md#count)

***

### clear()

> **clear**(): `Promise`\<`number`\>

Defined in: [packages/do-core/src/repository.ts:379](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L379)

Clear all entities in this repository

#### Returns

`Promise`\<`number`\>

***

### matchesFilter()

> `protected` **matchesFilter**(`value`, `filter`): `boolean`

Defined in: [packages/do-core/src/repository.ts:389](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L389)

Check if filter matches value

#### Parameters

##### value

`unknown`

##### filter

[`FilterCondition`](../interfaces/FilterCondition.md)

#### Returns

`boolean`
