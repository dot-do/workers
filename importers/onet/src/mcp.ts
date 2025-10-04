/**
 * MCP Tools for ONET Importer
 *
 * Exposes ONET import operations as tools for AI agents
 */

/**
 * MCP Tool definitions
 */
export const mcpTools = [
  {
    name: 'import_onet_mdx',
    description: 'Import ONET occupation data from parsed MDX files into graph database',
    inputSchema: {
      type: 'object',
      properties: {
        mdxFiles: {
          type: 'array',
          description: 'Array of parsed MDX files with type and data properties',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['occupation', 'skill', 'knowledge', 'ability', 'technology'],
                description: 'Type of ONET entity',
              },
              data: {
                type: 'object',
                description: 'Entity data (varies by type)',
              },
              content: {
                type: 'string',
                description: 'Optional markdown content',
              },
              code: {
                type: 'string',
                description: 'Optional code content',
              },
            },
            required: ['type', 'data'],
          },
        },
      },
      required: ['mdxFiles'],
    },
  },
  {
    name: 'import_onet_r2',
    description: 'Import ONET data from R2 bucket containing MDX files',
    inputSchema: {
      type: 'object',
      properties: {
        bucket: {
          type: 'string',
          description: 'R2 bucket name',
        },
        prefix: {
          type: 'string',
          description: 'Optional prefix for MDX files (e.g., "onet/")',
        },
      },
      required: ['bucket'],
    },
  },
  {
    name: 'import_onet_url',
    description: 'Import ONET data from a URL pointing to data archive',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to ONET data archive',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_onet_status',
    description: 'Get current ONET import status and database statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear_onet_data',
    description: 'Clear all ONET data from the graph database (WARNING: destructive operation)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]
