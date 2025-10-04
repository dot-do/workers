# html

# HTML Worker

Converts Markdown to HTML with frontmatter support, GitHub-flavored markdown, and custom styling.

## Features

- ✅ Markdown to HTML conversion using marked
- ✅ YAML frontmatter parsing
- ✅ GitHub-flavored heading IDs
- ✅ Automatic anchor links in headings
- ✅ GitHub markdown CSS styling

## API

**POST markdown for conversion:**
```javascript
const response = await fetch('https://html.apis.do/', {
  method: 'POST',
  body: '---\ntitle: Test\n---\n# Hello\n\nWorld'
})
const html = await response.text()
```

## Dependencies

- marked (^16.0.0) - Markdown parser
- marked-gfm-heading-id (^4.1.2) - Heading ID generation
- yaml (^2.8.0) - YAML parser

## Implementation

---

**Generated from:** html.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts html.mdx`
