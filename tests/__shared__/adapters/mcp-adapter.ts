/**
 * MCP Adapter - Test via mcp.do MCP server
 */

import type { TestAdapter } from './types'

export interface McpAdapterOptions {
  serverUrl?: string
  accessToken?: string
}

export class McpAdapter implements TestAdapter {
  name = 'mcp.do'
  private client: any
  private options: McpAdapterOptions

  constructor(options: McpAdapterOptions = {}) {
    this.options = {
      serverUrl: options.serverUrl || process.env.MCP_SERVER_URL || 'https://mcp.do',
      accessToken: options.accessToken || process.env.ACCESS_TOKEN,
    }
  }

  async setup(): Promise<void> {
    // Dynamically import MCP client
    try {
      const { createMCPClient } = await import('cli.do')
      this.client = createMCPClient({
        serverUrl: this.options.serverUrl!,
        accessToken: this.options.accessToken,
      })
    } catch (error) {
      throw new Error(`Failed to load MCP client: ${error}`)
    }

    // Verify connection
    try {
      await this.client.getServerInfo()
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`)
    }
  }

  async teardown(): Promise<void> {
    // Nothing to cleanup
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.getServerInfo()
      return true
    } catch {
      return false
    }
  }

  async call(service: string, method: string, input: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setup() first.')
    }

    // MCP uses the universal 'do' tool with TypeScript code
    // Generate code to call the service method
    const inputJson = JSON.stringify(input)
    const code = `return await $.${service}.${method}(${inputJson})`

    const result = await this.client.callTool('do', { code })

    // Parse the result from MCP response format
    if (result.content && result.content[0] && result.content[0].text) {
      return JSON.parse(result.content[0].text)
    }

    throw new Error('Invalid MCP response format')
  }
}
