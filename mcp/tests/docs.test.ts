/**
 * Tests for MCP documentation endpoints
 */

import { describe, it, expect } from 'vitest'
import { generateDocs, generateDocsIndex, listDocs } from '../src/docs/generator'

describe('Documentation Generator', () => {
  describe('listDocs', () => {
    it('should return array of available primitives', () => {
      const docs = listDocs()

      expect(Array.isArray(docs)).toBe(true)
      expect(docs.length).toBeGreaterThan(0)
    })

    it('should include $ runtime', () => {
      const docs = listDocs()

      expect(docs).toContain('$')
    })

    it('should include all 8 primitives', () => {
      const docs = listDocs()

      expect(docs).toContain('ai')
      expect(docs).toContain('db')
      expect(docs).toContain('api')
      expect(docs).toContain('on')
      expect(docs).toContain('send')
      expect(docs).toContain('every')
      expect(docs).toContain('decide')
      expect(docs).toContain('user')
    })
  })

  describe('generateDocs', () => {
    it('should generate docs for $ runtime', () => {
      const docs = generateDocs('$')

      expect(docs).toBeDefined()
      expect(docs).toContain('Business-as-Code Runtime')
      expect(docs).toContain('BusinessRuntime')
      expect(docs).toContain('8 core primitives')
    })

    it('should generate docs for ai primitive', () => {
      const docs = generateDocs('ai')

      expect(docs).toBeDefined()
      expect(docs).toContain('AI Operations')
      expect(docs).toContain('AIOperations')
      expect(docs).toContain('generateText')
      expect(docs).toContain('embed')
    })

    it('should generate docs for db primitive', () => {
      const docs = generateDocs('db')

      expect(docs).toBeDefined()
      expect(docs).toContain('Database Operations')
      expect(docs).toContain('DatabaseOperations')
      expect(docs).toContain('find')
      expect(docs).toContain('create')
      expect(docs).toContain('update')
      expect(docs).toContain('delete')
    })

    it('should generate docs for api primitive', () => {
      const docs = generateDocs('api')

      expect(docs).toBeDefined()
      expect(docs).toContain('API Operations')
      expect(docs).toContain('APIOperations')
      expect(docs).toContain('get')
      expect(docs).toContain('post')
    })

    it('should generate docs for on primitive', () => {
      const docs = generateDocs('on')

      expect(docs).toBeDefined()
      expect(docs).toContain('Event Operations')
      expect(docs).toContain('EventOperations')
      expect(docs).toContain('created')
      expect(docs).toContain('updated')
    })

    it('should generate docs for send primitive', () => {
      const docs = generateDocs('send')

      expect(docs).toBeDefined()
      expect(docs).toContain('Send Operations')
      expect(docs).toContain('SendOperations')
      expect(docs).toContain('email')
      expect(docs).toContain('sms')
    })

    it('should generate docs for every primitive', () => {
      const docs = generateDocs('every')

      expect(docs).toBeDefined()
      expect(docs).toContain('Every Operations')
      expect(docs).toContain('EveryOperations')
      expect(docs).toContain('hour')
      expect(docs).toContain('day')
      expect(docs).toContain('forEvery')
    })

    it('should generate docs for decide primitive', () => {
      const docs = generateDocs('decide')

      expect(docs).toBeDefined()
      expect(docs).toContain('Decide Operations')
      expect(docs).toContain('DecisionOperations')
      expect(docs).toContain('if')
      expect(docs).toContain('switch')
    })

    it('should generate docs for user primitive', () => {
      const docs = generateDocs('user')

      expect(docs).toBeDefined()
      expect(docs).toContain('User Context')
      expect(docs).toContain('UserContext')
      expect(docs).toContain('id')
      expect(docs).toContain('email')
      expect(docs).toContain('roles')
    })

    it('should throw error for unknown primitive', () => {
      expect(() => generateDocs('unknown')).toThrow('Documentation not found')
    })
  })

  describe('generateDocsIndex', () => {
    it('should generate documentation index', () => {
      const index = generateDocsIndex()

      expect(index).toBeDefined()
      expect(index).toContain('Business-as-Code Documentation')
      expect(index).toContain('8 core primitives')
    })

    it('should include links to all primitives', () => {
      const index = generateDocsIndex()

      expect(index).toContain('$.md')
      expect(index).toContain('ai.md')
      expect(index).toContain('db.md')
      expect(index).toContain('api.md')
      expect(index).toContain('on.md')
      expect(index).toContain('send.md')
      expect(index).toContain('every.md')
      expect(index).toContain('decide.md')
      expect(index).toContain('user.md')
    })

    it('should include quick start examples', () => {
      const index = generateDocsIndex()

      expect(index).toContain('Quick Start')
      expect(index).toContain('Pattern 1: Evaluate Statement')
      expect(index).toContain('Pattern 2: Business Module')
    })

    it('should include security information', () => {
      const index = generateDocsIndex()

      expect(index).toContain('Security')
      expect(index).toContain('Automatic rollback')
      expect(index).toContain('Non-destructive mutations')
    })

    it('should include Code Mode philosophy', () => {
      const index = generateDocsIndex()

      expect(index).toContain('Code Mode')
      expect(index).toContain('LLMs are better at writing code')
    })
  })

  describe('Documentation Content Quality', () => {
    it('should include TypeScript interfaces in all docs', () => {
      const primitives = ['$', 'ai', 'db', 'api', 'on', 'send', 'every', 'decide', 'user']

      for (const primitive of primitives) {
        const docs = generateDocs(primitive)
        expect(docs).toContain('interface')
        expect(docs).toContain('```typescript')
      }
    })

    it('should include usage examples in all docs', () => {
      const primitives = ['$', 'ai', 'db', 'api', 'on', 'send', 'every', 'decide', 'user']

      for (const primitive of primitives) {
        const docs = generateDocs(primitive)
        expect(docs).toContain('@example')
        expect(docs).toContain('```typescript')
      }
    })

    it('should include both usage patterns in $ runtime docs', () => {
      const docs = generateDocs('$')

      expect(docs).toContain('Evaluate Statement')
      expect(docs).toContain('Business Module')
      expect(docs).toContain('export default $ =>')
    })

    it('should use consistent markdown formatting', () => {
      const primitives = ['$', 'ai', 'db', 'api', 'on', 'send', 'every', 'decide', 'user']

      for (const primitive of primitives) {
        const docs = generateDocs(primitive)

        // Should have headers
        expect(docs).toMatch(/^#\s+/m)

        // Should have code blocks
        expect(docs).toContain('```typescript')
        expect(docs).toContain('```')

        // Should have proper JSDoc
        expect(docs).toContain('/**')
        expect(docs).toContain('*/')
      }
    })
  })

  describe('Documentation Completeness', () => {
    it('should document all AI operations', () => {
      const docs = generateDocs('ai')

      expect(docs).toContain('generateText')
      expect(docs).toContain('generate')
      expect(docs).toContain('generateStream')
      expect(docs).toContain('embed')
      expect(docs).toContain('classify')
      expect(docs).toContain('extract')
    })

    it('should document all DB operations', () => {
      const docs = generateDocs('db')

      expect(docs).toContain('find')
      expect(docs).toContain('findOne')
      expect(docs).toContain('create')
      expect(docs).toContain('update')
      expect(docs).toContain('delete')
      expect(docs).toContain('forEvery')
      expect(docs).toContain('count')
    })

    it('should document all API methods', () => {
      const docs = generateDocs('api')

      expect(docs).toContain('get')
      expect(docs).toContain('post')
      expect(docs).toContain('put')
      expect(docs).toContain('patch')
      expect(docs).toContain('delete')
    })

    it('should document event lifecycle events', () => {
      const docs = generateDocs('on')

      expect(docs).toContain('created')
      expect(docs).toContain('updated')
      expect(docs).toContain('deleted')
      expect(docs).toContain('emit')
    })

    it('should document all send operations', () => {
      const docs = generateDocs('send')

      expect(docs).toContain('email')
      expect(docs).toContain('sms')
      expect(docs).toContain('push')
      expect(docs).toContain('webhook')
    })

    it('should document all scheduling intervals', () => {
      const docs = generateDocs('every')

      expect(docs).toContain('minute')
      expect(docs).toContain('hour')
      expect(docs).toContain('day')
      expect(docs).toContain('week')
      expect(docs).toContain('month')
      expect(docs).toContain('year')
    })

    it('should document all decision operations', () => {
      const docs = generateDocs('decide')

      expect(docs).toContain('if')
      expect(docs).toContain('switch')
      expect(docs).toContain('rules')
    })

    it('should document user context properties', () => {
      const docs = generateDocs('user')

      expect(docs).toContain('id')
      expect(docs).toContain('email')
      expect(docs).toContain('name')
      expect(docs).toContain('roles')
      expect(docs).toContain('permissions')
      expect(docs).toContain('hasRole')
      expect(docs).toContain('hasPermission')
    })
  })
})
