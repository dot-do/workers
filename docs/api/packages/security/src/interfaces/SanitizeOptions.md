[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / SanitizeOptions

# Interface: SanitizeOptions

Defined in: [packages/security/src/index.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L25)

Options for input sanitization

## Properties

### allowlist?

> `optional` **allowlist**: `RegExp`

Defined in: [packages/security/src/index.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L27)

Regex pattern for allowed characters

***

### maxLength?

> `optional` **maxLength**: `number`

Defined in: [packages/security/src/index.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L29)

Maximum length of output

***

### trim?

> `optional` **trim**: `boolean`

Defined in: [packages/security/src/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L31)

Whether to trim whitespace (default: true)
