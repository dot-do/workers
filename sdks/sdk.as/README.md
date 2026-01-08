# sdk.as

**Turn your API into SDKs. Automatically.**

```bash
npm install sdk.as
```

---

## Your API Is Great. The Developer Experience Isn't.

You've built a powerful API. But your customers are struggling to use it.

They're writing boilerplate. They're guessing at types. They're fighting with authentication. They're reading docs instead of building.

**Every friction point is a customer you might lose.**

What if you could give every developer a native SDK in their language?

## SDKs That Write Themselves

```typescript
import { sdk } from 'sdk.as'

const result = await sdk.generate({
  name: 'acme-sdk',
  source: 'https://api.acme.com/openapi.json',
  language: 'typescript'
})

console.log(result.installCommand)  // npm install acme-sdk
console.log(result.usageExample)    // Ready-to-copy code
```

**sdk.as** gives you:
- Type-safe SDKs from your OpenAPI spec
- Every major language supported
- Auto-publish to npm, PyPI, crates.io
- SDKs that update when your API does
- Beautiful, documented code

## Ship SDKs in 3 Steps

### 1. Point at Your API

```typescript
import { sdk } from 'sdk.as'

const result = await sdk.generate({
  name: 'my-api',
  source: 'https://api.example.com/openapi.json',
  language: 'typescript',
  validation: true  // Runtime type checking
})
```

### 2. Generate for Every Language

```typescript
// One API, every language
const sdks = await sdk.generateAll({
  name: 'my-api',
  source: 'https://api.example.com/openapi.json',
  languages: ['typescript', 'python', 'go', 'rust']
})

for (const s of sdks) {
  console.log(`${s.sdk.language}: ${s.installCommand}`)
}
```

### 3. Publish Everywhere

```typescript
// Publish to npm
await sdk.publish('my-api', { registry: 'npm', access: 'public' })

// Publish to PyPI
await sdk.publish('my-api', { registry: 'pypi' })

// Your customers install with one command
```

## The SDK Advantage

**Without SDKs:**
- Customers write raw HTTP calls
- Type errors at runtime
- Onboarding takes days
- Every language is a support burden

**With sdk.as:**
- Native feel in every language
- Type errors at compile time
- Onboarding in minutes
- One source of truth, all languages

## Everything for World-Class DX

```typescript
// Validate your spec first
const validation = await sdk.validate(myOpenApiSpec)
if (!validation.valid) {
  console.log(validation.errors)
}

// Preview before publishing
const files = await sdk.preview('my-api')
for (const file of files) {
  console.log(`${file.path}:\n${file.content}`)
}

// Watch for changes and regenerate
await sdk.watch('my-api', 'https://api.example.com/openapi.json')

// Track adoption
const stats = await sdk.stats('my-api')
console.log(`${stats.downloads} downloads this week`)
```

## Configuration

### Environment Variables

```bash
# Primary API key (used by default)
export DO_API_KEY="your-api-key"

# Alternative: Organization API key
export ORG_AI_API_KEY="your-org-key"
```

### Cloudflare Workers

```typescript
import 'rpc.do/env'
import { sdk } from 'sdk.as'

// Environment is automatically configured
await sdk.generate({ name, source, language })
```

### Custom Configuration

```typescript
import { SDK } from 'sdk.as'

const client = SDK({
  baseURL: 'https://custom.example.com'
})
```

## Your API Deserves Great SDKs

The best APIs feel native in every language. The best developer experiences have zero friction.

**Give your customers SDKs that make integration a joy, not a job.**

```bash
npm install sdk.as
```

[Generate your SDKs at sdk.as](https://sdk.as)

---

MIT License
