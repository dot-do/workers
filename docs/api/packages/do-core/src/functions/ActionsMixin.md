[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionsMixin

# Function: ActionsMixin()

> **ActionsMixin**\<`TBase`\>(`Base`): \{(...`args`): `ActionsMixinClass`; `prototype`: `ActionsMixinClass`\<`any`\>; \} & `TBase`

Defined in: [packages/do-core/src/actions-mixin.ts:246](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L246)

ActionsMixin factory function

Creates a mixin class that adds action handling capabilities to any base class.
The base class should extend DOCore or have compatible ctx/env properties.

## Type Parameters

### TBase

`TBase` *extends* `Constructor`\<`DOCoreLike`\>

## Parameters

### Base

`TBase`

The base class to extend

## Returns

\{(...`args`): `ActionsMixinClass`; `prototype`: `ActionsMixinClass`\<`any`\>; \} & `TBase`

A new class with action handling capabilities

## Example

```typescript
// Compose with DOCore
class MyDO extends ActionsMixin(DOCore) {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
    this.registerAction('ping', {
      handler: async () => 'pong'
    })
  }
}

// Compose with Agent
class MyAgent extends ActionsMixin(Agent) {
  // Has both Agent lifecycle AND action handling
}
```
