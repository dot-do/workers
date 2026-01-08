[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / CRUDBase

# Abstract Class: CRUDBase

Defined in: [packages/do-core/src/crud-mixin.ts:454](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L454)

Abstract base class alternative for CRUD operations.

Use this if you prefer classical inheritance over mixins.

## Example

```typescript
class MyDO extends CRUDBase {
  protected ctx: DOState

  constructor(ctx: DOState, env: Env) {
    super()
    this.ctx = ctx
  }

  getStorage() {
    return this.ctx.storage
  }
}
```

## Implements

- [`StorageProvider`](../interfaces/StorageProvider.md)

## Constructors

### Constructor

> **new CRUDBase**(): `CRUDBase`

#### Returns

`CRUDBase`

## Methods

### getStorage()

> `abstract` **getStorage**(): [`DOStorage`](../interfaces/DOStorage.md)

Defined in: [packages/do-core/src/crud-mixin.ts:456](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L456)

Implement to provide storage access

#### Returns

[`DOStorage`](../interfaces/DOStorage.md)

#### Implementation of

[`StorageProvider`](../interfaces/StorageProvider.md).[`getStorage`](../interfaces/StorageProvider.md#getstorage)

***

### get()

> **get**\<`T`\>(`collection`, `id`): `Promise`\<`T` \| `null`\>

Defined in: [packages/do-core/src/crud-mixin.ts:458](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L458)

#### Type Parameters

##### T

`T` *extends* [`Document`](../interfaces/Document.md)

#### Parameters

##### collection

`string`

##### id

`string`

#### Returns

`Promise`\<`T` \| `null`\>

***

### create()

> **create**\<`T`\>(`collection`, `data`): `Promise`\<`T` & [`Document`](../interfaces/Document.md)\>

Defined in: [packages/do-core/src/crud-mixin.ts:465](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L465)

#### Type Parameters

##### T

`T` *extends* `Partial`\<[`Document`](../interfaces/Document.md)\>

#### Parameters

##### collection

`string`

##### data

`T`

#### Returns

`Promise`\<`T` & [`Document`](../interfaces/Document.md)\>

***

### update()

> **update**\<`T`\>(`collection`, `id`, `updates`): `Promise`\<`T` \| `null`\>

Defined in: [packages/do-core/src/crud-mixin.ts:486](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L486)

#### Type Parameters

##### T

`T` *extends* [`Document`](../interfaces/Document.md)

#### Parameters

##### collection

`string`

##### id

`string`

##### updates

`Partial`\<`T`\>

#### Returns

`Promise`\<`T` \| `null`\>

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/crud-mixin.ts:510](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L510)

#### Parameters

##### collection

`string`

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### list()

> **list**\<`T`\>(`collection`, `options`): `Promise`\<`T`[]\>

Defined in: [packages/do-core/src/crud-mixin.ts:516](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L516)

#### Type Parameters

##### T

`T` *extends* [`Document`](../interfaces/Document.md)

#### Parameters

##### collection

`string`

##### options

[`CRUDListOptions`](../interfaces/CRUDListOptions.md) = `{}`

#### Returns

`Promise`\<`T`[]\>

***

### exists()

> **exists**(`collection`, `id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/crud-mixin.ts:537](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L537)

#### Parameters

##### collection

`string`

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### count()

> **count**(`collection`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/crud-mixin.ts:542](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L542)

#### Parameters

##### collection

`string`

#### Returns

`Promise`\<`number`\>

***

### upsert()

> **upsert**\<`T`\>(`collection`, `id`, `data`): `Promise`\<`T` & [`Document`](../interfaces/Document.md)\>

Defined in: [packages/do-core/src/crud-mixin.ts:549](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L549)

#### Type Parameters

##### T

`T` *extends* `Partial`\<[`Document`](../interfaces/Document.md)\>

#### Parameters

##### collection

`string`

##### id

`string`

##### data

`T`

#### Returns

`Promise`\<`T` & [`Document`](../interfaces/Document.md)\>

***

### deleteCollection()

> **deleteCollection**(`collection`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/crud-mixin.ts:564](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L564)

#### Parameters

##### collection

`string`

#### Returns

`Promise`\<`number`\>

***

### getMany()

> **getMany**\<`T`\>(`collection`, `ids`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/do-core/src/crud-mixin.ts:577](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L577)

#### Type Parameters

##### T

`T` *extends* [`Document`](../interfaces/Document.md)

#### Parameters

##### collection

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

***

### createMany()

> **createMany**\<`T`\>(`collection`, `docs`): `Promise`\<`T` & [`Document`](../interfaces/Document.md)[]\>

Defined in: [packages/do-core/src/crud-mixin.ts:594](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L594)

#### Type Parameters

##### T

`T` *extends* `Partial`\<[`Document`](../interfaces/Document.md)\>

#### Parameters

##### collection

`string`

##### docs

`T`[]

#### Returns

`Promise`\<`T` & [`Document`](../interfaces/Document.md)[]\>

***

### deleteMany()

> **deleteMany**(`collection`, `ids`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/crud-mixin.ts:622](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L622)

#### Parameters

##### collection

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`number`\>
