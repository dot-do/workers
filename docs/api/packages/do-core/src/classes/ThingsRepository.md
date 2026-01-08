[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ThingsRepository

# Class: ThingsRepository

Defined in: [packages/do-core/src/things-repository.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L70)

Repository for managing Thing entities in SQL storage.

Things are stored in a SQL table with support for:
- Namespace isolation (ns)
- Type-based collections
- JSON data payload
- Efficient querying and filtering

## Example

```typescript
const repo = new ThingsRepository(sql)
await repo.ensureSchema()

// Create a thing
const thing = await repo.create({
  type: 'user',
  data: { name: 'Alice', email: 'alice@example.com' }
})

// Query things
const users = await repo.findByType('default', 'user')
```

## Extends

- [`BaseSQLRepository`](BaseSQLRepository.md)\<[`Thing`](../interfaces/Thing.md)\>

## Constructors

### Constructor

> **new ThingsRepository**(`sql`): `ThingsRepository`

Defined in: [packages/do-core/src/things-repository.ts:73](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L73)

#### Parameters

##### sql

[`SqlStorage`](../interfaces/SqlStorage.md)

#### Returns

`ThingsRepository`

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`constructor`](BaseSQLRepository.md#constructor)

## Properties

### sql

> `protected` `readonly` **sql**: [`SqlStorage`](../interfaces/SqlStorage.md)

Defined in: [packages/do-core/src/repository.ts:447](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L447)

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`sql`](BaseSQLRepository.md#sql)

***

### tableName

> `protected` `readonly` **tableName**: `string`

Defined in: [packages/do-core/src/repository.ts:448](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L448)

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`tableName`](BaseSQLRepository.md#tablename)

## Methods

### getIdColumn()

> `protected` **getIdColumn**(): `string`

Defined in: [packages/do-core/src/repository.ts:473](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L473)

Get the primary key column name (default: 'id')

#### Returns

`string`

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`getIdColumn`](BaseSQLRepository.md#getidcolumn)

***

### getMany()

> **getMany**(`ids`): `Promise`\<`Map`\<`string`, [`Thing`](../interfaces/Thing.md)\>\>

Defined in: [packages/do-core/src/repository.ts:540](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L540)

Get multiple entities by IDs

#### Parameters

##### ids

`string`[]

Array of entity identifiers

#### Returns

`Promise`\<`Map`\<`string`, [`Thing`](../interfaces/Thing.md)\>\>

Map of id to entity (missing entities not included)

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`getMany`](BaseSQLRepository.md#getmany)

***

### saveMany()

> **saveMany**(`entities`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/repository.ts:553](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L553)

Save multiple entities

#### Parameters

##### entities

[`Thing`](../interfaces/Thing.md)[]

Array of entities to save

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Array of saved entities

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`saveMany`](BaseSQLRepository.md#savemany)

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

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`deleteMany`](BaseSQLRepository.md#deletemany)

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

#### Inherited from

[`BaseSQLRepository`](BaseSQLRepository.md).[`operatorToSQL`](BaseSQLRepository.md#operatortosql)

***

### ensureSchema()

> **ensureSchema**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/things-repository.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L80)

Ensure the things schema is initialized

#### Returns

`Promise`\<`void`\>

***

### getId()

> `protected` **getId**(`entity`): `string`

Defined in: [packages/do-core/src/things-repository.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L93)

Get entity ID from entity

#### Parameters

##### entity

[`Thing`](../interfaces/Thing.md)

#### Returns

`string`

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`getId`](BaseSQLRepository.md#getid)

***

### getSelectColumns()

> `protected` **getSelectColumns**(): `string`[]

Defined in: [packages/do-core/src/things-repository.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L97)

Get column names for SELECT queries

#### Returns

`string`[]

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`getSelectColumns`](BaseSQLRepository.md#getselectcolumns)

***

### rowToEntity()

> `protected` **rowToEntity**(`row`): [`Thing`](../interfaces/Thing.md)

Defined in: [packages/do-core/src/things-repository.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L101)

Convert database row to entity

#### Parameters

##### row

`Record`\<`string`, `unknown`\>

#### Returns

[`Thing`](../interfaces/Thing.md)

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`rowToEntity`](BaseSQLRepository.md#rowtoentity)

***

### entityToRow()

> `protected` **entityToRow**(`entity`): `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/things-repository.ts:123](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L123)

Convert entity to database row values

#### Parameters

##### entity

[`Thing`](../interfaces/Thing.md)

#### Returns

`Record`\<`string`, `unknown`\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`entityToRow`](BaseSQLRepository.md#entitytorow)

***

### getByKey()

> **getByKey**(`ns`, `type`, `id`): `Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

Defined in: [packages/do-core/src/things-repository.ts:139](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L139)

Get a thing by namespace, type, and ID

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

***

### get()

> **get**(`id`): `Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

Defined in: [packages/do-core/src/things-repository.ts:158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L158)

Override get to require schema

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`get`](BaseSQLRepository.md#get)

***

### create()

> **create**(`input`): `Promise`\<[`Thing`](../interfaces/Thing.md)\>

Defined in: [packages/do-core/src/things-repository.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L166)

Create a new thing from input

#### Parameters

##### input

[`CreateThingInput`](../interfaces/CreateThingInput.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)\>

***

### save()

> **save**(`entity`): `Promise`\<[`Thing`](../interfaces/Thing.md)\>

Defined in: [packages/do-core/src/things-repository.ts:199](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L199)

Save (insert or update) a thing

#### Parameters

##### entity

[`Thing`](../interfaces/Thing.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`save`](BaseSQLRepository.md#save)

***

### update()

> **update**(`ns`, `type`, `id`, `input`): `Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

Defined in: [packages/do-core/src/things-repository.ts:240](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L240)

Update an existing thing

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

##### input

[`UpdateThingInput`](../interfaces/UpdateThingInput.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md) \| `null`\>

***

### deleteByKey()

> **deleteByKey**(`ns`, `type`, `id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/things-repository.ts:281](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L281)

Delete a thing by namespace, type, and ID

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### delete()

> **delete**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/things-repository.ts:297](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L297)

Override delete to require schema

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`delete`](BaseSQLRepository.md#delete)

***

### findThings()

> **findThings**(`filter?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/things-repository.ts:305](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L305)

Find things with filtering options

#### Parameters

##### filter?

[`ThingFilter`](../interfaces/ThingFilter.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

***

### find()

> **find**(`query?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/things-repository.ts:362](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L362)

Override find to use ensureSchema

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<[`Thing`](../interfaces/Thing.md)\>

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`find`](BaseSQLRepository.md#find)

***

### search()

> **search**(`queryText`, `options?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/things-repository.ts:370](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L370)

Search things by text query in data field

#### Parameters

##### queryText

`string`

##### options?

[`ThingSearchOptions`](../interfaces/ThingSearchOptions.md)

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

***

### findByType()

> **findByType**(`ns`, `type`, `limit?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/things-repository.ts:410](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L410)

Find things by type in a namespace

#### Parameters

##### ns

`string`

##### type

`string`

##### limit?

`number`

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

***

### findByNamespace()

> **findByNamespace**(`ns`, `limit?`): `Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

Defined in: [packages/do-core/src/things-repository.ts:417](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L417)

Find things by namespace

#### Parameters

##### ns

`string`

##### limit?

`number`

#### Returns

`Promise`\<[`Thing`](../interfaces/Thing.md)[]\>

***

### countThings()

> **countThings**(`filter?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/things-repository.ts:424](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L424)

Count things matching filter

#### Parameters

##### filter?

[`ThingFilter`](../interfaces/ThingFilter.md)

#### Returns

`Promise`\<`number`\>

***

### count()

> **count**(`query?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/things-repository.ts:453](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L453)

Override count to use ensureSchema

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<[`Thing`](../interfaces/Thing.md)\>

#### Returns

`Promise`\<`number`\>

#### Overrides

[`BaseSQLRepository`](BaseSQLRepository.md).[`count`](BaseSQLRepository.md#count)

***

### isSchemaInitialized()

> **isSchemaInitialized**(): `boolean`

Defined in: [packages/do-core/src/things-repository.ts:461](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-repository.ts#L461)

Check if schema has been initialized

#### Returns

`boolean`
