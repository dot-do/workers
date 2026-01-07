/**
 * Tests for unlink (file deletion) operation [GREEN phase]
 *
 * unlink removes a file from the filesystem. It does NOT remove directories
 * (use rmdir for that). For symlinks, it removes the symlink itself, not the target.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { unlink, setContext, getContext, type FileEntry, type UnlinkContext } from './unlink'
import { ENOENT, EISDIR } from '../core/errors'
import { normalize, dirname, basename } from '../core/path'

// Mock filesystem state for testing
interface MockFS {
  files: Map<string, FileEntry>
  blobs: Map<string, Uint8Array>
}

// Global mock filesystem reference for this test file
let fs: MockFS

describe('unlink', () => {
  beforeEach(() => {
    // Set up a mock filesystem with some initial state
    fs = {
      files: new Map<string, FileEntry>([
        ['/', { type: 'directory' }],
        ['/test.txt', { type: 'file', content: new TextEncoder().encode('test content'), blobId: 'blob-1' }],
        ['/nested', { type: 'directory' }],
        ['/nested/dir', { type: 'directory' }],
        ['/nested/dir/file.txt', { type: 'file', content: new TextEncoder().encode('nested file'), blobId: 'blob-2' }],
        ['/empty-dir', { type: 'directory' }],
        ['/link-to-test', { type: 'symlink', target: '/test.txt' }],
        ['/broken-link', { type: 'symlink', target: '/nonexistent.txt' }],
      ]),
      blobs: new Map<string, Uint8Array>([
        ['blob-1', new TextEncoder().encode('test content')],
        ['blob-2', new TextEncoder().encode('nested file')],
      ]),
    }

    // Set the context for the unlink function
    setContext(fs as UnlinkContext)
  })

  afterEach(() => {
    // Clean up context
    setContext(null)
  })

  describe('happy path: delete existing file', () => {
    it('should delete a file at root level', async () => {
      await unlink('/test.txt')

      // File should no longer exist after unlink
      const exists = await fileExists('/test.txt')
      expect(exists).toBe(false)
    })

    it('should return undefined on successful deletion', async () => {
      const result = await unlink('/test.txt')
      expect(result).toBeUndefined()
    })

    it('should delete a file and not affect other files', async () => {
      await unlink('/test.txt')

      // Other files should still exist
      const nestedExists = await fileExists('/nested/dir/file.txt')
      expect(nestedExists).toBe(true)
    })
  })

  describe('ENOENT: file does not exist', () => {
    it('should throw ENOENT when file does not exist', async () => {
      await expect(unlink('/nonexistent.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall', async () => {
      try {
        await unlink('/nonexistent.txt')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('unlink')
        expect((error as ENOENT).path).toBe('/nonexistent.txt')
      }
    })

    it('should throw ENOENT when parent directory does not exist', async () => {
      await expect(unlink('/no-such-dir/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for deeply nested nonexistent path', async () => {
      await expect(unlink('/a/b/c/d/e/f/file.txt')).rejects.toThrow(ENOENT)
    })
  })

  describe('EISDIR: path is a directory', () => {
    it('should throw EISDIR when path is a directory', async () => {
      await expect(unlink('/empty-dir')).rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR with correct syscall and path', async () => {
      try {
        await unlink('/nested')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(EISDIR)
        expect((error as EISDIR).syscall).toBe('unlink')
        expect((error as EISDIR).path).toBe('/nested')
      }
    })

    it('should throw EISDIR for nested directory', async () => {
      await expect(unlink('/nested/dir')).rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR even for empty directories', async () => {
      // unlink should never work on directories, use rmdir instead
      await expect(unlink('/empty-dir')).rejects.toThrow(EISDIR)
    })
  })

  describe('delete file in nested directory', () => {
    it('should delete a file in a nested directory', async () => {
      await unlink('/nested/dir/file.txt')

      const exists = await fileExists('/nested/dir/file.txt')
      expect(exists).toBe(false)
    })

    it('should preserve parent directories after deleting nested file', async () => {
      await unlink('/nested/dir/file.txt')

      // Parent directories should still exist
      const nestedExists = await dirExists('/nested')
      const dirExists2 = await dirExists('/nested/dir')
      expect(nestedExists).toBe(true)
      expect(dirExists2).toBe(true)
    })

    it('should handle deeply nested file deletion', async () => {
      // First create a deeply nested file
      await createFile('/a/b/c/d/deep.txt', 'deep content')

      await unlink('/a/b/c/d/deep.txt')

      const exists = await fileExists('/a/b/c/d/deep.txt')
      expect(exists).toBe(false)
    })
  })

  describe('delete then verify file is gone', () => {
    it('should make stat fail with ENOENT after deletion', async () => {
      await unlink('/test.txt')

      // Attempting to stat the deleted file should throw ENOENT
      await expect(stat('/test.txt')).rejects.toThrow(ENOENT)
    })

    it('should make readFile fail with ENOENT after deletion', async () => {
      await unlink('/test.txt')

      // Attempting to read the deleted file should throw ENOENT
      await expect(readFile('/test.txt')).rejects.toThrow(ENOENT)
    })

    it('should remove file from directory listing after deletion', async () => {
      await unlink('/nested/dir/file.txt')

      const entries = await readdir('/nested/dir')
      expect(entries).not.toContain('file.txt')
    })

    it('should free blob storage after file deletion', async () => {
      // Get blob reference count before deletion
      const blobsBefore = await getBlobCount()

      await unlink('/test.txt')

      // Blob should be freed (or marked for garbage collection)
      const blobsAfter = await getBlobCount()
      expect(blobsAfter).toBeLessThan(blobsBefore)
    })
  })

  describe('unlink symlink', () => {
    it('should remove symlink without affecting target', async () => {
      await unlink('/link-to-test')

      // Symlink should be gone
      const linkExists = await fileExists('/link-to-test')
      expect(linkExists).toBe(false)

      // Target file should still exist
      const targetExists = await fileExists('/test.txt')
      expect(targetExists).toBe(true)
    })

    it('should be able to unlink broken symlinks', async () => {
      // Broken symlinks should still be unlinkable
      await unlink('/broken-link')

      const exists = await fileExists('/broken-link')
      expect(exists).toBe(false)
    })

    it('should not follow symlinks when unlinking', async () => {
      // When we unlink a symlink, we remove the symlink, not what it points to
      await unlink('/link-to-test')

      // The symlink is gone
      const linkExists = await symlinkExists('/link-to-test')
      expect(linkExists).toBe(false)

      // The target is still there
      const targetContent = await readFile('/test.txt')
      expect(new TextDecoder().decode(targetContent)).toBe('test content')
    })

    it('should preserve target content after unlinking symlink', async () => {
      const contentBefore = new TextDecoder().decode(await readFile('/test.txt'))

      await unlink('/link-to-test')

      const contentAfter = new TextDecoder().decode(await readFile('/test.txt'))
      expect(contentAfter).toBe(contentBefore)
    })
  })

  describe('edge cases', () => {
    it('should handle unlinking file with special characters in name', async () => {
      await createFile('/file with spaces.txt', 'content')
      await unlink('/file with spaces.txt')

      const exists = await fileExists('/file with spaces.txt')
      expect(exists).toBe(false)
    })

    it('should handle unlinking file with unicode characters', async () => {
      await createFile('/fichier-francais.txt', 'contenu')
      await unlink('/fichier-francais.txt')

      const exists = await fileExists('/fichier-francais.txt')
      expect(exists).toBe(false)
    })

    it('should handle unlinking file with very long name', async () => {
      const longName = '/' + 'a'.repeat(200) + '.txt'
      await createFile(longName, 'content')
      await unlink(longName)

      const exists = await fileExists(longName)
      expect(exists).toBe(false)
    })

    it('should handle concurrent unlink calls gracefully', async () => {
      // Both calls should not crash - one succeeds, one throws ENOENT
      const promise1 = unlink('/test.txt')
      const promise2 = unlink('/test.txt')

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

    it('should handle root path correctly', async () => {
      // Attempting to unlink root should throw EISDIR (root is a directory)
      await expect(unlink('/')).rejects.toThrow(EISDIR)
    })

    it('should handle empty path', async () => {
      // Empty path should throw an error (ENOENT or similar)
      await expect(unlink('')).rejects.toThrow()
    })

    it('should handle trailing slashes', async () => {
      // Trailing slash typically indicates directory, should throw EISDIR or normalize
      // Behavior may vary - this tests the implementation handles it consistently
      const result = unlink('/test.txt/')
      // Should either succeed (after normalizing) or throw appropriate error
      await expect(result).rejects.toThrow()
    })
  })

  describe('callback-style API compatibility', () => {
    it('should support callback API if implemented', async () => {
      // This tests if there's a callback-style API alongside promises
      // Skip if only promise API is supported
      const callbackUnlink = (unlink as any).callback
      if (typeof callbackUnlink !== 'function') {
        // No callback API - test passes (optional feature)
        return
      }

      // Wrap callback in promise for testing
      await new Promise<void>((resolve, reject) => {
        callbackUnlink('/test.txt', (err: Error | null) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
  })
})

// Helper functions implemented against the mock filesystem

async function fileExists(path: string): Promise<boolean> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  return entry !== undefined && entry.type !== 'directory'
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
    throw new EISDIR('readFile', normalizedPath)
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
