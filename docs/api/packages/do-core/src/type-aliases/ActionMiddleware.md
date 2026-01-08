[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionMiddleware

# Type Alias: ActionMiddleware()

> **ActionMiddleware** = (`actionName`, `params`, `next`) => `Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\>

Defined in: [packages/do-core/src/actions-mixin.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L117)

Middleware function for action execution

## Parameters

### actionName

`string`

### params

`unknown`

### next

() => `Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\>

## Returns

`Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\>
