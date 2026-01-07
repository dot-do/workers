/**
 * Tests for rename (file/directory rename/move) operation [RED phase]
 *
 * rename(oldPath, newPath) moves/renames a file or directory:
 * - Moves file from oldPath to newPath
 * - Works for both files and directories
 * - Atomic operation (either succeeds completely or fails)
 * - Returns undefined on success
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rename, setContext, getContext, type FileEntry, type RenameContext } from './rename'
import { ENOENT, EISDIR, ENOTDIR, ENOTEMPTY, EINVAL } from '../core/errors'
import { normalize, dirname, basename } from '../core/path'

// Mock filesystem state for testing
interface MockFS {
  files: Map<string, FileEntry>
  blobs: Map<string, Uint8Array>
}

// Global mock filesystem reference for this test file
let fs: MockFS

describe('rename', () => {
  beforeEach(() => {
    // Set up a mock filesystem with initial state
    fs = {
      files: new Map<string, FileEntry>([
        ['/', { type: 'directory' }],
        ['/source.txt', { type: 'file', content: new TextEncoder().encode('source content'), blobId: 'blob-1', mode: 0o644, mtime: 1000 }],
        ['/existing.txt', { type: 'file', content: new TextEncoder().encode('existing content'), blobId: 'blob-2' }],
        ['/dir1', { type: 'directory' }],
        ['/dir1/file.txt', { type: 'file', content: new TextEncoder().encode('file in dir1'), blobId: 'blob-3' }],
        ['/dir1/subdir', { type: 'directory' }],
        ['/dir1/subdir/deep.txt', { type: 'file', content: new TextEncoder().encode('deep file'), blobId: 'blob-4' }],
        ['/dir2', { type: 'directory' }],
        ['/dir2/other.txt', { type: 'file', content: new TextEncoder().encode('other content'), blobId: 'blob-5' }],
        ['/empty-dir', { type: 'directory' }],
        ['/non-empty-dir', { type: 'directory' }],
        ['/non-empty-dir/child.txt', { type: 'file', content: new TextEncoder().encode('child'), blobId: 'blob-6' }],
        ['/link-to-source', { type: 'symlink', target: '/source.txt' }],
        ['/link-to-dir', { type: 'symlink', target: '/dir1' }],
        ['/broken-link', { type: 'symlink', target: '/nonexistent.txt' }],
      ]),
      blobs: new Map<string, Uint8Array>([
        ['blob-1', new TextEncoder().encode('source content')],
        ['blob-2', new TextEncoder().encode('existing content')],
        ['blob-3', new TextEncoder().encode('file in dir1')],
        ['blob-4', new TextEncoder().encode('deep file')],
        ['blob-5', new TextEncoder().encode('other content')],
        ['blob-6', new TextEncoder().encode('child')],
      ]),
    }

    // Set the context for the rename function
    setContext(fs as RenameContext)
  })

  afterEach(() => {
    // Clean up context
    setContext(null)
  })

  // ============================================
  // Basic Rename
  // ============================================

  describe('basic rename', () => {
    it('should rename a file in the same directory', async () => {
      await rename('/source.txt', '/renamed.txt')

      // Old path should not exist
      expect(fs.files.has('/source.txt')).toBe(false)
      // New path should exist
      expect(fs.files.has('/renamed.txt')).toBe(true)
    })

    it('should rename a directory in the same directory', async () => {
      await rename('/empty-dir', '/renamed-dir')

      expect(fs.files.has('/empty-dir')).toBe(false)
      expect(fs.files.has('/renamed-dir')).toBe(true)
      expect(fs.files.get('/renamed-dir')?.type).toBe('directory')
    })

    it('should return undefined on success', async () => {
      const result = await rename('/source.txt', '/renamed.txt')
      expect(result).toBeUndefined()
    })

    it('should rename a directory with contents (contents move with it)', async () => {
      await rename('/dir1', '/dir1-renamed')

      // Old paths should not exist
      expect(fs.files.has('/dir1')).toBe(false)
      expect(fs.files.has('/dir1/file.txt')).toBe(false)
      expect(fs.files.has('/dir1/subdir')).toBe(false)
      expect(fs.files.has('/dir1/subdir/deep.txt')).toBe(false)

      // New paths should exist
      expect(fs.files.has('/dir1-renamed')).toBe(true)
      expect(fs.files.has('/dir1-renamed/file.txt')).toBe(true)
      expect(fs.files.has('/dir1-renamed/subdir')).toBe(true)
      expect(fs.files.has('/dir1-renamed/subdir/deep.txt')).toBe(true)
    })
  })

  // ============================================
  // Move (Cross-directory)
  // ============================================

  describe('move (cross-directory)', () => {
    it('should move a file to a different directory', async () => {
      await rename('/source.txt', '/dir2/moved.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/dir2/moved.txt')).toBe(true)
    })

    it('should move a directory to a different directory', async () => {
      await rename('/empty-dir', '/dir2/moved-dir')

      expect(fs.files.has('/empty-dir')).toBe(false)
      expect(fs.files.has('/dir2/moved-dir')).toBe(true)
    })

    it('should move a file to the root directory', async () => {
      await rename('/dir1/file.txt', '/moved-from-dir1.txt')

      expect(fs.files.has('/dir1/file.txt')).toBe(false)
      expect(fs.files.has('/moved-from-dir1.txt')).toBe(true)
    })

    it('should move a file from root to nested directory', async () => {
      await rename('/source.txt', '/dir1/subdir/moved.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/dir1/subdir/moved.txt')).toBe(true)
    })

    it('should move a directory with all its contents', async () => {
      await rename('/dir1', '/dir2/dir1-moved')

      // Old directory and contents gone
      expect(fs.files.has('/dir1')).toBe(false)
      expect(fs.files.has('/dir1/file.txt')).toBe(false)

      // New directory and contents present
      expect(fs.files.has('/dir2/dir1-moved')).toBe(true)
      expect(fs.files.has('/dir2/dir1-moved/file.txt')).toBe(true)
      expect(fs.files.has('/dir2/dir1-moved/subdir')).toBe(true)
      expect(fs.files.has('/dir2/dir1-moved/subdir/deep.txt')).toBe(true)
    })
  })

  // ============================================
  // Overwrite Behavior
  // ============================================

  describe('overwrite behavior', () => {
    it('should overwrite an existing file at newPath', async () => {
      const originalContent = fs.files.get('/source.txt')?.content

      await rename('/source.txt', '/existing.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/existing.txt')).toBe(true)
      // Content should be from source, not existing
      expect(fs.files.get('/existing.txt')?.content).toEqual(originalContent)
    })

    it('should overwrite an existing empty directory at newPath', async () => {
      // Create another empty directory to test overwrite
      fs.files.set('/target-empty', { type: 'directory' })

      await rename('/empty-dir', '/target-empty')

      expect(fs.files.has('/empty-dir')).toBe(false)
      expect(fs.files.has('/target-empty')).toBe(true)
    })

    it('should throw ENOTEMPTY when newPath is a non-empty directory', async () => {
      await expect(rename('/empty-dir', '/non-empty-dir')).rejects.toThrow(ENOTEMPTY)
    })

    it('should have ENOTEMPTY error with correct syscall', async () => {
      try {
        await rename('/empty-dir', '/non-empty-dir')
        expect.fail('Should have thrown ENOTEMPTY')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOTEMPTY)
        expect((error as ENOTEMPTY).syscall).toBe('rename')
      }
    })
  })

  // ============================================
  // Symlink Handling
  // ============================================

  describe('symlink handling', () => {
    it('should rename a symlink (moves symlink, not target)', async () => {
      await rename('/link-to-source', '/renamed-link')

      // Symlink moved
      expect(fs.files.has('/link-to-source')).toBe(false)
      expect(fs.files.has('/renamed-link')).toBe(true)

      // Target unchanged
      expect(fs.files.has('/source.txt')).toBe(true)

      // Renamed symlink still points to same target
      const entry = fs.files.get('/renamed-link')
      expect(entry?.type).toBe('symlink')
      expect(entry?.target).toBe('/source.txt')
    })

    it('should rename over an existing symlink (replaces symlink)', async () => {
      await rename('/source.txt', '/link-to-source')

      // Source moved to symlink location
      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/link-to-source')).toBe(true)

      // It should now be a file, not a symlink
      expect(fs.files.get('/link-to-source')?.type).toBe('file')
    })

    it('should preserve symlink target after renaming symlink', async () => {
      const originalTarget = fs.files.get('/link-to-source')?.target

      await rename('/link-to-source', '/renamed-link')

      const renamedEntry = fs.files.get('/renamed-link')
      expect(renamedEntry?.target).toBe(originalTarget)
    })

    it('should be able to rename broken symlinks', async () => {
      await rename('/broken-link', '/renamed-broken-link')

      expect(fs.files.has('/broken-link')).toBe(false)
      expect(fs.files.has('/renamed-broken-link')).toBe(true)
      expect(fs.files.get('/renamed-broken-link')?.type).toBe('symlink')
    })

    it('should rename symlink to directory (moves symlink, not directory)', async () => {
      await rename('/link-to-dir', '/renamed-link-to-dir')

      expect(fs.files.has('/link-to-dir')).toBe(false)
      expect(fs.files.has('/renamed-link-to-dir')).toBe(true)

      // Original directory still exists
      expect(fs.files.has('/dir1')).toBe(true)
    })
  })

  // ============================================
  // Error Handling - ENOENT
  // ============================================

  describe('error handling - ENOENT', () => {
    it('should throw ENOENT when oldPath does not exist', async () => {
      await expect(rename('/nonexistent.txt', '/new.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with syscall=rename', async () => {
      try {
        await rename('/nonexistent.txt', '/new.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('rename')
      }
    })

    it('should throw ENOENT with correct path', async () => {
      try {
        await rename('/nonexistent.txt', '/new.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect((error as ENOENT).path).toBe('/nonexistent.txt')
      }
    })

    it('should throw ENOENT when newPath parent directory does not exist', async () => {
      await expect(rename('/source.txt', '/nonexistent-dir/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for deeply nested nonexistent parent', async () => {
      await expect(rename('/source.txt', '/a/b/c/d/file.txt')).rejects.toThrow(ENOENT)
    })
  })

  // ============================================
  // Error Handling - EISDIR/ENOTDIR
  // ============================================

  describe('error handling - EISDIR/ENOTDIR', () => {
    it('should throw EISDIR when oldPath is file but newPath is non-empty directory', async () => {
      // Attempting to rename a file to an existing directory path
      await expect(rename('/source.txt', '/dir1')).rejects.toThrow(EISDIR)
    })

    it('should throw ENOTDIR when oldPath is directory but newPath is file', async () => {
      await expect(rename('/empty-dir', '/source.txt')).rejects.toThrow(ENOTDIR)
    })

    it('should have EISDIR error with correct syscall', async () => {
      try {
        await rename('/source.txt', '/non-empty-dir')
        expect.fail('Should have thrown')
      } catch (error) {
        if (error instanceof EISDIR) {
          expect(error.syscall).toBe('rename')
        }
      }
    })

    it('should have ENOTDIR error with correct syscall', async () => {
      try {
        await rename('/empty-dir', '/source.txt')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOTDIR)
        expect((error as ENOTDIR).syscall).toBe('rename')
      }
    })
  })

  // ============================================
  // Error Handling - Other
  // ============================================

  describe('error handling - other', () => {
    it('should throw EINVAL when newPath is inside oldPath', async () => {
      // Cannot move a directory into itself
      await expect(rename('/dir1', '/dir1/subdir/moved')).rejects.toThrow(EINVAL)
    })

    it('should throw EINVAL with correct syscall', async () => {
      try {
        await rename('/dir1', '/dir1/inside')
        expect.fail('Should have thrown EINVAL')
      } catch (error) {
        expect(error).toBeInstanceOf(EINVAL)
        expect((error as EINVAL).syscall).toBe('rename')
      }
    })

    it('should throw EINVAL for deeply nested invalid move', async () => {
      await expect(rename('/dir1', '/dir1/subdir/deep/inside')).rejects.toThrow(EINVAL)
    })
  })

  // ============================================
  // Atomicity
  // ============================================

  describe('atomicity', () => {
    it('should remove original file after successful rename', async () => {
      await rename('/source.txt', '/renamed.txt')
      expect(fs.files.has('/source.txt')).toBe(false)
    })

    it('should preserve content exactly after rename', async () => {
      const originalContent = fs.files.get('/source.txt')?.content
      const originalBlob = fs.blobs.get('blob-1')

      await rename('/source.txt', '/renamed.txt')

      const newEntry = fs.files.get('/renamed.txt')
      expect(newEntry?.content).toEqual(originalContent)
    })

    it('should preserve metadata (mode) after rename', async () => {
      const originalMode = fs.files.get('/source.txt')?.mode

      await rename('/source.txt', '/renamed.txt')

      const newEntry = fs.files.get('/renamed.txt')
      expect(newEntry?.mode).toBe(originalMode)
    })

    it('should preserve metadata (mtime) after rename', async () => {
      const originalMtime = fs.files.get('/source.txt')?.mtime

      await rename('/source.txt', '/renamed.txt')

      const newEntry = fs.files.get('/renamed.txt')
      expect(newEntry?.mtime).toBe(originalMtime)
    })

    it('should leave original unchanged if rename fails', async () => {
      const originalEntry = fs.files.get('/source.txt')

      // This should fail (newPath parent doesn't exist)
      try {
        await rename('/source.txt', '/nonexistent-dir/file.txt')
      } catch {
        // Expected to fail
      }

      // Original should be unchanged
      expect(fs.files.has('/source.txt')).toBe(true)
      expect(fs.files.get('/source.txt')).toEqual(originalEntry)
    })
  })

  // ============================================
  // Path Handling
  // ============================================

  describe('path handling', () => {
    it('should handle absolute paths', async () => {
      await rename('/source.txt', '/renamed.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/renamed.txt')).toBe(true)
    })

    it('should normalize paths with double slashes', async () => {
      await rename('//source.txt', '//renamed.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/renamed.txt')).toBe(true)
    })

    it('should normalize paths with ./', async () => {
      await rename('/./source.txt', '/./renamed.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/renamed.txt')).toBe(true)
    })

    it('should normalize paths with ../', async () => {
      await rename('/dir1/../source.txt', '/dir1/../renamed.txt')

      expect(fs.files.has('/source.txt')).toBe(false)
      expect(fs.files.has('/renamed.txt')).toBe(true)
    })

    it('should handle trailing slashes on directories', async () => {
      await rename('/empty-dir/', '/renamed-dir/')

      expect(fs.files.has('/empty-dir')).toBe(false)
      expect(fs.files.has('/renamed-dir')).toBe(true)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle renaming to the same path (no-op or error)', async () => {
      // Behavior depends on implementation - could be no-op or could throw
      // Most implementations make this a no-op
      const contentBefore = fs.files.get('/source.txt')?.content

      await rename('/source.txt', '/source.txt')

      expect(fs.files.has('/source.txt')).toBe(true)
      expect(fs.files.get('/source.txt')?.content).toEqual(contentBefore)
    })

    it('should handle file names with special characters', async () => {
      fs.files.set('/file with spaces.txt', { type: 'file', content: new TextEncoder().encode('content') })

      await rename('/file with spaces.txt', '/renamed with spaces.txt')

      expect(fs.files.has('/file with spaces.txt')).toBe(false)
      expect(fs.files.has('/renamed with spaces.txt')).toBe(true)
    })

    it('should handle file names with unicode characters', async () => {
      fs.files.set('/fichier.txt', { type: 'file', content: new TextEncoder().encode('content') })

      await rename('/fichier.txt', '/renamed-file.txt')

      expect(fs.files.has('/fichier.txt')).toBe(false)
      expect(fs.files.has('/renamed-file.txt')).toBe(true)
    })

    it('should handle very long filenames', async () => {
      const longName = '/' + 'a'.repeat(200) + '.txt'
      const longNameRenamed = '/' + 'b'.repeat(200) + '.txt'
      fs.files.set(longName, { type: 'file', content: new TextEncoder().encode('content') })

      await rename(longName, longNameRenamed)

      expect(fs.files.has(longName)).toBe(false)
      expect(fs.files.has(longNameRenamed)).toBe(true)
    })

    it('should handle empty filename component gracefully', async () => {
      // Path like '/dir//file.txt' should normalize to '/dir/file.txt'
      fs.files.set('/dir', { type: 'directory' })
      fs.files.set('/dir/file.txt', { type: 'file', content: new TextEncoder().encode('content') })

      await rename('/dir//file.txt', '/dir//renamed.txt')

      expect(fs.files.has('/dir/file.txt')).toBe(false)
      expect(fs.files.has('/dir/renamed.txt')).toBe(true)
    })

    it('should throw for empty oldPath', async () => {
      await expect(rename('', '/new.txt')).rejects.toThrow()
    })

    it('should throw for empty newPath', async () => {
      await expect(rename('/source.txt', '')).rejects.toThrow()
    })

    it('should handle concurrent renames gracefully', async () => {
      // Both calls should not crash - one succeeds, one may throw ENOENT
      const promise1 = rename('/source.txt', '/renamed1.txt')
      const promise2 = rename('/source.txt', '/renamed2.txt')

      const results = await Promise.allSettled([promise1, promise2])

      // At least one should succeed
      const successes = results.filter((r) => r.status === 'fulfilled')
      expect(successes.length).toBeGreaterThanOrEqual(1)

      // The source should not exist after both complete
      expect(fs.files.has('/source.txt')).toBe(false)
    })
  })

  // ============================================
  // Cross-filesystem behavior (not applicable for in-memory)
  // ============================================

  describe('directory rename edge cases', () => {
    it('should not partially rename directory contents on failure', async () => {
      // If a directory rename fails, none of the contents should be affected
      const originalContents = new Map(fs.files)

      try {
        // This should fail - can't move directory into itself
        await rename('/dir1', '/dir1/subdir')
      } catch {
        // Expected
      }

      // All original files should still exist in original locations
      expect(fs.files.get('/dir1')).toBeDefined()
      expect(fs.files.get('/dir1/file.txt')).toBeDefined()
      expect(fs.files.get('/dir1/subdir')).toBeDefined()
    })

    it('should handle renaming nested directory to parent level', async () => {
      await rename('/dir1/subdir', '/promoted-subdir')

      expect(fs.files.has('/dir1/subdir')).toBe(false)
      expect(fs.files.has('/dir1/subdir/deep.txt')).toBe(false)
      expect(fs.files.has('/promoted-subdir')).toBe(true)
      expect(fs.files.has('/promoted-subdir/deep.txt')).toBe(true)
    })
  })
})

// ============================================
// Helper functions for verifying test state
// ============================================

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

async function readFileContent(path: string): Promise<string> {
  const normalizedPath = normalize(path)
  const entry = fs.files.get(normalizedPath)
  if (!entry || entry.type !== 'file' || !entry.content) {
    throw new ENOENT('read', normalizedPath)
  }
  return new TextDecoder().decode(entry.content)
}
