# MDX Demo Worker

A comprehensive demonstration of the `@hono/mdx` package running on Cloudflare Workers.

## Features

This worker showcases all major features of @hono/mdx:

- ✅ **Basic MDX rendering** - Simple markdown to HTML conversion
- ✅ **Custom React components** - Button, Card, Alert, CodeBlock components
- ✅ **Streaming SSR** - Progressive rendering with React 19
- ✅ **Static rendering** - Non-streaming mode for complete HTML
- ✅ **Frontmatter parsing** - YAML frontmatter support
- ✅ **Dynamic content** - Runtime content generation
- ✅ **Error handling** - Custom 404 and error pages

## Available Routes

### Basic Examples
- `/` - Home page with navigation
- `/hello` - Simple MDX rendering
- `/frontmatter` - Frontmatter parsing demo
- `/components` - Custom React components showcase

### Advanced Examples
- `/streaming` - Streaming SSR demonstration
- `/non-streaming` - Static rendering demonstration
- `/dynamic` - Dynamic content with query parameters

### Documentation
- `/about` - About @hono/mdx
- `/api` - API documentation

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Custom Components

The worker includes four custom React components:

### Button
```tsx
<Button>Click me!</Button>
<Button variant="secondary">Secondary</Button>
```

### Card
```tsx
<Card title="Title">
  Content goes here
</Card>
```

### Alert
```tsx
<Alert type="info">Info message</Alert>
<Alert type="warning">Warning message</Alert>
<Alert type="error">Error message</Alert>
<Alert type="success">Success message</Alert>
```

### CodeBlock
```tsx
<CodeBlock language="typescript">
  const hello = 'world'
</CodeBlock>
```

## Deployment

This worker is configured to deploy to `mdx.do/*` routes.

Update `wrangler.jsonc` to change the deployment configuration:

```jsonc
{
  "name": "mdx",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "routes": [
    {
      "pattern": "mdx.do/*",
      "zone_name": "do"
    }
  ]
}
```

## Implementation Details

The worker uses:
- **Hono** - Ultrafast web framework
- **@hono/mdx** - MDX rendering with streaming support
- **React 19** - For component rendering
- **Cloudflare Workers** - Edge runtime deployment

All pages are rendered using the `c.mdx()` helper provided by the MDX middleware:

```typescript
import { mdx } from '@hono/mdx'

app.use('*', mdx({
  components: { Button, Card, Alert, CodeBlock },
  compileOptions: { development: true }
}))

app.get('/', (c) => c.mdx(\`# Hello World!\`))
```

## Testing Locally

```bash
# Start dev server (usually http://localhost:8787)
pnpm dev

# Visit in browser
open http://localhost:8787
```

## License

MIT
