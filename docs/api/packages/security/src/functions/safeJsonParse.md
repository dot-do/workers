[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / safeJsonParse

# Function: safeJsonParse()

> **safeJsonParse**(`json`): `unknown`

Defined in: [packages/security/src/prototype-pollution.ts:214](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L214)

Safely parse JSON, filtering out prototype pollution keys

## Parameters

### json

`string`

The JSON string to parse

## Returns

`unknown`

Parsed object without prototype pollution
