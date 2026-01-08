[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SqlStorage

# Interface: SqlStorage

Defined in: [packages/do-core/src/core.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L76)

SQL storage interface for advanced queries

## Methods

### exec()

> **exec**\<`T`\>(`query`, ...`bindings`): [`SqlStorageCursor`](SqlStorageCursor.md)\<`T`\>

Defined in: [packages/do-core/src/core.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L77)

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

#### Parameters

##### query

`string`

##### bindings

...`unknown`[]

#### Returns

[`SqlStorageCursor`](SqlStorageCursor.md)\<`T`\>
