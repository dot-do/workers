[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / applyEventMixin

# Function: applyEventMixin()

> **applyEventMixin**\<`TBase`\>(`Base`, `config?`): \{(...`args`): `EventMixin`; `prototype`: `EventMixin`\<`any`\>; \} & `TBase`

Defined in: [packages/do-core/src/event-mixin.ts:195](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L195)

Apply EventMixin to a base class

This function returns a new class that extends the base class
with event sourcing capabilities.

## Type Parameters

### TBase

`TBase` *extends* `Constructor`\<`EventMixinBase`\>

## Parameters

### Base

`TBase`

The base class to extend

### config?

[`EventMixinConfig`](../interfaces/EventMixinConfig.md)

Optional configuration for the mixin

## Returns

\{(...`args`): `EventMixin`; `prototype`: `EventMixin`\<`any`\>; \} & `TBase`

A new class with event sourcing operations

## Example

```typescript
class MyDO extends applyEventMixin(DOCore) {
  // Now has appendEvent, getEvents, getLatestVersion
}
```
