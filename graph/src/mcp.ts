/**
 * MCP Tools for Graph Service
 *
 * Exposes Things & Relationships operations as tools for AI agents
 */

import type { Thing, Relationship } from '@do/graph-types'

/**
 * MCP Tool definitions
 */
export const mcpTools = [
  // ============================================================
  // THING TOOLS
  // ============================================================

  {
    name: 'graph_create_thing',
    description: 'Create a new thing (entity) in the graph',
    inputSchema: {
      type: 'object',
      properties: {
        ns: {
          type: 'string',
          description: 'Namespace (e.g., "onet.org", "en.wikipedia.org")',
        },
        id: {
          type: 'string',
          description: 'Unique identifier within namespace',
        },
        type: {
          type: 'string',
          description: 'Entity type (e.g., "occupation", "skill", "page")',
        },
        data: {
          type: 'object',
          description: 'Flexible structured data (JSON)',
        },
        content: {
          type: 'string',
          description: 'Main content (markdown, text, description)',
        },
        code: {
          type: 'string',
          description: 'Extracted code/ESM (optional)',
        },
      },
      required: ['ns', 'id', 'type'],
    },
  },

  {
    name: 'graph_get_thing',
    description: 'Get a thing by namespace and identifier',
    inputSchema: {
      type: 'object',
      properties: {
        ns: {
          type: 'string',
          description: 'Namespace',
        },
        id: {
          type: 'string',
          description: 'Identifier',
        },
      },
      required: ['ns', 'id'],
    },
  },

  {
    name: 'graph_query_things',
    description: 'Query things with filters',
    inputSchema: {
      type: 'object',
      properties: {
        ns: {
          type: 'string',
          description: 'Filter by namespace',
        },
        type: {
          type: 'string',
          description: 'Filter by type',
        },
        contentLike: {
          type: 'string',
          description: 'Search content (LIKE query)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 100)',
          default: 100,
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
          default: 0,
        },
      },
    },
  },

  // ============================================================
  // RELATIONSHIP TOOLS
  // ============================================================

  {
    name: 'graph_create_relationship',
    description: 'Create a relationship between two things',
    inputSchema: {
      type: 'object',
      properties: {
        fromNs: {
          type: 'string',
          description: 'Source namespace',
        },
        fromId: {
          type: 'string',
          description: 'Source identifier',
        },
        fromType: {
          type: 'string',
          description: 'Source type (optional)',
        },
        predicate: {
          type: 'string',
          description: 'Relationship type (e.g., "requires_skill", "part_of")',
        },
        reverse: {
          type: 'string',
          description: 'Reverse predicate (e.g., "required_by", "contains")',
        },
        toNs: {
          type: 'string',
          description: 'Target namespace',
        },
        toId: {
          type: 'string',
          description: 'Target identifier',
        },
        data: {
          type: 'object',
          description: 'Relationship metadata',
        },
        strength: {
          type: 'number',
          description: 'Relationship strength (0-1 or custom scale)',
        },
      },
      required: ['fromNs', 'fromId', 'predicate', 'toNs', 'toId'],
    },
  },

  {
    name: 'graph_get_inbound_relationships',
    description: 'Get relationships pointing TO a thing (most common query, optimized by index)',
    inputSchema: {
      type: 'object',
      properties: {
        toNs: {
          type: 'string',
          description: 'Target namespace',
        },
        toId: {
          type: 'string',
          description: 'Target identifier',
        },
        predicate: {
          type: 'string',
          description: 'Filter by relationship type (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 100)',
          default: 100,
        },
      },
      required: ['toNs', 'toId'],
    },
  },

  {
    name: 'graph_get_outbound_relationships',
    description: 'Get relationships pointing FROM a thing',
    inputSchema: {
      type: 'object',
      properties: {
        fromNs: {
          type: 'string',
          description: 'Source namespace',
        },
        fromId: {
          type: 'string',
          description: 'Source identifier',
        },
        predicate: {
          type: 'string',
          description: 'Filter by relationship type (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 100)',
          default: 100,
        },
      },
      required: ['fromNs', 'fromId'],
    },
  },

  {
    name: 'graph_query_relationships',
    description: 'Query relationships with complex filters',
    inputSchema: {
      type: 'object',
      properties: {
        fromNs: {
          type: 'string',
          description: 'Filter by source namespace',
        },
        fromId: {
          type: 'string',
          description: 'Filter by source identifier',
        },
        predicate: {
          type: 'string',
          description: 'Filter by relationship type',
        },
        toNs: {
          type: 'string',
          description: 'Filter by target namespace',
        },
        toId: {
          type: 'string',
          description: 'Filter by target identifier',
        },
        minStrength: {
          type: 'number',
          description: 'Minimum relationship strength',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 100)',
          default: 100,
        },
      },
    },
  },

  // ============================================================
  // GRAPH TRAVERSAL TOOLS
  // ============================================================

  {
    name: 'graph_get_related_things',
    description: 'Get all things related to a thing (both inbound and outbound)',
    inputSchema: {
      type: 'object',
      properties: {
        ns: {
          type: 'string',
          description: 'Thing namespace',
        },
        id: {
          type: 'string',
          description: 'Thing identifier',
        },
        predicate: {
          type: 'string',
          description: 'Filter by relationship type (optional)',
        },
        direction: {
          type: 'string',
          enum: ['inbound', 'outbound', 'both'],
          description: 'Direction to traverse (default: both)',
          default: 'both',
        },
        limit: {
          type: 'number',
          description: 'Maximum results per direction (default: 100)',
          default: 100,
        },
      },
      required: ['ns', 'id'],
    },
  },

  {
    name: 'graph_find_path',
    description: 'Find a path between two things in the graph',
    inputSchema: {
      type: 'object',
      properties: {
        fromNs: {
          type: 'string',
          description: 'Source namespace',
        },
        fromId: {
          type: 'string',
          description: 'Source identifier',
        },
        toNs: {
          type: 'string',
          description: 'Target namespace',
        },
        toId: {
          type: 'string',
          description: 'Target identifier',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum path depth (default: 5)',
          default: 5,
        },
        predicates: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by relationship types (optional)',
        },
      },
      required: ['fromNs', 'fromId', 'toNs', 'toId'],
    },
  },
]

/**
 * Example usage with MCP server
 *
 * ```typescript
 * import { mcpTools } from './mcp.js'
 *
 * // Register tools with MCP server
 * for (const tool of mcpTools) {
 *   server.tool(tool)
 * }
 * ```
 */
