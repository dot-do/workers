# mdx

# MDX Demo Worker

A Cloudflare Worker demonstrating **@hono/mdx** package functionality with streaming SSR and custom React components.

## Features

- ✅ **MDX Rendering** - Render MDX content with full Markdown + JSX support
- ✅ **Custom React Components** - Button, Card, Alert, CodeBlock components
- ✅ **Streaming SSR** - Progressive rendering with React 19's renderToReadableStream
- ✅ **Non-Streaming Mode** - Static rendering for SEO/email
- ✅ **Frontmatter Parsing** - YAML frontmatter support
- ✅ **Dynamic Content** - Query params and request headers
- ✅ **Hono Framework** - Fast, lightweight routing

## Available Routes

### Basic Examples

- **GET /** - Home page with navigation
- **GET /hello** - Simple MDX rendering
- **GET /frontmatter** - Frontmatter parsing demo
- **GET /components** - Custom React components showcase

### Advanced Examples

- **GET /streaming** - Streaming SSR demo
- **GET /non-streaming** - Static rendering demo
- **GET /dynamic** - Dynamic content generation

### Documentation

- **GET /about** - About @hono/mdx
- **GET /api** - API documentation

## Custom Components

### Button Component

Styled button with variant support:

```jsx
<Button>Click me!</Button>
<Button variant="secondary">Secondary</Button>
```

### Card Component

Container with optional title:

```jsx
<Card title="Welcome">
  Content here
</Card>
```

### Alert Component

Colored alerts with different types:

```jsx
<Alert type="info">Info message</Alert>
<Alert type="warning">Warning message</Alert>
<Alert type="error">Error message</Alert>
<Alert type="success">Success message</Alert>
```

### CodeBlock Component

Syntax-highlighted code blocks:

```jsx
<CodeBlock language="javascript">
  const x = 42
</CodeBlock>
```

## Streaming vs Non-Streaming

### Streaming SSR

- **Faster TTFB** - Browser receives HTML immediately
- **Progressive Rendering** - Content appears incrementally
- **Better UX** - Users see content sooner

```ts
app.get('/streaming', (c) => {
  return c.mdx(content, {
    renderOptions: { streaming: true }
  })
})
```

### Static Rendering

- **Complete HTML** - Server waits until all content rendered
- **SEO-Friendly** - Better for some crawlers
- **Email/PDF** - Required for non-streaming clients

```ts
app.get('/non-streaming', (c) => {
  return c.mdx(content, {
    renderOptions: { streaming: false }
  })
})
```

## Dynamic Content

Access query parameters and headers:

```ts
app.get('/dynamic', (c) => {
  const name = c.req.query('name') || 'World'
  const timestamp = new Date().toISOString()
  const userAgent = c.req.header('user-agent') || 'Unknown'

  return c.mdx(`# Hello, ${name}! Generated at ${timestamp}`)
})
```

## Dependencies

- `hono` - Fast, lightweight web framework
- `@hono/mdx` - MDX rendering for Hono
- `react` - React library
- `react-dom` - React DOM renderer

## Implementation



## Use Cases

1. **Documentation Sites** - Render docs with custom components
2. **Landing Pages** - Create marketing pages with MDX
3. **Blog Posts** - Write content in Markdown with JSX
4. **Interactive Demos** - Combine content and components
5. **API Documentation** - Generate API docs from MDX

## Benefits

- **Developer Experience** - Write content in familiar Markdown syntax
- **Flexibility** - Mix content and interactive components
- **Performance** - Streaming SSR for fast page loads
- **Edge Deployment** - Run at the edge for global performance
- **Type Safety** - Full TypeScript support

---

**Generated from:** mdx.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts mdx.mdx`
