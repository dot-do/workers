[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/sessions/src](../README.md) / Session

# Interface: Session

Defined in: [packages/sessions/src/index.ts:7](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L7)

Session interface representing a user session

## Properties

### id

> **id**: `string`

Defined in: [packages/sessions/src/index.ts:8](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L8)

***

### userId

> **userId**: `string`

Defined in: [packages/sessions/src/index.ts:9](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L9)

***

### token

> **token**: `string`

Defined in: [packages/sessions/src/index.ts:10](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L10)

***

### tokenHash

> **tokenHash**: `string`

Defined in: [packages/sessions/src/index.ts:11](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L11)

***

### createdAt

> **createdAt**: `Date`

Defined in: [packages/sessions/src/index.ts:12](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L12)

***

### expiresAt

> **expiresAt**: `Date`

Defined in: [packages/sessions/src/index.ts:13](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L13)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/sessions/src/index.ts:14](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L14)

***

### revokedAt?

> `optional` **revokedAt**: `Date`

Defined in: [packages/sessions/src/index.ts:15](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L15)

***

### slidingExpiration?

> `optional` **slidingExpiration**: `boolean`

Defined in: [packages/sessions/src/index.ts:16](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L16)

***

### boundUserAgent?

> `optional` **boundUserAgent**: `string`

Defined in: [packages/sessions/src/index.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L17)
