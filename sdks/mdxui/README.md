# mdxui

React component library for enhanced MDX rendering - interactive code playgrounds, live examples, and rich documentation experiences.

## Installation

```bash
npm install mdxui
# or
pnpm add mdxui
```

## Quick Start

```tsx
import { MDXProvider, components } from 'mdxui'

function App({ children }) {
  return (
    <MDXProvider components={components}>
      {children}
    </MDXProvider>
  )
}
```

## Components

### CodeBlock

Syntax-highlighted code blocks with copy button and line numbers.

```tsx
import { CodeBlock } from 'mdxui/components'

<CodeBlock language="typescript" showLineNumbers highlight="2-4">
  {`const greeting = 'Hello'
const name = 'World'
const message = greeting + ' ' + name
console.log(message)`}
</CodeBlock>
```

### Playground

Interactive code playground with live preview.

```tsx
import { Playground } from 'mdxui/components'

<Playground
  code={`function Button() {
  return <button>Click me</button>
}`}
  language="tsx"
  editable
  preview
/>
```

### Callout

Styled callout boxes for notes, warnings, tips.

```tsx
import { Callout } from 'mdxui/components'

<Callout type="warning" title="Important">
  This action cannot be undone.
</Callout>
```

### Tabs

Tabbed content sections.

```tsx
import { Tabs } from 'mdxui/components'

<Tabs items={['npm', 'pnpm', 'yarn']}>
  <Tab>npm install mdxui</Tab>
  <Tab>pnpm add mdxui</Tab>
  <Tab>yarn add mdxui</Tab>
</Tabs>
```

## Live Playground

For advanced interactive documentation:

```tsx
import { LiveProvider, LiveEditor, LivePreview, LiveError } from 'mdxui/playground'

function InteractiveDemo({ code, scope }) {
  return (
    <LiveProvider code={code} scope={scope}>
      <div className="grid grid-cols-2 gap-4">
        <LiveEditor />
        <LivePreview />
      </div>
      <LiveError />
    </LiveProvider>
  )
}
```

## Custom Components

Create your own component set:

```tsx
import { createComponents } from 'mdxui'

const myComponents = createComponents({
  code: MyCodeBlock,
  Callout: MyCallout,
})
```

## Integration with Fumadocs

mdxui works seamlessly with Fumadocs:

```tsx
// app/docs/[[...slug]]/page.tsx
import { MDXProvider, components } from 'mdxui'

export default function DocsPage({ params }) {
  return (
    <MDXProvider components={components}>
      <DocsContent />
    </MDXProvider>
  )
}
```

## License

MIT
