# Code Execution Service

Secure code execution service for running user code in sandboxed environments.

## Features

- ✅ **JavaScript Execution** - Execute JavaScript code with full async/await support
- ✅ **TypeScript Support** - Execute TypeScript code (transpiled to JavaScript)
- 🚧 **Python Support** - Planned via Cloudflare Containers
- 🔒 **Security Sandboxing** - Code validation, timeout enforcement, API restrictions
- 🎯 **Runtime APIs** - Controlled access to AI, HTTP, database, and console
- 📝 **Execution History** - Track all executions with full audit trail
- ⚡ **High Performance** - Sub-second execution times on Cloudflare Workers

## Supported Languages

| Language   | Status      | Implementation                |
| ---------- | ----------- | ----------------------------- |
| JavaScript | ✅ Supported | Native async function wrapper |
| TypeScript | ✅ Supported | Type annotation stripping     |
| Python     | 🚧 Planned   | Cloudflare Containers         |

## Runtime APIs

Sandboxed code has access to these controlled APIs:

### `ai(model, input)`

Execute AI model inference:

```javascript
const result = await ai('@cf/meta/llama-3.1-8b-instruct', {
  messages: [{ role: 'user', content: 'Hello!' }],
})
console.log(result.response)
```

### `api(url, options)`

Make HTTP API requests:

```javascript
const response = await api('https://api.github.com/repos/cloudflare/workers-sdk', {
  headers: { 'User-Agent': 'code-exec' },
})
console.log(response.body.name)
```

### `db(query)`

Execute database queries:

```javascript
const results = await db({
  select: {
    from: 'things',
    where: { ns: 'wiki', type: 'Article' },
    limit: 10,
  },
})
console.log('Found', results.rowCount, 'articles')
```

### `console`

Captured console for logging:

```javascript
console.log('Processing started')
console.info('Status:', status)
console.warn('Warning:', warning)
console.error('Error:', error)
```

## Usage

### RPC (Service-to-Service)

```typescript
// From another service
const result = await env.CODE_EXEC.executeCode(
  'return 1 + 1',
  'javascript',
  { user: 'john' },
  { timeout: 5000 }
)

if (result.success) {
  console.log('Result:', result.result)
  console.log('Logs:', result.logs)
} else {
  console.error('Error:', result.error)
}
```

### HTTP API

#### Execute Code

```bash
POST /execute
{
  "code": "return 1 + 1",
  "language": "javascript",
  "context": { "user": "john" },
  "config": { "timeout": 5000 }
}
```

#### Validate Code

```bash
POST /validate
{
  "code": "return 42"
}
```

#### Get Execution History

```bash
GET /executions/:id
```

#### List Executions

```bash
GET /executions?limit=10&offset=0
```

#### Get Supported Languages

```bash
GET /languages
```

#### Get Runtime Documentation

```bash
GET /docs
```

## Security

### Code Validation

All code is validated before execution:

- ❌ `require()` - Not allowed
- ❌ `import` statements - Not allowed
- ❌ `eval()` - Not allowed
- ❌ `Function()` constructor - Not allowed
- ❌ `process` object - Not available
- ❌ `__dirname` / `__filename` - Not available
- ✅ Maximum code size: 100KB

### Timeout Enforcement

Default timeout: **30 seconds** (configurable)

```javascript
// This will timeout after 30s
await executeCode('while(true) {}', 'javascript', {}, { timeout: 30000 })
```

### API Restrictions

Control which runtime APIs are available:

```typescript
const config = {
  allowedAPIs: ['console', 'db'], // Only console and db allowed
  allowedDomains: ['api.github.com'], // Only allow GitHub API
}

await executeCode(code, 'javascript', {}, config)
```

### Sandboxed Execution

All code runs in an isolated async function with:

- No access to Node.js built-ins
- No file system access
- No network access (except via `api()`)
- No access to environment variables
- No access to parent scope

## Configuration

### Environment Variables

None required for basic operation.

### Secrets

None required for basic operation.

### Service Bindings

Required:

- `DB` - Database service for query execution
- `AI` - Workers AI binding for inference

Optional:

- `EXECUTIONS_DB` - D1 database for execution history

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Dev Server

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

### Type Check

```bash
pnpm typecheck
```

### Deploy

```bash
pnpm deploy
```

## Examples

### Simple Calculation

```javascript
const code = 'return Math.sqrt(16) * 2'
const result = await executeCode(code, 'javascript')
// result.result === 8
```

### Using Context

```javascript
const code = 'return `Hello ${context.name}!`'
const result = await executeCode(code, 'javascript', { name: 'World' })
// result.result === "Hello World!"
```

### AI Text Generation

```javascript
const code = `
  const result = await ai('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: 'What is TypeScript?' }]
  })
  return result.response
`
const result = await executeCode(code, 'javascript')
```

### Database Query

```javascript
const code = `
  const results = await db({
    select: { from: 'things', limit: 10 }
  })
  return results.rows.length
`
const result = await executeCode(code, 'javascript')
```

### HTTP API Call

```javascript
const code = `
  const response = await api('https://api.github.com/repos/cloudflare/workers-sdk')
  return response.body.stargazers_count
`
const result = await executeCode(code, 'javascript', {}, { allowedDomains: ['api.github.com'] })
```

### TypeScript Execution

```javascript
const code = `
  interface User {
    name: string
    age: number
  }
  const user: User = { name: 'John', age: 30 }
  return user.name
`
const result = await executeCode(code, 'typescript')
// result.result === "John"
```

## Performance

- **Cold Start**: < 100ms
- **Execution**: < 10ms for simple code
- **Timeout**: 30s default (configurable)

## Limitations

- **No Python Support** - Planned for future via Cloudflare Containers
- **No File System** - Code cannot read/write files
- **No Network Access** - Except via controlled `api()` function
- **Memory Limits** - Limited by Cloudflare Workers (128MB)
- **CPU Time** - Limited by execution timeout

## Future Enhancements

- [ ] Python execution via Cloudflare Containers
- [ ] Multi-file code support
- [ ] Package imports (npm, PyPI)
- [ ] Persistent execution sessions
- [ ] WebSocket streaming output
- [ ] Code optimization suggestions
- [ ] Execution analytics dashboard

## Support

For issues or questions, open an issue in the GitHub repository.

---

**Service**: code-exec
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2025-10-02
