/**
 * Playground Worker
 * Serves the .do playground standalone bundle and demo pages
 */

interface Env {
  ENVIRONMENT?: string
  ASSETS?: KVNamespace // Optional: for caching playground bundle
}

// Demo HTML page
const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>.do playground - Interactive SDK Playground</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #1e1e1e;
        color: #fff;
      }
      .header {
        padding: 20px;
        background: #252526;
        border-bottom: 1px solid #3e3e42;
      }
      .header h1 {
        font-size: 24px;
        margin-bottom: 8px;
      }
      .header p {
        color: #888;
        font-size: 14px;
      }
      .playground-container {
        height: calc(100vh - 120px);
      }
      .footer {
        padding: 16px 20px;
        background: #252526;
        border-top: 1px solid #3e3e42;
        text-align: center;
        font-size: 12px;
        color: #888;
      }
      .footer a {
        color: #4fc3f7;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>🎮 .do playground</h1>
      <p>Interactive playground for sdk.do • Press Cmd/Ctrl+Enter to run code</p>
    </div>

    <div id="playground" class="playground-container"></div>

    <div class="footer">
      <p>
        Powered by <a href="https://sdk.do" target="_blank">sdk.do</a> •
        <a href="https://github.com/dot-do" target="_blank">GitHub</a> •
        <a href="/docs" target="_blank">Docs</a>
      </p>
    </div>

    <script src="/playground.iife.js"></script>
    <script>
      // Custom SDK implementation with real API endpoints
      const sdk = {
        $: {},
        ai: {
          generate: async (prompt, options = {}) => {
            console.log('🤖 AI generate:', prompt)
            try {
              const response = await fetch('https://api.do/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, ...options }),
              })
              return response.json()
            } catch (error) {
              console.error('AI error:', error)
              return { error: 'AI service not available. This is a demo.' }
            }
          },
        },
        api: {
          fetch: fetch,
          get: async (url, options) => {
            const response = await fetch(url, { ...options, method: 'GET' })
            return response.json()
          },
          post: async (url, data, options) => {
            const response = await fetch(url, {
              ...options,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...options?.headers },
              body: JSON.stringify(data),
            })
            return response.json()
          },
        },
        db: {
          query: async (sql) => {
            console.log('🗄️ DB query:', sql)
            try {
              const response = await fetch('https://db.do/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql }),
              })
              return response.json()
            } catch (error) {
              console.error('DB error:', error)
              return { error: 'Database not available. This is a demo.' }
            }
          },
          execute: async (sql) => {
            console.log('🗄️ DB execute:', sql)
            try {
              const response = await fetch('https://db.do/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql }),
              })
              return response.json()
            } catch (error) {
              console.error('DB error:', error)
              return { error: 'Database not available. This is a demo.' }
            }
          },
        },
        every: {},
        on: {},
        send: {},
      }

      const defaultCode = \`// Welcome to .do playground! 🎮
// Press Cmd/Ctrl+Enter to run your code

// Example 1: Fetch data from an API
const response = await api.fetch('https://api.github.com/users/octocat')
const data = await response.json()
console.log('GitHub user:', data.login)
console.log('Public repos:', data.public_repos)

// Example 2: Use the helper methods
const posts = await api.get('https://jsonplaceholder.typicode.com/posts?_limit=5')
console.log('Posts:', posts.length)

// Example 3: AI generation (demo)
// Uncomment to try:
// const aiResult = await ai.generate('Write a haiku about coding')
// console.log('AI:', aiResult)

// Example 4: Database query (demo)
// Uncomment to try:
// const dbResult = await db.query('SELECT * FROM users LIMIT 10')
// console.log('DB:', dbResult)

// Return values are automatically displayed
return {
  success: true,
  github: data.login,
  posts: posts.length,
  message: 'Edit this code and run it!'
}
\`

      // Mount playground
      DOPlayground.mount(document.getElementById('playground'), {
        sdk,
        defaultCode,
        theme: 'vs-dark',
        height: '100%',
      })

      console.log('✅ .do playground ready!')
    </script>
  </body>
</html>
`

// Simple usage page
const SIMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>.do playground - Simple Example</title>
  </head>
  <body style="margin: 0; padding: 0; background: #1e1e1e">
    <!-- Mount playground here -->
    <div data-do-playground style="height: 100vh"></div>

    <!-- Load playground (auto-mounts) -->
    <script src="/playground.iife.js"></script>
  </body>
</html>
`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Route handling
    switch (url.pathname) {
      case '/':
      case '/demo':
        return new Response(DEMO_HTML, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        })

      case '/simple':
        return new Response(SIMPLE_HTML, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        })

      case '/playground.iife.js':
        // Serve the playground bundle
        // In production, this would be built and served from KV or R2
        // For now, return instructions
        return new Response(
          \`// .do playground bundle not built yet
// Run: cd sdk/packages/playground && pnpm install && pnpm build:standalone
// Then deploy the dist/playground.iife.js file to this worker

console.error('.do playground: Bundle not available. Please build and deploy first.')
alert('.do playground: Bundle not available. Please build and deploy first.')
\`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
          }
        )

      case '/health':
        return Response.json({ status: 'ok', service: 'playground', version: '0.1.0' }, { headers: corsHeaders })

      default:
        return new Response('Not found', {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        })
    }
  },
}
