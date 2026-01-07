# rpc.do

**Call APIs like local functions. Full type safety. Zero boilerplate.**

```bash
npm install rpc.do
```

---

## You're Drowning in API Boilerplate

Every time you integrate a new service, it's the same story:

- Writing `fetch` wrappers with proper headers
- Parsing JSON and handling edge cases
- Guessing at response types or creating them manually
- Implementing retry logic and timeout handling
- Copy-pasting authentication patterns
- Debugging wire format issues at 2 AM

**You're a developer, not a plumber.** You should be building features, not wrestling with HTTP.

## What If APIs Just Worked Like Functions?

```typescript
import { createClient } from 'rpc.do'

interface MyAPI {
  hello(name: string): Promise<string>
  createUser(data: User): Promise<User>
  getOrder(id: string): Promise<Order>
}

const api = createClient<MyAPI>('https://my-service.do')

// Call remote APIs like local functions
const greeting = await api.hello('world')
const user = await api.createUser({ name: 'Alice' })
const order = await api.getOrder('ord_123')
```

**rpc.do** turns any API into type-safe function calls:

- Full TypeScript inference across the wire
- Automatic authentication from environment
- Built-in retries with exponential backoff
- Proper error handling with typed exceptions
- Works everywhere: Node.js, Cloudflare Workers, browsers

## Connect to Any API in 3 Steps

### 1. Define Your Interface

```typescript
import { createClient } from 'rpc.do'

// Describe what the API can do
interface PaymentAPI {
  charge(amount: number, currency: string): Promise<Charge>
  refund(chargeId: string): Promise<Refund>
  listTransactions(limit?: number): Promise<Transaction[]>
}
```

### 2. Create Your Client

```typescript
// Create a typed client
const payments = createClient<PaymentAPI>('https://payments.do', {
  apiKey: process.env.DO_API_KEY
})
```

### 3. Call Methods Like Functions

```typescript
// Full autocomplete. Full type checking. No guessing.
const charge = await payments.charge(2999, 'usd')
const refund = await payments.refund(charge.id)
const history = await payments.listTransactions(10)
```

## The Difference

**Without rpc.do:**
```typescript
// 20+ lines for one API call
const response = await fetch('https://api.example.com/charge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_KEY}`
  },
  body: JSON.stringify({ amount: 2999, currency: 'usd' })
})

if (!response.ok) {
  const error = await response.json()
  throw new Error(error.message)
}

const charge = await response.json() as Charge  // Hope this is right!
```

**With rpc.do:**
```typescript
// One line. Type-safe. Handles everything.
const charge = await payments.charge(2999, 'usd')
```

## Everything Handled for You

### Automatic Authentication

```typescript
// Reads from environment automatically
// Checks: DO_API_KEY, DO_TOKEN, ORG_AI_API_KEY, ORG_AI_TOKEN

const client = createClient<API>('https://api.do')
// Auth headers added automatically

// Or pass explicitly
const client = createClient<API>('https://api.do', {
  apiKey: 'your-api-key'
})
```

### Built-in Retry Logic

```typescript
const client = createClient<API>('https://api.do', {
  timeout: 30000,
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'  // 1s, 2s, 4s
  }
})
```

### Typed Error Handling

```typescript
import { createClient, RPCError } from 'rpc.do'

try {
  const result = await client.riskyOperation()
} catch (error) {
  if (error instanceof RPCError) {
    console.error(`Error ${error.code}: ${error.message}`)
    console.error('Details:', error.data)
  }
}
```

### Multiple Transports

```typescript
const client = createClient<API>('https://api.do', {
  transport: 'auto'  // HTTP, WebSocket, or auto-select
})
```

## For .do SDK Authors

Building an SDK for the workers.do platform? rpc.do is your foundation:

```typescript
// sdks/my-service/index.ts
import { createAutoClient, type ClientOptions } from 'rpc.do'

export interface MyServiceAPI {
  process(input: string): Promise<Result>
  analyze(data: Data): Promise<Analysis>
}

export function createMyServiceClient(options?: ClientOptions) {
  return createAutoClient<MyServiceAPI>('my-service.do', options)
}

// Convenient default export
export const myService = createMyServiceClient()
```

Every .do SDK (llm.do, payments.do, services.do) is built on rpc.do.

## Stop Wrestling with APIs

Life's too short for fetch boilerplate. Type safety shouldn't end at your function boundaries.

**Call remote APIs like local functions. Start shipping features instead of plumbing.**

```bash
npm install rpc.do
```

[Explore the workers.do platform](https://workers.do)

---

MIT License
