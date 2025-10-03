import { describe, it, expect, beforeAll, vi } from 'vitest'
import DatabaseService from '../src/index'
import { getPostgresClient } from '../src/postgres'
import * as things from '../src/queries/things'
import * as relationships from '../src/queries/relationships'
import * as search from '../src/queries/search'
import * as analytics from '../src/queries/analytics'

describe('DatabaseService', () => {
  let db: DatabaseService
  let mockEnv: Env

  beforeAll(() => {
    // Mock environment
    mockEnv = {
      DB: {} as any,
      pipeline: {} as any,
      kv: {} as any,
      yaml: {} as any,
    }

    // Create service instance
    db = new DatabaseService({} as any, mockEnv)
  })

  describe('RPC Interface', () => {
    it('should have get method', () => {
      expect(typeof db.get).toBe('function')
    })

    it('should have list method', () => {
      expect(typeof db.list).toBe('function')
    })

    it('should have search method', () => {
      expect(typeof db.search).toBe('function')
    })

    it('should have upsert method', () => {
      expect(typeof db.upsert).toBe('function')
    })

    it('should have delete method', () => {
      expect(typeof db.delete).toBe('function')
    })

    it('should have query method', () => {
      expect(typeof db.query).toBe('function')
    })

    it('should have transaction method', () => {
      expect(typeof db.transaction).toBe('function')
    })

    it('should have relationship methods', () => {
      expect(typeof db.getRelationships).toBe('function')
      expect(typeof db.getIncomingRelationships).toBe('function')
      expect(typeof db.upsertRelationship).toBe('function')
      expect(typeof db.deleteRelationship).toBe('function')
      expect(typeof db.listRelationships).toBe('function')
    })

    it('should have analytics methods', () => {
      expect(typeof db.stats).toBe('function')
      expect(typeof db.typeDistribution).toBe('function')
      expect(typeof db.clickhouseStats).toBe('function')
      expect(typeof db.recentActivity).toBe('function')
    })
  })

  describe('HTTP Interface', () => {
    it('should respond to health check', async () => {
      const request = new Request('http://localhost/health')
      const response = await db.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('postgres')
      expect(data).toHaveProperty('clickhouse')
    })

    it('should respond to root endpoint', async () => {
      const request = new Request('http://localhost/')
      const response = await db.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'database')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('interfaces')
      expect(data).toHaveProperty('endpoints')
    })
  })

  describe('Query Modules', () => {
    describe('things', () => {
      it('should export get function', () => {
        expect(typeof things.get).toBe('function')
      })

      it('should export list function', () => {
        expect(typeof things.list).toBe('function')
      })

      it('should export upsert function', () => {
        expect(typeof things.upsert).toBe('function')
      })

      it('should export del function', () => {
        expect(typeof things.del).toBe('function')
      })

      it('should export search function', () => {
        expect(typeof things.search).toBe('function')
      })

      it('should export count function', () => {
        expect(typeof things.count).toBe('function')
      })
    })

    describe('relationships', () => {
      it('should export getRelationships function', () => {
        expect(typeof relationships.getRelationships).toBe('function')
      })

      it('should export getIncomingRelationships function', () => {
        expect(typeof relationships.getIncomingRelationships).toBe('function')
      })

      it('should export upsert function', () => {
        expect(typeof relationships.upsert).toBe('function')
      })

      it('should export del function', () => {
        expect(typeof relationships.del).toBe('function')
      })

      it('should export list function', () => {
        expect(typeof relationships.list).toBe('function')
      })
    })

    describe('search', () => {
      it('should export vectorSearch function', () => {
        expect(typeof search.vectorSearch).toBe('function')
      })

      it('should export fullTextSearch function', () => {
        expect(typeof search.fullTextSearch).toBe('function')
      })

      it('should export hybridSearch function', () => {
        expect(typeof search.hybridSearch).toBe('function')
      })
    })

    describe('analytics', () => {
      it('should export getDatabaseStats function', () => {
        expect(typeof analytics.getDatabaseStats).toBe('function')
      })

      it('should export getTypeDistribution function', () => {
        expect(typeof analytics.getTypeDistribution).toBe('function')
      })

      it('should export getClickHouseStats function', () => {
        expect(typeof analytics.getClickHouseStats).toBe('function')
      })

      it('should export getRecentActivity function', () => {
        expect(typeof analytics.getRecentActivity).toBe('function')
      })
    })
  })

  describe('MCP Tools', () => {
    it('should have MCP tools defined', async () => {
      const { mcpTools } = await import('../src/mcp')
      expect(Array.isArray(mcpTools)).toBe(true)
      expect(mcpTools.length).toBeGreaterThan(0)
    })

    it('should have db_query tool', async () => {
      const { dbQuery } = await import('../src/mcp')
      expect(dbQuery.name).toBe('db_query')
      expect(typeof dbQuery.handler).toBe('function')
    })

    it('should have db_get tool', async () => {
      const { dbGet } = await import('../src/mcp')
      expect(dbGet.name).toBe('db_get')
      expect(typeof dbGet.handler).toBe('function')
    })

    it('should have db_search tool', async () => {
      const { dbSearch } = await import('../src/mcp')
      expect(dbSearch.name).toBe('db_search')
      expect(typeof dbSearch.handler).toBe('function')
    })

    it('should have db_list tool', async () => {
      const { dbList } = await import('../src/mcp')
      expect(dbList.name).toBe('db_list')
      expect(typeof dbList.handler).toBe('function')
    })

    it('should have db_stats tool', async () => {
      const { dbStats } = await import('../src/mcp')
      expect(dbStats.name).toBe('db_stats')
      expect(typeof dbStats.handler).toBe('function')
    })
  })

  describe('Integration', () => {
    it('should initialize without errors', () => {
      expect(db).toBeDefined()
      expect(db).toBeInstanceOf(DatabaseService)
    })

    it('should have all required methods', () => {
      const requiredMethods = [
        'get',
        'list',
        'search',
        'vectorSearch',
        'upsert',
        'delete',
        'query',
        'transaction',
        'getRelationships',
        'getIncomingRelationships',
        'upsertRelationship',
        'deleteRelationship',
        'listRelationships',
        'stats',
        'typeDistribution',
        'clickhouseStats',
        'recentActivity',
        'count',
        'clickhouse',
        'sql',
      ]

      for (const method of requiredMethods) {
        expect(typeof (db as any)[method]).toBe('function')
      }
    })
  })
})

describe('PostgreSQL Client', () => {
  it('should throw error if DATABASE_URL not set', () => {
    // Save original
    const original = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    expect(() => getPostgresClient()).toThrow('DATABASE_URL not configured')

    // Restore
    if (original) process.env.DATABASE_URL = original
  })
})
