[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / applyThingsMixin

# Function: applyThingsMixin()

> **applyThingsMixin**\<`TBase`\>(`Base`): \{(...`args`): `ThingsMixin`; `prototype`: `ThingsMixin`\<`any`\>; \} & `TBase`

Defined in: [packages/do-core/src/things-mixin.ts:213](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L213)

Apply ThingsMixin to a base class

This function returns a new class that extends the base class
with Things management capabilities.

## Type Parameters

### TBase

`TBase` *extends* `Constructor`\<`ThingsMixinBase`\>

## Parameters

### Base

`TBase`

The base class to extend

## Returns

\{(...`args`): `ThingsMixin`; `prototype`: `ThingsMixin`\<`any`\>; \} & `TBase`

A new class with Things operations

## Example

```typescript
class MyDO extends applyThingsMixin(DOCore) {
  // Now has getThing, createThing, etc.
}
```
