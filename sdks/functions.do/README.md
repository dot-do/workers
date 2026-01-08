# functions.do

**Run serverless functions without the serverless pain.**

```bash
npm install functions.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { functions } from 'functions.do'

// Or use the factory for custom config
import { Functions } from 'functions.do'
const functions = Functions({ baseURL: 'https://custom.example.com' })
```

---

## You Built a Function. Now You're Managing a Platform.

You wrote 50 lines of code. Now you're debugging cold starts at 3am.

What started as a simple function has become:
- Waiting 2+ seconds for cold starts while users bounce
- Configuring CI/CD pipelines instead of shipping features
- Managing versions across 17 different functions
- Trying to debug production issues with logs that tell you nothing
- Getting surprise bills because you can't predict costs

**You wanted serverless simplicity. You got serverless complexity.**

## What If Functions Just Worked?

```typescript
import { functions } from 'functions.do'

await functions.define('processImage', {
  code: `export default async (input) => { return resizeImage(input) }`,
  runtime: 'v8'
})

const result = await functions.invoke('processImage', { url: 'https://...' })
// Cold start? What cold start?
```

**functions.do** gives you:
- V8 isolates with near-zero cold starts
- Deploy from anywhere with a single call
- Version management built in
- Real-time logs that actually help you debug
- Predictable pricing you can understand

## Ship Your Function in 3 Steps

### 1. Define Your Function

```typescript
import { functions } from 'functions.do'

await functions.define('sendWelcomeEmail', {
  code: `
    export default async ({ email, name }) => {
      await sendEmail({
        to: email,
        subject: 'Welcome!',
        body: \`Hey \${name}, glad to have you!\`
      })
      return { sent: true }
    }
  `,
  runtime: 'v8',
  timeout: 30000
})
```

### 2. Invoke It

```typescript
// Synchronous - get the result now
const result = await functions.invoke('sendWelcomeEmail', {
  email: 'user@example.com',
  name: 'Alex'
})

// Asynchronous - fire and forget
const { invocationId } = await functions.invokeAsync('sendWelcomeEmail', data)
const status = await functions.status(invocationId)
```

### 3. Ship It

Your function is live. No CI/CD to configure. No containers to manage. No cold starts to optimize. Just code that runs.

## Before and After

**The Old Way:**
- 5+ seconds cold start on first request
- 2 hours configuring deployment pipelines
- "Works on my machine" debugging nightmares
- $500 surprise bills from forgotten functions
- Managing infrastructure instead of building product

**The functions.do Way:**
- Near-instant cold starts with V8 isolates
- Deploy in one function call
- Real-time logs, real debugging
- Predictable, usage-based pricing
- Write functions, not infrastructure

## Everything You Need

```typescript
// List all your functions
const allFunctions = await functions.list()

// Update configuration without redeploying
await functions.update('sendWelcomeEmail', {
  timeout: 60000,
  memory: 256
})

// View real-time logs
const logs = await functions.logs('sendWelcomeEmail', {
  limit: 100,
  from: new Date('2024-01-01')
})

// Get function details
const fn = await functions.get('sendWelcomeEmail')
console.log(`Invocations: ${fn.invocations}`)

// Clean up when done
await functions.delete('legacy-function')
```

## Pick Your Runtime

```typescript
// V8 Isolates - fastest cold start (recommended)
await functions.define('fast', { code, runtime: 'v8' })

// Node.js - when you need npm packages
await functions.define('node', { code, runtime: 'node' })

// Python - for data science and ML
await functions.define('ml', { code, runtime: 'python' })

// WebAssembly - for maximum performance
await functions.define('wasm', { code, runtime: 'wasm' })
```

## Error Handling

Handle function errors gracefully with typed exceptions:

```typescript
import { functions } from 'functions.do'
import { RPCError } from 'rpc.do'

try {
  const result = await functions.invoke('processData', { input: data })
} catch (error) {
  if (error instanceof RPCError) {
    switch (error.code) {
      case 404:
        console.error('Function not found')
        break
      case 408:
        console.error('Function timed out')
        break
      case 500:
        console.error('Function execution error:', error.data)
        break
      default:
        console.error(`Function error ${error.code}: ${error.message}`)
    }
  }
  throw error
}
```

### Common Error Codes

| Code | Meaning | What to Do |
|------|---------|------------|
| 400 | Invalid input | Check function parameters |
| 401 | Authentication failed | Verify your API key |
| 404 | Function not found | Verify function is deployed |
| 408 | Timeout | Increase timeout or optimize function |
| 413 | Payload too large | Reduce input size |
| 429 | Rate limited | Wait and retry with backoff |
| 500 | Execution error | Check function logs |
| 507 | Memory exceeded | Increase memory limit |

### Safe Invocation Pattern

```typescript
import { functions } from 'functions.do'
import { RPCError } from 'rpc.do'

async function safeInvoke<T>(name: string, input: unknown): Promise<T | null> {
  try {
    return await functions.invoke(name, input)
  } catch (error) {
    if (error instanceof RPCError) {
      // Log for monitoring
      console.error(`Function ${name} failed:`, {
        code: error.code,
        message: error.message
      })

      // Return null for retriable errors
      if ([408, 429, 500].includes(error.code)) {
        return null
      }
    }
    throw error
  }
}
```

### Async Invocation with Status Polling

```typescript
import { functions } from 'functions.do'
import { RPCError } from 'rpc.do'

async function invokeAndWait(name: string, input: unknown, timeoutMs = 30000) {
  const { invocationId } = await functions.invokeAsync(name, input)
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const status = await functions.status(invocationId)

      if (status.state === 'completed') {
        return status.result
      }
      if (status.state === 'failed') {
        throw new Error(`Function failed: ${status.error}`)
      }

      await new Promise(r => setTimeout(r, 500))
    } catch (error) {
      if (error instanceof RPCError && error.code === 404) {
        throw new Error('Invocation not found - may have expired')
      }
      throw error
    }
  }

  throw new Error('Function invocation timed out')
}
```

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { functions } from 'functions.do'

// Or use factory with custom config
import { Functions } from 'functions.do'
const customFunctions = Functions({
  baseURL: 'https://custom.example.com'
})
// API key resolved automatically from FUNCTIONS_API_KEY or DO_API_KEY
```

Set `FUNCTIONS_API_KEY` or `DO_API_KEY` in your environment.

## Your Functions, Your Focus

You have features to ship. Customers to delight. A startup to build.

**Don't let serverless infrastructure be the thing that slows you down.**

```bash
npm install functions.do
```

[Start building at functions.do](https://functions.do)

---

MIT License
