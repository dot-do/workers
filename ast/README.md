# AST Parser Worker

A Cloudflare Worker that parses Markdown/MDX documents with YAML frontmatter into an Abstract Syntax Tree (AST) in a streaming manner.

## Features

- **Streaming Processing**: Efficiently handles large documents using TransformStream
- **YAML Frontmatter**: Extracts and parses YAML frontmatter from the beginning of documents
- **MDX Support**: Full support for MDX (Markdown + JSX components)
- **Code Block Parsing**: Extracts and parses JavaScript/JSX/TypeScript code blocks into ASTs
- **Clean Output**: Position information is automatically removed for cleaner, more concise ASTs
- **Error Handling**: Graceful error handling with detailed error messages

## Usage

### Basic Usage

The worker fetches content from a URL and returns the parsed AST:

```bash
# Fetch and parse a markdown file
curl https://your-ast-worker.workers.dev/raw.githubusercontent.com/user/repo/main/README.md
```

### POST Request

You can also POST content directly:

```bash
curl -X POST https://your-ast-worker.workers.dev/ \
  -H "Content-Type: text/plain" \
  -d '@your-file.md'
```

### Response Format

The worker returns a JSON response with the following structure:

```json
{
  "success": true,
  "url": "https://example.com/document.md",
  "ast": {
    "frontmatter": {
      "title": "Document Title",
      "author": "Author Name",
      "tags": ["tag1", "tag2"]
    },
    "mdxAst": {
      "type": "root",
      "children": [
        // MDX AST nodes without position data
      ]
    },
    "jsCodeBlocks": [
      {
        "code": "const x = 42;",
        "lang": "javascript",
        "ast": {
          "type": "Program",
          "body": [
            // Acorn AST without position data
          ],
          "sourceType": "module"
        }
      }
    ]
  }
}
```

### Supported Code Block Languages

- `javascript` / `js`
- `jsx`
- `typescript` / `ts`
- `tsx`

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI

### Installation

```bash
pnpm install
```

### Local Development

```bash
pnpm dev
```

### Deploy

```bash
pnpm deploy
```

## How It Works

1. **Content Fetching**: Fetches markdown content from the provided URL or accepts POST body
2. **Frontmatter Detection**: Looks for YAML frontmatter delimited by `---` at the start
3. **MDX Parsing**: Uses `mdast` to parse the content into a Markdown AST
4. **Code Block Extraction**: Regular expressions identify code blocks for separate parsing
5. **JavaScript Parsing**: Uses `acorn` with JSX extension to parse JS/JSX code blocks
6. **Position Removal**: Automatically strips position/location data for cleaner output

## Examples

### Parsing a Simple Markdown File

```markdown
---
title: Hello World
date: 2024-01-15
---

# Hello World

This is a simple markdown file.

```javascript
console.log('Hello, World!');
```
```

Returns:
```json
{
  "ast": {
    "frontmatter": {
      "title": "Hello World",
      "date": "2024-01-15"
    },
    "mdxAst": {
      "type": "root",
      "children": [
        {
          "type": "heading",
          "depth": 1,
          "children": [{"type": "text", "value": "Hello World"}]
        },
        {
          "type": "paragraph",
          "children": [{"type": "text", "value": "This is a simple markdown file."}]
        },
        {
          "type": "code",
          "lang": "javascript",
          "value": "console.log('Hello, World!');"
        }
      ]
    },
    "jsCodeBlocks": [
      {
        "code": "console.log('Hello, World!');\n",
        "lang": "javascript",
        "ast": {
          "type": "Program",
          "body": [/* ... */],
          "sourceType": "module"
        }
      }
    ]
  }
}
```

### Parsing MDX with Components

```mdx
---
component: Button
props:
  - onClick
  - children
---

import { Button } from './components'

# MDX Example

<Button onClick={() => alert('Clicked!')}>
  Click me
</Button>
```

## Error Handling

The worker handles various error scenarios:

- **Fetch Errors**: Returns appropriate HTTP status codes
- **YAML Parse Errors**: Includes error details in frontmatter
- **MDX Parse Errors**: Returns error information in the AST
- **Code Block Parse Errors**: Includes error messages for individual blocks

## Performance Considerations

- The streaming approach allows handling of large documents without loading everything into memory
- Frontmatter extraction is optimized to avoid buffering the entire document
- Code block parsing is done independently, allowing partial success
- Position data is removed to reduce payload size

## Limitations

- Currently collects all results before returning (future versions may support streaming responses)
- Code block detection uses regex which may have edge cases with nested backticks
- TypeScript type checking is not performed (only syntax parsing) 