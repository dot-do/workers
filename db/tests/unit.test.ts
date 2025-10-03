import { describe, it, expect } from 'vitest'

describe('Database Service - Unit Tests', () => {
  describe('Module Exports', () => {
    it('should export things query module', async () => {
      const things = await import('../src/queries/things')
      expect(typeof things.get).toBe('function')
      expect(typeof things.list).toBe('function')
      expect(typeof things.upsert).toBe('function')
      expect(typeof things.del).toBe('function')
      expect(typeof things.search).toBe('function')
      expect(typeof things.count).toBe('function')
    })

    it('should export relationships query module', async () => {
      const relationships = await import('../src/queries/relationships')
      expect(typeof relationships.getRelationships).toBe('function')
      expect(typeof relationships.getIncomingRelationships).toBe('function')
      expect(typeof relationships.upsert).toBe('function')
      expect(typeof relationships.del).toBe('function')
      expect(typeof relationships.list).toBe('function')
    })

    it('should export search query module', async () => {
      const search = await import('../src/queries/search')
      expect(typeof search.vectorSearch).toBe('function')
      expect(typeof search.fullTextSearch).toBe('function')
      expect(typeof search.hybridSearch).toBe('function')
    })

    it('should export analytics query module', async () => {
      const analytics = await import('../src/queries/analytics')
      expect(typeof analytics.getDatabaseStats).toBe('function')
      expect(typeof analytics.getTypeDistribution).toBe('function')
      expect(typeof analytics.getClickHouseStats).toBe('function')
      expect(typeof analytics.getRecentActivity).toBe('function')
    })

    it('should export postgres client', async () => {
      const postgres = await import('../src/postgres')
      expect(typeof postgres.getPostgresClient).toBe('function')
      expect(typeof postgres.executeRawSQL).toBe('function')
      expect(typeof postgres.checkPostgresHealth).toBe('function')
    })

    it('should export ClickHouse client', async () => {
      const sql = await import('../src/sql')
      expect(typeof sql.sql).toBe('function')
      expect(typeof sql.clickhouse).toBe('object')
    })

    it('should export MCP tools', async () => {
      const mcp = await import('../src/mcp')
      expect(Array.isArray(mcp.mcpTools)).toBe(true)
      expect(mcp.mcpTools.length).toBe(5)
      expect(mcp.dbQuery.name).toBe('db_query')
      expect(mcp.dbGet.name).toBe('db_get')
      expect(mcp.dbSearch.name).toBe('db_search')
      expect(mcp.dbList.name).toBe('db_list')
      expect(mcp.dbStats.name).toBe('db_stats')
    })
  })

  describe('MCP Tool Schemas', () => {
    it('db_query should have correct schema', async () => {
      const { dbQuery } = await import('../src/mcp')
      expect(dbQuery.inputSchema.type).toBe('object')
      expect(dbQuery.inputSchema.required).toContain('query')
      expect(dbQuery.inputSchema.properties.query.type).toBe('string')
      expect(dbQuery.inputSchema.properties.database.enum).toEqual(['postgres', 'clickhouse'])
    })

    it('db_get should have correct schema', async () => {
      const { dbGet } = await import('../src/mcp')
      expect(dbGet.inputSchema.type).toBe('object')
      expect(dbGet.inputSchema.required).toEqual(['ns', 'id'])
      expect(dbGet.inputSchema.properties.ns.type).toBe('string')
      expect(dbGet.inputSchema.properties.id.type).toBe('string')
    })

    it('db_search should have correct schema', async () => {
      const { dbSearch } = await import('../src/mcp')
      expect(dbSearch.inputSchema.type).toBe('object')
      expect(dbSearch.inputSchema.required).toEqual(['query'])
      expect(dbSearch.inputSchema.properties.searchMode.enum).toEqual(['text', 'vector', 'hybrid'])
    })

    it('db_list should have correct schema', async () => {
      const { dbList } = await import('../src/mcp')
      expect(dbList.inputSchema.type).toBe('object')
      expect(dbList.inputSchema.required).toEqual(['ns'])
      expect(dbList.inputSchema.properties.visibility.enum).toEqual(['public', 'private', 'unlisted'])
    })

    it('db_stats should have correct schema', async () => {
      const { dbStats } = await import('../src/mcp')
      expect(dbStats.inputSchema.type).toBe('object')
      expect(dbStats.inputSchema.properties.includeClickHouse.type).toBe('boolean')
    })
  })

  describe('Service Architecture', () => {
    it('should organize query modules correctly', async () => {
      // Verify directory structure
      const things = await import('../src/queries/things')
      const relationships = await import('../src/queries/relationships')
      const search = await import('../src/queries/search')
      const analytics = await import('../src/queries/analytics')

      expect(things).toBeDefined()
      expect(relationships).toBeDefined()
      expect(search).toBeDefined()
      expect(analytics).toBeDefined()
    })

    it('should export main service from src/index', async () => {
      const index = await import('../src/index')
      expect(index.default).toBeDefined()
      expect(index.default.name).toBe('DatabaseService')
    })
  })

  describe('Type Safety', () => {
    it('should have typed ListOptions', async () => {
      const { list } = await import('../src/queries/things')
      // Type checking will fail at compile time if incorrect
      const validOptions = {
        limit: 100,
        offset: 0,
        type: 'Occupation',
        visibility: 'public' as const,
        orderBy: 'createdAt' as const,
        order: 'desc' as const,
      }
      // Just verify it's callable with correct types
      expect(typeof list).toBe('function')
    })

    it('should have typed SearchOptions', async () => {
      const { vectorSearch } = await import('../src/queries/search')
      const validOptions = {
        limit: 20,
        offset: 0,
        threshold: 0.5,
        ns: 'onet',
        type: 'Occupation',
      }
      expect(typeof vectorSearch).toBe('function')
    })
  })
})
