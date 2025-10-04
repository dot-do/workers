# load

# Load Worker

Loads and manages AI model data from OpenRouter API, storing it in the database.

## Features

- ✅ Fetches AI models from OpenRouter API
- ✅ Stores models in database via RPC
- ✅ Extracts model names/slugs
- ✅ Returns model list as YAML

## API

**RPC Methods:**
```javascript
// Get all models (fetch from API, store in DB)
const models = await env.LOAD_SERVICE.models()

// Get model names/slugs only
const names = await env.LOAD_SERVICE.modelNames()
```

**HTTP Endpoint:**
```javascript
// Returns model names as YAML
const response = await fetch('https://load.apis.do/')
const yaml = await response.text()
```

## Dependencies

- **db** - Database service (RPC binding)
- **yaml** - YAML service (RPC binding)

## Implementation

---

**Generated from:** load.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts load.mdx`
