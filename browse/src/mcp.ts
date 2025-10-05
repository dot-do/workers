/**
 * MCP Tools for Browse Worker
 *
 * Exposes browser automation capabilities as AI-accessible tools
 */

import type { BrowseService } from './index'
import type { BrowseOptions, BrowserBaseOptions } from './types'

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
 * List of MCP tools exposed by browse worker
 */
export const mcpTools: MCPTool[] = [
  {
    name: 'browse_url',
    description: 'Browse a web page and extract HTML, text content, and optionally take a screenshot using Cloudflare Browser Rendering. Fast and cost-effective for standard browsing.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to browse',
        },
        options: {
          type: 'object',
          description: 'Browse options',
          properties: {
            waitUntil: {
              type: 'string',
              enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
              description: 'Wait condition before returning',
              default: 'domcontentloaded',
            },
            timeout: {
              type: 'number',
              description: 'Maximum timeout in milliseconds',
              default: 30000,
            },
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            screenshot: {
              type: 'object',
              properties: {
                fullPage: { type: 'boolean', default: false },
                format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
                quality: { type: 'number', minimum: 0, maximum: 100 },
              },
            },
            javascript: {
              type: 'string',
              description: 'JavaScript code to execute after page load',
            },
            css: {
              type: 'string',
              description: 'CSS to inject into the page',
            },
            cache: {
              type: 'boolean',
              description: 'Cache the result',
              default: true,
            },
            cacheTtl: {
              type: 'number',
              description: 'Cache TTL in seconds',
              default: 3600,
            },
          },
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'browse_stealth',
    description: 'Browse a web page with advanced stealth mode using BrowserBase. Bypasses bot detection, solves CAPTCHAs automatically, and uses residential proxies. Best for sites with heavy anti-bot protection.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to browse',
        },
        options: {
          type: 'object',
          description: 'Stealth browse options',
          properties: {
            advancedStealth: {
              type: 'boolean',
              description: 'Enable advanced stealth mode (requires Scale plan)',
              default: true,
            },
            proxies: {
              type: 'boolean',
              description: 'Use residential proxies',
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
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            screenshot: {
              type: 'object',
              properties: {
                fullPage: { type: 'boolean' },
                format: { type: 'string', enum: ['png', 'jpeg'] },
                quality: { type: 'number' },
              },
            },
          },
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'browse_clear_cache',
    description: 'Clear the browse cache. Optionally provide a pattern to clear specific cached entries.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern to match cache keys (optional)',
        },
      },
    },
  },
]

/**
 * Execute MCP tool call
 */
export async function executeMCPTool(
  toolName: string,
  args: any,
  service: BrowseService
): Promise<any> {
  switch (toolName) {
    case 'browse_url':
      return await service.browse(args.url, args.options || {})

    case 'browse_stealth':
      return await service.browseStealth(args.url, args.options || {})

    case 'browse_clear_cache':
      return await service.clearCache(args.pattern)

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
