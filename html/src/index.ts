import { WorkerEntrypoint } from 'cloudflare:workers'
import { marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import YAML from 'yaml'

// Configure marked with GitHub-flavored heading IDs
marked.use(gfmHeadingId())

// Note: The anchor links customization from the original worker.ts
// was removed as it causes compatibility issues with Workers runtime

const FRONT = /^---\s*[\r\n]+([\s\S]*?)\r?\n---\s*[\r\n]*/m

function renderWithSections(src: string): string {
  let rest = src, out = ''
  while (true) {
    const m = rest.match(FRONT)
    if (!m) break
    out += String(marked.parse(rest.slice(0, m.index)))
    out += yamlSection(YAML.parse(m[1]) ?? {})
    rest = rest.slice(m.index! + m[0].length)
  }
  out += String(marked.parse(rest))
  return wrap(out)
}

function yamlSection(obj: Record<string, unknown>): string {
  return `<section class="frontmatter">
            <h2>Front-matter</h2>
            <pre><code>${escape(JSON.stringify(obj, null, 2))}</code></pre>
          </section>`
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const wrap = (body: string) => `<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>Rendered Markdown</title>
<link rel="stylesheet" href="https://unpkg.com/github-markdown-css/github-markdown-light.css">
<style>
  body{max-width:780px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui}
  .frontmatter{background:#f6f8fa;border:1px solid #d0d7de;padding:1rem;border-radius:6px;margin:1.5rem 0}
  .anchor{opacity:.2;margin-right:.25em;text-decoration:none}
  h1:hover .anchor,h2:hover .anchor,h3:hover .anchor{opacity:.6}
</style>
<body class="markdown-body">
${body}
</body></html>`

export default class extends WorkerEntrypoint {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return Response.json({ success: true, message: 'POST markdown to convert to HTML' })
    }

    try {
      const md = await req.text()
      const html = renderWithSections(md)
      return new Response(html, {
        headers: { 'content-type': 'text/html;charset=utf-8' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    }
  }
}
