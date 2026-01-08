[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/sessions/src](../README.md) / SessionManager

# Class: SessionManager

Defined in: [packages/sessions/src/index.ts:338](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L338)

SessionManager provides high-level session management

## Constructors

### Constructor

> **new SessionManager**(`config`): `SessionManager`

Defined in: [packages/sessions/src/index.ts:343](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L343)

#### Parameters

##### config

[`SessionConfig`](../interfaces/SessionConfig.md)

#### Returns

`SessionManager`

## Methods

### create()

> **create**(`options`): `Promise`\<[`Session`](../interfaces/Session.md)\>

Defined in: [packages/sessions/src/index.ts:349](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L349)

#### Parameters

##### options

[`CreateSessionOptions`](../interfaces/CreateSessionOptions.md)

#### Returns

`Promise`\<[`Session`](../interfaces/Session.md)\>

***

### validate()

> **validate**(`token`, `context?`): `Promise`\<[`ValidationResult`](../interfaces/ValidationResult.md)\>

Defined in: [packages/sessions/src/index.ts:369](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L369)

#### Parameters

##### token

`string`

##### context?

###### userAgent?

`string`

#### Returns

`Promise`\<[`ValidationResult`](../interfaces/ValidationResult.md)\>

***

### destroy()

> **destroy**(`sessionId`): `Promise`\<`void`\>

Defined in: [packages/sessions/src/index.ts:396](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L396)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

***

### refresh()

> **refresh**(`token`): `Promise`\<[`Session`](../interfaces/Session.md)\>

Defined in: [packages/sessions/src/index.ts:406](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L406)

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`Session`](../interfaces/Session.md)\>

***

### listForUser()

> **listForUser**(`userId`): `Promise`\<[`Session`](../interfaces/Session.md)[]\>

Defined in: [packages/sessions/src/index.ts:423](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L423)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`Session`](../interfaces/Session.md)[]\>

***

### destroyAllForUser()

> **destroyAllForUser**(`userId`): `Promise`\<`void`\>

Defined in: [packages/sessions/src/index.ts:443](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L443)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

***

### toPublicSession()

> **toPublicSession**(`session`): [`PublicSession`](../interfaces/PublicSession.md)

Defined in: [packages/sessions/src/index.ts:457](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L457)

#### Parameters

##### session

[`Session`](../interfaces/Session.md)

#### Returns

[`PublicSession`](../interfaces/PublicSession.md)
