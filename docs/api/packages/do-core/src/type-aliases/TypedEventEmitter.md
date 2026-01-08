[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TypedEventEmitter

# Type Alias: TypedEventEmitter\<Events\>

> **TypedEventEmitter**\<`Events`\> = `object`

Defined in: [packages/do-core/src/events.ts:489](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L489)

Type helper for creating typed event emitters

## Example

```typescript
interface MyEvents {
  'user:created': { userId: string; email: string }
  'user:deleted': { userId: string }
}

class MyDO extends EventsMixin {
  // Type-safe event emission
  async createUser(email: string) {
    const userId = crypto.randomUUID()
    await this.emit<MyEvents>('user:created', { userId, email })
  }
}
```

## Type Parameters

### Events

`Events` *extends* `Record`\<`string`, `unknown`\>

## Methods

### emit()

> **emit**\<`K`\>(`event`, `data`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/events.ts:490](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L490)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### data

`Events`\[`K`\]

#### Returns

`Promise`\<`void`\>

***

### on()

> **on**\<`K`\>(`event`, `handler`): [`Unsubscribe`](Unsubscribe.md)

Defined in: [packages/do-core/src/events.ts:491](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L491)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### handler

(`data`) => `void` \| `Promise`\<`void`\>

#### Returns

[`Unsubscribe`](Unsubscribe.md)

***

### once()

> **once**\<`K`\>(`event`, `handler`): [`Unsubscribe`](Unsubscribe.md)

Defined in: [packages/do-core/src/events.ts:492](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L492)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### handler

(`data`) => `void` \| `Promise`\<`void`\>

#### Returns

[`Unsubscribe`](Unsubscribe.md)

***

### off()

> **off**\<`K`\>(`event`, `handler`): `void`

Defined in: [packages/do-core/src/events.ts:493](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L493)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### handler

(`data`) => `void` \| `Promise`\<`void`\>

#### Returns

`void`
