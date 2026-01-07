/**
 * MCP Tools for filesystem operations
 *
 * Model Context Protocol integration for AI-assisted file operations.
 */

import type { FSx } from '../core/fsx.js'

/**
 * MCP Tool definition
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string; enum?: string[] }>
    required?: string[]
  }
}

/**
 * MCP Tool result
 */
export interface McpToolResult {
  content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>
  isError?: boolean
}

/**
 * Filesystem MCP tools
 */
export const fsTools: McpTool[] = [
  {
    name: 'fs_read',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        encoding: { type: 'string', description: 'Encoding (utf-8, base64)', enum: ['utf-8', 'base64'] },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_write',
    description: 'Write content to a file (creates or overwrites)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write' },
        encoding: { type: 'string', description: 'Encoding of content', enum: ['utf-8', 'base64'] },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'fs_append',
    description: 'Append content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file' },
        content: { type: 'string', description: 'Content to append' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'fs_delete',
    description: 'Delete a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to delete' },
        recursive: { type: 'boolean', description: 'Delete directories recursively' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_move',
    description: 'Move or rename a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source path' },
        destination: { type: 'string', description: 'Destination path' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'fs_copy',
    description: 'Copy a file',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source path' },
        destination: { type: 'string', description: 'Destination path' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'fs_list',
    description: 'List files and directories in a path',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        recursive: { type: 'boolean', description: 'List recursively' },
        withDetails: { type: 'boolean', description: 'Include file details (size, modified date)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_mkdir',
    description: 'Create a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to create' },
        recursive: { type: 'boolean', description: 'Create parent directories if needed' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_stat',
    description: 'Get file or directory information',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to get info for' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_exists',
    description: 'Check if a file or directory exists',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to check' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_search',
    description: 'Search for files by name pattern or content',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory to search in' },
        pattern: { type: 'string', description: 'File name pattern (glob)' },
        content: { type: 'string', description: 'Search for files containing this text' },
        recursive: { type: 'boolean', description: 'Search recursively' },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_tree',
    description: 'Get a tree view of directory structure',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Root directory path' },
        depth: { type: 'number', description: 'Maximum depth (default: 3)' },
      },
      required: ['path'],
    },
  },
]

/**
 * Tool handlers
 */
const handlers: Record<string, (fs: FSx, params: Record<string, unknown>) => Promise<McpToolResult>> = {
  async fs_read(fs, params) {
    const path = params.path as string
    const encoding = (params.encoding as string) || 'utf-8'

    try {
      const content = await fs.readFile(path, encoding as any)
      return {
        content: [{ type: 'text', text: typeof content === 'string' ? content : '[binary data]' }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_write(fs, params) {
    const path = params.path as string
    const content = params.content as string
    const encoding = params.encoding as string

    try {
      await fs.writeFile(path, content, { flag: 'w' })
      return {
        content: [{ type: 'text', text: `Successfully wrote to ${path}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_append(fs, params) {
    const path = params.path as string
    const content = params.content as string

    try {
      await fs.appendFile(path, content)
      return {
        content: [{ type: 'text', text: `Successfully appended to ${path}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_delete(fs, params) {
    const path = params.path as string
    const recursive = params.recursive as boolean

    try {
      await fs.rm(path, { recursive, force: true })
      return {
        content: [{ type: 'text', text: `Successfully deleted ${path}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_move(fs, params) {
    const source = params.source as string
    const destination = params.destination as string

    try {
      await fs.rename(source, destination)
      return {
        content: [{ type: 'text', text: `Successfully moved ${source} to ${destination}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_copy(fs, params) {
    const source = params.source as string
    const destination = params.destination as string

    try {
      await fs.copyFile(source, destination)
      return {
        content: [{ type: 'text', text: `Successfully copied ${source} to ${destination}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_list(fs, params) {
    const path = params.path as string
    const recursive = params.recursive as boolean
    const withDetails = params.withDetails as boolean

    try {
      if (withDetails) {
        const entries = (await fs.readdir(path, { withFileTypes: true, recursive })) as any[]
        const lines = entries.map((entry) => {
          const type = entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : '-'
          return `${type} ${entry.name}`
        })
        return {
          content: [{ type: 'text', text: lines.join('\n') || '(empty)' }],
        }
      } else {
        const entries = (await fs.readdir(path, { recursive })) as string[]
        return {
          content: [{ type: 'text', text: entries.join('\n') || '(empty)' }],
        }
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_mkdir(fs, params) {
    const path = params.path as string
    const recursive = params.recursive as boolean

    try {
      await fs.mkdir(path, { recursive })
      return {
        content: [{ type: 'text', text: `Successfully created directory ${path}` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_stat(fs, params) {
    const path = params.path as string

    try {
      const stats = await fs.stat(path)
      const type = stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file'
      const info = [
        `Type: ${type}`,
        `Size: ${stats.size} bytes`,
        `Mode: ${stats.mode.toString(8)}`,
        `Modified: ${stats.mtime.toISOString()}`,
        `Created: ${stats.birthtime.toISOString()}`,
      ]
      return {
        content: [{ type: 'text', text: info.join('\n') }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_exists(fs, params) {
    const path = params.path as string

    try {
      const exists = await fs.exists(path)
      return {
        content: [{ type: 'text', text: exists ? `${path} exists` : `${path} does not exist` }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_search(fs, params) {
    const path = params.path as string
    const pattern = params.pattern as string | undefined
    const content = params.content as string | undefined
    const recursive = params.recursive as boolean

    try {
      const entries = (await fs.readdir(path, { recursive })) as string[]

      let matches = entries
      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
        matches = matches.filter((e) => regex.test(e))
      }

      // Note: content search would need to read each file
      // This is a simplified implementation

      return {
        content: [{ type: 'text', text: matches.join('\n') || 'No matches found' }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },

  async fs_tree(fs, params) {
    const path = params.path as string
    const maxDepth = (params.depth as number) || 3

    try {
      const buildTree = async (currentPath: string, depth: number, prefix: string): Promise<string[]> => {
        if (depth > maxDepth) return []

        const entries = (await fs.readdir(currentPath, { withFileTypes: true })) as any[]
        const lines: string[] = []

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          const isLast = i === entries.length - 1
          const connector = isLast ? '└── ' : '├── '
          const icon = entry.isDirectory() ? '📁' : '📄'

          lines.push(`${prefix}${connector}${icon} ${entry.name}`)

          if (entry.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ')
            const subLines = await buildTree(entry.path, depth + 1, newPrefix)
            lines.push(...subLines)
          }
        }

        return lines
      }

      const tree = await buildTree(path, 1, '')
      const output = `📁 ${path}\n${tree.join('\n')}`

      return {
        content: [{ type: 'text', text: output }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
  },
}

/**
 * Invoke an MCP tool
 */
export async function invokeTool(name: string, params: Record<string, unknown>, fs: FSx): Promise<McpToolResult> {
  const handler = handlers[name]
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    }
  }
  return handler(fs, params)
}

/**
 * Register a custom tool
 */
export function registerTool(
  tool: McpTool & {
    handler: (fs: FSx, params: Record<string, unknown>) => Promise<McpToolResult>
  }
): void {
  fsTools.push(tool)
  handlers[tool.name] = tool.handler
}
