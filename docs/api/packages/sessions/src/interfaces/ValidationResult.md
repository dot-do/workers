[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/sessions/src](../README.md) / ValidationResult

# Interface: ValidationResult

Defined in: [packages/sessions/src/index.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L44)

Result of session validation

## Properties

### valid

> **valid**: `boolean`

Defined in: [packages/sessions/src/index.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L45)

***

### session?

> `optional` **session**: [`Session`](Session.md)

Defined in: [packages/sessions/src/index.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L46)

***

### error?

> `optional` **error**: `"invalid_token"` \| `"session_expired"` \| `"session_revoked"` \| `"user_agent_mismatch"`

Defined in: [packages/sessions/src/index.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/sessions/src/index.ts#L47)
