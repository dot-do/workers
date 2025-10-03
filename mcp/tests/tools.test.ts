import { describe, it, expect } from 'vitest'
import { listTools } from '../src/tools'

describe('Tool Registration', () => {
  it('should register all 20+ tools', () => {
    const tools = listTools(true)
    expect(tools.length).toBeGreaterThanOrEqual(20)
  })

  it('should have unique tool names', () => {
    const tools = listTools(true)
    const names = tools.map(t => t.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('should have valid input schemas', () => {
    const tools = listTools(true)
    tools.forEach(tool => {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    })
  })

  describe('Database Tools', () => {
    it('should register 5 database tools', () => {
      const tools = listTools(true)
      const dbTools = tools.filter(t => t.name.startsWith('db_'))
      expect(dbTools.length).toBe(6) // db_query, db_get, db_list, db_upsert, db_delete, db_search
    })

    it('should have correct database tool schemas', () => {
      const tools = listTools(true)
      const dbQuery = tools.find(t => t.name === 'db_query')

      expect(dbQuery).toBeDefined()
      expect(dbQuery?.inputSchema.properties.sql).toBeDefined()
      expect(dbQuery?.inputSchema.required).toContain('sql')
    })
  })

  describe('AI Tools', () => {
    it('should register 4 AI tools', () => {
      const tools = listTools(true)
      const aiTools = tools.filter(t => t.name.startsWith('ai_'))
      expect(aiTools.length).toBe(4)
    })

    it('should have correct AI tool schemas', () => {
      const tools = listTools(true)
      const aiGenerate = tools.find(t => t.name === 'ai_generate')

      expect(aiGenerate).toBeDefined()
      expect(aiGenerate?.inputSchema.properties.prompt).toBeDefined()
      expect(aiGenerate?.inputSchema.required).toContain('prompt')
    })
  })

  describe('Auth Tools', () => {
    it('should register 4 auth tools', () => {
      const tools = listTools(true)
      const authTools = tools.filter(t => t.name.startsWith('auth_'))
      expect(authTools.length).toBe(4)
    })
  })

  describe('Queue Tools', () => {
    it('should register 3 queue tools', () => {
      const tools = listTools(true)
      const queueTools = tools.filter(t => t.name.startsWith('queue_'))
      expect(queueTools.length).toBe(3)
    })
  })

  describe('Workflow Tools', () => {
    it('should register 3 workflow tools', () => {
      const tools = listTools(true)
      const workflowTools = tools.filter(t => t.name.startsWith('workflow_'))
      expect(workflowTools.length).toBe(3)
    })
  })

  describe('Public vs Authenticated', () => {
    it('should filter tools for anonymous users', () => {
      const publicTools = listTools(false)
      const allTools = listTools(true)

      expect(publicTools.length).toBeLessThan(allTools.length)
      expect(publicTools.every(t => t.name === 'db_search')).toBe(true)
    })

    it('should provide all tools for authenticated users', () => {
      const tools = listTools(true)
      expect(tools.length).toBeGreaterThanOrEqual(20)
    })
  })
})
