# apis.as

**Build APIs in minutes. Not weeks.**

```bash
npm install apis.as
```

---

## Your API Shouldn't Be Harder Than Your Product

You've built something valuable. Now you need an API so others can use it.

But building a production API means:
- Writing boilerplate for every endpoint
- Implementing authentication from scratch
- Creating documentation nobody will maintain
- Building rate limiting, caching, versioning...
- Generating SDKs for every language your customers use

**That's not building. That's yak shaving.**

## What If Your API Wrote Itself?

```typescript
import { apis } from 'apis.as'

await apis.create({
  name: 'my-api',
  schema: {
    '/users': {
      get: { response: 'User[]' },
      post: { body: 'CreateUser', response: 'User' }
    },
    '/users/:id': {
      get: { response: 'User' },
      put: { body: 'UpdateUser', response: 'User' }
    }
  }
})
// API live. Docs generated. SDKs ready.
```

**apis.as** gives you:
- Auto-generated OpenAPI documentation
- Type-safe SDKs in any language
- Built-in authentication & rate limiting
- Real-time analytics
- One-click API key management

## Ship Your API in 3 Steps

### 1. Define Your Schema

```typescript
import { apis } from 'apis.as'

const api = await apis.create({
  name: 'acme-api',
  auth: 'api-key',
  schema: {
    '/products': {
      get: { response: 'Product[]', description: 'List all products' },
      post: { body: 'NewProduct', response: 'Product', auth: true }
    }
  }
})
```

### 2. Generate SDKs

```typescript
// TypeScript SDK
const tsSDK = await apis.sdk('acme-api', { language: 'typescript' })

// Python SDK
const pySDK = await apis.sdk('acme-api', { language: 'python' })

// Curl examples
const curlSDK = await apis.sdk('acme-api', { language: 'curl' })
```

### 3. Share Your Docs

Your API is live at `https://acme-api.apis.as` with beautiful, interactive documentation. Your customers can explore, test, and integrate immediately.

## The Difference

**The Old Way:**
- 2 weeks writing endpoints
- 1 week on authentication
- Documentation that's always outdated
- Manual SDK updates for every change
- Customers struggling to integrate

**The apis.as Way:**
- API live in 5 minutes
- Auth built in
- Docs always in sync
- SDKs auto-regenerate
- Customers integrating in minutes

## Everything You Need

```typescript
// Import from OpenAPI
const api = await apis.import('https://api.example.com/openapi.json')

// Test endpoints
const result = await apis.test('my-api', '/users', {
  method: 'POST',
  body: { name: 'Test User' }
})

// Monitor usage
const metrics = await apis.metrics('my-api')
console.log(`${metrics.requests} requests this week`)

// Manage API keys
const key = await apis.createKey('my-api', { name: 'Production' })
```

## Your Platform, Powered by APIs

The best products become platforms. Platforms are built on APIs.

**Don't let API development slow your platform ambitions.**

```bash
npm install apis.as
```

[Start building at apis.as](https://apis.as)

---

MIT License
