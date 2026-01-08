[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / Permission

# Type Alias: Permission

> **Permission** = `string`

Defined in: [packages/auth/src/index.ts:8](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L8)

Permission string type - can be simple ('read') or namespaced ('documents:read')
Supports wildcards: '*' for all permissions, 'namespace:*' for all in namespace
