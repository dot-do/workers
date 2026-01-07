# functions.do

**Run serverless functions without the serverless pain.**

```bash
npm install functions.do
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

## Your Functions, Your Focus

You have features to ship. Customers to delight. A startup to build.

**Don't let serverless infrastructure be the thing that slows you down.**

```bash
npm install functions.do
```

[Start building at functions.do](https://functions.do)

---

MIT License
