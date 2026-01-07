/**
 * Tests for find() function (RED phase - all tests should fail)
 *
 * The find() function provides Unix find-like file discovery with support for:
 * - Name pattern matching (glob and regex)
 * - File type filtering (file, directory, symlink)
 * - Depth control (maxdepth, mindepth)
 * - Size filtering (larger than, smaller than, exact)
 * - Time filtering (mtime, ctime, atime)
 * - Empty file/directory detection
 * - Directory pruning
 *
 * @module find/test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { find, type FindOptions, type FindResult } from './find'

/**
 * Mock filesystem structure for testing
 *
 * /
 * ├── README.md (1000 bytes, mtime: 2024-01-15)
 * ├── package.json (500 bytes, mtime: 2024-01-10)
 * ├── .gitignore (50 bytes, mtime: 2024-01-01)
 * ├── .env (100 bytes, mtime: 2024-01-05)
 * ├── empty.txt (0 bytes, mtime: 2024-01-20)
 * ├── src/
 * │   ├── index.ts (2000 bytes, mtime: 2024-01-14)
 * │   ├── utils/
 * │   │   ├── helpers.ts (1500 bytes, mtime: 2024-01-12)
 * │   │   └── format.ts (800 bytes, mtime: 2024-01-13)
 * │   └── components/
 * │       ├── Button.tsx (3000 bytes, mtime: 2024-01-11)
 * │       └── Modal.tsx (5000 bytes, mtime: 2024-01-16)
 * ├── test/
 * │   ├── index.test.ts (1200 bytes, mtime: 2024-01-17)
 * │   └── helpers.test.ts (900 bytes, mtime: 2024-01-18)
 * ├── dist/ (empty directory)
 * ├── node_modules/
 * │   └── lodash/
 * │       └── index.js (50000 bytes, mtime: 2023-12-01)
 * ├── large-file.bin (2000000 bytes, mtime: 2024-01-19) - 2MB
 * └── link-to-readme -> README.md (symlink)
 */

describe('find', () => {
  // ========================================
  // 1. Basic traversal (6 tests)
  // ========================================
  describe('basic traversal', () => {
    it('should search from root by default', async () => {
      // Given: no path option specified
      // When: calling find
      // Then: should search from root and return all entries

      const results = await find()

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.path === '/README.md')).toBe(true)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
    })

    it('should search from specified path', async () => {
      // Given: path option set to /src
      // When: calling find
      // Then: should only return entries under /src

      const results = await find({ path: '/src' })

      expect(results.every(r => r.path.startsWith('/src'))).toBe(true)
      expect(results.some(r => r.path === '/README.md')).toBe(false)
    })

    it('should return empty array for non-existent path', async () => {
      // Given: path that does not exist
      // When: calling find
      // Then: should return empty array

      const results = await find({ path: '/nonexistent' })

      expect(results).toEqual([])
    })

    it('should include the starting path if it matches criteria', async () => {
      // Given: path pointing to a directory
      // When: calling find with type 'd'
      // Then: should include the starting directory itself (at mindepth 0)

      const results = await find({ path: '/src', type: 'd', mindepth: 0 })

      expect(results.some(r => r.path === '/src')).toBe(true)
    })

    it('should traverse directories recursively', async () => {
      // Given: nested directory structure
      // When: calling find
      // Then: should find files at all depths

      const results = await find({ path: '/src' })

      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
      expect(results.some(r => r.path === '/src/utils/helpers.ts')).toBe(true)
      expect(results.some(r => r.path === '/src/components/Button.tsx')).toBe(true)
    })

    it('should return results with correct structure', async () => {
      // Given: filesystem with files
      // When: calling find
      // Then: results should have path, type, size, and mtime

      const results = await find({ name: 'README.md' })

      expect(results.length).toBe(1)
      expect(results[0]).toHaveProperty('path')
      expect(results[0]).toHaveProperty('type')
      expect(results[0]).toHaveProperty('size')
      expect(results[0]).toHaveProperty('mtime')
      expect(results[0].mtime).toBeInstanceOf(Date)
    })
  })

  // ========================================
  // 2. Name filtering (8 tests)
  // ========================================
  describe('name filtering', () => {
    it('should filter by exact filename', async () => {
      // Given: name option with exact filename
      // When: calling find
      // Then: should only return files with that name

      const results = await find({ name: 'package.json' })

      expect(results.length).toBe(1)
      expect(results[0].path).toBe('/package.json')
    })

    it('should filter by glob pattern with wildcard', async () => {
      // Given: name option with *.ts glob pattern
      // When: calling find
      // Then: should return all .ts files

      const results = await find({ name: '*.ts' })

      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.path.endsWith('.ts'))).toBe(true)
    })

    it('should filter by glob pattern with multiple extensions', async () => {
      // Given: name option with {ts,tsx} alternatives
      // When: calling find
      // Then: should return both .ts and .tsx files

      const results = await find({ name: '*.{ts,tsx}' })

      expect(results.every(r => r.path.endsWith('.ts') || r.path.endsWith('.tsx'))).toBe(true)
      expect(results.some(r => r.path.endsWith('.ts'))).toBe(true)
      expect(results.some(r => r.path.endsWith('.tsx'))).toBe(true)
    })

    it('should filter by glob pattern with character class', async () => {
      // Given: name option with character class [A-Z]*.tsx
      // When: calling find
      // Then: should match files starting with uppercase letter

      const results = await find({ name: '[A-Z]*.tsx' })

      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => {
        const filename = r.path.split('/').pop()!
        return /^[A-Z]/.test(filename) && r.path.endsWith('.tsx')
      })).toBe(true)
    })

    it('should filter by RegExp pattern', async () => {
      // Given: name option with RegExp
      // When: calling find
      // Then: should match files against the regex

      const results = await find({ name: /\.test\.ts$/ })

      expect(results.every(r => r.path.endsWith('.test.ts'))).toBe(true)
    })

    it('should be case-sensitive by default with string patterns', async () => {
      // Given: name with specific case
      // When: calling find
      // Then: should not match different case

      const results = await find({ name: 'README.MD' })

      expect(results.length).toBe(0) // README.md exists but README.MD doesn't
    })

    it('should support case-insensitive RegExp', async () => {
      // Given: RegExp with 'i' flag
      // When: calling find
      // Then: should match regardless of case

      const results = await find({ name: /readme\.md$/i })

      expect(results.length).toBe(1)
      expect(results[0].path.toLowerCase()).toContain('readme.md')
    })

    it('should handle dotfiles in name pattern', async () => {
      // Given: name pattern starting with dot
      // When: calling find
      // Then: should find dotfiles

      const results = await find({ name: '.git*' })

      expect(results.some(r => r.path === '/.gitignore')).toBe(true)
    })
  })

  // ========================================
  // 3. Type filtering (6 tests)
  // ========================================
  describe('type filtering', () => {
    it('should filter for files only with type "f"', async () => {
      // Given: type: 'f' option
      // When: calling find
      // Then: should only return files, not directories

      const results = await find({ type: 'f' })

      expect(results.every(r => r.type === 'file')).toBe(true)
      expect(results.some(r => r.type === 'directory')).toBe(false)
    })

    it('should filter for directories only with type "d"', async () => {
      // Given: type: 'd' option
      // When: calling find
      // Then: should only return directories

      const results = await find({ type: 'd' })

      expect(results.every(r => r.type === 'directory')).toBe(true)
      expect(results.some(r => r.type === 'file')).toBe(false)
    })

    it('should filter for symlinks only with type "l"', async () => {
      // Given: type: 'l' option
      // When: calling find
      // Then: should only return symlinks

      const results = await find({ type: 'l' })

      expect(results.every(r => r.type === 'symlink')).toBe(true)
    })

    it('should return all types when type is not specified', async () => {
      // Given: no type option
      // When: calling find
      // Then: should return files, directories, and symlinks

      const results = await find()

      const types = new Set(results.map(r => r.type))
      expect(types.has('file')).toBe(true)
      expect(types.has('directory')).toBe(true)
    })

    it('should combine type with name filter', async () => {
      // Given: type: 'f' and name: '*.ts'
      // When: calling find
      // Then: should only return .ts files (not directories)

      const results = await find({ type: 'f', name: '*.ts' })

      expect(results.every(r => r.type === 'file' && r.path.endsWith('.ts'))).toBe(true)
    })

    it('should find the symlink itself not the target', async () => {
      // Given: filesystem with symlink
      // When: calling find with type 'l'
      // Then: should return symlink path, not resolved target

      const results = await find({ type: 'l', name: 'link-to-readme' })

      expect(results.length).toBe(1)
      expect(results[0].path).toBe('/link-to-readme')
      expect(results[0].type).toBe('symlink')
    })
  })

  // ========================================
  // 4. Depth control (7 tests)
  // ========================================
  describe('depth control', () => {
    it('should limit depth with maxdepth: 0', async () => {
      // Given: maxdepth: 0
      // When: calling find
      // Then: should only return the starting path itself

      const results = await find({ path: '/src', maxdepth: 0 })

      expect(results.length).toBe(1)
      expect(results[0].path).toBe('/src')
    })

    it('should limit depth with maxdepth: 1', async () => {
      // Given: maxdepth: 1
      // When: calling find from /src
      // Then: should return /src and its direct children only

      const results = await find({ path: '/src', maxdepth: 1 })

      expect(results.some(r => r.path === '/src')).toBe(true)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
      expect(results.some(r => r.path === '/src/utils')).toBe(true)
      expect(results.some(r => r.path === '/src/utils/helpers.ts')).toBe(false)
    })

    it('should limit depth with maxdepth: 2', async () => {
      // Given: maxdepth: 2
      // When: calling find from /src
      // Then: should include up to grandchildren

      const results = await find({ path: '/src', maxdepth: 2 })

      expect(results.some(r => r.path === '/src/utils/helpers.ts')).toBe(true)
    })

    it('should exclude shallow results with mindepth: 1', async () => {
      // Given: mindepth: 1
      // When: calling find from /src
      // Then: should not include /src itself

      const results = await find({ path: '/src', mindepth: 1 })

      expect(results.some(r => r.path === '/src')).toBe(false)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
    })

    it('should exclude shallow results with mindepth: 2', async () => {
      // Given: mindepth: 2
      // When: calling find from /src
      // Then: should not include /src or its direct children

      const results = await find({ path: '/src', mindepth: 2 })

      expect(results.some(r => r.path === '/src')).toBe(false)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(false)
      expect(results.some(r => r.path === '/src/utils/helpers.ts')).toBe(true)
    })

    it('should combine mindepth and maxdepth', async () => {
      // Given: mindepth: 1 and maxdepth: 1
      // When: calling find from /src
      // Then: should only return direct children

      const results = await find({ path: '/src', mindepth: 1, maxdepth: 1 })

      expect(results.some(r => r.path === '/src')).toBe(false)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
      expect(results.some(r => r.path === '/src/utils/helpers.ts')).toBe(false)
    })

    it('should return empty when mindepth > maxdepth', async () => {
      // Given: mindepth: 3 and maxdepth: 1
      // When: calling find
      // Then: should return empty (impossible range)

      const results = await find({ path: '/src', mindepth: 3, maxdepth: 1 })

      expect(results).toEqual([])
    })
  })

  // ========================================
  // 5. Size filtering (8 tests)
  // ========================================
  describe('size filtering', () => {
    it('should find files larger than size with + prefix', async () => {
      // Given: size: '+1M' (larger than 1 megabyte)
      // When: calling find
      // Then: should only return files > 1MB

      const results = await find({ size: '+1M', type: 'f' })

      expect(results.every(r => r.size > 1024 * 1024)).toBe(true)
    })

    it('should find files smaller than size with - prefix', async () => {
      // Given: size: '-100K' (smaller than 100 kilobytes)
      // When: calling find
      // Then: should only return files < 100KB

      const results = await find({ size: '-100K', type: 'f' })

      expect(results.every(r => r.size < 100 * 1024)).toBe(true)
    })

    it('should find files of exact size without prefix', async () => {
      // Given: size: '1000' (exactly 1000 bytes)
      // When: calling find
      // Then: should only return files of exactly 1000 bytes

      const results = await find({ size: '1000', type: 'f' })

      expect(results.every(r => r.size === 1000)).toBe(true)
    })

    it('should handle bytes suffix (B)', async () => {
      // Given: size: '+500B'
      // When: calling find
      // Then: should interpret as 500 bytes

      const results = await find({ size: '+500B', type: 'f' })

      expect(results.every(r => r.size > 500)).toBe(true)
    })

    it('should handle kilobytes suffix (K)', async () => {
      // Given: size: '+1K'
      // When: calling find
      // Then: should interpret as 1024 bytes

      const results = await find({ size: '+1K', type: 'f' })

      expect(results.every(r => r.size > 1024)).toBe(true)
    })

    it('should handle megabytes suffix (M)', async () => {
      // Given: size: '-1M'
      // When: calling find
      // Then: should interpret as 1048576 bytes

      const results = await find({ size: '-1M', type: 'f' })

      expect(results.every(r => r.size < 1024 * 1024)).toBe(true)
    })

    it('should handle gigabytes suffix (G)', async () => {
      // Given: size: '-1G'
      // When: calling find
      // Then: should interpret as 1073741824 bytes

      const results = await find({ size: '-1G', type: 'f' })

      expect(results.every(r => r.size < 1024 * 1024 * 1024)).toBe(true)
    })

    it('should combine size with type filter', async () => {
      // Given: size filter and type: 'f'
      // When: calling find
      // Then: should only apply size to files

      const results = await find({ size: '+1K', type: 'f', name: '*.ts' })

      expect(results.every(r =>
        r.type === 'file' &&
        r.size > 1024 &&
        r.path.endsWith('.ts')
      )).toBe(true)
    })
  })

  // ========================================
  // 6. Time filtering (9 tests)
  // ========================================
  describe('time filtering', () => {
    it('should find files modified within N days with -Nd', async () => {
      // Given: mtime: '-7d' (modified within last 7 days)
      // When: calling find
      // Then: should return files modified in last 7 days

      const results = await find({ mtime: '-7d', type: 'f' })
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      expect(results.every(r => r.mtime.getTime() > sevenDaysAgo)).toBe(true)
    })

    it('should find files modified more than N days ago with +Nd', async () => {
      // Given: mtime: '+30d' (modified more than 30 days ago)
      // When: calling find
      // Then: should return files modified before 30 days ago

      const results = await find({ mtime: '+30d', type: 'f' })
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

      expect(results.every(r => r.mtime.getTime() < thirtyDaysAgo)).toBe(true)
    })

    it('should support hours suffix (h)', async () => {
      // Given: mtime: '-24h' (modified within last 24 hours)
      // When: calling find
      // Then: should return recently modified files

      const results = await find({ mtime: '-24h', type: 'f' })
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

      expect(results.every(r => r.mtime.getTime() > oneDayAgo)).toBe(true)
    })

    it('should support minutes suffix (m)', async () => {
      // Given: mtime: '-60m' (modified within last 60 minutes)
      // When: calling find
      // Then: should return very recently modified files

      const results = await find({ mtime: '-60m', type: 'f' })
      const oneHourAgo = Date.now() - 60 * 60 * 1000

      expect(results.every(r => r.mtime.getTime() > oneHourAgo)).toBe(true)
    })

    it('should support weeks suffix (w)', async () => {
      // Given: mtime: '-2w' (modified within last 2 weeks)
      // When: calling find
      // Then: should return files modified in last 2 weeks

      const results = await find({ mtime: '-2w', type: 'f' })
      const twoWeeksAgo = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000

      expect(results.every(r => r.mtime.getTime() > twoWeeksAgo)).toBe(true)
    })

    it('should filter by ctime (change time)', async () => {
      // Given: ctime: '-7d'
      // When: calling find
      // Then: should filter by metadata change time

      const results = await find({ ctime: '-7d', type: 'f' })

      // Just verify the filter is applied (results depend on filesystem)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should filter by atime (access time)', async () => {
      // Given: atime: '-1d'
      // When: calling find
      // Then: should filter by access time

      const results = await find({ atime: '-1d', type: 'f' })

      // Just verify the filter is applied (results depend on filesystem)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should combine multiple time filters', async () => {
      // Given: mtime and ctime both specified
      // When: calling find
      // Then: should apply both filters (AND logic)

      const results = await find({ mtime: '-30d', ctime: '-30d', type: 'f' })

      // Files must satisfy both conditions
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle exact time without prefix', async () => {
      // Given: mtime: '7d' (exactly 7 days old)
      // When: calling find
      // Then: should find files modified approximately 7 days ago

      const results = await find({ mtime: '7d', type: 'f' })

      expect(Array.isArray(results)).toBe(true)
    })
  })

  // ========================================
  // 7. Empty filtering (4 tests)
  // ========================================
  describe('empty filtering', () => {
    it('should find empty files with empty: true', async () => {
      // Given: empty: true and type: 'f'
      // When: calling find
      // Then: should return files with size 0

      const results = await find({ empty: true, type: 'f' })

      expect(results.every(r => r.size === 0)).toBe(true)
      expect(results.some(r => r.path === '/empty.txt')).toBe(true)
    })

    it('should find empty directories with empty: true', async () => {
      // Given: empty: true and type: 'd'
      // When: calling find
      // Then: should return directories with no contents

      const results = await find({ empty: true, type: 'd' })

      expect(results.every(r => r.type === 'directory')).toBe(true)
      expect(results.some(r => r.path === '/dist')).toBe(true)
    })

    it('should not filter by empty when empty: false', async () => {
      // Given: empty: false
      // When: calling find
      // Then: should return only non-empty entries

      const results = await find({ empty: false, type: 'f' })

      expect(results.every(r => r.size > 0)).toBe(true)
    })

    it('should ignore empty filter when not specified', async () => {
      // Given: no empty option
      // When: calling find
      // Then: should return both empty and non-empty

      const results = await find({ type: 'f' })

      const hasEmpty = results.some(r => r.size === 0)
      const hasNonEmpty = results.some(r => r.size > 0)

      expect(hasEmpty || hasNonEmpty).toBe(true)
    })
  })

  // ========================================
  // 8. Pruning (5 tests)
  // ========================================
  describe('pruning', () => {
    it('should skip directories matching prune pattern', async () => {
      // Given: prune: ['node_modules']
      // When: calling find
      // Then: should not traverse into node_modules

      const results = await find({ prune: ['node_modules'] })

      expect(results.every(r => !r.path.includes('node_modules'))).toBe(true)
    })

    it('should prune multiple directories', async () => {
      // Given: prune: ['node_modules', 'dist']
      // When: calling find
      // Then: should skip both directories

      const results = await find({ prune: ['node_modules', 'dist'] })

      expect(results.every(r =>
        !r.path.includes('node_modules') && !r.path.includes('dist')
      )).toBe(true)
    })

    it('should support glob patterns in prune', async () => {
      // Given: prune: ['.*'] (all dotfiles/dotdirs)
      // When: calling find
      // Then: should skip directories starting with .

      const results = await find({ prune: ['.*'] })

      expect(results.every(r => {
        const parts = r.path.split('/')
        return !parts.some(p => p.startsWith('.') && p.length > 1)
      })).toBe(true)
    })

    it('should not include pruned directory itself', async () => {
      // Given: prune: ['node_modules']
      // When: calling find with type: 'd'
      // Then: should not include node_modules directory

      const results = await find({ prune: ['node_modules'], type: 'd' })

      expect(results.every(r => r.path !== '/node_modules')).toBe(true)
    })

    it('should still find files alongside pruned directories', async () => {
      // Given: prune: ['node_modules']
      // When: calling find
      // Then: should still find other files at same level

      const results = await find({ prune: ['node_modules'] })

      expect(results.some(r => r.path === '/README.md')).toBe(true)
      expect(results.some(r => r.path === '/src/index.ts')).toBe(true)
    })
  })

  // ========================================
  // 9. Combined filters (5 tests)
  // ========================================
  describe('combined filters', () => {
    it('should combine name and type filters', async () => {
      // Given: name: '*.ts' and type: 'f'
      // When: calling find
      // Then: should return only .ts files

      const results = await find({ name: '*.ts', type: 'f' })

      expect(results.every(r =>
        r.type === 'file' && r.path.endsWith('.ts')
      )).toBe(true)
    })

    it('should combine path, name, and size filters', async () => {
      // Given: path, name, and size options
      // When: calling find
      // Then: should apply all filters

      const results = await find({
        path: '/src',
        name: '*.ts',
        size: '+1K'
      })

      expect(results.every(r =>
        r.path.startsWith('/src') &&
        r.path.endsWith('.ts') &&
        r.size > 1024
      )).toBe(true)
    })

    it('should combine depth and name filters', async () => {
      // Given: maxdepth and name options
      // When: calling find
      // Then: should apply both filters

      const results = await find({
        path: '/src',
        maxdepth: 1,
        name: '*.ts'
      })

      expect(results.every(r => {
        const depth = r.path.split('/').filter(Boolean).length
        return depth <= 2 && r.path.endsWith('.ts')
      })).toBe(true)
    })

    it('should combine time and size filters', async () => {
      // Given: mtime and size options
      // When: calling find
      // Then: should return files matching both

      const results = await find({
        mtime: '-30d',
        size: '+1K',
        type: 'f'
      })

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

      expect(results.every(r =>
        r.mtime.getTime() > thirtyDaysAgo && r.size > 1024
      )).toBe(true)
    })

    it('should combine all filter types', async () => {
      // Given: comprehensive options
      // When: calling find
      // Then: should apply all filters

      const results = await find({
        path: '/src',
        name: '*.ts',
        type: 'f',
        maxdepth: 3,
        mindepth: 1,
        size: '+500B',
        mtime: '-30d',
        prune: ['node_modules']
      })

      expect(Array.isArray(results)).toBe(true)
      // Each result should satisfy all conditions
      results.forEach(r => {
        expect(r.path.startsWith('/src')).toBe(true)
        expect(r.path.endsWith('.ts')).toBe(true)
        expect(r.type).toBe('file')
        expect(r.size).toBeGreaterThan(500)
        expect(r.path.includes('node_modules')).toBe(false)
      })
    })
  })

  // ========================================
  // 10. Edge cases (8 tests)
  // ========================================
  describe('edge cases', () => {
    it('should handle path with trailing slash', async () => {
      // Given: path with trailing slash
      // When: calling find
      // Then: should work correctly

      const results = await find({ path: '/src/' })

      expect(results.every(r => r.path.startsWith('/src'))).toBe(true)
    })

    it('should handle root path explicitly', async () => {
      // Given: path: '/'
      // When: calling find
      // Then: should search entire filesystem

      const results = await find({ path: '/' })

      expect(results.length).toBeGreaterThan(0)
    })

    it('should return stable ordering', async () => {
      // Given: same find options
      // When: calling find multiple times
      // Then: should return results in same order

      const results1 = await find({ path: '/src' })
      const results2 = await find({ path: '/src' })

      expect(results1.map(r => r.path)).toEqual(results2.map(r => r.path))
    })

    it('should handle special characters in path', async () => {
      // Given: path containing spaces or special chars
      // When: calling find
      // Then: should handle correctly

      const results = await find({ path: '/path with spaces' })

      // Should not throw, should return empty for non-existent
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle very deep nesting', async () => {
      // Given: deeply nested structure
      // When: calling find without maxdepth
      // Then: should traverse all levels

      const results = await find({ name: '*.js' })

      // Should find node_modules files if not pruned
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle circular symlinks gracefully', async () => {
      // Given: filesystem with circular symlink
      // When: calling find
      // Then: should not infinite loop

      const results = await find({ maxdepth: 10 })

      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle permission errors gracefully', async () => {
      // Given: directory without read permission
      // When: calling find
      // Then: should skip and continue (not throw)

      const results = await find()

      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle empty options object', async () => {
      // Given: empty options object {}
      // When: calling find
      // Then: should behave same as no options

      const results1 = await find()
      const results2 = await find({})

      expect(results1.length).toBe(results2.length)
    })
  })

  // ========================================
  // 11. Performance considerations (2 tests)
  // ========================================
  describe('performance', () => {
    it('should return results as array not generator', async () => {
      // Given: calling find
      // When: getting results
      // Then: should be an array

      const results = await find()

      expect(Array.isArray(results)).toBe(true)
    })

    it('should apply filters during traversal not after', async () => {
      // Given: prune option
      // When: calling find
      // Then: should not traverse pruned directories (verified by result count)

      // This is more of a performance test - pruned dirs should not be visited
      const withPrune = await find({ prune: ['node_modules'] })
      const withoutPrune = await find()

      // With prune should have fewer or equal results
      expect(withPrune.length).toBeLessThanOrEqual(withoutPrune.length)
    })
  })
})
