[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventStoreOptions

# Interface: EventStoreOptions

Defined in: [packages/do-core/src/event-store.ts:257](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L257)

Configuration options for EventStore.

Allows customization of ID generation, serialization, and other behaviors.

## Example

```typescript
const options: EventStoreOptions = {
  idGenerator: () => ulid(),
  serializer: customSerializer,
  timestampProvider: () => Date.now(),
}

const store = new EventStore(sql, options)
```

## Properties

### idGenerator?

> `optional` **idGenerator**: [`IdGenerator`](../type-aliases/IdGenerator.md)

Defined in: [packages/do-core/src/event-store.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L262)

Custom ID generator function.

#### Default

```ts
crypto.randomUUID()
```

***

### serializer?

> `optional` **serializer**: [`EventSerializer`](EventSerializer.md)

Defined in: [packages/do-core/src/event-store.ts:268](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L268)

Custom serializer for payload and metadata.

#### Default

```ts
JSON serializer
```

***

### timestampProvider()?

> `optional` **timestampProvider**: () => `number`

Defined in: [packages/do-core/src/event-store.ts:274](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L274)

Custom timestamp provider function.

#### Returns

`number`

#### Default

```ts
Date.now()
```
