[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventBase

# Class: EventBase\<Env\>

Defined in: [packages/do-core/src/event-mixin.ts:439](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L439)

EventBase - Convenience base class with event sourcing operations

Pre-composed class that extends DOCore with EventMixin.
Use this when you only need event sourcing without additional mixins.

## Example

```typescript
import { EventBase } from '@dotdo/do'

class MyDO extends EventBase {
  async fetch(request: Request) {
    const event = await this.appendEvent({
      streamId: 'order-123',
      type: 'order.created',
      data: { customerId: 'cust-456' }
    })
    return Response.json(event)
  }
}
```

## Extends

- `any`

## Type Parameters

### Env

`Env` *extends* [`DOEnv`](../interfaces/DOEnv.md) = [`DOEnv`](../interfaces/DOEnv.md)

## Constructors

### Constructor

> **new EventBase**\<`Env`\>(`ctx`, `env`): `EventBase`\<`Env`\>

Defined in: [packages/do-core/src/event-mixin.ts:440](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L440)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

#### Returns

`EventBase`\<`Env`\>

#### Overrides

`applyEventMixin(DOCore)<Env>.constructor`
