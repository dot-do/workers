[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IBatchRepository

# Interface: IBatchRepository\<T\>

Defined in: [packages/do-core/src/repository.ts:174](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L174)

Extended repository interface with batch operations

## Extends

- [`IRepository`](IRepository.md)\<`T`\>

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

#### Inherited from

[`IRepository`](IRepository.md).[`get`](IRepository.md#get)

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

#### Inherited from

[`IRepository`](IRepository.md).[`save`](IRepository.md#save)

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

#### Inherited from

[`IRepository`](IRepository.md).[`delete`](IRepository.md#delete)

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

#### Inherited from

[`IRepository`](IRepository.md).[`find`](IRepository.md#find)

***

### getMany()

> **getMany**(`ids`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/do-core/src/repository.ts:181](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L181)

Get multiple entities by IDs

#### Parameters

##### ids

`string`[]

Array of entity identifiers

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

Map of id to entity (missing entities not included)

***

### saveMany()

> **saveMany**(`entities`): `Promise`\<`T`[]\>

Defined in: [packages/do-core/src/repository.ts:189](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L189)

Save multiple entities

#### Parameters

##### entities

`T`[]

Array of entities to save

#### Returns

`Promise`\<`T`[]\>

Array of saved entities

***

### deleteMany()

> **deleteMany**(`ids`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/repository.ts:197](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L197)

Delete multiple entities by IDs

#### Parameters

##### ids

`string`[]

Array of entity identifiers

#### Returns

`Promise`\<`number`\>

Number of entities deleted

***

### count()

> **count**(`query?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/repository.ts:205](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L205)

Count entities matching query criteria

#### Parameters

##### query?

[`QueryOptions`](QueryOptions.md)\<`T`\>

Optional query options for filtering

#### Returns

`Promise`\<`number`\>

Number of matching entities
