[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / freezePrototypes

# Function: freezePrototypes()

> **freezePrototypes**(): `void`

Defined in: [packages/security/src/prototype-pollution.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L227)

Freeze built-in prototypes to prevent runtime modifications
Should be called early in application startup

NOTE: Tests using this function may need isolation since freezing prototypes
affects the entire JavaScript runtime and cannot be undone. Consider running
such tests in a separate process or using VM isolation.

## Returns

`void`
