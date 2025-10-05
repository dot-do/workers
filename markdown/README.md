# markdown

# Markdown Converter Worker

A Cloudflare Worker that fetches content from URLs and converts it to markdown using Workers AI.

## Features

- ✅ **URL Fetching** - Fetches content from any URL via prxy.do
- ✅ **AI Conversion** - Converts content to markdown using Workers AI
- ✅ **Content-Type Detection** - Automatically handles different content types
- ✅ **Metadata Preservation** - Returns original headers along with markdown

## Usage

This worker accepts any URL path and converts the content to markdown:

```bash
# Fetch and convert a webpage
curl https://markdown.fetch.do/example.com

# Fetch and convert a PDF
curl https://markdown.fetch.do/document.pdf
```

## Response Format

Returns JSON with:
- `markdown` - The converted markdown content
- `headers` - Original response headers

```json
{
  "markdown": "# Example\n\nConverted content...",
  "headers": {
    "content-type": "text/html",
    "content-length": "12345"
  }
}
```

## How It Works

1. Extracts the path from the request URL
2. Fetches content from `https://prxy.do{path}`
3. Converts response to a Blob
4. Uses Workers AI `toMarkdown()` to convert content
5. Returns JSON with markdown and original headers

## AI Model

Uses Cloudflare Workers AI with the `toMarkdown` function which automatically:
- Detects content type (HTML, PDF, etc.)
- Extracts text content
- Converts to clean markdown format
- Preserves document structure

## Implementation



## Dependencies

- `cloudflare:workers` - Workers runtime and AI binding
- Workers AI - Cloudflare's AI platform for content conversion

## Routes

- `markdown.fetch.do/*` - Main domain for markdown conversion
- `md.fetch.do/*` - Short alias
- `scrape.md/*` - Alternative domain

---

**Generated from:** markdown.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts markdown.mdx`
