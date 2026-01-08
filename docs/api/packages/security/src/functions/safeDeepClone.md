[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / safeDeepClone

# Function: safeDeepClone()

> **safeDeepClone**\<`T`\>(`obj`): `T`

Defined in: [packages/security/src/prototype-pollution.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L130)

Safely deep clone an object, filtering out prototype pollution keys
Uses null prototype to ensure no inherited constructor/prototype properties

## Type Parameters

### T

`T`

## Parameters

### obj

`T`

The object to clone

## Returns

`T`

A new cloned object without prototype pollution
