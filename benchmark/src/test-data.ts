/**
 * Test Data Generator - Synthetic Web Content
 *
 * Generates realistic web content with 5 formats:
 * - JSON (structured metadata)
 * - Code (extracted ESM/JavaScript)
 * - Markdown (MDX with YAML frontmatter)
 * - HTML (rendered output)
 * - AST (Abstract Syntax Tree)
 */

import type { TestContent } from './types'

/**
 * Generate random Lorem Ipsum text
 */
function generateLoremIpsum(paragraphs: number): string {
  const lorem = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
    'Nisi ut aliquip ex ea commodo consequat velit esse cillum dolore.',
    'Ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute.',
    'Irure dolor in reprehenderit in voluptate velit esse cillum dolore eu.',
  ]

  const result: string[] = []
  for (let i = 0; i < paragraphs; i++) {
    const paragraph = []
    const sentences = 3 + Math.floor(Math.random() * 5)
    for (let j = 0; j < sentences; j++) {
      paragraph.push(lorem[Math.floor(Math.random() * lorem.length)])
    }
    result.push(paragraph.join(' '))
  }

  return result.join('\n\n')
}

/**
 * Generate random namespace (domain/subdomain)
 */
function generateNs(): string {
  const domains = ['wikipedia.org', 'github.com', 'stackoverflow.com', 'medium.com', 'dev.to']
  const subdomains = ['en', 'docs', 'blog', 'api', 'help']

  const domain = domains[Math.floor(Math.random() * domains.length)]

  // 50% chance to add subdomain
  if (Math.random() > 0.5) {
    const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)]
    return `${subdomain}.${domain}`
  }

  return domain
}

/**
 * Generate random ID (page title with spaces)
 */
function generateId(): string {
  const adjectives = ['Advanced', 'Simple', 'Complete', 'Modern', 'Essential', 'Practical']
  const nouns = ['Guide', 'Tutorial', 'Documentation', 'Introduction', 'Overview', 'Reference']
  const topics = [
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'Web Development',
    'API Design',
    'Database Design',
    'Cloudflare Workers',
  ]

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const topic = topics[Math.floor(Math.random() * topics.length)]

  return `${adjective} ${noun} to ${topic}`
}

/**
 * Generate JavaScript code snippet
 */
function generateCode(): string {
  const examples = [
    `export function hello() {
  console.log('Hello, world!')
  return { status: 'ok' }
}`,
    `export async function fetchData(url: string) {
  const response = await fetch(url)
  return await response.json()
}`,
    `export class MyClass {
  constructor(private name: string) {}

  greet() {
    return \`Hello, \${this.name}!\`
  }
}`,
  ]

  return examples[Math.floor(Math.random() * examples.length)]
}

/**
 * Generate markdown with YAML frontmatter
 */
function generateMarkdown(id: string, paragraphs: number, code: string): string {
  const title = id
  const description = generateLoremIpsum(1)
  const tags = ['tutorial', 'guide', 'documentation']
  const body = generateLoremIpsum(paragraphs)

  return `---
title: "${title}"
description: "${description}"
tags: [${tags.join(', ')}]
date: 2025-10-04
author: Test Generator
---

# ${title}

${body}

## Code Example

\`\`\`typescript
${code}
\`\`\`

## Conclusion

${generateLoremIpsum(1)}`
}

/**
 * Generate HTML from markdown
 */
function generateHtml(markdown: string): string {
  // Very basic markdown to HTML conversion
  let html = markdown

  // Remove frontmatter
  html = html.replace(/^---[\s\S]*?---\n\n/, '')

  // Convert headings
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')

  // Convert code blocks
  html = html.replace(/```(\w+)\n([\s\S]+?)\n```/g, '<pre><code class="language-$1">$2</code></pre>')

  // Convert paragraphs
  html = html.replace(/\n\n/g, '</p>\n<p>')
  html = `<div class="content">\n<p>${html}</p>\n</div>`

  return html
}

/**
 * Generate AST from markdown
 */
function generateAst(markdown: string): any {
  // Simplified AST representation
  return {
    type: 'root',
    children: [
      {
        type: 'frontmatter',
        value: markdown.match(/^---\n([\s\S]+?)\n---/)?.[1] || '',
      },
      {
        type: 'heading',
        depth: 1,
        children: [{ type: 'text', value: markdown.match(/^# (.+)$/m)?.[1] || 'Title' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'Content...' }],
      },
      {
        type: 'code',
        lang: 'typescript',
        value: markdown.match(/```typescript\n([\s\S]+?)\n```/)?.[1] || '',
      },
    ],
  }
}

/**
 * Generate content hash (SHA256-like string)
 */
function generateHash(content: string): string {
  // Simple hash for testing (not cryptographic)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

/**
 * Generate test content with specified average size
 *
 * @param avgSizeKB Average total size in KB (default: 225 KB = 50KB markdown + 75KB HTML + 100KB AST)
 */
export function generateTestContent(avgSizeKB: number = 225): TestContent {
  const ns = generateNs()
  const id = generateId()

  // Calculate paragraphs to roughly hit target size
  // Rough estimate: 1 paragraph ≈ 500 bytes markdown
  // HTML is ~1.5x markdown size
  // AST is ~2x markdown size
  const targetMarkdownKB = avgSizeKB / 4.5 // (1 + 1.5 + 2) = 4.5x markdown
  const paragraphs = Math.max(5, Math.floor((targetMarkdownKB * 1024) / 500))

  const code = generateCode()
  const markdown = generateMarkdown(id, paragraphs, code)
  const html = generateHtml(markdown)
  const ast = generateAst(markdown)

  const json = {
    title: id,
    ns,
    id,
    type: 'page',
    language: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    ns,
    id,
    json,
    code,
    markdown,
    html,
    ast,
    hash: generateHash(markdown),
    language: 'en',
  }
}
