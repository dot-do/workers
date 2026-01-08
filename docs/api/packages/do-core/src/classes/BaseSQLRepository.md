[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / BaseSQLRepository

# Abstract Class: BaseSQLRepository\<T\>

Defined in: [packages/do-core/src/repository.ts:446](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L446)

Base repository implementation for SQL storage.

Provides CRUD operations using Durable Object SQL storage
with typed query building.

## Example

```typescript
interface Thing { rowid?: number; ns: string; type: string; id: string; data: string }

class ThingRepository extends BaseSQLRepository<Thing> {
  constructor(sql: SqlStorage) {
    super(sql, 'things')
  }

  protected getId(entity: Thing): string {
    return entity.id
  }

  protected rowToEntity(row: Record<string, unknown>): Thing {
    return { ... }
  }

  protected entityToRow(entity: Thing): Record<string, unknown> {
    return { ... }
  }
}
```

## Extended by

- [`ThingsRepository`](ThingsRepository.md)

## Type Parameters

### T

`T`

## Implements

- [`IBatchRepository`](../interfaces/IBatchRepository.md)\<`T`\>

## Constructors

### Constructor

> **new BaseSQLRepository**\<`T`\>(`sql`, `tableName`): `BaseSQLRepository`\<`T`\>

Defined in: [packages/do-core/src/repository.ts:450](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L450)

#### Parameters

##### sql

[`SqlStorage`](../interfaces/SqlStorage.md)

##### tableName

`string`

#### Returns

`BaseSQLRepository`\<`T`\>

## Properties

### sql

> `protected` `readonly` **sql**: [`SqlStorage`](../interfaces/SqlStorage.md)

Defined in: [packages/do-core/src/repository.ts:447](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L447)

***

### tableName

> `protected` `readonly` **tableName**: `string`

Defined in: [packages/do-core/src/repository.ts:448](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L448)

## Methods

### getId()

> `abstract` `protected` **getId**(`entity`): `string`

Defined in: [packages/do-core/src/repository.ts:458](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L458)

Get entity ID from entity

#### Parameters

##### entity

`T`

#### Returns

`string`

***

### rowToEntity()

> `abstract` `protected` **rowToEntity**(`row`): `T`

Defined in: [packages/do-core/src/repository.ts:463](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L463)

Convert database row to entity

#### Parameters

##### row

`Record`\<`string`, `unknown`\>

#### Returns

`T`

***

### entityToRow()

> `abstract` `protected` **entityToRow**(`entity`): `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/repository.ts:468](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L468)

Convert entity to database row values

#### Parameters

##### entity

`T`

#### Returns

`Record`\<`string`, `unknown`\>

***

### getIdColumn()

> `protected` **getIdColumn**(): `string`

Defined in: [packages/do-core/src/repository.ts:473](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L473)

Get the primary key column name (default: 'id')

#### Returns

`string`

***

### getSelectColumns()

> `abstract` `protected` **getSelectColumns**(): `string`[]

Defined in: [packages/do-core/src/repository.ts:480](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L480)

Get column names for SELECT queries

#### Returns

`string`[]

***

### get()

> **get**(`id`): `Promise`\<`T` \| `null`\>

Defined in: [packages/do-core/src/repository.ts:482](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L482)

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

> `abstract` **save**(`entity`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/repository.ts:495](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L495)

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

Defined in: [packages/do-core/src/repository.ts:497](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L497)

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

Defined in: [packages/do-core/src/repository.ts:506](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L506)

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

Defined in: [packages/do-core/src/repository.ts:540](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L540)

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

Defined in: [packages/do-core/src/repository.ts:553](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L553)

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

Defined in: [packages/do-core/src/repository.ts:561](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L561)

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

Defined in: [packages/do-core/src/repository.ts:571](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L571)

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

### operatorToSQL()

> `protected` **operatorToSQL**(`op`): `string`

Defined in: [packages/do-core/src/repository.ts:590](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L590)

Convert filter operator to SQL operator

#### Parameters

##### op

[`FilterOperator`](../type-aliases/FilterOperator.md)

#### Returns

`string`
