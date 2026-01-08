[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/sessions/src](../README.md) / SessionStore

# Class: SessionStore

Defined in: [packages/sessions/src/index.ts:231](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L231)

SessionStore handles persistence of sessions

## Constructors

### Constructor

> **new SessionStore**(`config`, `prefix`): `SessionStore`

Defined in: [packages/sessions/src/index.ts:235](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L235)

#### Parameters

##### config

[`StoreConfig`](../interfaces/StoreConfig.md)

##### prefix

`string` = `'session:'`

#### Returns

`SessionStore`

## Methods

### save()

> **save**(`session`): `Promise`\<`void`\>

Defined in: [packages/sessions/src/index.ts:279](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L279)

#### Parameters

##### session

[`Session`](../interfaces/Session.md)

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`id`): `Promise`\<[`Session`](../interfaces/Session.md) \| `null`\>

Defined in: [packages/sessions/src/index.ts:295](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L295)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Session`](../interfaces/Session.md) \| `null`\>

***

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [packages/sessions/src/index.ts:310](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L310)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### findByTokenHash()

> **findByTokenHash**(`tokenHash`): `Promise`\<[`Session`](../interfaces/Session.md) \| `null`\>

Defined in: [packages/sessions/src/index.ts:319](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L319)

#### Parameters

##### tokenHash

`string`

#### Returns

`Promise`\<[`Session`](../interfaces/Session.md) \| `null`\>
