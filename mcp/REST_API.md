# REST API for Mock MCP Server

Simple REST API interface for the AI-powered Mock MCP Server with HATEOAS (Hypermedia as the Engine of Application State).

## Quick Start

### 1. Start Server

```bash
pnpm dev:mock
```

### 2. Open in Browser

Navigate to: http://localhost:8787

You'll see a JSON response with clickable links to all endpoints and examples!

## HATEOAS Features

Every response includes `_links` with related actions:
- **Discoverable**: Start at root and follow links
- **Self-documenting**: Each endpoint describes itself
- **Clickable examples**: Try examples directly in browser
- **Navigable**: Links connect related resources

## Endpoints

### Root - API Discovery

**GET /**

Returns complete API map with clickable examples.

```bash
curl http://localhost:8787
```

Browser: http://localhost:8787

Response includes:
- `_links.rest.eval.get.examples[]` - Clickable example queries
- `_links.documentation` - Links to docs
- `capabilities` - Available APIs and features

### Quick Start Guide

**GET /docs/quickstart**

Step-by-step guide with clickable examples.

```bash
curl http://localhost:8787/docs/quickstart
```

Browser: http://localhost:8787/docs/quickstart

Each step includes:
- `action.href` - Clickable link to execute
- `action.clickable: true` - Can be clicked in browser
- `followup` - Next step in workflow

### Example Use Cases

**GET /docs/examples**

Categorized examples you can click to execute.

```bash
curl http://localhost:8787/docs/examples
```

Browser: http://localhost:8787/docs/examples

Categories:
- Database Operations
- AI Operations
- External API Integration
- Event-Driven Patterns
- Full Pipeline

Each example has:
- `_links.execute.href` - Clickable execution link
- `_links.execute.method` - GET or POST
- Description and context

### API Reference

**GET /docs/api**

Complete API documentation.

```bash
curl http://localhost:8787/docs/api
```

Browser: http://localhost:8787/docs/api

## REST Endpoints

### Execute Code (GET)

**GET /mock/eval?code={code}&session={session}**

Execute code via URL parameters.

**Parameters:**
- `code` (required) - JavaScript code (URL-encoded)
- `context` (optional) - JSON context object (URL-encoded)
- `session` (optional) - Session ID for conversation context

**Examples:**

1. **Simple Hello World**
   ```
   http://localhost:8787/mock/eval?code=return%20%22Hello%20from%20Mock%20MCP!%22
   ```

2. **GitHub API Call**
   ```
   http://localhost:8787/mock/eval?code=const%20repos%20%3D%20await%20api.github.searchRepositories(%7B%20query%3A%20%22cloudflare%20workers%22%20%7D)%3B%20return%20%7B%20found%3A%20repos.length%2C%20top%3A%20repos%5B0%5D.name%20%7D%3B
   ```

   Decoded code:
   ```javascript
   const repos = await api.github.searchRepositories({ query: "cloudflare workers" });
   return { found: repos.length, top: repos[0].name };
   ```

3. **Database + AI**
   ```
   http://localhost:8787/mock/eval?code=const%20docs%20%3D%20await%20db.documents.search(%22machine%20learning%22%2C%20%7B%20limit%3A%205%20%7D)%3B%20const%20summary%20%3D%20await%20ai.textGeneration(%7B%20prompt%3A%20%22Summarize%22%20%7D)%3B%20return%20%7B%20docs%3A%20docs.length%2C%20summary%20%7D%3B
   ```

4. **With Session Context**
   ```
   http://localhost:8787/mock/eval?code=await%20db.users.put(%22alice%22%2C%20%7B%20name%3A%20%22Alice%22%2C%20role%3A%20%22engineer%22%20%7D)%3B%20return%20%22User%20created%22%3B&session=my-session
   ```

   Follow-up (same session):
   ```
   http://localhost:8787/mock/eval?code=const%20alice%20%3D%20await%20db.users.get(%22alice%22)%3B%20return%20alice.role%3B&session=my-session
   ```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"result\":...,\"logs\":[...],\"sideEffects\":[...]}"
      }
    ]
  },
  "session": "my-session"
}
```

### Execute Code (POST)

**POST /mock/eval**

Execute code via JSON body.

**Body:**
```json
{
  "code": "const repos = await api.github.searchRepositories({ query: 'mcp' }); return repos[0];",
  "context": { "userId": "user-123" },
  "session": "my-session"
}
```

**Example:**

```bash
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const repos = await api.github.searchRepositories({ query: \"cloudflare workers\" }); return { found: repos.length, top: repos[0].name };",
    "session": "demo"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"result\":{\"found\":156,\"top\":\"cloudflare/workers-sdk\"},\"logs\":[...],\"sideEffects\":[...]}"
      }
    ]
  },
  "session": "demo"
}
```

## Browser-Based Testing

All GET endpoints are clickable in the browser!

### Step 1: Discover API

Open: http://localhost:8787

Click on any `href` in `_links.rest.eval.get.examples`

### Step 2: Try Examples

Open: http://localhost:8787/docs/examples

Click any `_links.execute.href` to run that example

### Step 3: Follow Quick Start

Open: http://localhost:8787/docs/quickstart

Click through steps 1-3

## Testing Workflow

### Scenario 1: Database Operations

1. **Create Document**
   ```
   http://localhost:8787/mock/eval?code=await%20db.documents.put(%22doc-123%22%2C%20%7B%20title%3A%20%22Test%22%2C%20content%3A%20%22Hello%22%20%7D)%3B%20return%20%22Created%22%3B&session=test-1
   ```

2. **Retrieve Document**
   ```
   http://localhost:8787/mock/eval?code=const%20doc%20%3D%20await%20db.documents.get(%22doc-123%22)%3B%20return%20doc%3B&session=test-1
   ```

3. **Search Documents**
   ```
   http://localhost:8787/mock/eval?code=const%20docs%20%3D%20await%20db.documents.search(%22test%22%2C%20%7B%20limit%3A%2010%20%7D)%3B%20return%20%7B%20found%3A%20docs.length%20%7D%3B&session=test-1
   ```

### Scenario 2: AI Pipeline

```bash
# POST example with multi-line code
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const response = await fetch(\"https://example.com/data\");\nconst data = await response.json();\nconst embedding = await ai.embedding({ text: JSON.stringify(data) });\nawait db.documents.put(\"data-123\", { data, embedding: embedding.data[0] });\nreturn \"Processed\";",
    "session": "pipeline-1"
  }'
```

### Scenario 3: External APIs

```bash
# GitHub + Slack workflow
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const repos = await api.github.searchRepositories({ query: \"mcp\" });\nconst topRepo = repos[0];\nawait api.slack.sendMessage({ channel: \"#dev\", text: \"Top MCP repo: \" + topRepo.name });\nreturn { notified: topRepo.name };",
    "session": "workflow-1"
  }'
```

## Response Structure

### Success Response

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "type": "text",
        "text": "{
          \"success\": true,
          \"result\": <execution result>,
          \"logs\": [\"log message 1\", \"log message 2\"],
          \"sideEffects\": [
            {
              \"type\": \"database|api|http|ai|event|schedule\",
              ...type-specific fields
            }
          ]
        }"
      }
    ]
  },
  "session": "session-id"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Advanced Features

### Session Management

Use the same `session` parameter to maintain conversation context:

```bash
# Request 1: Set context
curl "http://localhost:8787/mock/eval?code=const%20user%20%3D%20%7B%20name%3A%20%22Alice%22%20%7D%3B%20return%20user%3B&session=my-session"

# Request 2: AI remembers previous request
curl "http://localhost:8787/mock/eval?code=return%20%22Tell%20me%20about%20the%20user%20from%20the%20previous%20request%22%3B&session=my-session"
```

### Context Variables

Pass context to execution environment:

```bash
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -d '{
    "code": "return context.userId + \" is logged in\";",
    "context": { "userId": "user-123", "role": "admin" }
  }'
```

### Custom Headers

Set session via header:

```bash
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: my-session" \
  -d '{
    "code": "return \"Session set via header\";"
  }'
```

## URL Encoding Helper

For GET requests, encode your JavaScript:

**JavaScript:**
```javascript
const repos = await api.github.searchRepositories({ query: "mcp" });
return repos[0];
```

**Encoded:**
```
const%20repos%20%3D%20await%20api.github.searchRepositories(%7B%20query%3A%20%22mcp%22%20%7D)%3B%0Areturn%20repos%5B0%5D%3B
```

**Tools:**
- JavaScript: `encodeURIComponent(code)`
- Command line: `python3 -c "import urllib.parse; print(urllib.parse.quote(input()))"`
- Online: https://www.urlencoder.org/

## Comparison: REST vs MCP

### REST API
✅ Simple GET/POST requests
✅ Browser-clickable links
✅ Easy to test with curl
✅ HATEOAS discoverable
✅ No JSON-RPC overhead

### MCP JSON-RPC
✅ Standard protocol
✅ Tool discovery
✅ Structured responses
✅ Compatible with MCP clients
✅ Session management built-in

## Browser DevTools Testing

Open DevTools Console:

```javascript
// Simple test
fetch('/mock/eval?code=' + encodeURIComponent('return "Hello"'))
  .then(r => r.json())
  .then(console.log)

// GitHub API test
fetch('/mock/eval?code=' + encodeURIComponent(
  'const repos = await api.github.searchRepositories({ query: "workers" }); return repos[0];'
))
  .then(r => r.json())
  .then(console.log)

// POST with session
fetch('/mock/eval', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'const docs = await db.documents.search("AI"); return docs.length;',
    session: 'browser-test'
  })
})
  .then(r => r.json())
  .then(console.log)
```

## Integration Examples

### HTML Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mock MCP API Test</title>
</head>
<body>
  <h1>Mock MCP API Tester</h1>

  <button onclick="testAPI()">Test GitHub API</button>
  <pre id="result"></pre>

  <script>
    async function testAPI() {
      const code = 'const repos = await api.github.searchRepositories({ query: "mcp" }); return repos.slice(0, 3);'

      const response = await fetch('/mock/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, session: 'web-test' })
      })

      const data = await response.json()
      document.getElementById('result').textContent = JSON.stringify(data, null, 2)
    }
  </script>
</body>
</html>
```

### JavaScript Client

```javascript
class MockMCPRestClient {
  constructor(baseUrl = 'http://localhost:8787') {
    this.baseUrl = baseUrl
    this.session = 'rest-client-' + Date.now()
  }

  async eval(code, context) {
    const response = await fetch(`${this.baseUrl}/mock/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, context, session: this.session })
    })
    return await response.json()
  }

  async discover() {
    const response = await fetch(`${this.baseUrl}/`)
    return await response.json()
  }

  async getExamples() {
    const response = await fetch(`${this.baseUrl}/docs/examples`)
    return await response.json()
  }
}

// Usage
const client = new MockMCPRestClient()
const result = await client.eval('return "Hello from REST!"')
console.log(result)
```

## See Also

- [MOCK_POC.md](./MOCK_POC.md) - Complete MCP documentation
- [TESTING.mock.md](./TESTING.mock.md) - Testing guide
- [QUICKSTART.md](./QUICKSTART.md) - Visual quick start

## Tips

1. **Start at root**: http://localhost:8787 to discover all endpoints
2. **Click examples**: All `_links.*.href` are browser-clickable
3. **Use sessions**: Maintain context across requests
4. **Check logs**: Terminal shows AI generation process
5. **Try in browser**: GET endpoints work directly in address bar
