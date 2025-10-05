# utils

# Utils Worker

A Cloudflare Worker that provides utility functions for ID conversion and markdown processing via both HTTP and RPC interfaces.

## Features

- ✅ **ULID ↔ Sqid Conversion** - Convert between ULID and Sqid formats
- ✅ **toMarkdown** - Access Workers AI markdown conversion
- ✅ **HTTP API** - Call functions via URL query parameters
- ✅ **RPC Interface** - Service-to-service communication
- ✅ **Auto-Discovery** - Lists available functions at root

## Available Functions

### ID Conversion

- **ulidToSqid** - Convert ULID to Sqid format
- **sqidToUlid** - Convert Sqid back to ULID format

### Markdown Processing

- **toMarkdown** - Convert content to markdown using Workers AI

## Usage

### HTTP API

```bash
# List available functions
curl https://utils.do/

# Convert ULID to Sqid
curl "https://utils.do/ulidToSqid?u=01ARZ3NDEKTSV4RRFFQ69G5FAV"

# Convert Sqid to ULID
curl "https://utils.do/sqidToUlid?id=abc123"

# Convert to markdown (via AI binding)
curl "https://utils.do/toMarkdown?blob=..."
```

### RPC Interface



## ID Formats

### ULID (Universally Unique Lexicographically Sortable Identifier)

- **Format**: 26-character Crockford Base32
- **Example**: `01ARZ3NDEKTSV4RRFFQ69G5FAV`
- **Components**:
  - 10 chars: Timestamp (48 bits, millisecond precision)
  - 16 chars: Randomness (80 bits)
- **Benefits**: Sortable, URL-safe, collision-resistant

### Sqid (Sqids - Short Unique IDs)

- **Format**: Variable-length alphanumeric
- **Example**: `abc123xyz`
- **Benefits**: Shorter, customizable alphabet, aesthetic
- **Use case**: Public-facing IDs, URLs

### Conversion

The worker converts between formats while preserving:
- **Timestamp** - Original creation time from ULID
- **Randomness** - Full 80 bits of entropy
- **Reversibility** - Bidirectional conversion

## Implementation



## Utility Functions

### ULID ↔ Sqid Conversion



### Markdown Conversion



## Dependencies

- `ulid` - ULID generation and parsing
- `sqids` - Sqids generation (short IDs)
- Workers AI binding - Markdown conversion

## Use Cases

1. **Public-Facing IDs** - Convert internal ULIDs to prettier Sqids for URLs
2. **Database Keys** - Use ULIDs internally for sorting, Sqids publicly
3. **URL Shortening** - Generate short, readable IDs
4. **AI Content Processing** - Convert various formats to markdown
5. **Cross-Service Utilities** - Shared functions available via RPC

## Response Format

### Success

```json
{
  "result": "abc123xyz"
}
```

### Error

```json
{
  "success": false,
  "error": "Invalid ULID"
}
```

### Function List

```json
[
  "https://utils.do/ulidToSqid",
  "https://utils.do/sqidToUlid",
  "https://utils.do/toMarkdown"
]
```

---

**Generated from:** utils.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts utils.mdx`
