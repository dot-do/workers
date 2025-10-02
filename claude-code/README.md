# Claude Code Service

AI-powered code generation and analysis service using Claude API.

## Features

- **Code Generation**: Generate code from natural language prompts
- **Code Analysis**: Analyze code for issues, patterns, and improvements
- **Code Explanation**: Get detailed explanations of how code works
- **Code Refactoring**: Refactor code based on specific instructions
- **Bug Fixing**: Fix broken code given error messages
- **Code Review**: Comprehensive code review with ratings and suggestions
- **MCP Integration**: Expose capabilities as MCP tools for AI agents

## Installation

```bash
cd workers/claude-code
pnpm install
```

## Configuration

Set the Anthropic API key as a secret:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

## Development

```bash
# Start local dev server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck
```

## Deployment

```bash
pnpm deploy
```

## API Reference

### RPC Methods

#### `generateCode(prompt: string, options?: CodeGenOptions): Promise<CodeGeneration>`

Generate code from a natural language prompt.

**Parameters:**
- `prompt`: Natural language description of code to generate
- `options`: Optional configuration
  - `model`: Claude model to use (default: claude-sonnet-4-5-20250929)
  - `maxTokens`: Maximum tokens in response (default: 4096)
  - `temperature`: Sampling temperature 0-1 (default: 0.7)
  - `system`: Custom system prompt

**Returns:** `{ code: string, generationId: string, model?: string, tokensUsed?: number }`

#### `analyzeCode(code: string, analysis: string): Promise<AnalysisResult>`

Analyze code with specific focus areas.

**Parameters:**
- `code`: Code to analyze
- `analysis`: What to analyze (e.g., "security issues", "performance bottlenecks")

**Returns:** `{ analysis: string, code: string }`

#### `explainCode(code: string): Promise<string>`

Explain what code does and how it works.

**Parameters:**
- `code`: Code to explain

**Returns:** Detailed explanation string

#### `refactorCode(code: string, instructions: string): Promise<string>`

Refactor code based on specific instructions.

**Parameters:**
- `code`: Code to refactor
- `instructions`: Refactoring instructions (e.g., "extract reusable functions")

**Returns:** Refactored code

#### `fixCode(code: string, error: string): Promise<string>`

Fix broken code given an error message.

**Parameters:**
- `code`: Broken code
- `error`: Error message or description

**Returns:** Fixed code

#### `reviewCode(code: string, focus?: string): Promise<{ issues: string[], suggestions: string[], rating: number }>`

Review code for issues and provide suggestions.

**Parameters:**
- `code`: Code to review
- `focus`: Optional focus area (e.g., "security", "performance")

**Returns:** `{ issues: string[], suggestions: string[], rating: number }`

### HTTP Endpoints

#### `POST /generate`

Generate code from a prompt.

**Request:**
```json
{
  "prompt": "Write a function to validate email addresses",
  "options": {
    "model": "claude-sonnet-4-5-20250929",
    "maxTokens": 4096
  }
}
```

**Response:**
```json
{
  "code": "function isValidEmail(email: string): boolean { ... }",
  "generationId": "uuid",
  "model": "claude-sonnet-4-5-20250929",
  "tokensUsed": 234
}
```

#### `POST /analyze`

Analyze code.

**Request:**
```json
{
  "code": "const x = eval(userInput)",
  "analysis": "security issues"
}
```

**Response:**
```json
{
  "analysis": "This code has a critical security vulnerability...",
  "code": "const x = eval(userInput)"
}
```

#### `POST /explain`

Explain code.

**Request:**
```json
{
  "code": "function memoize(fn) { const cache = {}; return (...args) => { ... } }"
}
```

**Response:**
```json
{
  "explanation": "This is a memoization function that caches results..."
}
```

#### `POST /refactor`

Refactor code.

**Request:**
```json
{
  "code": "function process() { if (x) { if (y) { ... } } }",
  "instructions": "reduce nesting and improve readability"
}
```

**Response:**
```json
{
  "code": "function process() { if (!x || !y) return; ... }"
}
```

#### `POST /fix`

Fix broken code.

**Request:**
```json
{
  "code": "function add(a b) { return a + b; }",
  "error": "Unexpected identifier"
}
```

**Response:**
```json
{
  "code": "function add(a, b) { return a + b; }"
}
```

#### `POST /review`

Review code.

**Request:**
```json
{
  "code": "const data = JSON.parse(req.body); database.query(data.sql);",
  "focus": "security"
}
```

**Response:**
```json
{
  "issues": [
    "SQL injection vulnerability",
    "No input validation"
  ],
  "suggestions": [
    "Use parameterized queries",
    "Validate and sanitize input"
  ],
  "rating": 2
}
```

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "claude-code"
}
```

## MCP Tools

The service exposes the following MCP tools:

- `generate_code` - Generate code from prompts
- `analyze_code` - Analyze code with focus areas
- `explain_code` - Explain code functionality
- `refactor_code` - Refactor based on instructions
- `fix_code` - Fix broken code
- `review_code` - Review code for issues

## Models Supported

- `claude-sonnet-4-5-20250929` (default)
- `claude-opus-4`
- `claude-haiku-4`

## Service Bindings

The service requires a binding to the `db` worker for storing code generations:

```toml
[[services]]
binding = "DB"
service = "db"
```

## Architecture

```
┌─────────────────┐
│  RPC Clients    │
│  HTTP Clients   │
│  MCP Agents     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  ClaudeCodeService      │
│  (WorkerEntrypoint)     │
│                         │
│  - generateCode()       │
│  - analyzeCode()        │
│  - explainCode()        │
│  - refactorCode()       │
│  - fixCode()            │
│  - reviewCode()         │
│  - mcpToolCall()        │
└────────┬────────────────┘
         │
         ├──> Anthropic API
         │    (Claude Models)
         │
         └──> DB Service
              (Store Generations)
```

## Testing

The service includes comprehensive tests covering:

- Code generation with various options
- Code analysis and explanation
- Code refactoring and fixing
- Code review functionality
- MCP tool routing
- HTTP endpoint handling
- Error handling
- CORS support

Run tests:
```bash
pnpm test
```

## Error Handling

All methods handle errors gracefully and return meaningful error messages:

- **Anthropic API errors**: Rate limiting, authentication, etc.
- **Database errors**: Continue on DB failures (logged but not thrown)
- **Invalid input**: Validation errors with clear messages
- **Network errors**: Timeout and connection issues

## Rate Limiting

Rate limiting is handled at the API gateway level. The service itself does not implement rate limiting.

## Security

- API keys stored as Cloudflare secrets
- Code generations stored with private visibility
- CORS enabled for cross-origin requests
- No sensitive data in logs

## Performance

- Average response time: 2-5 seconds (depends on code complexity)
- Supports concurrent requests via RPC
- Automatic scaling via Cloudflare Workers
- Database operations are async and non-blocking

## Monitoring

The service supports Cloudflare observability:

```toml
[observability]
enabled = true
```

Metrics available:
- Request count
- Error rate
- Response time
- Token usage
- API call success/failure

## License

MIT
