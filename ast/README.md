# ast

# AST Parser Worker

A Cloudflare Worker that parses MDX/Markdown content and JavaScript code blocks into Abstract Syntax Trees (ASTs).

## Features

- ✅ **MDX/Markdown Parsing** - Converts MDX or Markdown to AST using mdast
- ✅ **YAML Frontmatter Extraction** - Parses YAML frontmatter into structured data
- ✅ **Code Block Parsing** - Extracts and parses JavaScript/TypeScript code blocks
- ✅ **JSX Support** - Handles JSX syntax in code blocks via acorn-jsx
- ✅ **Dual Interface** - Supports both GET (fetch URL) and POST (direct content)
- ✅ **Error Handling** - Graceful fallbacks for parse errors

## Usage

### GET Request (Fetch and Parse)

```bash
# Parse MDX from URL
curl https://ast.do/github.com/user/repo/file.mdx
```

### POST Request (Parse Content)

```bash
# Parse MDX content directly
curl -X POST https://ast.do \
  -H "Content-Type: text/plain" \
  -d "---
title: Example
---

# Hello World

\`\`\`javascript
const greeting = 'Hello'
\`\`\`
"
```

## Response Format

```json
{
  "success": true,
  "ast": {
    "frontmatter": {
      "title": "Example"
    },
    "mdxAst": {
      "type": "root",
      "children": [...]
    },
    "jsCodeBlocks": [
      {
        "code": "const greeting = 'Hello'",
        "lang": "javascript",
        "ast": {
          "type": "Program",
          "body": [...]
        }
      }
    ]
  }
}
```

## Parsing Pipeline

1. **Extract Frontmatter** - Parses YAML between `---` delimiters
2. **Parse MDX** - Converts content to mdast using MDX extensions
3. **Fallback to Markdown** - If MDX fails, tries standard markdown
4. **Extract Code Blocks** - Finds JavaScript/TypeScript code blocks
5. **Parse Code** - Converts each code block to AST using acorn
6. **Clean AST** - Removes position data for cleaner output

## Supported Code Languages

Code blocks are parsed if they have one of these language tags:
- `javascript`, `js`
- `jsx`
- `typescript`, `ts`
- `tsx`

## Error Handling

- **MDX Parse Errors** - Falls back to standard markdown parsing
- **YAML Parse Errors** - Returns raw frontmatter with error flag
- **Code Parse Errors** - Returns code with error message instead of AST
- **Fetch Errors** - Returns HTTP status and error message

## Implementation



## Dependencies

- `yaml` - YAML parsing
- `mdast-util-from-markdown` - Markdown to AST conversion
- `micromark-extension-mdxjs` - MDX syntax support
- `mdast-util-mdx` - MDX AST utilities
- `acorn` - JavaScript parser
- `acorn-jsx` - JSX syntax extension for acorn

## Use Cases

1. **MDX Documentation Analysis** - Extract structure and metadata from MDX docs
2. **Code Block Extraction** - Find and analyze code examples in documentation
3. **Frontmatter Processing** - Extract configuration from Markdown files
4. **Static Site Generation** - Parse content for build pipelines
5. **Content Validation** - Verify MDX syntax before publishing

---

**Generated from:** ast.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts ast.mdx`
