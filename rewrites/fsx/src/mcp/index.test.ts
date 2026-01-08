/**
 * Tests for fsx.do MCP connector (RED phase - should fail)
 *
 * These tests verify the MCP tool definitions and handlers for:
 * - fs_read: Read file contents
 * - fs_write: Write content to a file
 * - fs_append: Append content to a file
 * - fs_delete: Delete a file or directory
 * - fs_list: List directory contents
 * - fs_stat: Get file/directory information
 *
 * MCP (Model Context Protocol) integration allows AI assistants to
 * perform filesystem operations through a standardized tool interface.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fsTools, invokeTool, registerTool, type McpTool, type McpToolResult } from './index'
import type { FSx } from '../core/fsx'

/**
 * Create a mock FSx instance for testing
 *
 * The mock tracks calls and provides controllable responses
 */
function createMockFSx(): FSx & { _calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = []

  const mockFiles = new Map<string, { content: string; isDirectory: boolean; size: number; mode: number; mtime: Date; birthtime: Date }>()

  // Pre-populate directories first
  mockFiles.set('/test', {
    content: '',
    isDirectory: true,
    size: 0,
    mode: 0o755,
    mtime: new Date('2026-01-01T00:00:00Z'),
    birthtime: new Date('2026-01-01T00:00:00Z'),
  })

  // Pre-populate some test files
  mockFiles.set('/test/hello.txt', {
    content: 'Hello, World!',
    isDirectory: false,
    size: 13,
    mode: 0o644,
    mtime: new Date('2026-01-01T00:00:00Z'),
    birthtime: new Date('2026-01-01T00:00:00Z'),
  })
  mockFiles.set('/test/empty.txt', {
    content: '',
    isDirectory: false,
    size: 0,
    mode: 0o644,
    mtime: new Date('2026-01-01T00:00:00Z'),
    birthtime: new Date('2026-01-01T00:00:00Z'),
  })
  mockFiles.set('/test/mydir', {
    content: '',
    isDirectory: true,
    size: 0,
    mode: 0o755,
    mtime: new Date('2026-01-01T00:00:00Z'),
    birthtime: new Date('2026-01-01T00:00:00Z'),
  })
  mockFiles.set('/test/mydir/nested.txt', {
    content: 'Nested content',
    isDirectory: false,
    size: 14,
    mode: 0o644,
    mtime: new Date('2026-01-01T00:00:00Z'),
    birthtime: new Date('2026-01-01T00:00:00Z'),
  })

  const mock = {
    _calls: calls,

    async readFile(path: string, encoding?: string): Promise<string | Uint8Array> {
      calls.push({ method: 'readFile', args: [path, encoding] })
      const file = mockFiles.get(path)
      if (!file) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      if (file.isDirectory) {
        const error = new Error(`EISDIR: illegal operation on a directory, read '${path}'`)
        ;(error as any).code = 'EISDIR'
        throw error
      }
      return file.content
    },

    async writeFile(path: string, data: string | Uint8Array, options?: { flag?: string }): Promise<void> {
      calls.push({ method: 'writeFile', args: [path, data, options] })
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
      if (parentPath !== '/' && !mockFiles.has(parentPath)) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      const existing = mockFiles.get(path)
      if (existing?.isDirectory) {
        const error = new Error(`EISDIR: illegal operation on a directory, open '${path}'`)
        ;(error as any).code = 'EISDIR'
        throw error
      }
      const content = typeof data === 'string' ? data : new TextDecoder().decode(data)
      mockFiles.set(path, {
        content,
        isDirectory: false,
        size: content.length,
        mode: 0o644,
        mtime: new Date(),
        birthtime: existing?.birthtime ?? new Date(),
      })
    },

    async appendFile(path: string, data: string | Uint8Array): Promise<void> {
      calls.push({ method: 'appendFile', args: [path, data] })
      const file = mockFiles.get(path)
      if (file?.isDirectory) {
        const error = new Error(`EISDIR: illegal operation on a directory, open '${path}'`)
        ;(error as any).code = 'EISDIR'
        throw error
      }
      const content = typeof data === 'string' ? data : new TextDecoder().decode(data)
      const existingContent = file?.content ?? ''
      mockFiles.set(path, {
        content: existingContent + content,
        isDirectory: false,
        size: existingContent.length + content.length,
        mode: 0o644,
        mtime: new Date(),
        birthtime: file?.birthtime ?? new Date(),
      })
    },

    async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
      calls.push({ method: 'rm', args: [path, options] })
      const file = mockFiles.get(path)
      if (!file && !options?.force) {
        const error = new Error(`ENOENT: no such file or directory, unlink '${path}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      if (file?.isDirectory && !options?.recursive) {
        // Check if directory has children
        const hasChildren = Array.from(mockFiles.keys()).some(
          (p) => p !== path && p.startsWith(path + '/')
        )
        if (hasChildren) {
          const error = new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`)
          ;(error as any).code = 'ENOTEMPTY'
          throw error
        }
      }
      if (options?.recursive) {
        // Remove all children
        for (const p of mockFiles.keys()) {
          if (p === path || p.startsWith(path + '/')) {
            mockFiles.delete(p)
          }
        }
      } else {
        mockFiles.delete(path)
      }
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      calls.push({ method: 'rename', args: [oldPath, newPath] })
      const file = mockFiles.get(oldPath)
      if (!file) {
        const error = new Error(`ENOENT: no such file or directory, rename '${oldPath}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      mockFiles.delete(oldPath)
      mockFiles.set(newPath, file)
    },

    async copyFile(src: string, dest: string): Promise<void> {
      calls.push({ method: 'copyFile', args: [src, dest] })
      const file = mockFiles.get(src)
      if (!file) {
        const error = new Error(`ENOENT: no such file or directory, copyfile '${src}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      if (file.isDirectory) {
        const error = new Error(`EISDIR: illegal operation on a directory, copyfile '${src}'`)
        ;(error as any).code = 'EISDIR'
        throw error
      }
      mockFiles.set(dest, { ...file, birthtime: new Date(), mtime: new Date() })
    },

    async readdir(path: string, options?: { withFileTypes?: boolean; recursive?: boolean }): Promise<string[] | any[]> {
      calls.push({ method: 'readdir', args: [path, options] })
      const dir = mockFiles.get(path)
      if (!dir) {
        const error = new Error(`ENOENT: no such file or directory, scandir '${path}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      if (!dir.isDirectory) {
        const error = new Error(`ENOTDIR: not a directory, scandir '${path}'`)
        ;(error as any).code = 'ENOTDIR'
        throw error
      }

      const entries: string[] = []
      const prefix = path === '/' ? '/' : path + '/'

      for (const p of mockFiles.keys()) {
        if (p === path) continue
        if (!p.startsWith(prefix)) continue

        const relativePath = p.slice(prefix.length)
        if (!options?.recursive && relativePath.includes('/')) continue

        entries.push(options?.recursive ? relativePath : relativePath.split('/')[0])
      }

      // Remove duplicates (for non-recursive, parent dirs might be listed multiple times)
      const uniqueEntries = [...new Set(entries)]

      if (options?.withFileTypes) {
        return uniqueEntries.map((name) => {
          const fullPath = prefix + name
          const file = mockFiles.get(fullPath)
          return {
            name,
            path: fullPath,
            isDirectory: () => file?.isDirectory ?? false,
            isFile: () => !file?.isDirectory,
            isSymbolicLink: () => false,
          }
        })
      }

      return uniqueEntries
    },

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      calls.push({ method: 'mkdir', args: [path, options] })
      if (mockFiles.has(path)) {
        const error = new Error(`EEXIST: file already exists, mkdir '${path}'`)
        ;(error as any).code = 'EEXIST'
        throw error
      }
      mockFiles.set(path, {
        content: '',
        isDirectory: true,
        size: 0,
        mode: 0o755,
        mtime: new Date(),
        birthtime: new Date(),
      })
    },

    async stat(path: string): Promise<any> {
      calls.push({ method: 'stat', args: [path] })
      const file = mockFiles.get(path)
      if (!file) {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`)
        ;(error as any).code = 'ENOENT'
        throw error
      }
      return {
        size: file.size,
        mode: file.mode | (file.isDirectory ? 0o40000 : 0o100000),
        mtime: file.mtime,
        birthtime: file.birthtime,
        isDirectory: () => file.isDirectory,
        isFile: () => !file.isDirectory,
        isSymbolicLink: () => false,
      }
    },

    async exists(path: string): Promise<boolean> {
      calls.push({ method: 'exists', args: [path] })
      return mockFiles.has(path)
    },
  } as unknown as FSx & { _calls: Array<{ method: string; args: unknown[] }> }

  return mock
}

describe('MCP Tool Definitions', () => {
  describe('fsTools array', () => {
    it('should export an array of tool definitions', () => {
      expect(Array.isArray(fsTools)).toBe(true)
      expect(fsTools.length).toBeGreaterThan(0)
    })

    it('should include fs_read tool', () => {
      const readTool = fsTools.find((t) => t.name === 'fs_read')
      expect(readTool).toBeDefined()
      expect(readTool?.description).toContain('Read')
    })

    it('should include fs_write tool', () => {
      const writeTool = fsTools.find((t) => t.name === 'fs_write')
      expect(writeTool).toBeDefined()
      expect(writeTool?.description).toContain('Write')
    })

    it('should include fs_append tool', () => {
      const appendTool = fsTools.find((t) => t.name === 'fs_append')
      expect(appendTool).toBeDefined()
      expect(appendTool?.description).toContain('Append')
    })

    it('should include fs_delete tool', () => {
      const deleteTool = fsTools.find((t) => t.name === 'fs_delete')
      expect(deleteTool).toBeDefined()
      expect(deleteTool?.description).toContain('Delete')
    })

    it('should include fs_list tool', () => {
      const listTool = fsTools.find((t) => t.name === 'fs_list')
      expect(listTool).toBeDefined()
      expect(listTool?.description).toContain('List')
    })

    it('should include fs_stat tool', () => {
      const statTool = fsTools.find((t) => t.name === 'fs_stat')
      expect(statTool).toBeDefined()
      expect(statTool?.description).toContain('information')
    })

    it('should have valid inputSchema for each tool', () => {
      for (const tool of fsTools) {
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
      }
    })

    it('should have required path parameter for file operations', () => {
      const fileOps = ['fs_read', 'fs_write', 'fs_delete', 'fs_list', 'fs_stat']
      for (const opName of fileOps) {
        const tool = fsTools.find((t) => t.name === opName)
        expect(tool?.inputSchema.required).toContain('path')
      }
    })
  })

  describe('tool schema validation', () => {
    it('fs_read should have path and encoding properties', () => {
      const tool = fsTools.find((t) => t.name === 'fs_read')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.path.type).toBe('string')
      expect(tool?.inputSchema.properties.encoding).toBeDefined()
    })

    it('fs_write should have path, content, and encoding properties', () => {
      const tool = fsTools.find((t) => t.name === 'fs_write')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.content).toBeDefined()
      expect(tool?.inputSchema.required).toContain('path')
      expect(tool?.inputSchema.required).toContain('content')
    })

    it('fs_append should have path and content properties', () => {
      const tool = fsTools.find((t) => t.name === 'fs_append')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.content).toBeDefined()
      expect(tool?.inputSchema.required).toContain('path')
      expect(tool?.inputSchema.required).toContain('content')
    })

    it('fs_delete should have path and recursive properties', () => {
      const tool = fsTools.find((t) => t.name === 'fs_delete')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.recursive).toBeDefined()
      expect(tool?.inputSchema.properties.recursive.type).toBe('boolean')
    })

    it('fs_list should have path, recursive, and withDetails properties', () => {
      const tool = fsTools.find((t) => t.name === 'fs_list')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.recursive).toBeDefined()
      expect(tool?.inputSchema.properties.withDetails).toBeDefined()
    })

    it('fs_stat should have path property', () => {
      const tool = fsTools.find((t) => t.name === 'fs_stat')
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.required).toContain('path')
    })
  })
})

describe('fs_read handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should read file contents as text', async () => {
    const result = await invokeTool('fs_read', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe('Hello, World!')
  })

  it('should read empty file', async () => {
    const result = await invokeTool('fs_read', { path: '/test/empty.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect(result.content[0].type).toBe('text')
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe('')
  })

  it('should return error for non-existent file', async () => {
    const result = await invokeTool('fs_read', { path: '/nonexistent/file.txt' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should return error when path is a directory', async () => {
    const result = await invokeTool('fs_read', { path: '/test/mydir' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should support utf-8 encoding', async () => {
    const result = await invokeTool('fs_read', { path: '/test/hello.txt', encoding: 'utf-8' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe('Hello, World!')
  })

  it('should call FSx.readFile with correct parameters', async () => {
    await invokeTool('fs_read', { path: '/test/hello.txt', encoding: 'utf-8' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'readFile',
      args: ['/test/hello.txt', 'utf-8'],
    })
  })
})

describe('fs_write handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should write content to a new file', async () => {
    const result = await invokeTool('fs_write', { path: '/test/new.txt', content: 'New content' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should overwrite existing file', async () => {
    const result = await invokeTool('fs_write', { path: '/test/hello.txt', content: 'Overwritten' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should return error when writing to a directory', async () => {
    const result = await invokeTool('fs_write', { path: '/test/mydir', content: 'content' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should return error when parent directory does not exist', async () => {
    const result = await invokeTool('fs_write', { path: '/nonexistent/dir/file.txt', content: 'content' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should call FSx.writeFile with correct parameters', async () => {
    await invokeTool('fs_write', { path: '/test/new.txt', content: 'New content' }, mockFs)

    expect(mockFs._calls.some((c) => c.method === 'writeFile' && c.args[0] === '/test/new.txt')).toBe(true)
  })

  it('should write empty content', async () => {
    const result = await invokeTool('fs_write', { path: '/test/blank.txt', content: '' }, mockFs)

    expect(result.isError).toBeFalsy()
  })

  it('should handle unicode content', async () => {
    const unicodeContent = 'Hello, World!'
    const result = await invokeTool('fs_write', { path: '/test/unicode.txt', content: unicodeContent }, mockFs)

    expect(result.isError).toBeFalsy()
  })
})

describe('fs_append handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should append content to existing file', async () => {
    const result = await invokeTool('fs_append', { path: '/test/hello.txt', content: ' Appended!' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should create file if it does not exist', async () => {
    const result = await invokeTool('fs_append', { path: '/test/newappend.txt', content: 'First content' }, mockFs)

    expect(result.isError).toBeFalsy()
  })

  it('should return error when appending to a directory', async () => {
    const result = await invokeTool('fs_append', { path: '/test/mydir', content: 'content' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should call FSx.appendFile with correct parameters', async () => {
    await invokeTool('fs_append', { path: '/test/hello.txt', content: ' More' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'appendFile',
      args: ['/test/hello.txt', ' More'],
    })
  })

  it('should append empty content (no change)', async () => {
    const result = await invokeTool('fs_append', { path: '/test/hello.txt', content: '' }, mockFs)

    expect(result.isError).toBeFalsy()
  })

  it('should append multiline content', async () => {
    const multiline = '\nLine 2\nLine 3'
    const result = await invokeTool('fs_append', { path: '/test/hello.txt', content: multiline }, mockFs)

    expect(result.isError).toBeFalsy()
  })
})

describe('fs_delete handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should delete a file', async () => {
    const result = await invokeTool('fs_delete', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should return error for non-existent file without force', async () => {
    const result = await invokeTool('fs_delete', { path: '/nonexistent/file.txt' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should delete empty directory', async () => {
    // First need to delete nested file to make mydir empty
    await invokeTool('fs_delete', { path: '/test/mydir/nested.txt' }, mockFs)
    const result = await invokeTool('fs_delete', { path: '/test/mydir' }, mockFs)

    expect(result.isError).toBeFalsy()
  })

  it('should fail to delete non-empty directory without recursive', async () => {
    const result = await invokeTool('fs_delete', { path: '/test/mydir', recursive: false }, mockFs)

    expect(result.isError).toBe(true)
  })

  it('should delete directory recursively', async () => {
    const result = await invokeTool('fs_delete', { path: '/test/mydir', recursive: true }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should call FSx.rm with correct parameters', async () => {
    await invokeTool('fs_delete', { path: '/test/hello.txt', recursive: true }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'rm',
      args: ['/test/hello.txt', { recursive: true, force: true }],
    })
  })
})

describe('fs_list handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should list directory contents', async () => {
    const result = await invokeTool('fs_list', { path: '/test' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect(result.content[0].type).toBe('text')
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('hello.txt')
    expect(text).toContain('mydir')
  })

  it('should return error for non-existent directory', async () => {
    const result = await invokeTool('fs_list', { path: '/nonexistent' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should return error when path is a file', async () => {
    const result = await invokeTool('fs_list', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBe(true)
  })

  it('should list recursively when recursive=true', async () => {
    const result = await invokeTool('fs_list', { path: '/test', recursive: true }, mockFs)

    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('nested.txt')
  })

  it('should include file details when withDetails=true', async () => {
    const result = await invokeTool('fs_list', { path: '/test', withDetails: true }, mockFs)

    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: 'text'; text: string }).text
    // Should include type indicator (d for directory, - for file)
    expect(text).toMatch(/[d-]/)
  })

  it('should return "(empty)" for empty directory', async () => {
    // Create an empty directory first
    await mockFs.mkdir('/test/emptydir')
    const result = await invokeTool('fs_list', { path: '/test/emptydir' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe('(empty)')
  })

  it('should call FSx.readdir with correct parameters', async () => {
    await invokeTool('fs_list', { path: '/test', recursive: true, withDetails: true }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'readdir',
      args: ['/test', { withFileTypes: true, recursive: true }],
    })
  })
})

describe('fs_stat handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should return file stats', async () => {
    const result = await invokeTool('fs_stat', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect(result.content[0].type).toBe('text')
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('Type: file')
    expect(text).toContain('Size:')
  })

  it('should return directory stats', async () => {
    const result = await invokeTool('fs_stat', { path: '/test/mydir' }, mockFs)

    expect(result.isError).toBeFalsy()
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('Type: directory')
  })

  it('should return error for non-existent path', async () => {
    const result = await invokeTool('fs_stat', { path: '/nonexistent/file.txt' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should include file size in output', async () => {
    const result = await invokeTool('fs_stat', { path: '/test/hello.txt' }, mockFs)

    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('13 bytes') // "Hello, World!" is 13 bytes
  })

  it('should include file mode in output', async () => {
    const result = await invokeTool('fs_stat', { path: '/test/hello.txt' }, mockFs)

    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('Mode:')
  })

  it('should include timestamps in output', async () => {
    const result = await invokeTool('fs_stat', { path: '/test/hello.txt' }, mockFs)

    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toContain('Modified:')
    expect(text).toContain('Created:')
  })

  it('should call FSx.stat with correct parameters', async () => {
    await invokeTool('fs_stat', { path: '/test/hello.txt' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'stat',
      args: ['/test/hello.txt'],
    })
  })
})

describe('invokeTool error handling', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should return error for unknown tool name', async () => {
    const result = await invokeTool('unknown_tool', {}, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Unknown tool')
  })

  it('should handle missing required parameters gracefully', async () => {
    const result = await invokeTool('fs_read', {}, mockFs)

    // Should either throw or return error
    expect(result.isError).toBe(true)
  })

  it('should handle FSx errors and return error result', async () => {
    const result = await invokeTool('fs_read', { path: '/nonexistent' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })
})

describe('registerTool', () => {
  it('should add a custom tool to fsTools array', () => {
    const initialCount = fsTools.length

    registerTool({
      name: 'fs_custom',
      description: 'Custom test tool',
      inputSchema: {
        type: 'object',
        properties: {
          test: { type: 'string' },
        },
      },
      handler: async () => ({
        content: [{ type: 'text', text: 'Custom result' }],
      }),
    })

    expect(fsTools.length).toBe(initialCount + 1)
    expect(fsTools.find((t) => t.name === 'fs_custom')).toBeDefined()
  })

  it('should make custom tool invokable', async () => {
    registerTool({
      name: 'fs_test_invoke',
      description: 'Test invokable tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (fs, params) => ({
        content: [{ type: 'text', text: `Invoked with ${JSON.stringify(params)}` }],
      }),
    })

    const mockFs = createMockFSx()
    const result = await invokeTool('fs_test_invoke', { foo: 'bar' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('foo')
  })
})

describe('fs_move handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should move/rename a file', async () => {
    const result = await invokeTool('fs_move', { source: '/test/hello.txt', destination: '/test/renamed.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should return error for non-existent source', async () => {
    const result = await invokeTool('fs_move', { source: '/nonexistent.txt', destination: '/test/dest.txt' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should call FSx.rename with correct parameters', async () => {
    await invokeTool('fs_move', { source: '/test/hello.txt', destination: '/test/moved.txt' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'rename',
      args: ['/test/hello.txt', '/test/moved.txt'],
    })
  })
})

describe('fs_copy handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should copy a file', async () => {
    const result = await invokeTool('fs_copy', { source: '/test/hello.txt', destination: '/test/hello-copy.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should return error for non-existent source', async () => {
    const result = await invokeTool('fs_copy', { source: '/nonexistent.txt', destination: '/test/dest.txt' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should return error when copying a directory', async () => {
    const result = await invokeTool('fs_copy', { source: '/test/mydir', destination: '/test/mydir-copy' }, mockFs)

    expect(result.isError).toBe(true)
  })

  it('should call FSx.copyFile with correct parameters', async () => {
    await invokeTool('fs_copy', { source: '/test/hello.txt', destination: '/test/copied.txt' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'copyFile',
      args: ['/test/hello.txt', '/test/copied.txt'],
    })
  })
})

describe('fs_mkdir handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should create a directory', async () => {
    const result = await invokeTool('fs_mkdir', { path: '/test/newdir' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Successfully')
  })

  it('should return error when directory already exists', async () => {
    const result = await invokeTool('fs_mkdir', { path: '/test/mydir' }, mockFs)

    expect(result.isError).toBe(true)
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('Error')
  })

  it('should call FSx.mkdir with correct parameters', async () => {
    await invokeTool('fs_mkdir', { path: '/test/newdir', recursive: true }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'mkdir',
      args: ['/test/newdir', { recursive: true }],
    })
  })
})

describe('fs_exists handler', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should return exists message for existing file', async () => {
    const result = await invokeTool('fs_exists', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('exists')
  })

  it('should return does not exist message for non-existent file', async () => {
    const result = await invokeTool('fs_exists', { path: '/nonexistent.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('does not exist')
  })

  it('should call FSx.exists with correct parameters', async () => {
    await invokeTool('fs_exists', { path: '/test/hello.txt' }, mockFs)

    expect(mockFs._calls).toContainEqual({
      method: 'exists',
      args: ['/test/hello.txt'],
    })
  })
})

describe('MCP result format', () => {
  let mockFs: ReturnType<typeof createMockFSx>

  beforeEach(() => {
    mockFs = createMockFSx()
  })

  it('should return content array with text type for successful operations', async () => {
    const result = await invokeTool('fs_read', { path: '/test/hello.txt' }, mockFs)

    expect(result.content).toBeDefined()
    expect(Array.isArray(result.content)).toBe(true)
    expect(result.content[0].type).toBe('text')
  })

  it('should return isError=true for error results', async () => {
    const result = await invokeTool('fs_read', { path: '/nonexistent' }, mockFs)

    expect(result.isError).toBe(true)
  })

  it('should not set isError for successful operations', async () => {
    const result = await invokeTool('fs_read', { path: '/test/hello.txt' }, mockFs)

    expect(result.isError).toBeFalsy()
  })

  it('should include error message in text content for errors', async () => {
    const result = await invokeTool('fs_read', { path: '/nonexistent' }, mockFs)

    const textContent = result.content[0] as { type: 'text'; text: string }
    expect(textContent.text).toContain('Error')
  })
})
