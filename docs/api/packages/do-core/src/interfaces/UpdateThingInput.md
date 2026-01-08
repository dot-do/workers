[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / UpdateThingInput

# Interface: UpdateThingInput

Defined in: [packages/do-core/src/things-mixin.ts:88](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L88)

Input for updating an existing Thing

## Properties

### url?

> `optional` **url**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:90](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L90)

URL to update

***

### data?

> `optional` **data**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/things-mixin.ts:92](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L92)

Data fields to update (merged with existing)

***

### context?

> `optional` **context**: `string`

Defined in: [packages/do-core/src/things-mixin.ts:94](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L94)

JSON-LD context to update
