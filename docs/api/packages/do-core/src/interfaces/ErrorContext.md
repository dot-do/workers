[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ErrorContext

# Interface: ErrorContext

Defined in: [packages/do-core/src/error-boundary.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L25)

Error context for debugging

## Properties

### boundaryName

> **boundaryName**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L27)

The boundary name where error occurred

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L29)

Timestamp when error occurred

***

### request?

> `optional` **request**: `Request`\<`unknown`, `CfProperties`\<`unknown`\>\>

Defined in: [packages/do-core/src/error-boundary.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L31)

Request that caused the error (if applicable)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/error-boundary.ts:33](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L33)

Additional metadata

***

### stack?

> `optional` **stack**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L35)

Stack trace

***

### operation?

> `optional` **operation**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L37)

Operation being performed
