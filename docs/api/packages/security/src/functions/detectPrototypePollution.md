[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / detectPrototypePollution

# Function: detectPrototypePollution()

> **detectPrototypePollution**(`obj`): [`PrototypePollutionResult`](../interfaces/PrototypePollutionResult.md)

Defined in: [packages/security/src/prototype-pollution.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L63)

Detect prototype pollution attempts in an object
Checks for dangerous keys like __proto__, constructor, and prototype

## Parameters

### obj

`unknown`

The object to check for prototype pollution

## Returns

[`PrototypePollutionResult`](../interfaces/PrototypePollutionResult.md)

Detection result with dangerous keys and paths found
