[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / QueryOptions

# Interface: QueryOptions\<T\>

Defined in: [packages/do-core/src/repository.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L37)

Query options for repository operations

## Type Parameters

### T

`T` = `unknown`

## Properties

### filters?

> `optional` **filters**: [`FilterCondition`](FilterCondition.md)\<`T`\>[]

Defined in: [packages/do-core/src/repository.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L39)

Filter conditions (AND logic)

***

### orderBy?

> `optional` **orderBy**: `string`

Defined in: [packages/do-core/src/repository.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L41)

Order by field

***

### order?

> `optional` **order**: `"asc"` \| `"desc"`

Defined in: [packages/do-core/src/repository.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L43)

Order direction

***

### limit?

> `optional` **limit**: `number`

Defined in: [packages/do-core/src/repository.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L45)

Maximum results

***

### offset?

> `optional` **offset**: `number`

Defined in: [packages/do-core/src/repository.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/repository.ts#L47)

Results to skip
