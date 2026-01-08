[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / CreateThingInput

# Interface: CreateThingInput

Defined in: [packages/do-core/src/things-mixin.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L70)

Input for creating a new Thing

## Properties

### ns?

> `optional` **ns**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L72)

Namespace (defaults to 'default')

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:74](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L74)

Type/collection of the thing (required)

***

### id?

> `optional` **id**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L76)

Unique identifier (auto-generated if not provided)

***

### url?

> `optional` **url**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L78)

Optional URL identifier

***

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/things-mixin.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L80)

The thing's data payload

***

### context?

> `optional` **context**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:82](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L82)

JSON-LD context
