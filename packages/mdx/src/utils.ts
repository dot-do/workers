import type { Frontmatter, MdxOptions } from './types'
import { parse as parseYAML } from 'yaml'

/**
 * Regular expression for matching YAML frontmatter
 */
const FRONTMATTER_REGEX = /^---\s*[\r\n]+([\s\S]*?)\r?\n---\s*[\r\n]*/m

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: Frontmatter
  content: string
} {
  const match = markdown.match(FRONTMATTER_REGEX)

  if (!match) {
    return {
      frontmatter: {},
      content: markdown
    }
  }

  let frontmatter: Frontmatter = {}
  try {
    frontmatter = parseYAML(match[1]) || {}
  } catch (error) {
    console.error('Failed to parse frontmatter:', error)
  }

  const content = markdown.replace(match[0], '')
  return { frontmatter, content }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char)
}

/**
 * Wrap HTML content in a full document
 */
export function wrapHtml(
  body: string,
  options: MdxOptions,
  frontmatter: Frontmatter
): string {
  const { styling = 'github' } = options

  const title = frontmatter.title || 'Rendered Markdown'

  const styleLink = styling === 'github'
    ? '<link rel="stylesheet" href="https://unpkg.com/github-markdown-css/github-markdown-light.css">'
    : styling === 'minimal'
    ? `<style>
      body { max-width: 780px; margin: 2rem auto; padding: 0 1rem; font: 16px/1.6 system-ui; }
      h1, h2, h3 { margin-top: 1.5rem; }
      code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; }
      pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    </style>`
    : ''

  const frontmatterSection = Object.keys(frontmatter).length > 0
    ? `<section class="frontmatter">
         <h2>Front-matter</h2>
         <pre><code>${escapeHtml(JSON.stringify(frontmatter, null, 2))}</code></pre>
       </section>`
    : ''

  const additionalStyles = styling !== 'none'
    ? `<style>
      body { max-width: 780px; margin: 2rem auto; padding: 0 1rem; font: 16px/1.6 system-ui; }
      .frontmatter { background: #f6f8fa; border: 1px solid #d0d7de; padding: 1rem; border-radius: 6px; margin: 1.5rem 0; }
      .anchor { opacity: 0.2; margin-right: 0.25em; text-decoration: none; }
      h1:hover .anchor, h2:hover .anchor, h3:hover .anchor { opacity: 0.6; }
    </style>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${styleLink}
  ${additionalStyles}
</head>
<body class="${styling === 'github' ? 'markdown-body' : ''}">
${frontmatterSection}
${body}
</body>
</html>`
}
