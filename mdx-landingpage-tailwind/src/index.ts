/**
 * MDX LandingPage Renderer - Tailwind
 *
 * Renders LandingPage MDX content with Tailwind CSS components
 */

import { Hono } from 'hono'
import { renderMDX } from '@hono/mdx'
import TailwindComponents from '@mdx-components/tailwind'

const app = new Hono()

// Tailwind CSS (inline for simplicity - could be from CDN or bundled)
const tailwindCSS = `
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; }
</style>
`

/**
 * POST /render - Render MDX content
 * Expected body: { content: string, frontmatter?: object }
 */
app.post('/render', async (c) => {
  try {
    const body = await c.req.json()
    const { content, frontmatter = {} } = body

    if (!content) {
      return c.json({ error: 'Missing content' }, 400)
    }

    // Render MDX with Tailwind components
    const html = await renderMDX(c, content, {
      components: TailwindComponents,
      props: frontmatter,
      template: (bodyContent, css, scripts) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frontmatter.title || 'Landing Page'}</title>
  ${tailwindCSS}
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
  ${bodyContent}
  ${scripts?.map((src) => `<script src="${src}"></script>`).join('\n') || ''}
</body>
</html>
      `,
      renderOptions: {
        streaming: false, // Static HTML for landing pages
      },
    })

    return html
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
  <title>MDX LandingPage Renderer - Tailwind</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #333; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>MDX LandingPage Renderer - Tailwind</h1>
  <p>Renders landing page MDX content with Tailwind CSS components.</p>

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
  "content": "---\\n$type: LandingPage\\n$style: tailwind\\n---\\n\\n&lt;Hero title=\\"Welcome\\" /&gt;",
  "frontmatter": {
    "$type": "LandingPage",
    "$style": "tailwind",
    "title": "My Landing Page"
  }
}</pre>

  <h2>Example MDX</h2>
  <pre>---
$type: LandingPage
$style: tailwind
title: My Awesome Product
---

&lt;Hero 
  title="Welcome to Our Product"
  subtitle="The best solution for your needs"
  cta="Get Started"
  ctaLink="/signup"
/&gt;

&lt;Features 
  title="Why Choose Us"
  features={[
    { icon: "⚡", title: "Fast", description: "Lightning fast" },
    { icon: "🔒", title: "Secure", description: "Bank-level security" },
    { icon: "📱", title: "Mobile", description: "Works everywhere" }
  ]}
/&gt;

&lt;CTA 
  title="Ready to get started?"
  primaryText="Start Free Trial"
  primaryLink="/signup"
/&gt;</pre>
</body>
</html>
  `)
})

export default app
