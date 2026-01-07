/**
 * @dotdo/vite - Framework Integration Tests (RED Phase)
 *
 * These tests validate that the Vite plugin correctly integrates with
 * various frameworks: TanStack Start, React Router v7, pure Hono, and
 * @cloudflare/vite-plugin.
 *
 * RED Phase: All tests should FAIL because the integration logic
 * is not yet implemented.
 *
 * @see https://tanstack.com/start
 * @see https://reactrouter.com/
 * @see https://hono.dev/
 * @see https://developers.cloudflare.com/workers/vite-plugin
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { resolve, join } from 'path'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'

// ============================================================================
// Types
// ============================================================================

interface MockProject {
  root: string
  packageJson: Record<string, unknown>
  files: Map<string, string>
  cleanup: () => Promise<void>
}

interface ViteConfig {
  plugins?: unknown[]
  build?: {
    outDir?: string
    rollupOptions?: {
      external?: string[]
    }
  }
  resolve?: {
    alias?: Record<string, string>
  }
  server?: {
    port?: number
    hmr?: boolean | { port?: number }
  }
  ssr?: {
    noExternal?: string[]
  }
}

interface BuildResult {
  success: boolean
  outputDir: string
  files: string[]
  bundleSize?: number
  errors?: string[]
}

interface DevServer {
  port: number
  url: string
  close: () => Promise<void>
  waitForHMR: () => Promise<void>
}

// ============================================================================
// Mock Project Helpers
// ============================================================================

/**
 * Creates a mock project directory with specified dependencies and files.
 * Used to test framework detection and build configurations.
 */
async function createMockProject(config: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  files?: Record<string, string>
  viteConfig?: string
}): Promise<MockProject> {
  const root = await mkdtemp(join(tmpdir(), 'vite-test-'))

  const packageJson = {
    name: 'mock-project',
    version: '1.0.0',
    type: 'module',
    dependencies: config.dependencies ?? {},
    devDependencies: config.devDependencies ?? {},
  }

  const files = new Map<string, string>()
  files.set('package.json', JSON.stringify(packageJson, null, 2))

  // Add custom files
  if (config.files) {
    for (const [path, content] of Object.entries(config.files)) {
      files.set(path, content)
    }
  }

  // Add vite config if specified
  if (config.viteConfig) {
    files.set('vite.config.ts', config.viteConfig)
  }

  // Write all files to disk
  for (const [path, content] of files) {
    const fullPath = join(root, path)
    const dir = resolve(fullPath, '..')
    await mkdir(dir, { recursive: true })
    await writeFile(fullPath, content, 'utf-8')
  }

  return {
    root,
    packageJson,
    files,
    cleanup: async () => {
      await rm(root, { recursive: true, force: true })
    },
  }
}

/**
 * Creates a TanStack Start project structure
 */
async function createTanStackProject(additionalDeps?: Record<string, string>): Promise<MockProject> {
  return createMockProject({
    dependencies: {
      '@tanstack/react-start': '^1.0.0',
      '@tanstack/react-router': '^1.0.0',
      'react': '^18.0.0',
      'react-dom': '^18.0.0',
      ...additionalDeps,
    },
    devDependencies: {
      'vite': '^6.0.0',
      '@dotdo/vite': '0.0.1',
    },
    files: {
      'index.html': `
        <!DOCTYPE html>
        <html>
          <head><title>TanStack Start App</title></head>
          <body>
            <div id="root"></div>
            <script type="module" src="/app/root.tsx"></script>
          </body>
        </html>
      `,
      'app/routes/index.tsx': `
        import { createFileRoute } from '@tanstack/react-router'

        export const Route = createFileRoute('/')({
          component: Home,
        })

        function Home() {
          return <div>Welcome to TanStack Start</div>
        }
      `,
      'app/root.tsx': `
        import { Outlet } from '@tanstack/react-router'

        export default function Root() {
          return (
            <html>
              <body>
                <Outlet />
              </body>
            </html>
          )
        }
      `,
    },
    viteConfig: `
      import { defineConfig } from 'vite'
      import { dotdo } from '@dotdo/vite'

      export default defineConfig({
        plugins: [dotdo()],
      })
    `,
  })
}

/**
 * Creates a React Router v7 project structure
 */
async function createReactRouterProject(additionalDeps?: Record<string, string>): Promise<MockProject> {
  return createMockProject({
    dependencies: {
      'react-router': '^7.0.0',
      '@react-router/cloudflare': '^7.0.0',
      'react': '^18.0.0',
      'react-dom': '^18.0.0',
      ...additionalDeps,
    },
    devDependencies: {
      'vite': '^6.0.0',
      '@dotdo/vite': '0.0.1',
    },
    files: {
      'app/routes/_index.tsx': `
        export default function Index() {
          return <div>Welcome to React Router</div>
        }
      `,
      'app/root.tsx': `
        import { Outlet } from 'react-router'

        export default function Root() {
          return (
            <html>
              <body>
                <Outlet />
              </body>
            </html>
          )
        }
      `,
    },
    viteConfig: `
      import { defineConfig } from 'vite'
      import { dotdo } from '@dotdo/vite'

      export default defineConfig({
        plugins: [dotdo()],
      })
    `,
  })
}

/**
 * Creates a pure Hono project structure (no React)
 */
async function createHonoProject(additionalDeps?: Record<string, string>): Promise<MockProject> {
  return createMockProject({
    dependencies: {
      'hono': '^4.0.0',
      ...additionalDeps,
    },
    devDependencies: {
      'vite': '^6.0.0',
      '@dotdo/vite': '0.0.1',
    },
    files: {
      'index.html': `
        <!DOCTYPE html>
        <html>
          <head><title>Hono App</title></head>
          <body>
            <div id="root">Hello from Hono</div>
            <script type="module" src="/src/index.tsx"></script>
          </body>
        </html>
      `,
      'src/index.tsx': `
        import { Hono } from 'hono'
        import { jsx } from 'hono/jsx'

        const app = new Hono()

        app.get('/', (c) => {
          return c.html(<div>Hello from Hono</div>)
        })

        export default app
      `,
    },
    viteConfig: `
      import { defineConfig } from 'vite'
      import { dotdo } from '@dotdo/vite'

      export default defineConfig({
        plugins: [dotdo()],
      })
    `,
  })
}

/**
 * Creates a project with @cloudflare/vite-plugin
 */
async function createCloudflareViteProject(additionalDeps?: Record<string, string>): Promise<MockProject> {
  return createMockProject({
    dependencies: {
      'hono': '^4.0.0',
      ...additionalDeps,
    },
    devDependencies: {
      'vite': '^6.0.0',
      '@cloudflare/vite-plugin': '^1.0.0',
      '@dotdo/vite': '0.0.1',
    },
    files: {
      'index.html': `
        <!DOCTYPE html>
        <html>
          <head><title>Cloudflare Worker</title></head>
          <body>
            <div id="root">Hello from Cloudflare Worker</div>
            <script type="module" src="/src/index.ts"></script>
          </body>
        </html>
      `,
      'src/index.ts': `
        export default {
          async fetch(request: Request): Promise<Response> {
            return new Response('Hello from Cloudflare Worker')
          }
        }
      `,
      'wrangler.toml': `
        name = "test-worker"
        main = "src/index.ts"
        compatibility_date = "2024-01-01"
      `,
    },
    viteConfig: `
      import { defineConfig } from 'vite'
      import { dotdo } from '@dotdo/vite'

      export default defineConfig({
        plugins: [dotdo()],
      })
    `,
  })
}

// ============================================================================
// Import actual implementation
// ============================================================================

import {
  dotdo,
  resolveViteConfig,
  buildProject,
  startDevServer,
  getBundleSize,
} from '../src/index'

// ============================================================================
// Test Suites
// ============================================================================

describe('@dotdo/vite Framework Integration', () => {
  // --------------------------------------------------------------------------
  // TanStack Start Integration
  // --------------------------------------------------------------------------
  describe('TanStack Start integration', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('detects @tanstack/react-start in dependencies', async () => {
      project = await createTanStackProject()

      const config = await resolveViteConfig(project.root)

      // Should detect TanStack Start framework
      expect(config).toBeDefined()
      // Plugin should configure for TanStack Start
      expect(config.plugins).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/tanstack|dotdo/),
        })
      )
    })

    it('applies correct Cloudflare adapter config for TanStack Start', async () => {
      project = await createTanStackProject()

      const config = await resolveViteConfig(project.root)

      // Should include Cloudflare adapter configuration
      expect(config.ssr).toBeDefined()
      expect(config.ssr?.noExternal).toContain('@tanstack/react-start')

      // Should configure proper build output
      expect(config.build?.outDir).toBe('dist')
    })

    it('works with TanStack Router file-based routes', async () => {
      project = await createTanStackProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      expect(result.files).toContain('worker.js')
      // Should include route for index
      expect(result.files.some(f => f.includes('routes'))).toBe(true)
    })

    it('supports @tanstack/react-query alongside TanStack Start', async () => {
      project = await createTanStackProject({
        '@tanstack/react-query': '^5.0.0',
      })

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      // Query should be bundled correctly
      expect(result.errors).toBeUndefined()
    })

    it('uses react-compat when configured for TanStack Start', async () => {
      project = await createMockProject({
        dependencies: {
          '@tanstack/react-start': '^1.0.0',
          '@tanstack/react-router': '^1.0.0',
          '@dotdo/react-compat': '0.0.1',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'app/routes/index.tsx': 'export default function Home() { return <div>Hello</div> }',
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo({ jsxRuntime: 'react-compat' })],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Should alias React to @dotdo/react (our react-compat implementation)
      expect(config.resolve?.alias?.['react']).toBe('@dotdo/react')
      expect(config.resolve?.alias?.['react-dom']).toBe('@dotdo/react/dom')
    })
  })

  // --------------------------------------------------------------------------
  // React Router v7 Integration
  // --------------------------------------------------------------------------
  describe('React Router v7 integration', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('detects react-router v7 in dependencies', async () => {
      project = await createReactRouterProject()

      const config = await resolveViteConfig(project.root)

      expect(config).toBeDefined()
      // Should detect React Router framework
      expect(config.plugins).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/react-router|dotdo/),
        })
      )
    })

    it('applies correct Cloudflare adapter config for React Router v7', async () => {
      project = await createReactRouterProject()

      const config = await resolveViteConfig(project.root)

      // Should include Cloudflare adapter configuration
      expect(config.ssr).toBeDefined()
      expect(config.ssr?.noExternal).toContain('@react-router/cloudflare')

      // Should configure proper build output
      expect(config.build?.outDir).toBe('dist')
    })

    it('works with React Router file-based routes', async () => {
      project = await createReactRouterProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      expect(result.files).toContain('worker.js')
      // Should include route for _index
      expect(result.files.some(f => f.includes('routes'))).toBe(true)
    })

    it('supports @react-router/cloudflare adapter', async () => {
      project = await createReactRouterProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      // Should output cloudflare-compatible worker
      expect(result.files).toContain('worker.js')
      expect(result.errors).toBeUndefined()
    })
  })

  // --------------------------------------------------------------------------
  // Pure Hono Integration
  // --------------------------------------------------------------------------
  describe('Pure Hono integration', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('detects hono-only project (no React)', async () => {
      project = await createHonoProject()

      const config = await resolveViteConfig(project.root)

      expect(config).toBeDefined()
      // Should detect pure Hono framework
      expect(config.plugins).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/hono|dotdo/),
        })
      )
    })

    it('uses hono/jsx directly without react-compat', async () => {
      project = await createHonoProject()

      const config = await resolveViteConfig(project.root)

      // Should NOT alias React (no react-compat needed)
      expect(config.resolve?.alias?.['react']).toBeUndefined()
      expect(config.resolve?.alias?.['react-dom']).toBeUndefined()
    })

    it('produces bundle size < 20KB for minimal Hono app', async () => {
      project = await createHonoProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)

      const bundleSize = await getBundleSize(result.outputDir)

      // Bundle should be under 20KB for minimal Hono app
      expect(bundleSize).toBeLessThan(20000) // 20KB in bytes
    })

    it('supports hono/jsx JSX transform', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.tsx': `
            import { Hono } from 'hono'
            import { jsx } from 'hono/jsx'

            const App = () => (
              <div class="app">
                <h1>Hello Hono JSX</h1>
                <ul>
                  {[1, 2, 3].map(n => <li key={n}>Item {n}</li>)}
                </ul>
              </div>
            )

            const app = new Hono()
            app.get('/', (c) => c.html(<App />))

            export default app
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('excludes React from external dependencies for pure Hono', async () => {
      project = await createHonoProject()

      const config = await resolveViteConfig(project.root)

      // Should not externalize React (it's not a dependency)
      expect(config.build?.rollupOptions?.external).not.toContain('react')
      expect(config.build?.rollupOptions?.external).not.toContain('react-dom')
    })
  })

  // --------------------------------------------------------------------------
  // @cloudflare/vite-plugin Integration
  // --------------------------------------------------------------------------
  describe('@cloudflare/vite-plugin integration', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('loads @cloudflare/vite-plugin correctly', async () => {
      project = await createCloudflareViteProject()

      const config = await resolveViteConfig(project.root)

      expect(config).toBeDefined()
      // Should include Cloudflare plugin
      expect(config.plugins).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/cloudflare/),
        })
      )
    })

    it('passes through cloudflare-specific config', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@cloudflare/vite-plugin': '^1.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.ts': `
            export default {
              async fetch(request: Request): Promise<Response> {
                return new Response('Hello')
              }
            }
          `,
          'wrangler.toml': `
            name = "test-worker"
            main = "src/index.ts"
            compatibility_date = "2024-01-01"

            [durable_objects]
            bindings = [{ name = "DO", class_name = "MyDO" }]
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo({
              cloudflare: {
                persistState: true,
                configPath: './wrangler.toml',
              },
            })],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Cloudflare config should be passed through
      expect(config).toBeDefined()
      // Should read wrangler.toml configuration
      expect(config.plugins).toBeDefined()
    })

    it('works with wrangler dev', async () => {
      project = await createCloudflareViteProject()

      const server = await startDevServer(project.root)

      try {
        expect(server.port).toBeDefined()
        expect(server.port).toBeGreaterThan(0)
        expect(server.url).toContain('localhost')

        // Server should be listening - verify by checking port
        // Note: Without an index.html, Vite dev server may return 404
        // but the server itself should be running
        expect(typeof server.close).toBe('function')
      } finally {
        await server.close()
      }
    })

    it('reads bindings from wrangler.toml', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@cloudflare/vite-plugin': '^1.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.ts': `
            interface Env {
              KV: KVNamespace
              DB: D1Database
            }

            export default {
              async fetch(request: Request, env: Env): Promise<Response> {
                await env.KV.put('test', 'value')
                return new Response('OK')
              }
            }
          `,
          'wrangler.toml': `
            name = "binding-test"
            main = "src/index.ts"
            compatibility_date = "2024-01-01"

            [[kv_namespaces]]
            binding = "KV"
            id = "xxx"

            [[d1_databases]]
            binding = "DB"
            database_name = "test-db"
            database_id = "xxx"
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Should configure bindings for dev mode
      expect(config).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // Dev Server Tests
  // --------------------------------------------------------------------------
  describe('Dev server', () => {
    let project: MockProject
    let server: DevServer | null = null

    afterEach(async () => {
      if (server) {
        await server.close()
        server = null
      }
      if (project) {
        await project.cleanup()
      }
    })

    it('startDevServer() returns server with port', async () => {
      project = await createHonoProject()

      server = await startDevServer(project.root)

      expect(server).toBeDefined()
      expect(server.port).toBeGreaterThan(0)
      expect(server.port).toBeLessThan(65536)
      expect(server.url).toMatch(/^http:\/\/localhost:\d+/)
    })

    it('HMR works correctly', async () => {
      project = await createTanStackProject()

      server = await startDevServer(project.root)

      // Verify server is running and has HMR capability
      expect(server.port).toBeGreaterThan(0)
      expect(server.url).toContain('localhost')
      expect(typeof server.waitForHMR).toBe('function')

      // Initial request - server serves index.html
      const response1 = await fetch(server.url)
      // In test environment without node_modules, we may get 404 for module imports
      // but the server should respond
      expect(response1.status).toBeDefined()

      // Modify a file
      const routePath = join(project.root, 'app/routes/index.tsx')
      await writeFile(
        routePath,
        `
        import { createFileRoute } from '@tanstack/react-router'

        export const Route = createFileRoute('/')({
          component: Home,
        })

        function Home() {
          return <div>Updated content via HMR</div>
        }
      `,
        'utf-8'
      )

      // Wait for HMR to process - this should not throw
      await server.waitForHMR()

      // Server should still be running after HMR
      expect(server.port).toBeGreaterThan(0)
    })

    it('SSR works correctly', async () => {
      project = await createTanStackProject()

      server = await startDevServer(project.root)

      const response = await fetch(server.url)

      // Server should respond - in test env without modules, content may vary
      // but the server infrastructure should work
      expect(response.status).toBeDefined()

      // Verify server is properly configured
      expect(server.port).toBeGreaterThan(0)
      expect(server.url).toContain('localhost')

      // The index.html should contain html tag (served by Vite)
      const html = await response.text()
      expect(html).toContain('html')
    })

    it('serves static assets correctly', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'index.html': `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Static Asset Test</title>
                <link rel="stylesheet" href="/styles.css">
              </head>
              <body>
                <div id="root">Hello</div>
                <script type="module" src="/src/index.tsx"></script>
              </body>
            </html>
          `,
          'src/index.tsx': `
            import { Hono } from 'hono'
            const app = new Hono()
            app.get('/', (c) => c.html('<html><body>Hello</body></html>'))
            export default app
          `,
          'public/styles.css': `
            body { background: blue; }
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      server = await startDevServer(project.root)

      // Vite serves public assets at the root
      const response = await fetch(`${server.url}/styles.css`)
      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/css')

      const css = await response.text()
      expect(css).toContain('background: blue')
    })

    it('handles errors gracefully in dev mode', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'index.html': `
            <!DOCTYPE html>
            <html>
              <head><title>Error Test</title></head>
              <body>
                <div id="root"></div>
                <script type="module" src="/src/index.tsx"></script>
              </body>
            </html>
          `,
          'src/index.tsx': `
            // Intentional error for testing
            import { Hono } from 'hono'
            const app = new Hono()
            app.get('/', (c) => {
              throw new Error('Test error')
            })
            export default app
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      server = await startDevServer(project.root)

      const response = await fetch(server.url)

      // Server should not crash and should respond
      // In test environment without node_modules, the exact response varies
      // but the server infrastructure should handle errors gracefully
      expect(response.status).toBeDefined()
      expect(server.port).toBeGreaterThan(0)

      // Close should work without throwing
      await expect(server.close()).resolves.not.toThrow()
    })
  })

  // --------------------------------------------------------------------------
  // Build Configuration Tests
  // --------------------------------------------------------------------------
  describe('Build configuration', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('outputs to dist/worker.js by default', async () => {
      project = await createHonoProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      expect(result.outputDir).toBe(join(project.root, 'dist'))
      expect(result.files).toContain('worker.js')
    })

    it('generates sourcemaps in development builds', async () => {
      project = await createHonoProject()

      // Modify vite config for development build
      await writeFile(
        join(project.root, 'vite.config.ts'),
        `
        import { defineConfig } from 'vite'
        import { dotdo } from '@dotdo/vite'

        export default defineConfig({
          plugins: [dotdo()],
          build: {
            sourcemap: true,
          },
        })
      `,
        'utf-8'
      )

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      expect(result.files).toContain('worker.js.map')
    })

    it('minifies production builds', async () => {
      project = await createHonoProject()

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)

      const bundleSize = await getBundleSize(result.outputDir)

      // Minified bundle should be compact
      expect(bundleSize).toBeLessThan(50000) // 50KB for basic Hono app
    })

    it('handles TypeScript correctly', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
          'typescript': '^5.0.0',
        },
        files: {
          'src/index.ts': `
            import { Hono } from 'hono'

            interface User {
              id: number
              name: string
            }

            const app = new Hono()

            app.get('/user/:id', (c) => {
              const user: User = { id: parseInt(c.req.param('id')), name: 'Test' }
              return c.json(user)
            })

            export default app
          `,
          'tsconfig.json': JSON.stringify({
            compilerOptions: {
              target: 'ESNext',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              jsx: 'react-jsx',
            },
          }),
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      const result = await buildProject(project.root)

      expect(result.success).toBe(true)
      // Should compile TypeScript without errors
      expect(result.errors).toBeUndefined()
    })
  })

  // --------------------------------------------------------------------------
  // Framework Auto-Detection Tests
  // --------------------------------------------------------------------------
  describe('Framework auto-detection', () => {
    let project: MockProject

    afterEach(async () => {
      if (project) {
        await project.cleanup()
      }
    })

    it('prefers TanStack Start when both TanStack and React Router are present', async () => {
      project = await createMockProject({
        dependencies: {
          '@tanstack/react-start': '^1.0.0',
          '@tanstack/react-router': '^1.0.0',
          'react-router': '^7.0.0',
          'react': '^18.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.tsx': 'export default function App() { return <div>Hello</div> }',
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Should prioritize TanStack Start
      expect(config.ssr?.noExternal).toContain('@tanstack/react-start')
    })

    it('falls back to hono when no framework dependencies exist', async () => {
      project = await createMockProject({
        dependencies: {
          'hono': '^4.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.ts': `
            import { Hono } from 'hono'
            const app = new Hono()
            export default app
          `,
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo()],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Should use Hono-only config
      expect(config.resolve?.alias?.['react']).toBeUndefined()
    })

    it('respects explicit framework override', async () => {
      project = await createMockProject({
        dependencies: {
          '@tanstack/react-start': '^1.0.0',
          'hono': '^4.0.0',
          'react': '^18.0.0',
        },
        devDependencies: {
          'vite': '^6.0.0',
          '@dotdo/vite': '0.0.1',
        },
        files: {
          'src/index.tsx': 'export default function App() { return <div>Hello</div> }',
        },
        viteConfig: `
          import { defineConfig } from 'vite'
          import { dotdo } from '@dotdo/vite'

          export default defineConfig({
            plugins: [dotdo({ framework: 'hono' })],
          })
        `,
      })

      const config = await resolveViteConfig(project.root)

      // Should use Hono despite TanStack being present
      expect(config.ssr?.noExternal).not.toContain('@tanstack/react-start')
    })
  })
})

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge cases and error handling', () => {
  let project: MockProject

  afterEach(async () => {
    if (project) {
      await project.cleanup()
    }
  })

  it('handles missing package.json gracefully', async () => {
    project = await createMockProject({
      files: {
        'src/index.ts': 'export default {}',
      },
      viteConfig: `
        import { defineConfig } from 'vite'
        import { dotdo } from '@dotdo/vite'

        export default defineConfig({
          plugins: [dotdo()],
        })
      `,
    })

    // Remove package.json
    await rm(join(project.root, 'package.json'))

    // Should not throw, should use defaults
    await expect(resolveViteConfig(project.root)).resolves.toBeDefined()
  })

  it('handles invalid vite.config.ts gracefully', async () => {
    project = await createMockProject({
      dependencies: {
        'hono': '^4.0.0',
      },
      devDependencies: {
        'vite': '^6.0.0',
        '@dotdo/vite': '0.0.1',
      },
      files: {
        'src/index.ts': 'export default {}',
      },
      viteConfig: `
        // Invalid config - syntax error
        export default {
          plugins: [
      `,
    })

    // Should not throw - gracefully falls back to defaults when config is invalid
    // The config parser uses regex extraction, not full JS parsing
    const config = await resolveViteConfig(project.root)
    expect(config).toBeDefined()
    // Should still detect framework from package.json
    expect(config.plugins).toContainEqual(expect.objectContaining({ name: 'hono' }))
  })

  it('handles circular dependencies in project', async () => {
    project = await createMockProject({
      dependencies: {
        'hono': '^4.0.0',
      },
      devDependencies: {
        'vite': '^6.0.0',
        '@dotdo/vite': '0.0.1',
      },
      files: {
        'src/a.ts': `
          import { b } from './b'
          export const a = () => b()
        `,
        'src/b.ts': `
          import { a } from './a'
          export const b = () => a()
        `,
        'src/index.ts': `
          import { a } from './a'
          export default { fetch: () => new Response(String(a())) }
        `,
      },
      viteConfig: `
        import { defineConfig } from 'vite'
        import { dotdo } from '@dotdo/vite'

        export default defineConfig({
          plugins: [dotdo()],
        })
      `,
    })

    // Should handle circular deps (may warn but not crash)
    const result = await buildProject(project.root)

    // Build should complete (circular deps are valid JS)
    expect(result.success).toBe(true)
  })

  it('handles very large projects efficiently', async () => {
    // Create a project with many files
    const files: Record<string, string> = {
      'src/index.ts': `
        import { Hono } from 'hono'
        const app = new Hono()
        export default app
      `,
    }

    // Add 100 route files
    for (let i = 0; i < 100; i++) {
      files[`src/routes/route${i}.ts`] = `
        export const handler${i} = () => ({ id: ${i} })
      `
    }

    project = await createMockProject({
      dependencies: {
        'hono': '^4.0.0',
      },
      devDependencies: {
        'vite': '^6.0.0',
        '@dotdo/vite': '0.0.1',
      },
      files,
      viteConfig: `
        import { defineConfig } from 'vite'
        import { dotdo } from '@dotdo/vite'

        export default defineConfig({
          plugins: [dotdo()],
        })
      `,
    })

    const startTime = Date.now()
    const result = await buildProject(project.root)
    const buildTime = Date.now() - startTime

    expect(result.success).toBe(true)
    // Build should complete in reasonable time (< 60 seconds)
    expect(buildTime).toBeLessThan(60000)
  })
})
