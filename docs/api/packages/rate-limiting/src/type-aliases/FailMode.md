[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / FailMode

# Type Alias: FailMode

> **FailMode** = `"open"` \| `"closed"`

Defined in: [packages/rate-limiting/src/index.ts:11](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L11)

@dotdo/rate-limiting

Rate limiting middleware for Cloudflare Workers with:
- Token bucket algorithm
- Sliding window algorithm
- Fail-closed option (deny when uncertain)
- Configurable limits per endpoint/user
