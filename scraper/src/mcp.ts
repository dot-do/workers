/**
 * MCP Tools for Scraper Worker
 */

import type { ScraperService } from './index'
import type { ScreenshotOptions } from './types'

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * MCP tools exposed by scraper worker
 */
export const mcpTools: MCPTool[] = [
  {
    name: 'screenshot',
    description: 'Capture a screenshot of a web page. Returns base64-encoded image that Claude can analyze. Supports full-page screenshots, custom viewports, and element selection. Screenshots are cached for 24 hours by default.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to screenshot',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full page screenshot',
          default: false,
        },
        selector: {
          type: 'string',
          description: 'CSS selector to capture specific element',
        },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number', default: 1280 },
            height: { type: 'number', default: 1024 },
          },
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Image format',
          default: 'png',
        },
        quality: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'JPEG quality (0-100)',
          default: 80,
        },
        stealth: {
          type: 'boolean',
          description: 'Use stealth mode for bot-protected sites',
          default: false,
        },
        waitUntil: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
          default: 'domcontentloaded',
        },
        timeout: {
          type: 'number',
          description: 'Maximum timeout in milliseconds',
          default: 30000,
        },
        javascript: {
          type: 'string',
          description: 'JavaScript to execute before screenshot',
        },
        css: {
          type: 'string',
          description: 'CSS to inject before screenshot',
        },
        cache: {
          type: 'boolean',
          description: 'Cache the screenshot',
          default: true,
        },
        cacheTtl: {
          type: 'number',
          description: 'Cache TTL in seconds',
          default: 86400,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'screenshot_clear_cache',
    description: 'Clear the screenshot cache. Optionally provide a URL pattern to clear specific screenshots.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL pattern to match (optional)',
        },
      },
    },
  },
  {
    name: 'screenshot_cleanup_expired',
    description: 'Clean up expired screenshots from the cache. Returns the number of screenshots deleted.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

/**
 * Execute MCP tool call
 */
export async function executeMCPTool(
  toolName: string,
  args: any,
  service: ScraperService
): Promise<any> {
  switch (toolName) {
    case 'screenshot': {
      // Extract URL and build options from flat args
      const { url, ...options } = args
      return await service.screenshot(url, options)
    }

    case 'screenshot_clear_cache':
      return await service.clearCache(args.url)

    case 'screenshot_cleanup_expired':
      return await service.cleanupExpired()

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
