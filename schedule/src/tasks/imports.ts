/**
 * Import Tasks
 * Scheduled data import tasks from external sources
 */

import type { Env, TaskHandler } from '../types'

/**
 * Import MCP servers from registry
 * Runs: Daily at 2am
 */
export const importMCPServers: TaskHandler = async (env: Env) => {
  console.log('[Import] Starting MCP servers import...')

  try {
    // Call load service to import MCP data
    const result = await env.LOAD_SERVICE.importMCP()

    console.log(`[Import] ✅ MCP servers imported:`, {
      servers: result.servers?.length || 0,
      tools: result.tools?.length || 0,
    })

    return {
      success: true,
      serversImported: result.servers?.length || 0,
      toolsImported: result.tools?.length || 0,
    }
  } catch (error) {
    console.error('[Import] ❌ MCP import failed:', error)
    throw error
  }
}

/**
 * Import public APIs from directories
 * Runs: Daily at 3am
 */
export const importPublicAPIs: TaskHandler = async (env: Env) => {
  console.log('[Import] Starting public APIs import...')

  try {
    // Call load service to import API data
    const result = await env.LOAD_SERVICE.importAPIs()

    console.log(`[Import] ✅ Public APIs imported:`, {
      apis: result.apis?.length || 0,
      categories: result.categories?.length || 0,
    })

    return {
      success: true,
      apisImported: result.apis?.length || 0,
      categoriesImported: result.categories?.length || 0,
    }
  } catch (error) {
    console.error('[Import] ❌ API import failed:', error)
    throw error
  }
}

/**
 * Import all external data sources
 * Runs: Weekly on Sunday at 4am (comprehensive refresh)
 */
export const importAllSources: TaskHandler = async (env: Env) => {
  console.log('[Import] Starting comprehensive import of all sources...')

  const results = {
    mcp: null as any,
    apis: null as any,
    models: null as any,
  }

  try {
    // Import MCP servers
    console.log('[Import] 1/3 Importing MCP servers...')
    results.mcp = await importMCPServers(env)

    // Import public APIs
    console.log('[Import] 2/3 Importing public APIs...')
    results.apis = await importPublicAPIs(env)

    // Import models (existing task)
    console.log('[Import] 3/3 Importing models...')
    const models = await env.LOAD_SERVICE.models()
    results.models = { success: true, modelsImported: models?.length || 0 }

    console.log('[Import] ✅ All sources imported successfully:', {
      mcpServers: results.mcp.serversImported,
      mcpTools: results.mcp.toolsImported,
      apis: results.apis.apisImported,
      apiCategories: results.apis.categoriesImported,
      models: results.models.modelsImported,
    })

    return {
      success: true,
      ...results,
    }
  } catch (error) {
    console.error('[Import] ❌ Comprehensive import failed:', error)
    throw error
  }
}

/**
 * Verify imported data integrity
 * Runs: Daily at 5am (after imports complete)
 */
export const verifyImportedData: TaskHandler = async (env: Env) => {
  console.log('[Import] Verifying imported data integrity...')

  try {
    const issues: string[] = []

    // Check MCP servers
    const mcpServers = await env.DB_SERVICE.query({
      table: 'things',
      where: { ns: 'mcp', type: 'SoftwareApplication' },
      limit: 1,
    })
    if (!mcpServers || mcpServers.length === 0) {
      issues.push('No MCP servers found in database')
    }

    // Check APIs
    const apis = await env.DB_SERVICE.query({
      table: 'things',
      where: { ns: 'api', type: 'WebAPI' },
      limit: 1,
    })
    if (!apis || apis.length === 0) {
      issues.push('No APIs found in database')
    }

    // Check models
    const models = await env.DB_SERVICE.query({
      table: 'things',
      where: { ns: 'models.do', type: 'Model' },
      limit: 1,
    })
    if (!models || models.length === 0) {
      issues.push('No models found in database')
    }

    if (issues.length > 0) {
      console.warn('[Import] ⚠️  Data integrity issues:', issues)
      return {
        success: false,
        issues,
      }
    }

    console.log('[Import] ✅ Data integrity verified')
    return {
      success: true,
      issues: [],
    }
  } catch (error) {
    console.error('[Import] ❌ Data verification failed:', error)
    throw error
  }
}
