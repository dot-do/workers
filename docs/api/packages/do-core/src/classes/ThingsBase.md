[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ThingsBase

# Class: ThingsBase\<Env\>

Defined in: [packages/do-core/src/things-mixin.ts:425](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L425)

ThingsBase - Convenience base class with Things operations

Pre-composed class that extends DOCore with ThingsMixin.
Use this when you only need Things operations without additional mixins.

## Example

```typescript
import { ThingsBase } from '@dotdo/do'

class MyDO extends ThingsBase {
  async fetch(request: Request) {
    const thing = await this.createThing({
      type: 'user',
      data: { name: 'John' }
    })
    return Response.json(thing)
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

> **new ThingsBase**\<`Env`\>(`ctx`, `env`): `ThingsBase`\<`Env`\>

Defined in: [packages/do-core/src/things-mixin.ts:426](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/things-mixin.ts#L426)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

#### Returns

`ThingsBase`\<`Env`\>

#### Overrides

`applyThingsMixin(DOCore)<Env>.constructor`
