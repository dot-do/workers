/**
 * MCP (Model Context Protocol) server for {{SERVICE_NAME}}
 * @module {{SERVICE_NAME}}/mcp
 */

import type { Env } from './index'
import type { McpTool, McpResource } from '@dot-do/worker-types'

/**
 * MCP tools exposed by this service
 */
const tools: McpTool[] = [
  {
    name: '{{NAMESPACE}}_get_item',
    description: 'Get an item by ID from {{SERVICE_NAME}}',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the item to retrieve',
        },
      },
      required: ['id'],
    },
    handler: async (input: { id: string }) => {
      // TODO: Implement handler
      return { id: input.id, name: 'Example', createdAt: Date.now() }
    },
  },
  {
    name: '{{NAMESPACE}}_list_items',
    description: 'List items from {{SERVICE_NAME}}',
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        limit: {
          type: 'number',
          description: 'Items per page (default: 20, max: 100)',
        },
      },
    },
    handler: async (input: { page?: number; limit?: number }) => {
      // TODO: Implement handler
      return { items: [], total: 0, hasMore: false }
    },
  },
  {
    name: '{{NAMESPACE}}_create_item',
    description: 'Create a new item in {{SERVICE_NAME}}',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the item',
        },
      },
      required: ['name'],
    },
    handler: async (input: { name: string }) => {
      // TODO: Implement handler
      return { id: crypto.randomUUID(), name: input.name, createdAt: Date.now() }
    },
  },
]

/**
 * MCP resources exposed by this service
 */
const resources: McpResource[] = [
  {
    uri: '{{NAMESPACE}}://items',
    name: 'Items List',
    description: 'List of all items in {{SERVICE_NAME}}',
    mimeType: 'application/json',
    handler: async () => {
      // TODO: Implement handler
      return { items: [], total: 0 }
    },
  },
  {
    uri: '{{NAMESPACE}}://items/{id}',
    name: 'Item Details',
    description: 'Details of a specific item',
    mimeType: 'application/json',
    handler: async () => {
      // TODO: Implement handler with ID parameter
      return { id: 'example', name: 'Example', createdAt: Date.now() }
    },
  },
]

/**
 * Creates MCP server instance
 */
export function createMcpServer(env: Env) {
  return {
    tools,
    resources,

    /**
     * Executes an MCP tool
     */
    async executeTool(name: string, input: any) {
      const tool = tools.find((t) => t.name === name)
      if (!tool) {
        throw new Error(`Tool not found: ${name}`)
      }
      return await tool.handler(input)
    },

    /**
     * Gets an MCP resource
     */
    async getResource(uri: string) {
      const resource = resources.find((r) => r.uri === uri)
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`)
      }
      return await resource.handler()
    },

    /**
     * Lists all available tools
     */
    listTools() {
      return tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }))
    },

    /**
     * Lists all available resources
     */
    listResources() {
      return resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }))
    },
  }
}

/**
 * Type definition for the MCP server
 */
export type {{SERVICE_CLASS}}McpServer = ReturnType<typeof createMcpServer>
