/**
 * MDX LandingPage Renderer - Tailwind (Simplified)
 *
 * This version accepts PRE-COMPILED MDX components from the router
 * instead of compiling MDX at runtime
 */

import { Hono } from 'hono'
import { createElement as h } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import TailwindComponents from '@mdx-components/tailwind'

const app = new Hono()

// Tailwind CSS
const tailwindCSS = `
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; }
</style>
`

/**
 * POST /render - Render pre-compiled components
 * Expected body: { components: Array<ComponentSpec>, frontmatter?: object }
 *
 * ComponentSpec: { type: string, props: object }
 */
app.post('/render', async (c) => {
  try {
    const body = await c.req.json()
    const { components, frontmatter = {} } = body

    if (!components || !Array.isArray(components)) {
      return c.json({ error: 'Missing or invalid components array' }, 400)
    }

    // Render components
    const renderedComponents = components.map((spec: any, i: number) => {
      const Component = (TailwindComponents as any)[spec.type]
      if (!Component) {
        throw new Error(`Component not found: ${spec.type}`)
      }
      return h(Component, { key: i, ...spec.props })
    })

    // Create wrapper
    const Page = () => h('div', {}, ...renderedComponents)

    // Render to stream
    const stream = await renderToReadableStream(h(Page))
    const reader = stream.getReader()
    const chunks: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }

    const bodyContent = chunks.join('')

    // Wrap in HTML template
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frontmatter.title || 'Landing Page'}</title>
  ${tailwindCSS}
</head>
<body>
  ${bodyContent}
</body>
</html>
    `

    return c.html(html)
  } catch (error) {
    return c.json(
      {
        error: 'Rendering failed',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

/**
 * GET / - Info page
 */
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MDX LandingPage Renderer - Tailwind (Simplified)</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #333; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>MDX LandingPage Renderer - Tailwind (Simplified)</h1>
  <p>Renders landing pages from pre-compiled component specs.</p>

  <h2>Components Available</h2>
  <ul>
    <li><code>Hero</code> - Hero section</li>
    <li><code>Features</code> - Features grid</li>
    <li><code>CTA</code> - Call to action</li>
    <li><code>Form</code> - Contact forms</li>
    <li><code>Card</code> - Content cards</li>
    <li><code>Button</code> - Styled buttons</li>
  </ul>

  <h2>Usage</h2>
  <pre>POST /render
Content-Type: application/json

{
  "components": [
    {
      "type": "Hero",
      "props": {
        "title": "Welcome to Our Product",
        "subtitle": "The best solution",
        "cta": "Get Started",
        "ctaLink": "/signup"
      }
    },
    {
      "type": "Features",
      "props": {
        "title": "Why Choose Us",
        "features": [
          {"icon": "⚡", "title": "Fast", "description": "Lightning fast"},
          {"icon": "🔒", "title": "Secure", "description": "Bank-level security"}
        ]
      }
    }
  ],
  "frontmatter": {
    "title": "My Landing Page"
  }
}</pre>
</body>
</html>
  `)
})

export default app
