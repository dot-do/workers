[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Thing

# Interface: Thing

Defined in: [packages/do-core/src/things-mixin.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L46)

Base Thing entity representing a graph node

## Properties

### rowid?

> `optional` **rowid**: `number`

Defined in: [packages/do-core/src/things-mixin.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L48)

Internal row ID for efficient relationships

***

### ns

> **ns**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L50)

Namespace for multi-tenant isolation

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L52)

Type/collection of the thing

***

### id

> **id**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L54)

Unique identifier within ns/type

***

### url?

> `optional` **url**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L56)

Optional URL identifier (for LinkedData compatibility)

***

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/things-mixin.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L58)

The thing's data payload (JSON)

***

### context?

> `optional` **context**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L60)

JSON-LD context for semantic web compatibility

***

### createdAt

> **createdAt**: `number`

Defined in: [packages/do-core/src/things-mixin.ts:62](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L62)

Creation timestamp (Unix ms)

***

### updatedAt

> **updatedAt**: `number`

Defined in: [packages/do-core/src/things-mixin.ts:64](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L64)

Last update timestamp (Unix ms)
