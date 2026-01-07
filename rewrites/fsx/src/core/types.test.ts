/**
 * Tests for core filesystem types (GREEN phase - should pass)
 * These tests drive the implementation of Stats, Dirent, and FileHandle classes
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Stats, Dirent, FileHandle } from './types'
import type { FileEntry, BlobRef } from './types'

describe('Stats', () => {
  let stats: Stats

  beforeEach(() => {
    stats = new Stats({
      dev: 2114,
      ino: 48064969,
      mode: 33188, // 0o100644 - regular file with rw-r--r--
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: 527,
      blksize: 4096,
      blocks: 8,
      atimeMs: 1318289051000.1,
      mtimeMs: 1318289051000.1,
      ctimeMs: 1318289051000.1,
      birthtimeMs: 1318289051000.1,
    })
  })

  describe('numeric properties', () => {
    it('should have dev property', () => {
      expect(stats.dev).toBe(2114)
    })

    it('should have ino property', () => {
      expect(stats.ino).toBe(48064969)
    })

    it('should have mode property', () => {
      expect(stats.mode).toBe(33188)
    })

    it('should have nlink property', () => {
      expect(stats.nlink).toBe(1)
    })

    it('should have uid property', () => {
      expect(stats.uid).toBe(85)
    })

    it('should have gid property', () => {
      expect(stats.gid).toBe(100)
    })

    it('should have rdev property', () => {
      expect(stats.rdev).toBe(0)
    })

    it('should have size property', () => {
      expect(stats.size).toBe(527)
    })

    it('should have blksize property', () => {
      expect(stats.blksize).toBe(4096)
    })

    it('should have blocks property', () => {
      expect(stats.blocks).toBe(8)
    })
  })

  describe('timestamp properties', () => {
    it('should have atime as Date', () => {
      expect(stats.atime).toBeInstanceOf(Date)
      expect(stats.atime.getTime()).toBeCloseTo(1318289051000.1, 0)
    })

    it('should have mtime as Date', () => {
      expect(stats.mtime).toBeInstanceOf(Date)
      expect(stats.mtime.getTime()).toBeCloseTo(1318289051000.1, 0)
    })

    it('should have ctime as Date', () => {
      expect(stats.ctime).toBeInstanceOf(Date)
      expect(stats.ctime.getTime()).toBeCloseTo(1318289051000.1, 0)
    })

    it('should have birthtime as Date', () => {
      expect(stats.birthtime).toBeInstanceOf(Date)
      expect(stats.birthtime.getTime()).toBeCloseTo(1318289051000.1, 0)
    })
  })

  describe('type check methods for regular file', () => {
    it('should identify as regular file', () => {
      expect(stats.isFile()).toBe(true)
    })

    it('should not identify as directory', () => {
      expect(stats.isDirectory()).toBe(false)
    })

    it('should not identify as symbolic link', () => {
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(stats.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(stats.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(stats.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(stats.isSocket()).toBe(false)
    })
  })

  describe('type check methods for directory', () => {
    beforeEach(() => {
      stats = new Stats({
        dev: 2114,
        ino: 48064969,
        mode: 16877, // 0o040755 - directory with rwxr-xr-x
        nlink: 2,
        uid: 85,
        gid: 100,
        rdev: 0,
        size: 4096,
        blksize: 4096,
        blocks: 8,
        atimeMs: 1318289051000.1,
        mtimeMs: 1318289051000.1,
        ctimeMs: 1318289051000.1,
        birthtimeMs: 1318289051000.1,
      })
    })

    it('should identify as directory', () => {
      expect(stats.isDirectory()).toBe(true)
    })

    it('should not identify as regular file', () => {
      expect(stats.isFile()).toBe(false)
    })

    it('should not identify as symbolic link', () => {
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(stats.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(stats.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(stats.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(stats.isSocket()).toBe(false)
    })
  })

  describe('type check methods for symbolic link', () => {
    beforeEach(() => {
      stats = new Stats({
        dev: 2114,
        ino: 48064969,
        mode: 41471, // 0o120777 - symbolic link
        nlink: 1,
        uid: 85,
        gid: 100,
        rdev: 0,
        size: 10,
        blksize: 4096,
        blocks: 0,
        atimeMs: 1318289051000.1,
        mtimeMs: 1318289051000.1,
        ctimeMs: 1318289051000.1,
        birthtimeMs: 1318289051000.1,
      })
    })

    it('should identify as symbolic link', () => {
      expect(stats.isSymbolicLink()).toBe(true)
    })

    it('should not identify as regular file', () => {
      expect(stats.isFile()).toBe(false)
    })

    it('should not identify as directory', () => {
      expect(stats.isDirectory()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(stats.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(stats.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(stats.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(stats.isSocket()).toBe(false)
    })
  })
})

describe('Dirent', () => {
  let dirent: Dirent

  beforeEach(() => {
    dirent = new Dirent('myfile.txt', '/home/user', 'file')
  })

  describe('properties', () => {
    it('should have name property', () => {
      expect(dirent.name).toBe('myfile.txt')
    })

    it('should have parentPath property', () => {
      expect(dirent.parentPath).toBe('/home/user')
    })

    it('should have path property combining parent and name', () => {
      expect(dirent.path).toBe('/home/user/myfile.txt')
    })
  })

  describe('type check methods for file', () => {
    it('should identify as file', () => {
      expect(dirent.isFile()).toBe(true)
    })

    it('should not identify as directory', () => {
      expect(dirent.isDirectory()).toBe(false)
    })

    it('should not identify as symbolic link', () => {
      expect(dirent.isSymbolicLink()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(dirent.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(dirent.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(dirent.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(dirent.isSocket()).toBe(false)
    })
  })

  describe('type check methods for directory', () => {
    beforeEach(() => {
      dirent = new Dirent('mydir', '/home/user', 'directory')
    })

    it('should identify as directory', () => {
      expect(dirent.isDirectory()).toBe(true)
    })

    it('should not identify as file', () => {
      expect(dirent.isFile()).toBe(false)
    })

    it('should not identify as symbolic link', () => {
      expect(dirent.isSymbolicLink()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(dirent.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(dirent.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(dirent.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(dirent.isSocket()).toBe(false)
    })
  })

  describe('type check methods for symlink', () => {
    beforeEach(() => {
      dirent = new Dirent('mylink', '/home/user', 'symlink')
    })

    it('should identify as symbolic link', () => {
      expect(dirent.isSymbolicLink()).toBe(true)
    })

    it('should not identify as file', () => {
      expect(dirent.isFile()).toBe(false)
    })

    it('should not identify as directory', () => {
      expect(dirent.isDirectory()).toBe(false)
    })

    it('should not identify as block device', () => {
      expect(dirent.isBlockDevice()).toBe(false)
    })

    it('should not identify as character device', () => {
      expect(dirent.isCharacterDevice()).toBe(false)
    })

    it('should not identify as FIFO', () => {
      expect(dirent.isFIFO()).toBe(false)
    })

    it('should not identify as socket', () => {
      expect(dirent.isSocket()).toBe(false)
    })
  })
})

describe('FileHandle', () => {
  let handle: FileHandle
  let mockStats: Stats
  let mockData: Uint8Array

  beforeEach(() => {
    mockData = new TextEncoder().encode('Hello, World!')

    // Mock Stats for testing
    const now = Date.now()
    mockStats = new Stats({
      dev: 2114,
      ino: 48064969,
      mode: 33188,
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: mockData.length,
      blksize: 4096,
      blocks: 1,
      atimeMs: now,
      mtimeMs: now,
      ctimeMs: now,
      birthtimeMs: now,
    })

    handle = new FileHandle(1, mockData, mockStats)
  })

  describe('properties', () => {
    it('should have fd property', () => {
      expect(handle.fd).toBe(1)
    })
  })

  describe('read method', () => {
    it('should read data into buffer', async () => {
      const buffer = new Uint8Array(20)
      const result = await handle.read(buffer)

      expect(result.bytesRead).toBe(13)
      expect(result.buffer).toBe(buffer)
      expect(new TextDecoder().decode(result.buffer.slice(0, result.bytesRead))).toBe('Hello, World!')
    })

    it('should read with offset', async () => {
      const buffer = new Uint8Array(20)
      const result = await handle.read(buffer, 5)

      expect(result.bytesRead).toBe(13)
      expect(new TextDecoder().decode(result.buffer.slice(5, 5 + result.bytesRead))).toBe('Hello, World!')
    })

    it('should read with length limit', async () => {
      const buffer = new Uint8Array(20)
      const result = await handle.read(buffer, 0, 5)

      expect(result.bytesRead).toBe(5)
      expect(new TextDecoder().decode(result.buffer.slice(0, result.bytesRead))).toBe('Hello')
    })

    it('should read from position', async () => {
      const buffer = new Uint8Array(20)
      const result = await handle.read(buffer, 0, 5, 7)

      expect(result.bytesRead).toBe(5)
      expect(new TextDecoder().decode(result.buffer.slice(0, result.bytesRead))).toBe('World')
    })
  })

  describe('write method', () => {
    it('should write Uint8Array data', async () => {
      const data = new TextEncoder().encode('Test data')
      const result = await handle.write(data)

      expect(result.bytesWritten).toBe(9)
    })

    it('should write string data', async () => {
      const result = await handle.write('Test string')

      expect(result.bytesWritten).toBe(11)
    })

    it('should write at position', async () => {
      const data = new TextEncoder().encode('XXX')
      const result = await handle.write(data, 7)

      expect(result.bytesWritten).toBe(3)
    })
  })

  describe('stat method', () => {
    it('should return file stats', async () => {
      const stats = await handle.stat()

      expect(stats).toBeDefined()
      expect(stats.size).toBe(13)
      expect(stats.isFile()).toBe(true)
    })
  })

  describe('truncate method', () => {
    it('should truncate file to specified length', async () => {
      await handle.truncate(5)
      const stats = await handle.stat()

      expect(stats.size).toBe(5)
    })

    it('should truncate to zero length when no argument provided', async () => {
      await handle.truncate()
      const stats = await handle.stat()

      expect(stats.size).toBe(0)
    })
  })

  describe('sync method', () => {
    it('should sync file data to disk', async () => {
      await expect(handle.sync()).resolves.toBeUndefined()
    })
  })

  describe('close method', () => {
    it('should close the file handle', async () => {
      await expect(handle.close()).resolves.toBeUndefined()
    })

    it('should throw error when using closed handle', async () => {
      await handle.close()
      await expect(handle.read(new Uint8Array(10))).rejects.toThrow()
    })
  })

  describe('createReadStream method', () => {
    it('should create a readable stream', () => {
      const stream = handle.createReadStream()

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should create stream with start position', () => {
      const stream = handle.createReadStream({ start: 7 })

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should create stream with end position', () => {
      const stream = handle.createReadStream({ start: 0, end: 4 })

      expect(stream).toBeInstanceOf(ReadableStream)
    })
  })

  describe('createWriteStream method', () => {
    it('should create a writable stream', () => {
      const stream = handle.createWriteStream()

      expect(stream).toBeInstanceOf(WritableStream)
    })

    it('should create stream with start position', () => {
      const stream = handle.createWriteStream({ start: 10 })

      expect(stream).toBeInstanceOf(WritableStream)
    })
  })
})

describe('FileEntry interface', () => {
  it('should have correct structure', () => {
    const entry: FileEntry = {
      id: 'file-123',
      path: '/home/user/test.txt',
      name: 'test.txt',
      parentId: 'dir-456',
      type: 'file',
      mode: 33188,
      uid: 1000,
      gid: 1000,
      size: 1024,
      blobId: 'blob-789',
      linkTarget: null,
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      birthtime: Date.now(),
      nlink: 1,
    }

    expect(entry.id).toBe('file-123')
    expect(entry.path).toBe('/home/user/test.txt')
    expect(entry.name).toBe('test.txt')
    expect(entry.parentId).toBe('dir-456')
    expect(entry.type).toBe('file')
    expect(entry.mode).toBe(33188)
    expect(entry.uid).toBe(1000)
    expect(entry.gid).toBe(1000)
    expect(entry.size).toBe(1024)
    expect(entry.blobId).toBe('blob-789')
    expect(entry.linkTarget).toBeNull()
    expect(typeof entry.atime).toBe('number')
    expect(typeof entry.mtime).toBe('number')
    expect(typeof entry.ctime).toBe('number')
    expect(typeof entry.birthtime).toBe('number')
    expect(entry.nlink).toBe(1)
  })

  it('should support directory entries', () => {
    const entry: FileEntry = {
      id: 'dir-456',
      path: '/home/user',
      name: 'user',
      parentId: 'dir-123',
      type: 'directory',
      mode: 16877,
      uid: 1000,
      gid: 1000,
      size: 4096,
      blobId: null,
      linkTarget: null,
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      birthtime: Date.now(),
      nlink: 2,
    }

    expect(entry.type).toBe('directory')
    expect(entry.blobId).toBeNull()
  })

  it('should support symlink entries', () => {
    const entry: FileEntry = {
      id: 'link-789',
      path: '/home/user/link',
      name: 'link',
      parentId: 'dir-456',
      type: 'symlink',
      mode: 41471,
      uid: 1000,
      gid: 1000,
      size: 10,
      blobId: null,
      linkTarget: '/home/user/target',
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      birthtime: Date.now(),
      nlink: 1,
    }

    expect(entry.type).toBe('symlink')
    expect(entry.linkTarget).toBe('/home/user/target')
  })
})

describe('BlobRef interface', () => {
  it('should have correct structure', () => {
    const blob: BlobRef = {
      id: 'blob-123',
      tier: 'hot',
      size: 1048576,
      checksum: 'sha256:abcdef123456',
      createdAt: Date.now(),
    }

    expect(blob.id).toBe('blob-123')
    expect(blob.tier).toBe('hot')
    expect(blob.size).toBe(1048576)
    expect(blob.checksum).toBe('sha256:abcdef123456')
    expect(typeof blob.createdAt).toBe('number')
  })

  it('should support different tier levels', () => {
    const hotBlob: BlobRef = {
      id: 'blob-1',
      tier: 'hot',
      size: 1024,
      checksum: 'sha256:abc',
      createdAt: Date.now(),
    }

    const warmBlob: BlobRef = {
      id: 'blob-2',
      tier: 'warm',
      size: 2048,
      checksum: 'sha256:def',
      createdAt: Date.now(),
    }

    const coldBlob: BlobRef = {
      id: 'blob-3',
      tier: 'cold',
      size: 4096,
      checksum: 'sha256:ghi',
      createdAt: Date.now(),
    }

    expect(hotBlob.tier).toBe('hot')
    expect(warmBlob.tier).toBe('warm')
    expect(coldBlob.tier).toBe('cold')
  })
})
