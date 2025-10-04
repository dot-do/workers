# yaml

# YAML Parser and Converter Worker

A Cloudflare Worker that provides YAML parsing, stringification, and streaming markdown/frontmatter conversion capabilities via RPC.

## Features

- ✅ **YAML Parsing** - Parse YAML strings to JavaScript objects
- ✅ **YAML Stringification** - Convert JavaScript objects to YAML strings
- ✅ **Streaming Markdown → JSON** - Convert markdown with YAML frontmatter to JSON
- ✅ **Streaming JSON → Markdown** - Convert JSON to markdown with YAML frontmatter
- ✅ **RPC Interface** - Service-to-service communication via WorkerEntrypoint
- ✅ **HTTP Health Check** - Simple health endpoint

## RPC Interface

```javascript
// Parse YAML to object
const data = await env.YAML_SERVICE.parse('key: value')

// Stringify object to YAML
const yaml = await env.YAML_SERVICE.stringify({ key: 'value' })
```

## Streaming Converters

**Markdown with frontmatter → JSON:**
```javascript
const markdownRes = new Response('---\ntitle: Test\n---\nContent here')
const jsonRes = await mdToJson(markdownRes)
// Returns: [{ "title": "Test", "$content": "Content here" }]
```

**JSON → Markdown with frontmatter:**
```javascript
const jsonRes = new Response(JSON.stringify([
  { title: 'Test', $content: 'Content here' }
]))
const mdRes = await jsonToMd(jsonRes)
// Returns markdown with YAML frontmatter
```

## Usage

This worker is designed to be called via RPC from other workers:

```javascript
// In your wrangler.jsonc
{
  "services": [
    { "binding": "YAML_SERVICE", "service": "yaml" }
  ]
}

// In your worker
const parsed = await env.YAML_SERVICE.parse(yamlString)
const stringified = await env.YAML_SERVICE.stringify(data)
```

## Dependencies

- `yaml` (v2.8.0+) - YAML parser and stringifier

## Implementation

---

**Generated from:** yaml.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts yaml.mdx`
