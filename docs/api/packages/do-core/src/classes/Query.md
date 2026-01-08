[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Query

# Class: Query\<T\>

Defined in: [packages/do-core/src/repository.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L53)

Query builder for fluent query construction

## Type Parameters

### T

`T`

## Constructors

### Constructor

> **new Query**\<`T`\>(): `Query`\<`T`\>

#### Returns

`Query`\<`T`\>

## Methods

### where()

> **where**(`field`, `value`): `this`

Defined in: [packages/do-core/src/repository.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L63)

Add an equality filter

#### Parameters

##### field

keyof `T` & `string`

##### value

`unknown`

#### Returns

`this`

***

### whereOp()

> **whereOp**(`field`, `operator`, `value`): `this`

Defined in: [packages/do-core/src/repository.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L71)

Add a comparison filter

#### Parameters

##### field

keyof `T` & `string`

##### operator

[`FilterOperator`](../type-aliases/FilterOperator.md)

##### value

`unknown`

#### Returns

`this`

***

### orderBy()

> **orderBy**(`field`, `order`): `this`

Defined in: [packages/do-core/src/repository.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L79)

Set order by field

#### Parameters

##### field

keyof `T` & `string`

##### order

`"asc"` | `"desc"`

#### Returns

`this`

***

### limit()

> **limit**(`n`): `this`

Defined in: [packages/do-core/src/repository.ts:88](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L88)

Set result limit

#### Parameters

##### n

`number`

#### Returns

`this`

***

### offset()

> **offset**(`n`): `this`

Defined in: [packages/do-core/src/repository.ts:96](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L96)

Set result offset

#### Parameters

##### n

`number`

#### Returns

`this`

***

### build()

> **build**(): [`QueryOptions`](../interfaces/QueryOptions.md)

Defined in: [packages/do-core/src/repository.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L104)

Build query options

#### Returns

[`QueryOptions`](../interfaces/QueryOptions.md)
