# hash

# Hash Worker

A Cloudflare Worker that provides fast hashing and short ID generation capabilities via RPC.

## Features

- ✅ **xxHash32** - Ultra-fast non-cryptographic hash function
- ✅ **Sqids Encoding** - Short, unique IDs from hash values
- ✅ **RPC Interface** - Service-to-service communication via WorkerEntrypoint
- ✅ **HTTP Health Check** - Simple health endpoint

## Use Cases

**Data Deduplication:**
- Generate consistent hashes for content
- Detect duplicate entries
- Create content-addressable identifiers

**Short IDs:**
- Convert hash values to short, URL-safe strings
- Generate unique identifiers from data
- Create readable references for internal systems

**Performance:**
- xxHash32 is one of the fastest hashing algorithms
- Ideal for high-throughput hashing operations
- Low latency for edge compute

## API

**Hash a string:**
```javascript
const hash = await env.HASH_SERVICE.xxHash32('Hello, World!')
console.log(hash) // 2954815703
```

**Generate short ID:**
```javascript
const sqid = await env.HASH_SERVICE.encodeSqid('Hello, World!')
console.log(sqid) // "DXtr5NJ" (short, URL-safe ID)
```

## Usage

This worker is designed to be called via RPC from other workers:

```javascript
// In your wrangler.jsonc
{
  "services": [
    { "binding": "HASH_SERVICE", "service": "hash" }
  ]
}

// In your worker
const hash = await env.HASH_SERVICE.xxHash32('my-data')
const sqid = await env.HASH_SERVICE.encodeSqid('my-data')
```

## Dependencies

- `sqids` (^0.3.0) - Short ID generation from numbers
- `@taylorzane/hash-wasm` (^0.0.11) - Fast WebAssembly-based hashing

## Implementation

---

**Generated from:** hash.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts hash.mdx`
