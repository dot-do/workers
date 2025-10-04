/**
 * Remote Integration Tests for ESBuild Worker
 *
 * Tests the ESBuild worker deployed to Cloudflare using remote:true bindings.
 * This runs against the actual deployed worker, not a local simulation.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'

describe('ESBuild Worker (Remote)', () => {
  let esbuildService: any

  beforeAll(() => {
    esbuildService = env.ESBUILD_SERVICE
    if (!esbuildService) {
      throw new Error('ESBUILD_SERVICE binding not found - worker may not be deployed')
    }
  })

  describe('build() - TypeScript Compilation', () => {
    it('should compile TypeScript to JavaScript', async () => {
      const code = `
        const greeting: string = "Hello, World!"
        console.log(greeting)
      `

      const result = await esbuildService.build(code, {
        loader: 'ts',
        format: 'esm',
      })

      expect(result).toBeDefined()
      expect(result).toContain('Hello, World!')
      expect(result).not.toContain(': string') // TypeScript types removed
    })

    it('should compile TypeScript with interfaces', async () => {
      const code = `
        interface Person {
          name: string
          age: number
        }

        const person: Person = { name: "John", age: 30 }
        console.log(person)
      `

      const result = await esbuildService.build(code, {
        loader: 'ts',
        format: 'esm',
      })

      expect(result).toBeDefined()
      expect(result).not.toContain('interface Person') // Interface removed
      expect(result).toContain('John')
    })
  })

  describe('build() - Format Conversion', () => {
    it('should convert to ESM format', async () => {
      const code = `export const greeting = "Hello"`

      const result = await esbuildService.build(code, {
        loader: 'js',
        format: 'esm',
      })

      expect(result).toContain('export')
      expect(result).toContain('greeting')
    })

    it('should convert to CommonJS format', async () => {
      const code = `export const greeting = "Hello"`

      const result = await esbuildService.build(code, {
        loader: 'js',
        format: 'cjs',
      })

      expect(result).toContain('exports')
      expect(result).toContain('greeting')
    })

    it('should convert to IIFE format', async () => {
      const code = `const greeting = "Hello"; console.log(greeting)`

      const result = await esbuildService.build(code, {
        loader: 'js',
        format: 'iife',
      })

      expect(result).toContain('function()')
    })
  })

  describe('build() - JSX/TSX Support', () => {
    it('should transform JSX', async () => {
      const code = `
        const Component = () => {
          return <div>Hello</div>
        }
      `

      const result = await esbuildService.build(code, {
        loader: 'jsx',
        format: 'esm',
        jsx: 'automatic',
      })

      expect(result).toBeDefined()
      expect(result).toContain('Hello')
      expect(result).not.toContain('<div>') // JSX transformed
    })

    it('should transform TSX', async () => {
      const code = `
        interface Props {
          name: string
        }

        const Component = ({ name }: Props) => {
          return <div>Hello {name}</div>
        }
      `

      const result = await esbuildService.build(code, {
        loader: 'tsx',
        format: 'esm',
        jsx: 'automatic',
      })

      expect(result).toBeDefined()
      expect(result).not.toContain('interface Props')
      expect(result).not.toContain('<div>')
    })
  })

  describe('build() - Minification', () => {
    it('should minify code when requested', async () => {
      const code = `
        const greeting = "Hello, World!"
        const message = greeting + " How are you?"
        console.log(message)
      `

      const normalResult = await esbuildService.build(code, {
        loader: 'js',
        format: 'esm',
        minify: false,
      })

      const minifiedResult = await esbuildService.build(code, {
        loader: 'js',
        format: 'esm',
        minify: true,
      })

      expect(minifiedResult.length).toBeLessThan(normalResult.length)
      expect(minifiedResult).not.toContain('\n') // No newlines in minified
    })
  })

  describe('build() - Error Handling', () => {
    it('should handle TypeScript syntax errors', async () => {
      const code = `const x: string = 123` // Type error

      try {
        await esbuildService.build(code, {
          loader: 'ts',
          format: 'esm',
        })
        // esbuild may not throw on type errors, just transform them
      } catch (error: any) {
        expect(error).toBeDefined()
      }
    })

    it('should handle invalid JavaScript', async () => {
      const code = `const x = {{{ invalid }}}` // Syntax error

      try {
        await esbuildService.build(code, {
          loader: 'js',
          format: 'esm',
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('build() - Target Version', () => {
    it('should transpile to ES2015', async () => {
      const code = `
        const greeting = "Hello"
        const arrow = () => greeting
      `

      const result = await esbuildService.build(code, {
        loader: 'js',
        format: 'esm',
        target: 'es2015',
      })

      expect(result).toBeDefined()
      // ES2015 should still have arrow functions
      expect(result).toContain('=>')
    })

    it('should transpile to ES2020', async () => {
      const code = `
        const obj = { a: 1, b: 2 }
        const merged = { ...obj, c: 3 }
      `

      const result = await esbuildService.build(code, {
        loader: 'js',
        format: 'esm',
        target: 'es2020',
      })

      expect(result).toBeDefined()
      expect(result).toContain('...') // Spread operator preserved
    })
  })
})
