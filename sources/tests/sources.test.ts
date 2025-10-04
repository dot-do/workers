import { describe, it, expect } from 'vitest'

describe('Sources Service - HATEOAS Unit Tests', () => {
  // Note: Tests for index.ts (SourcesService) require Cloudflare Workers environment
  // These tests focus on the HATEOAS utilities which work in Node.js

  describe('HATEOAS Utilities - Exports', () => {
    it('should export wrapEntity function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.wrapEntity).toBe('function')
    })

    it('should export wrapCollection function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.wrapCollection).toBe('function')
    })

    it('should export wrapError function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.wrapError).toBe('function')
    })

    it('should export getSchemaOrgType function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.getSchemaOrgType).toBe('function')
    })

    it('should export getEntityUrl function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.getEntityUrl).toBe('function')
    })

    it('should export getCollectionUrl function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.getCollectionUrl).toBe('function')
    })

    it('should export generatePaginationLinks function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.generatePaginationLinks).toBe('function')
    })

    it('should export detectRelationships function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.detectRelationships).toBe('function')
    })

    it('should export generateRelationshipLinks function', async () => {
      const hateoas = await import('../src/hateoas')
      expect(typeof hateoas.generateRelationshipLinks).toBe('function')
    })
  })

  describe('HATEOAS Functions - Behavior', () => {
    it('getSchemaOrgType should map known types', async () => {
      const { getSchemaOrgType } = await import('../src/hateoas')
      expect(getSchemaOrgType('SoftwareApplication')).toBe('SoftwareApplication')
      expect(getSchemaOrgType('WebAPI')).toBe('WebAPI')
      expect(getSchemaOrgType('Action')).toBe('Action')
      expect(getSchemaOrgType('DefinedTerm')).toBe('DefinedTerm')
      expect(getSchemaOrgType('Model')).toBe('SoftwareApplication')
    })

    it('getSchemaOrgType should fallback to Thing', async () => {
      const { getSchemaOrgType } = await import('../src/hateoas')
      expect(getSchemaOrgType('UnknownType')).toBe('Thing')
      expect(getSchemaOrgType('RandomStuff')).toBe('Thing')
    })

    it('getEntityUrl should generate correct URL', async () => {
      const { getEntityUrl } = await import('../src/hateoas')
      expect(getEntityUrl('https://sources.do', 'mcp', 'com.anthropic/filesystem'))
        .toBe('https://sources.do/mcp/com.anthropic/filesystem')
    })

    it('getCollectionUrl should generate correct URL', async () => {
      const { getCollectionUrl } = await import('../src/hateoas')
      expect(getCollectionUrl('https://sources.do')).toBe('https://sources.do/resources')
      expect(getCollectionUrl('https://sources.do', { ns: 'mcp' }))
        .toBe('https://sources.do/resources?ns=mcp')
      expect(getCollectionUrl('https://sources.do', { ns: 'api', type: 'WebAPI' }))
        .toBe('https://sources.do/resources?ns=api&type=WebAPI')
    })

    it('detectRelationships should find relationships', async () => {
      const { detectRelationships } = await import('../src/hateoas')
      const data = {
        parentServer: 'com.anthropic/filesystem',
        namespace: 'com.anthropic',
        author: 'user-123',
        tags: ['tag1', 'tag2']
      }
      const rels = detectRelationships(data)
      expect(rels.length).toBeGreaterThan(0)
      expect(rels.some(r => r.predicate === 'parentServer')).toBe(true)
    })

    it('wrapEntity should include HATEOAS metadata', async () => {
      const { wrapEntity } = await import('../src/hateoas')
      const entity = {
        ns: 'mcp',
        id: 'com.anthropic/filesystem',
        type: 'SoftwareApplication',
        data: { name: 'filesystem' }
      }
      const wrapped = wrapEntity(entity, { baseUrl: 'https://sources.do' })
      expect(wrapped['@context']).toBe('https://schema.org')
      expect(wrapped['@type']).toBe('SoftwareApplication')
      expect(wrapped['@id']).toBe('https://sources.do/mcp/com.anthropic/filesystem')
      expect(wrapped._links).toBeDefined()
      expect(wrapped._links.self).toBeDefined()
    })

    it('wrapCollection should include pagination', async () => {
      const { wrapCollection } = await import('../src/hateoas')
      const items = [
        { ns: 'mcp', id: 'server1', type: 'SoftwareApplication', data: {} },
        { ns: 'mcp', id: 'server2', type: 'SoftwareApplication', data: {} }
      ]
      const wrapped = wrapCollection(items, {
        baseUrl: 'https://sources.do',
        pagination: { page: 1, limit: 20, total: 100, hasMore: true }
      })
      expect(wrapped['@type']).toBe('Collection')
      expect(wrapped.items.length).toBe(2)
      expect(wrapped.totalItems).toBe(100)
      expect(wrapped._meta).toBeDefined()
      expect(wrapped._links.next).toBeDefined()
    })

    it('wrapError should include error metadata', async () => {
      const { wrapError } = await import('../src/hateoas')
      const error = {
        code: 'NOT_FOUND',
        message: 'Source not found'
      }
      const wrapped = wrapError(error, { baseUrl: 'https://sources.do', path: '/sources/unknown' })
      expect(wrapped['@type']).toBe('Error')
      expect(wrapped.error.code).toBe('NOT_FOUND')
      expect(wrapped._links.self).toBeDefined()
      expect(wrapped._links.home).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should have typed HATEOAS options', async () => {
      const { wrapEntity } = await import('../src/hateoas')

      // Valid options should compile
      const options = {
        baseUrl: 'https://sources.do',
        contextUrl: 'https://schema.org',
        includeRelationships: true,
        embedRelated: false
      }

      const entity = {
        ns: 'mcp',
        id: 'test',
        type: 'Thing',
        data: {}
      }

      const wrapped = wrapEntity(entity, options)
      expect(wrapped).toBeDefined()
    })
  })

  describe('Service Architecture', () => {
    it('should organize HATEOAS utilities', async () => {
      const hateoas = await import('../src/hateoas')
      expect(hateoas.wrapEntity).toBeDefined()
      expect(hateoas.wrapCollection).toBeDefined()
      expect(hateoas.wrapError).toBeDefined()
      expect(hateoas.getSchemaOrgType).toBeDefined()
      expect(hateoas.getEntityUrl).toBeDefined()
      expect(hateoas.getCollectionUrl).toBeDefined()
    })
  })
})
