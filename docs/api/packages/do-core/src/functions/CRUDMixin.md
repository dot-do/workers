[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / CRUDMixin

# Function: CRUDMixin()

> **CRUDMixin**\<`TBase`\>(`Base`): \{(...`args`): `(Anonymous class)`; `prototype`: `(Anonymous class)`\<`any`\>; \} & `TBase`

Defined in: [packages/do-core/src/crud-mixin.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L80)

CRUD Mixin factory function.

Creates a mixin class that adds CRUD operations to any base class
that implements the StorageProvider interface.

## Type Parameters

### TBase

`TBase` *extends* `Constructor`\<[`StorageProvider`](../interfaces/StorageProvider.md)\>

## Parameters

### Base

`TBase`

The base class to extend

## Returns

\{(...`args`): `(Anonymous class)`; `prototype`: `(Anonymous class)`\<`any`\>; \} & `TBase`

A new class with CRUD operations mixed in

## Example

```typescript
class MyDO extends CRUDMixin(DOCore) {
  getStorage() {
    return this.ctx.storage
  }

  async fetch(request: Request) {
    // Now has access to this.get(), this.create(), etc.
    const user = await this.get('users', '123')
    return Response.json(user)
  }
}
```
