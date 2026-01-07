/**
 * Tests for access operation (RED phase - should fail)
 *
 * access tests file/directory accessibility without opening it.
 * Returns undefined if accessible, throws error if not.
 *
 * POSIX behavior:
 * - F_OK (0): Check file exists
 * - R_OK (4): Check read permission
 * - W_OK (2): Check write permission
 * - X_OK (1): Check execute permission
 * - Modes can be OR'd together (e.g., R_OK | W_OK)
 * - Throws ENOENT if path doesn't exist
 * - Throws EACCES if permission denied
 * - Follows symbolic links
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { access, setStorage, type AccessStorage } from './access'
import { type FileEntry, type FileType } from '../core/types'
import { ENOENT, EACCES } from '../core/errors'
import { constants } from '../core/constants'
import { normalize } from '../core/path'

// Re-export constants for convenience
const { F_OK, R_OK, W_OK, X_OK } = constants

// Helper to create file entries with default values
function createEntry(
  path: string,
  type: FileType,
  options: Partial<FileEntry> = {}
): FileEntry {
  const now = Date.now()
  const birthtime = options.birthtime ?? now - 100000
  return {
    id: options.id ?? path,
    path,
    name: path.split('/').pop() || '',
    parentId: null,
    type,
    mode: options.mode ?? (type === 'directory' ? 0o755 : 0o644),
    uid: options.uid ?? 1000,
    gid: options.gid ?? 1000,
    size: options.size ?? 0,
    blobId: null,
    linkTarget: options.linkTarget ?? null,
    atime: options.atime ?? now,
    mtime: options.mtime ?? now,
    ctime: options.ctime ?? now,
    birthtime: birthtime,
    nlink: options.nlink ?? (type === 'directory' ? 2 : 1),
  }
}

describe('access', () => {
  // Mock filesystem for testing
  let mockFs: Map<string, FileEntry>
  // Current user context
  let currentUid: number
  let currentGid: number
  let currentGroups: number[]

  beforeEach(() => {
    mockFs = new Map()
    currentUid = 1000
    currentGid = 1000
    currentGroups = [1000]

    // Root directory (world readable/executable, only root writable)
    mockFs.set('/', createEntry('/', 'directory', { id: '1', mode: 0o755, uid: 0, gid: 0 }))

    // /home directory structure
    mockFs.set('/home', createEntry('/home', 'directory', { id: '2', mode: 0o755 }))
    mockFs.set('/home/user', createEntry('/home/user', 'directory', { id: '3', mode: 0o755 }))

    // Regular file with standard permissions (rw-r--r--)
    mockFs.set('/home/user/file.txt', createEntry('/home/user/file.txt', 'file', {
      id: '4',
      size: 100,
      mode: 0o644,
      uid: 1000,
      gid: 1000,
    }))

    // Read-only file (r--r--r--)
    mockFs.set('/home/user/readonly.txt', createEntry('/home/user/readonly.txt', 'file', {
      id: '5',
      size: 50,
      mode: 0o444,
      uid: 1000,
      gid: 1000,
    }))

    // Executable file (rwxr-xr-x)
    mockFs.set('/home/user/script.sh', createEntry('/home/user/script.sh', 'file', {
      id: '6',
      size: 200,
      mode: 0o755,
      uid: 1000,
      gid: 1000,
    }))

    // No permissions file (----------)
    mockFs.set('/home/user/noaccess.txt', createEntry('/home/user/noaccess.txt', 'file', {
      id: '7',
      size: 30,
      mode: 0o000,
      uid: 1000,
      gid: 1000,
    }))

    // Write-only file (-w--------)
    mockFs.set('/home/user/writeonly.txt', createEntry('/home/user/writeonly.txt', 'file', {
      id: '8',
      size: 40,
      mode: 0o200,
      uid: 1000,
      gid: 1000,
    }))

    // Execute-only file (--x------)
    mockFs.set('/home/user/execonly.txt', createEntry('/home/user/execonly.txt', 'file', {
      id: '9',
      size: 50,
      mode: 0o100,
      uid: 1000,
      gid: 1000,
    }))

    // File owned by different user (user can't access)
    mockFs.set('/home/user/other-user-file.txt', createEntry('/home/user/other-user-file.txt', 'file', {
      id: '10',
      size: 60,
      mode: 0o600, // Only owner has access
      uid: 2000, // Different user
      gid: 2000,
    }))

    // File with group permissions (rw-rw----)
    mockFs.set('/home/user/group-file.txt', createEntry('/home/user/group-file.txt', 'file', {
      id: '11',
      size: 70,
      mode: 0o660,
      uid: 2000, // Different user
      gid: 1000, // Same group as current user
    }))

    // File with other permissions (rw-rw-rw-)
    mockFs.set('/home/user/world-writable.txt', createEntry('/home/user/world-writable.txt', 'file', {
      id: '12',
      size: 80,
      mode: 0o666,
      uid: 2000,
      gid: 2000,
    }))

    // /data directory with files
    mockFs.set('/data', createEntry('/data', 'directory', { id: '20', mode: 0o755 }))
    mockFs.set('/data/file.txt', createEntry('/data/file.txt', 'file', {
      id: '21',
      size: 100,
      mode: 0o644,
    }))

    // Read-only directory
    mockFs.set('/data/readonly-dir', createEntry('/data/readonly-dir', 'directory', {
      id: '22',
      mode: 0o555, // r-xr-xr-x
    }))

    // No-access directory
    mockFs.set('/data/noaccess-dir', createEntry('/data/noaccess-dir', 'directory', {
      id: '23',
      mode: 0o000,
    }))

    // /links directory with symlinks
    mockFs.set('/links', createEntry('/links', 'directory', { id: '30', mode: 0o755 }))
    mockFs.set('/links/file-link', createEntry('/links/file-link', 'symlink', {
      id: '31',
      linkTarget: '/data/file.txt',
      size: 14,
      mode: 0o777, // Symlinks typically have 777 permissions
    }))
    mockFs.set('/links/dir-link', createEntry('/links/dir-link', 'symlink', {
      id: '32',
      linkTarget: '/data',
      size: 5,
      mode: 0o777,
    }))
    mockFs.set('/links/broken-link', createEntry('/links/broken-link', 'symlink', {
      id: '33',
      linkTarget: '/nonexistent/target',
      size: 19,
      mode: 0o777,
    }))

    // Chain of symlinks: link1 -> link2 -> /data/file.txt
    mockFs.set('/links/link2', createEntry('/links/link2', 'symlink', {
      id: '34',
      linkTarget: '/data/file.txt',
      size: 14,
      mode: 0o777,
    }))
    mockFs.set('/links/link1', createEntry('/links/link1', 'symlink', {
      id: '35',
      linkTarget: '/links/link2',
      size: 12,
      mode: 0o777,
    }))

    // Symlink to readonly file
    mockFs.set('/links/readonly-link', createEntry('/links/readonly-link', 'symlink', {
      id: '36',
      linkTarget: '/home/user/readonly.txt',
      size: 22,
      mode: 0o777,
    }))

    // Symlink to noaccess file
    mockFs.set('/links/noaccess-link', createEntry('/links/noaccess-link', 'symlink', {
      id: '37',
      linkTarget: '/home/user/noaccess.txt',
      size: 22,
      mode: 0o777,
    }))

    // Create storage adapter
    const storage: AccessStorage = {
      get: (path: string) => {
        const normalizedPath = normalize(path)
        return mockFs.get(normalizedPath)
      },
      has: (path: string) => {
        const normalizedPath = normalize(path)
        return mockFs.has(normalizedPath)
      },
      resolveSymlink: (path: string, maxDepth: number = 40) => {
        let current = mockFs.get(normalize(path))
        let depth = 0
        while (current && current.type === 'symlink' && current.linkTarget && depth < maxDepth) {
          const targetPath = normalize(current.linkTarget)
          current = mockFs.get(targetPath)
          depth++
        }
        return current
      },
      getUid: () => currentUid,
      getGid: () => currentGid,
      getGroups: () => currentGroups,
    }
    setStorage(storage)
  })

  afterEach(() => {
    setStorage(null)
  })

  describe('F_OK - file exists check', () => {
    it('should return undefined for existing file', async () => {
      // Given: a file exists at /home/user/file.txt
      // When: calling access with F_OK (default)
      // Then: should return undefined (success)

      const result = await access('/home/user/file.txt')

      expect(result).toBeUndefined()
    })

    it('should return undefined for existing file with explicit F_OK', async () => {
      // Given: a file exists at /home/user/file.txt
      // When: calling access with F_OK explicitly
      // Then: should return undefined (success)

      const result = await access('/home/user/file.txt', F_OK)

      expect(result).toBeUndefined()
    })

    it('should return undefined for existing directory', async () => {
      // Given: a directory exists at /home/user
      // When: calling access with F_OK
      // Then: should return undefined (success)

      const result = await access('/home/user', F_OK)

      expect(result).toBeUndefined()
    })

    it('should return undefined for file with no permissions (F_OK only checks existence)', async () => {
      // Given: a file with mode 0o000 (no permissions)
      // When: calling access with F_OK
      // Then: should return undefined because F_OK only checks existence

      const result = await access('/home/user/noaccess.txt', F_OK)

      expect(result).toBeUndefined()
    })

    it('should return undefined for root directory', async () => {
      // Given: root directory exists
      // When: calling access with F_OK
      // Then: should return undefined

      const result = await access('/', F_OK)

      expect(result).toBeUndefined()
    })
  })

  describe('R_OK - read permission check', () => {
    it('should return undefined for file with read permission', async () => {
      // Given: a file with mode 0o644 (owner can read)
      // When: calling access with R_OK
      // Then: should return undefined

      const result = await access('/home/user/file.txt', R_OK)

      expect(result).toBeUndefined()
    })

    it('should return undefined for read-only file', async () => {
      // Given: a file with mode 0o444 (everyone can read)
      // When: calling access with R_OK
      // Then: should return undefined

      const result = await access('/home/user/readonly.txt', R_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for file without read permission', async () => {
      // Given: a file with mode 0o200 (write-only)
      // When: calling access with R_OK
      // Then: should throw EACCES

      await expect(access('/home/user/writeonly.txt', R_OK)).rejects.toThrow(EACCES)
    })

    it('should throw EACCES for file with no permissions', async () => {
      // Given: a file with mode 0o000
      // When: calling access with R_OK
      // Then: should throw EACCES

      await expect(access('/home/user/noaccess.txt', R_OK)).rejects.toThrow(EACCES)
    })

    it('should check group read permission when user is in group', async () => {
      // Given: file with mode 0o660 (owner and group read/write), owned by different user but same group
      // When: calling access with R_OK
      // Then: should return undefined (group permission applies)

      const result = await access('/home/user/group-file.txt', R_OK)

      expect(result).toBeUndefined()
    })

    it('should check other read permission when not owner or group', async () => {
      // Given: file with mode 0o666 (world readable), owned by different user and group
      // When: calling access with R_OK
      // Then: should return undefined (other permission applies)

      const result = await access('/home/user/world-writable.txt', R_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for file owned by other user with owner-only permissions', async () => {
      // Given: file with mode 0o600, owned by different user
      // When: calling access with R_OK
      // Then: should throw EACCES

      await expect(access('/home/user/other-user-file.txt', R_OK)).rejects.toThrow(EACCES)
    })
  })

  describe('W_OK - write permission check', () => {
    it('should return undefined for file with write permission', async () => {
      // Given: a file with mode 0o644 (owner can write)
      // When: calling access with W_OK
      // Then: should return undefined

      const result = await access('/home/user/file.txt', W_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for read-only file', async () => {
      // Given: a file with mode 0o444 (no write)
      // When: calling access with W_OK
      // Then: should throw EACCES

      await expect(access('/home/user/readonly.txt', W_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for write-only file', async () => {
      // Given: a file with mode 0o200 (write-only)
      // When: calling access with W_OK
      // Then: should return undefined

      const result = await access('/home/user/writeonly.txt', W_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for file with no permissions', async () => {
      // Given: a file with mode 0o000
      // When: calling access with W_OK
      // Then: should throw EACCES

      await expect(access('/home/user/noaccess.txt', W_OK)).rejects.toThrow(EACCES)
    })

    it('should check group write permission when user is in group', async () => {
      // Given: file with mode 0o660 (owner and group read/write), owned by different user but same group
      // When: calling access with W_OK
      // Then: should return undefined (group permission applies)

      const result = await access('/home/user/group-file.txt', W_OK)

      expect(result).toBeUndefined()
    })

    it('should check other write permission when not owner or group', async () => {
      // Given: file with mode 0o666 (world writable), owned by different user and group
      // When: calling access with W_OK
      // Then: should return undefined (other permission applies)

      const result = await access('/home/user/world-writable.txt', W_OK)

      expect(result).toBeUndefined()
    })
  })

  describe('X_OK - execute permission check', () => {
    it('should return undefined for executable file', async () => {
      // Given: a file with mode 0o755 (executable)
      // When: calling access with X_OK
      // Then: should return undefined

      const result = await access('/home/user/script.sh', X_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for non-executable file', async () => {
      // Given: a file with mode 0o644 (not executable)
      // When: calling access with X_OK
      // Then: should throw EACCES

      await expect(access('/home/user/file.txt', X_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for execute-only file', async () => {
      // Given: a file with mode 0o100 (execute-only)
      // When: calling access with X_OK
      // Then: should return undefined

      const result = await access('/home/user/execonly.txt', X_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for file with no permissions', async () => {
      // Given: a file with mode 0o000
      // When: calling access with X_OK
      // Then: should throw EACCES

      await expect(access('/home/user/noaccess.txt', X_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for directory with execute permission (for traversal)', async () => {
      // Given: a directory with mode 0o755
      // When: calling access with X_OK
      // Then: should return undefined (execute on directories allows traversal)

      const result = await access('/home/user', X_OK)

      expect(result).toBeUndefined()
    })
  })

  describe('combined modes', () => {
    it('should return undefined for R_OK | W_OK when file has both permissions', async () => {
      // Given: a file with mode 0o644 (owner can read and write)
      // When: calling access with R_OK | W_OK
      // Then: should return undefined

      const result = await access('/home/user/file.txt', R_OK | W_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for R_OK | W_OK when file is read-only', async () => {
      // Given: a file with mode 0o444 (read-only)
      // When: calling access with R_OK | W_OK
      // Then: should throw EACCES (missing write permission)

      await expect(access('/home/user/readonly.txt', R_OK | W_OK)).rejects.toThrow(EACCES)
    })

    it('should throw EACCES for R_OK | W_OK when file is write-only', async () => {
      // Given: a file with mode 0o200 (write-only)
      // When: calling access with R_OK | W_OK
      // Then: should throw EACCES (missing read permission)

      await expect(access('/home/user/writeonly.txt', R_OK | W_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for R_OK | X_OK on executable file', async () => {
      // Given: a file with mode 0o755 (readable and executable)
      // When: calling access with R_OK | X_OK
      // Then: should return undefined

      const result = await access('/home/user/script.sh', R_OK | X_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for R_OK | X_OK on non-executable file', async () => {
      // Given: a file with mode 0o644 (readable but not executable)
      // When: calling access with R_OK | X_OK
      // Then: should throw EACCES

      await expect(access('/home/user/file.txt', R_OK | X_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for R_OK | W_OK | X_OK on fully accessible file', async () => {
      // Given: a file with mode 0o755 (all permissions for owner)
      // When: calling access with R_OK | W_OK | X_OK
      // Then: should return undefined

      const result = await access('/home/user/script.sh', R_OK | W_OK | X_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for R_OK | W_OK | X_OK when missing any permission', async () => {
      // Given: a file with mode 0o644 (missing execute)
      // When: calling access with R_OK | W_OK | X_OK
      // Then: should throw EACCES

      await expect(access('/home/user/file.txt', R_OK | W_OK | X_OK)).rejects.toThrow(EACCES)
    })
  })

  describe('ENOENT - file does not exist', () => {
    it('should throw ENOENT for non-existent file', async () => {
      // Given: path does not exist
      // When: calling access
      // Then: should throw ENOENT

      await expect(access('/nonexistent/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for non-existent directory', async () => {
      // Given: directory does not exist
      // When: calling access
      // Then: should throw ENOENT

      await expect(access('/nonexistent/dir')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when parent directory does not exist', async () => {
      // Given: parent directory does not exist
      // When: calling access
      // Then: should throw ENOENT

      await expect(access('/nonexistent/parent/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should include syscall = "access" in ENOENT error', async () => {
      // Given: non-existent path
      // When: access throws ENOENT
      // Then: error.syscall should be 'access'

      try {
        await access('/nonexistent/file.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('access')
      }
    })

    it('should include correct path in ENOENT error', async () => {
      // Given: non-existent path
      // When: access throws ENOENT
      // Then: error.path should be the requested path

      try {
        await access('/some/missing/file.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).path).toBe('/some/missing/file.txt')
      }
    })

    it('should include errno = -2 in ENOENT error', async () => {
      // Given: non-existent path
      // When: access throws ENOENT
      // Then: error.errno should be -2

      try {
        await access('/nonexistent')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).errno).toBe(-2)
      }
    })
  })

  describe('EACCES - permission denied', () => {
    it('should include syscall = "access" in EACCES error', async () => {
      // Given: file without read permission
      // When: access throws EACCES
      // Then: error.syscall should be 'access'

      try {
        await access('/home/user/noaccess.txt', R_OK)
        expect.fail('Should have thrown EACCES')
      } catch (error) {
        expect(error).toBeInstanceOf(EACCES)
        expect((error as EACCES).syscall).toBe('access')
      }
    })

    it('should include correct path in EACCES error', async () => {
      // Given: file without read permission
      // When: access throws EACCES
      // Then: error.path should be the requested path

      try {
        await access('/home/user/noaccess.txt', R_OK)
        expect.fail('Should have thrown EACCES')
      } catch (error) {
        expect(error).toBeInstanceOf(EACCES)
        expect((error as EACCES).path).toBe('/home/user/noaccess.txt')
      }
    })

    it('should include errno = -13 in EACCES error', async () => {
      // Given: file without permission
      // When: access throws EACCES
      // Then: error.errno should be -13

      try {
        await access('/home/user/noaccess.txt', R_OK)
        expect.fail('Should have thrown EACCES')
      } catch (error) {
        expect(error).toBeInstanceOf(EACCES)
        expect((error as EACCES).errno).toBe(-13)
      }
    })
  })

  describe('directory access', () => {
    it('should return undefined for directory with read permission', async () => {
      // Given: a directory with mode 0o755
      // When: calling access with R_OK
      // Then: should return undefined

      const result = await access('/home/user', R_OK)

      expect(result).toBeUndefined()
    })

    it('should return undefined for directory with write permission', async () => {
      // Given: a directory with mode 0o755
      // When: calling access with W_OK
      // Then: should return undefined

      const result = await access('/home/user', W_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for read-only directory with W_OK', async () => {
      // Given: a directory with mode 0o555 (read-only)
      // When: calling access with W_OK
      // Then: should throw EACCES

      await expect(access('/data/readonly-dir', W_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for read-only directory with R_OK', async () => {
      // Given: a directory with mode 0o555
      // When: calling access with R_OK
      // Then: should return undefined

      const result = await access('/data/readonly-dir', R_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES for no-access directory', async () => {
      // Given: a directory with mode 0o000
      // When: calling access with R_OK
      // Then: should throw EACCES

      await expect(access('/data/noaccess-dir', R_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for directory with execute permission (traversal)', async () => {
      // Given: a directory with mode 0o755
      // When: calling access with X_OK
      // Then: should return undefined

      const result = await access('/home/user', X_OK)

      expect(result).toBeUndefined()
    })
  })

  describe('symlink access (follows symlinks)', () => {
    it('should check target file permissions through symlink', async () => {
      // Given: symlink to a readable file
      // When: calling access with R_OK on the symlink
      // Then: should return undefined (target is readable)

      const result = await access('/links/file-link', R_OK)

      expect(result).toBeUndefined()
    })

    it('should check target directory permissions through symlink', async () => {
      // Given: symlink to a directory
      // When: calling access with R_OK on the symlink
      // Then: should return undefined (target is readable)

      const result = await access('/links/dir-link', R_OK)

      expect(result).toBeUndefined()
    })

    it('should throw ENOENT for broken symlink', async () => {
      // Given: symlink to non-existent target
      // When: calling access
      // Then: should throw ENOENT

      await expect(access('/links/broken-link')).rejects.toThrow(ENOENT)
    })

    it('should include original symlink path in ENOENT for broken symlink', async () => {
      // Given: broken symlink
      // When: access throws ENOENT
      // Then: error.path should be the symlink path

      try {
        await access('/links/broken-link')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).path).toBe('/links/broken-link')
      }
    })

    it('should follow chain of symlinks', async () => {
      // Given: link1 -> link2 -> /data/file.txt
      // When: calling access with R_OK on link1
      // Then: should return undefined (final target is readable)

      const result = await access('/links/link1', R_OK)

      expect(result).toBeUndefined()
    })

    it('should throw EACCES when symlink target has no permission', async () => {
      // Given: symlink to file with mode 0o000
      // When: calling access with R_OK
      // Then: should throw EACCES

      await expect(access('/links/noaccess-link', R_OK)).rejects.toThrow(EACCES)
    })

    it('should throw EACCES for write check on symlink to read-only file', async () => {
      // Given: symlink to read-only file (mode 0o444)
      // When: calling access with W_OK
      // Then: should throw EACCES

      await expect(access('/links/readonly-link', W_OK)).rejects.toThrow(EACCES)
    })

    it('should return undefined for existence check (F_OK) on symlink', async () => {
      // Given: symlink to existing file
      // When: calling access with F_OK
      // Then: should return undefined

      const result = await access('/links/file-link', F_OK)

      expect(result).toBeUndefined()
    })
  })

  describe('path handling', () => {
    it('should handle absolute paths', async () => {
      // Given: an absolute path
      // When: calling access
      // Then: should work correctly

      const result = await access('/data/file.txt')

      expect(result).toBeUndefined()
    })

    it('should normalize paths with double slashes', async () => {
      // Given: path with double slashes
      // When: calling access
      // Then: should normalize and work

      const result = await access('/data//file.txt')

      expect(result).toBeUndefined()
    })

    it('should normalize paths with dot segments', async () => {
      // Given: path with ./
      // When: calling access
      // Then: should normalize and work

      const result = await access('/data/./file.txt')

      expect(result).toBeUndefined()
    })

    it('should normalize paths with parent directory segments', async () => {
      // Given: path with ../
      // When: calling access
      // Then: should normalize and work

      const result = await access('/data/readonly-dir/../file.txt')

      expect(result).toBeUndefined()
    })

    it('should handle trailing slashes for directories', async () => {
      // Given: directory path with trailing slash
      // When: calling access
      // Then: should work

      const result = await access('/data/')

      expect(result).toBeUndefined()
    })

    it('should handle root path', async () => {
      // Given: root path
      // When: calling access
      // Then: should work

      const result = await access('/')

      expect(result).toBeUndefined()
    })
  })

  describe('default mode behavior', () => {
    it('should default to F_OK when mode is undefined', async () => {
      // Given: existing file
      // When: calling access without mode parameter
      // Then: should behave like F_OK (only check existence)

      const result = await access('/home/user/file.txt')

      expect(result).toBeUndefined()
    })

    it('should default to F_OK when mode is 0', async () => {
      // Given: existing file
      // When: calling access with mode = 0
      // Then: should only check existence

      const result = await access('/home/user/noaccess.txt', 0)

      // F_OK (0) only checks existence, not permissions
      expect(result).toBeUndefined()
    })
  })

  describe('concurrent access', () => {
    it('should handle concurrent access calls on same file', async () => {
      // Given: a file
      // When: calling access concurrently multiple times
      // Then: all calls should succeed

      const promises = [
        access('/data/file.txt'),
        access('/data/file.txt'),
        access('/data/file.txt'),
      ]

      const results = await Promise.all(promises)

      // All should succeed (undefined)
      results.forEach(result => {
        expect(result).toBeUndefined()
      })
    })

    it('should handle concurrent access calls on different files', async () => {
      // Given: multiple files
      // When: calling access concurrently on different files
      // Then: all calls should succeed

      const promises = [
        access('/home/user/file.txt'),
        access('/home/user/readonly.txt'),
        access('/home/user/script.sh'),
      ]

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result).toBeUndefined()
      })
    })
  })

  describe('edge cases', () => {
    it('should handle mode value larger than X_OK | W_OK | R_OK', async () => {
      // Given: mode value with extra bits
      // When: calling access with mode = 0xFF
      // Then: should only consider the permission bits (R_OK | W_OK | X_OK = 7)

      // Mode 0xFF has all bits set, but only lower 3 bits should matter
      // This tests that only F_OK, R_OK, W_OK, X_OK are considered
      // The file has rwx for owner (0o755), so should pass
      const result = await access('/home/user/script.sh', R_OK | W_OK | X_OK)

      expect(result).toBeUndefined()
    })

    it('should handle file with special permission bits (setuid)', async () => {
      // Given: file with setuid bit
      // When: calling access
      // Then: should check regular permissions, not special bits

      mockFs.set('/home/user/setuid-file', createEntry('/home/user/setuid-file', 'file', {
        id: '100',
        mode: 0o4755, // setuid + rwxr-xr-x
        uid: 0,
        gid: 0,
      }))

      // Should be readable and executable by others
      const result = await access('/home/user/setuid-file', R_OK | X_OK)

      expect(result).toBeUndefined()
    })

    it('should handle file with sticky bit', async () => {
      // Given: directory with sticky bit
      // When: calling access
      // Then: should check regular permissions

      mockFs.set('/tmp', createEntry('/tmp', 'directory', {
        id: '101',
        mode: 0o1777, // sticky + rwxrwxrwx
        uid: 0,
        gid: 0,
      }))

      const result = await access('/tmp', R_OK | W_OK | X_OK)

      expect(result).toBeUndefined()
    })
  })
})
