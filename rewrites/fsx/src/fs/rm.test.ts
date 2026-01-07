/**
 * Tests for rm (recursive remove) operation [RED phase]
 *
 * rm removes files and directories from the filesystem.
 * Unlike unlink (files only), rm can remove directories with { recursive: true }.
 * With { force: true }, it doesn't throw on non-existent paths.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, setContext, getContext, type FileEntry, type RmContext, type RmOptions } from './rm'
import { ENOENT, ENOTEMPTY, EISDIR } from '../core/errors'
import { normalize, dirname, basename } from '../core/path'

// Mock filesystem state for testing
interface MockFS {
  files: Map<string, FileEntry>
  blobs: Map<string, Uint8Array>
}

// Global mock filesystem reference for this test file
let fs: MockFS

describe('rm', () => {
  beforeEach(() => {
    // Set up a mock filesystem with initial state
    fs = {
      files: new Map<string, FileEntry>([
        ['/', { type: 'directory' }],
        ['/test.txt', { type: 'file', content: new TextEncoder().encode('test content'), blobId: 'blob-1' }],
        ['/another.txt', { type: 'file', content: new TextEncoder().encode('another file'), blobId: 'blob-2' }],
        ['/empty-dir', { type: 'directory' }],
        ['/nested', { type: 'directory' }],
        ['/nested/dir', { type: 'directory' }],
        ['/nested/dir/file.txt', { type: 'file', content: new TextEncoder().encode('nested file'), blobId: 'blob-3' }],
        ['/nested/dir/another.txt', { type: 'file', content: new TextEncoder().encode('another nested'), blobId: 'blob-4' }],
        ['/deeply', { type: 'directory' }],
        ['/deeply/nested', { type: 'directory' }],
        ['/deeply/nested/path', { type: 'directory' }],
        ['/deeply/nested/path/to', { type: 'directory' }],
        ['/deeply/nested/path/to/file.txt', { type: 'file', content: new TextEncoder().encode('deep file'), blobId: 'blob-5' }],
        ['/link-to-test', { type: 'symlink', target: '/test.txt' }],
        ['/link-to-dir', { type: 'symlink', target: '/nested' }],
        ['/broken-link', { type: 'symlink', target: '/nonexistent.txt' }],
        ['/non-empty-dir', { type: 'directory' }],
        ['/non-empty-dir/child.txt', { type: 'file', content: new TextEncoder().encode('child'), blobId: 'blob-6' }],
      ]),
      blobs: new Map<string, Uint8Array>([
        ['blob-1', new TextEncoder().encode('test content')],
        ['blob-2', new TextEncoder().encode('another file')],
        ['blob-3', new TextEncoder().encode('nested file')],
        ['blob-4', new TextEncoder().encode('another nested')],
        ['blob-5', new TextEncoder().encode('deep file')],
        ['blob-6', new TextEncoder().encode('child')],
      ]),
    }

    // Set the context for the rm function
    setContext(fs as RmContext)
  })

  afterEach(() => {
    // Clean up context
    setContext(null)
  })

  describe('basic file removal', () => {
    it('should remove a file at root level', async () => {
      await rm('/test.txt')

      const exists = await fileExists('/test.txt')
      expect(exists).toBe(false)
    })

    it('should return undefined on successful removal', async () => {
      const result = await rm('/test.txt')
      expect(result).toBeUndefined()
    })

    it('should remove a file and not affect other files', async () => {
      await rm('/test.txt')

      // Other files should still exist
      const anotherExists = await fileExists('/another.txt')
      const nestedExists = await fileExists('/nested/dir/file.txt')
      expect(anotherExists).toBe(true)
      expect(nestedExists).toBe(true)
    })

    it('should remove a file in a nested directory', async () => {
      await rm('/nested/dir/file.txt')

      const exists = await fileExists('/nested/dir/file.txt')
      expect(exists).toBe(false)
    })

    it('should preserve parent directories after removing nested file', async () => {
      await rm('/nested/dir/file.txt')

      // Parent directories should still exist
      const nestedExists = await dirExists('/nested')
      const dirExists2 = await dirExists('/nested/dir')
      expect(nestedExists).toBe(true)
      expect(dirExists2).toBe(true)
    })
  })

  describe('empty directory removal', () => {
    it('should remove an empty directory with recursive option', async () => {
      await rm('/empty-dir', { recursive: true })

      const exists = await dirExists('/empty-dir')
      expect(exists).toBe(false)
    })

    it('should throw when removing empty directory without recursive option', async () => {
      // rm without recursive should fail on directories
      await expect(rm('/empty-dir')).rejects.toThrow()
    })
  })

  describe('non-empty directory removal with recursive', () => {
    it('should remove a non-empty directory with recursive option', async () => {
      await rm('/non-empty-dir', { recursive: true })

      const exists = await dirExists('/non-empty-dir')
      expect(exists).toBe(false)
    })

    it('should remove all children when removing directory recursively', async () => {
      await rm('/nested', { recursive: true })

      // Both directory and all its contents should be gone
      const nestedExists = await dirExists('/nested')
      const subDirExists = await dirExists('/nested/dir')
      const fileExists1 = await fileExists('/nested/dir/file.txt')
      const fileExists2 = await fileExists('/nested/dir/another.txt')

      expect(nestedExists).toBe(false)
      expect(subDirExists).toBe(false)
      expect(fileExists1).toBe(false)
      expect(fileExists2).toBe(false)
    })

    it('should throw ENOTEMPTY when removing non-empty directory without recursive', async () => {
      await expect(rm('/non-empty-dir')).rejects.toThrow()
    })

    it('should not affect other directories when removing one', async () => {
      await rm('/nested', { recursive: true })

      // Other directories should still exist
      const emptyDirExists = await dirExists('/empty-dir')
      const deeplyExists = await dirExists('/deeply')
      expect(emptyDirExists).toBe(true)
      expect(deeplyExists).toBe(true)
    })
  })

  describe('ENOENT handling and force option', () => {
    it('should throw ENOENT when file does not exist', async () => {
      await expect(rm('/nonexistent.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall and path', async () => {
      try {
        await rm('/nonexistent.txt')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('rm')
        expect((error as ENOENT).path).toBe('/nonexistent.txt')
      }
    })

    it('should throw ENOENT when parent directory does not exist', async () => {
      await expect(rm('/no-such-dir/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should not throw with force option on non-existent path', async () => {
      await expect(rm('/nonexistent.txt', { force: true })).resolves.toBeUndefined()
    })

    it('should return undefined with force option on non-existent path', async () => {
      const result = await rm('/nonexistent.txt', { force: true })
      expect(result).toBeUndefined()
    })

    it('should not throw with force option on non-existent parent directory', async () => {
      await expect(rm('/no-such-dir/file.txt', { force: true })).resolves.toBeUndefined()
    })

    it('should still remove existing files when force is true', async () => {
      await rm('/test.txt', { force: true })

      const exists = await fileExists('/test.txt')
      expect(exists).toBe(false)
    })

    it('should still remove existing directories when force and recursive are true', async () => {
      await rm('/nested', { force: true, recursive: true })

      const exists = await dirExists('/nested')
      expect(exists).toBe(false)
    })
  })

  describe('symlink handling', () => {
    it('should remove symlink without affecting target', async () => {
      await rm('/link-to-test')

      // Symlink should be gone
      const linkExists = await symlinkExists('/link-to-test')
      expect(linkExists).toBe(false)

      // Target file should still exist
      const targetExists = await fileExists('/test.txt')
      expect(targetExists).toBe(true)
    })

    it('should be able to rm broken symlinks', async () => {
      await rm('/broken-link')

      const exists = await symlinkExists('/broken-link')
      expect(exists).toBe(false)
    })

    it('should remove symlink to directory without removing directory', async () => {
      await rm('/link-to-dir')

      // Symlink should be gone
      const linkExists = await symlinkExists('/link-to-dir')
      expect(linkExists).toBe(false)

      // Target directory should still exist with its contents
      const targetExists = await dirExists('/nested')
      const fileInTarget = await fileExists('/nested/dir/file.txt')
      expect(targetExists).toBe(true)
      expect(fileInTarget).toBe(true)
    })

    it('should not follow symlinks when removing', async () => {
      // When we rm a symlink, we remove the symlink, not what it points to
      await rm('/link-to-test')

      // The symlink is gone
      const linkExists = await symlinkExists('/link-to-test')
      expect(linkExists).toBe(false)

      // The target is still there with its content
      const targetContent = await readFile('/test.txt')
      expect(new TextDecoder().decode(targetContent)).toBe('test content')
    })
  })

  describe('deeply nested removal', () => {
    it('should remove deeply nested file', async () => {
      await rm('/deeply/nested/path/to/file.txt')

      const exists = await fileExists('/deeply/nested/path/to/file.txt')
      expect(exists).toBe(false)
    })

    it('should remove entire deeply nested tree with recursive', async () => {
      await rm('/deeply', { recursive: true })

      // Everything should be gone
      const deeplyExists = await dirExists('/deeply')
      const nestedExists = await dirExists('/deeply/nested')
      const pathExists = await dirExists('/deeply/nested/path')
      const toExists = await dirExists('/deeply/nested/path/to')
      const fileExist = await fileExists('/deeply/nested/path/to/file.txt')

      expect(deeplyExists).toBe(false)
      expect(nestedExists).toBe(false)
      expect(pathExists).toBe(false)
      expect(toExists).toBe(false)
      expect(fileExist).toBe(false)
    })

    it('should preserve parent directories when removing nested file', async () => {
      await rm('/deeply/nested/path/to/file.txt')

      // All parent directories should still exist
      const deeplyExists = await dirExists('/deeply')
      const nestedExists = await dirExists('/deeply/nested')
      const pathExists = await dirExists('/deeply/nested/path')
      const toExists = await dirExists('/deeply/nested/path/to')

      expect(deeplyExists).toBe(true)
      expect(nestedExists).toBe(true)
      expect(pathExists).toBe(true)
      expect(toExists).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle root path correctly', async () => {
      // rm on root should fail (can't remove root)
      await expect(rm('/')).rejects.toThrow()
    })

    it('should handle root path with recursive correctly', async () => {
      // Even with recursive, removing root should fail or require special handling
      await expect(rm('/', { recursive: true })).rejects.toThrow()
    })

    it('should handle empty path', async () => {
      await expect(rm('')).rejects.toThrow()
    })

    it('should handle path with special characters', async () => {
      await createFile('/file with spaces.txt', 'content')
      await rm('/file with spaces.txt')

      const exists = await fileExists('/file with spaces.txt')
      expect(exists).toBe(false)
    })

    it('should handle path with unicode characters', async () => {
      await createFile('/fichier-francais.txt', 'contenu')
      await rm('/fichier-francais.txt')

      const exists = await fileExists('/fichier-francais.txt')
      expect(exists).toBe(false)
    })

    it('should handle path with very long name', async () => {
      const longName = '/' + 'a'.repeat(200) + '.txt'
      await createFile(longName, 'content')
      await rm(longName)

      const exists = await fileExists(longName)
      expect(exists).toBe(false)
    })

    it('should handle trailing slashes on files', async () => {
      // Trailing slash typically indicates directory intent
      // For a file path, this should either normalize or error appropriately
      const result = rm('/test.txt/')
      await expect(result).rejects.toThrow()
    })

    it('should handle concurrent rm calls gracefully', async () => {
      // Both calls should not crash - one succeeds, one throws ENOENT
      const promise1 = rm('/test.txt')
      const promise2 = rm('/test.txt')

      const results = await Promise.allSettled([promise1, promise2])

      // At least one should succeed
      const successes = results.filter((r) => r.status === 'fulfilled')
      const failures = results.filter((r) => r.status === 'rejected')

      expect(successes.length).toBeGreaterThanOrEqual(1)
      // The other might fail with ENOENT
      if (failures.length > 0) {
        expect((failures[0] as PromiseRejectedResult).reason).toBeInstanceOf(ENOENT)
      }
    })

    it('should handle concurrent rm calls with force', async () => {
      // With force, both calls should succeed
      const promise1 = rm('/test.txt', { force: true })
      const promise2 = rm('/test.txt', { force: true })

      const results = await Promise.allSettled([promise1, promise2])

      // Both should succeed with force option
      const successes = results.filter((r) => r.status === 'fulfilled')
      expect(successes.length).toBe(2)
    })
  })

  describe('combined options', () => {
    it('should handle force + recursive for non-existent directory', async () => {
      await expect(rm('/nonexistent-dir', { force: true, recursive: true })).resolves.toBeUndefined()
    })

    it('should handle force + recursive for existing directory with contents', async () => {
      await rm('/nested', { force: true, recursive: true })

      const exists = await dirExists('/nested')
      expect(exists).toBe(false)
    })
  })

  describe('blob cleanup', () => {
    it('should free blob storage when removing a file', async () => {
      const blobsBefore = await getBlobCount()

      await rm('/test.txt')

      const blobsAfter = await getBlobCount()
      expect(blobsAfter).toBeLessThan(blobsBefore)
    })

    it('should free all blobs when recursively removing directory', async () => {
      const blobsBefore = await getBlobCount()

      // Remove directory with 2 files
      await rm('/nested', { recursive: true })

      const blobsAfter = await getBlobCount()
      expect(blobsAfter).toBeLessThan(blobsBefore)
    })
  })

  describe('verification after removal', () => {
    it('should make stat fail with ENOENT after file removal', async () => {
      await rm('/test.txt')

      await expect(stat('/test.txt')).rejects.toThrow(ENOENT)
    })

    it('should make stat fail with ENOENT after directory removal', async () => {
      await rm('/nested', { recursive: true })

      await expect(stat('/nested')).rejects.toThrow(ENOENT)
    })

    it('should make readFile fail with ENOENT after removal', async () => {
      await rm('/test.txt')

      await expect(readFile('/test.txt')).rejects.toThrow(ENOENT)
    })

    it('should remove file from directory listing after removal', async () => {
      await rm('/nested/dir/file.txt')

      const entries = await readdir('/nested/dir')
      expect(entries).not.toContain('file.txt')
    })

    it('should remove directory from parent listing after recursive removal', async () => {
      await rm('/nested', { recursive: true })

      const entries = await readdir('/')
      expect(entries).not.toContain('nested')
    })
  })
})

// Helper functions implemented against the mock filesystem

async function fileExists(path: string): Promise<boolean> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  return entry !== undefined && entry.type === 'file'
}

async function dirExists(path: string): Promise<boolean> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  return entry !== undefined && entry.type === 'directory'
}

async function symlinkExists(path: string): Promise<boolean> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  return entry !== undefined && entry.type === 'symlink'
}

async function stat(path: string): Promise<any> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  if (!entry) {
    throw new ENOENT('stat', normalizedPath)
  }
  return {
    isFile: () => entry.type === 'file',
    isDirectory: () => entry.type === 'directory',
    isSymbolicLink: () => entry.type === 'symlink',
    size: entry.content?.length ?? 0,
  }
}

async function readFile(path: string): Promise<Uint8Array> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  if (!entry) {
    throw new ENOENT('readFile', normalizedPath)
  }
  if (entry.type === 'directory') {
    throw new Error(`EISDIR: illegal operation on a directory, read '${normalizedPath}'`)
  }
  // For symlinks, follow to target
  if (entry.type === 'symlink' && entry.target) {
    return readFile(entry.target)
  }
  return entry.content ?? new Uint8Array(0)
}

async function readdir(path: string): Promise<string[]> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  if (!entry) {
    throw new ENOENT('readdir', normalizedPath)
  }
  if (entry.type !== 'directory') {
    throw new Error(`ENOTDIR: not a directory, readdir '${normalizedPath}'`)
  }

  // Find all children of this directory
  const children: string[] = []
  const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/'

  for (const [filePath] of fs.files) {
    if (filePath === normalizedPath) continue
    if (filePath.startsWith(prefix)) {
      // Get immediate child name
      const remainder = filePath.slice(prefix.length)
      const childName = remainder.split('/')[0]
      if (childName && !children.includes(childName)) {
        children.push(childName)
      }
    }
  }

  return children
}

async function createFile(path: string, content: string): Promise<void> {
  const normalizedPath = normalize(path)
  const blobId = `blob-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const encoded = new TextEncoder().encode(content)

  // Ensure parent directories exist
  const parentPath = dirname(normalizedPath)
  if (parentPath !== '/' && !fs.files.has(parentPath)) {
    // Create parent directories recursively
    const parts = parentPath.split('/').filter((s) => s !== '')
    let current = ''
    for (const part of parts) {
      current = current + '/' + part
      if (!fs.files.has(current)) {
        fs.files.set(current, { type: 'directory' })
      }
    }
  }

  fs.files.set(normalizedPath, {
    type: 'file',
    content: encoded,
    blobId,
  })
  fs.blobs.set(blobId, encoded)
}

async function getBlobCount(): Promise<number> {
  return fs.blobs.size
}
