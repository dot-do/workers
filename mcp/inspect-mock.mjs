#!/usr/bin/env node

/**
 * MCP Inspector Launcher for Mock Server
 *
 * This script helps you test the mock MCP server using the MCP Inspector
 */

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8787'
const INSPECTOR_PORT = process.env.INSPECTOR_PORT || 6274

console.log('🚀 MCP Inspector Test Launcher')
console.log('================================')
console.log('')

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/health`)
    const data = await response.json()
    console.log('✅ Mock MCP Server is running')
    console.log(`   Status: ${data.status}`)
    console.log(`   Service: ${data.service}`)
    console.log(`   Version: ${data.version}`)
    console.log('')
    return true
  } catch (error) {
    console.log('❌ Mock MCP Server is not running')
    console.log('')
    console.log('Please start the server first:')
    console.log('  pnpm dev:mock')
    console.log('')
    console.log('Or in another terminal:')
    console.log('  wrangler dev --config wrangler.mock.jsonc')
    console.log('')
    return false
  }
}

// Test MCP connection
async function testMCPConnection() {
  console.log('Testing MCP connection...')
  try {
    // Test initialize
    const initResponse = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {},
        id: 1
      })
    })
    const initData = await initResponse.json()

    if (initData.result?.serverInfo) {
      console.log('✅ MCP Initialize successful')
      console.log(`   Protocol: ${initData.result.protocolVersion}`)
      console.log(`   Server: ${initData.result.serverInfo.name} v${initData.result.serverInfo.version}`)
      console.log('')

      // Test tools/list
      const toolsResponse = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 2
        })
      })
      const toolsData = await toolsResponse.json()

      if (toolsData.result?.tools) {
        console.log('✅ Tools available:')
        toolsData.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description.split('\\n')[0]}`)
        })
        console.log('')
      }

      return true
    } else {
      console.log('❌ MCP Initialize failed')
      console.log(JSON.stringify(initData, null, 2))
      return false
    }
  } catch (error) {
    console.log('❌ MCP Connection test failed:', error.message)
    return false
  }
}

// Launch inspector
async function launchInspector() {
  console.log('🔍 Launching MCP Inspector...')
  console.log('')
  console.log('Inspector Configuration:')
  console.log(`   Server URL: ${SERVER_URL}`)
  console.log(`   Inspector UI: http://localhost:${INSPECTOR_PORT}`)
  console.log('')
  console.log('📝 Usage Instructions:')
  console.log('   1. Open http://localhost:6274 in your browser')
  console.log('   2. The inspector should auto-connect to your mock server')
  console.log('   3. Try the "eval" tool with code examples:')
  console.log('')
  console.log('      Example 1 - Database & AI:')
  console.log('      --------------------------')
  console.log('      const docs = await db.documents.search("machine learning", { limit: 5 });')
  console.log('      const summary = await ai.textGeneration({ prompt: "Summarize these docs" });')
  console.log('      return { found: docs.length, summary };')
  console.log('')
  console.log('      Example 2 - GitHub API:')
  console.log('      ----------------------')
  console.log('      const repos = await api.github.searchRepositories({ query: "mcp" });')
  console.log('      return repos[0];')
  console.log('')
  console.log('      Example 3 - Full Pipeline:')
  console.log('      -------------------------')
  console.log('      const response = await fetch("https://example.com/data");')
  console.log('      const data = await response.json();')
  console.log('      const embedding = await ai.embedding({ text: JSON.stringify(data) });')
  console.log('      await db.documents.put("doc-123", { data, embedding: embedding.data[0] });')
  console.log('      return "Processed and stored";')
  console.log('')
  console.log('Press Ctrl+C to stop the inspector')
  console.log('================================')
  console.log('')

  // The inspector needs to connect via SSE transport
  // We'll use npx to run it with the HTTP URL
  const inspector = spawn('npx', [
    '@modelcontextprotocol/inspector',
    '--transport', 'sse',
    '--url', SERVER_URL
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: INSPECTOR_PORT
    }
  })

  inspector.on('error', (error) => {
    console.error('Failed to start inspector:', error)
    process.exit(1)
  })

  inspector.on('close', (code) => {
    console.log(`\\nInspector exited with code ${code}`)
    process.exit(code || 0)
  })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n\\nShutting down inspector...')
    inspector.kill('SIGINT')
  })
}

// Main
async function main() {
  // Check if server is running
  const serverRunning = await checkServer()
  if (!serverRunning) {
    process.exit(1)
  }

  // Test MCP connection
  const mcpWorking = await testMCPConnection()
  if (!mcpWorking) {
    console.log('⚠️  MCP connection test failed, but continuing anyway...')
    console.log('')
  }

  // Wait a moment
  await setTimeout(1000)

  // Launch inspector
  await launchInspector()
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
