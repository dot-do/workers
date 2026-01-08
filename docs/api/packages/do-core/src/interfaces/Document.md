[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Document

# Interface: Document

Defined in: [packages/do-core/src/crud-mixin.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L29)

Document with required id field

## Indexable

\[`key`: `string`\]: `unknown`

Additional document fields

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/crud-mixin.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L31)

Unique document identifier

***

### createdAt?

> `optional` **createdAt**: `string` \| `number`

Defined in: [packages/do-core/src/crud-mixin.ts:33](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L33)

Creation timestamp (ISO string or Unix ms)

***

### updatedAt?

> `optional` **updatedAt**: `string` \| `number`

Defined in: [packages/do-core/src/crud-mixin.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L35)

Last update timestamp (ISO string or Unix ms)
