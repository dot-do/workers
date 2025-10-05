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

### Timestamp Operations

- **extractTimestampFromSquid** - Extract millisecond timestamp from Sqid
- **extractTimestampFromUlid** - Extract millisecond timestamp from ULID
- **createSquidWithTimestamp** - Create new Sqid with specific or current timestamp
- **createUlidWithTimestamp** - Create new ULID with specific or current timestamp
- **isValidSquid** - Validate Sqid format

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

# Extract timestamp from Sqid (returns milliseconds since epoch)
curl "https://utils.do/extractTimestampFromSquid?sqid=abc123"

# Extract timestamp from ULID
curl "https://utils.do/extractTimestampFromUlid?ulid=01ARZ3NDEKTSV4RRFFQ69G5FAV"

# Create Sqid with specific timestamp
curl "https://utils.do/createSquidWithTimestamp?timestamp=1704067200000"

# Create Sqid with current timestamp (default)
curl "https://utils.do/createSquidWithTimestamp"

# Create ULID with specific timestamp
curl "https://utils.do/createUlidWithTimestamp?timestamp=1704067200000"

# Validate Sqid format
curl "https://utils.do/isValidSquid?id=abc123"

# Convert to markdown (via AI binding)
curl "https://utils.do/toMarkdown?blob=..."
```

### RPC Interface

```ts
// In your wrangler.jsonc
{
  "services": [
    { "binding": "UTILS_SERVICE", "service": "utils" }
  ]
}

// In your worker

// ID conversion
const sqid = await env.UTILS_SERVICE.ulidToSqid('01ARZ3NDEKTSV4RRFFQ69G5FAV')
const ulid = await env.UTILS_SERVICE.sqidToUlid('abc123')

// Timestamp operations
const timestamp = await env.UTILS_SERVICE.extractTimestampFromSquid('abc123')
const ulidTimestamp = await env.UTILS_SERVICE.extractTimestampFromUlid('01ARZ3NDEKTSV4RRFFQ69G5FAV')

// Create IDs with timestamps
const newSquid = await env.UTILS_SERVICE.createSquidWithTimestamp() // current time
const specificSquid = await env.UTILS_SERVICE.createSquidWithTimestamp(1704067200000)
const newUlid = await env.UTILS_SERVICE.createUlidWithTimestamp()

// Validation
const isValid = await env.UTILS_SERVICE.isValidSquid('abc123')

// Markdown conversion
const markdown = await env.UTILS_SERVICE.toMarkdown({ blob })
```

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
- **Timestamp** - Original creation time from ULID (48 bits, millisecond precision)
- **Randomness** - Full 80 bits of entropy
- **Reversibility** - Bidirectional conversion

### Timestamp Encoding

Both ULID and Sqid encode timestamps:
- **Precision**: Milliseconds since Unix epoch
- **Range**: 0 to 281,474,976,710,655 (until year 8920)
- **Sortable**: IDs with earlier timestamps sort before later ones
- **Extractable**: Timestamps can be retrieved from IDs without conversion

**Example:**
```ts
const timestamp = 1704067200000 // 2024-01-01 00:00:00 UTC
const sqid = createSquidWithTimestamp(timestamp)
const ulid = createUlidWithTimestamp(timestamp)

// Later, extract the timestamp
const extractedFromSquid = extractTimestampFromSquid(sqid) // 1704067200000
const extractedFromUlid = extractTimestampFromUlid(ulid)   // 1704067200000

// Convert between formats while preserving timestamp
const convertedSquid = ulidToSqid(ulid)
const extractedFromConverted = extractTimestampFromSquid(convertedSquid) // Still 1704067200000
```

## Implementation



## Utility Functions

### ULID ↔ Sqid Conversion

The worker converts between ULID and Sqid formats while preserving timestamp and randomness. See implementation above for the conversion logic.

### Markdown Conversion

The worker provides access to Workers AI's `toMarkdown` function for converting various content formats to markdown.

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
