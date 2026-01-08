[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SqlStorageCursor

# Interface: SqlStorageCursor\<T\>

Defined in: [packages/do-core/src/core.ts:83](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L83)

SQL cursor for iterating results

## Type Parameters

### T

`T` = `Record`\<`string`, `unknown`\>

## Properties

### columnNames

> `readonly` **columnNames**: `string`[]

Defined in: [packages/do-core/src/core.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L84)

***

### rowsRead

> `readonly` **rowsRead**: `number`

Defined in: [packages/do-core/src/core.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L85)

***

### rowsWritten

> `readonly` **rowsWritten**: `number`

Defined in: [packages/do-core/src/core.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L86)

## Methods

### toArray()

> **toArray**(): `T`[]

Defined in: [packages/do-core/src/core.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L87)

#### Returns

`T`[]

***

### one()

> **one**(): `T` \| `null`

Defined in: [packages/do-core/src/core.ts:88](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L88)

#### Returns

`T` \| `null`

***

### raw()

> **raw**\<`R`\>(): `IterableIterator`\<`R`\>

Defined in: [packages/do-core/src/core.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L89)

#### Type Parameters

##### R

`R` *extends* `unknown`[] = `unknown`[]

#### Returns

`IterableIterator`\<`R`\>

***

### \[iterator\]()

> **\[iterator\]**(): `IterableIterator`\<`T`\>

Defined in: [packages/do-core/src/core.ts:90](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L90)

#### Returns

`IterableIterator`\<`T`\>
