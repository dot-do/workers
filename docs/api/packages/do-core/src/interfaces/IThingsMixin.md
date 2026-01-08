[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IThingsMixin

# Interface: IThingsMixin

Defined in: [packages/do-core/src/things-mixin.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L156)

Interface for classes that provide Things operations

## Methods

### getThing()

> **getThing**(`ns`, `type`, `id`): `Promise`\<[`Thing`](Thing.md) \| `null`\>

Defined in: [packages/do-core/src/things-mixin.ts:158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L158)

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

#### Returns

`Promise`\<[`Thing`](Thing.md) \| `null`\>

***

### createThing()

> **createThing**(`input`): `Promise`\<[`Thing`](Thing.md)\>

Defined in: [packages/do-core/src/things-mixin.ts:159](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L159)

#### Parameters

##### input

[`CreateThingInput`](CreateThingInput.md)

#### Returns

`Promise`\<[`Thing`](Thing.md)\>

***

### updateThing()

> **updateThing**(`ns`, `type`, `id`, `input`): `Promise`\<[`Thing`](Thing.md) \| `null`\>

Defined in: [packages/do-core/src/things-mixin.ts:160](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L160)

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

##### input

[`UpdateThingInput`](UpdateThingInput.md)

#### Returns

`Promise`\<[`Thing`](Thing.md) \| `null`\>

***

### deleteThing()

> **deleteThing**(`ns`, `type`, `id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/things-mixin.ts:161](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L161)

#### Parameters

##### ns

`string`

##### type

`string`

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### listThings()

> **listThings**(`filter?`): `Promise`\<[`Thing`](Thing.md)[]\>

Defined in: [packages/do-core/src/things-mixin.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L162)

#### Parameters

##### filter?

[`ThingFilter`](ThingFilter.md)

#### Returns

`Promise`\<[`Thing`](Thing.md)[]\>

***

### searchThings()

> **searchThings**(`query`, `options?`): `Promise`\<[`Thing`](Thing.md)[]\>

Defined in: [packages/do-core/src/things-mixin.ts:165](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L165)

#### Parameters

##### query

`string`

##### options?

[`ThingSearchOptions`](ThingSearchOptions.md)

#### Returns

`Promise`\<[`Thing`](Thing.md)[]\>

***

### onThingEvent()

> **onThingEvent**(`handler`): `void`

Defined in: [packages/do-core/src/things-mixin.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L168)

#### Parameters

##### handler

[`ThingEventHandler`](../type-aliases/ThingEventHandler.md)

#### Returns

`void`

***

### offThingEvent()

> **offThingEvent**(`handler`): `void`

Defined in: [packages/do-core/src/things-mixin.ts:169](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L169)

#### Parameters

##### handler

[`ThingEventHandler`](../type-aliases/ThingEventHandler.md)

#### Returns

`void`
