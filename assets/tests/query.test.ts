/**
 * Query API Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AssetQuery } from '../src/query'
import { AssetStorage } from '../src/storage'
import type { StorageEnv } from '../src/storage'

// Reuse mocks from storage.test.ts
class MockR2Bucket {
  private store = new Map<string, { content: ArrayBuffer; metadata: Record<string, string> }>()

  async put(key: string, content: string | ArrayBuffer, options?: any): Promise<void> {
    const buffer = typeof content === 'string' ? new TextEncoder().encode(content) : content
    this.store.set(key, { content: buffer, metadata: options?.customMetadata || {} })
  }

  async get(key: string): Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null> {
    const item = this.store.get(key)
    if (!item) return null
    return { arrayBuffer: async () => item.content }
  }

  async head(key: string): Promise<{ size: number } | null> {
    const item = this.store.get(key)
    return item ? { size: item.content.byteLength } : null
  }
}

class MockR2SqlDatabase {
  private tables: Record<string, any[]> = {
    mdx_files: [],
    mdx_assets: [],
    mdx_dependencies: [],
  }

  async exec(query: string, ...params: unknown[]): Promise<{ rows: unknown[]; rowsAffected: number }> {
    if (query.includes('INSERT INTO mdx_files')) {
      const [id, repo, path, hash, size, created_at, updated_at, metadata] = params
      this.tables.mdx_files.push({ id, repo, path, hash, size, created_at, updated_at, metadata })
      return { rows: [], rowsAffected: 1 }
    }

    if (query.includes('INSERT INTO mdx_assets')) {
      const [id, file_id, type, hash, size, r2_key, created_at, metadata] = params
      this.tables.mdx_assets.push({ id, file_id, type, hash, size, r2_key, created_at, metadata })
      return { rows: [], rowsAffected: 1 }
    }

    if (query.includes('JOIN mdx_files f ON a.file_id = f.id')) {
      // findAssetsByPath or findAssetsByHash
      const [searchValue] = params
      let rows: any[] = []

      if (query.includes('f.repo = ? AND f.path = ?')) {
        const [repo, path] = params
        const files = this.tables.mdx_files.filter(f => f.repo === repo && f.path === path)
        for (const file of files) {
          const assets = this.tables.mdx_assets.filter(a => a.file_id === file.id)
          rows.push(...assets.map(a => ({ ...a, ...file })))
        }
      } else if (query.includes('a.hash = ?')) {
        const hash = params[0]
        const assets = this.tables.mdx_assets.filter(a => a.hash === hash)
        for (const asset of assets) {
          const file = this.tables.mdx_files.find(f => f.id === asset.file_id)
          if (file) rows.push({ ...asset, ...file })
        }
      }

      return { rows, rowsAffected: 0 }
    }

    if (query.includes('COUNT(*) as count')) {
      // Stats queries
      const repo = params[0]
      const files = this.tables.mdx_files.filter(f => f.repo === repo)
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0)

      return {
        rows: [{ count: files.length, total_size: totalSize }],
        rowsAffected: 0,
      }
    }

    return { rows: [], rowsAffected: 0 }
  }
}

describe('AssetQuery', () => {
  let query: AssetQuery
  let storage: AssetStorage
  let env: StorageEnv

  beforeEach(() => {
    env = {
      MDX_ASSETS: new MockR2Bucket() as any,
      MDX_METADATA: new MockR2SqlDatabase() as any,
    }
    query = new AssetQuery(env)
    storage = new AssetStorage(env)
  })

  describe('findAssetsByPath', () => {
    it('should find assets by repo and path', async () => {
      // Create test file and assets
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/crm/index.mdx',
        content: '# CRM App',
      })

      await storage.storeAsset({
        fileId: file.id,
        type: 'json',
        content: JSON.stringify({ title: 'CRM' }),
      })

      await storage.storeAsset({
        fileId: file.id,
        type: 'html',
        content: '<h1>CRM App</h1>',
      })

      const assets = await query.findAssetsByPath('apps', 'apps/crm/index.mdx')

      expect(assets.length).toBeGreaterThan(0)
      expect(assets[0].file.repo).toBe('apps')
      expect(assets[0].file.path).toBe('apps/crm/index.mdx')
    })
  })

  describe('findAssetsByHash', () => {
    it('should find all assets with same content hash', async () => {
      const content = JSON.stringify({ title: 'Shared' })

      // Create two files with same asset content
      const file1 = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test1.mdx',
        content: '# Test 1',
      })

      const file2 = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test2.mdx',
        content: '# Test 2',
      })

      const asset1 = await storage.storeAsset({
        fileId: file1.id,
        type: 'json',
        content,
      })

      await storage.storeAsset({
        fileId: file2.id,
        type: 'json',
        content,
      })

      const duplicates = await query.findAssetsByHash(asset1.hash)

      expect(duplicates.length).toBe(2)
      expect(duplicates.every(a => a.hash === asset1.hash)).toBe(true)
    })
  })

  describe('getRepoStats', () => {
    it('should calculate repository statistics', async () => {
      // Create test files
      await storage.storeFile({ repo: 'apps', path: 'apps/crm.mdx', content: '# CRM' })
      await storage.storeFile({ repo: 'apps', path: 'apps/erp.mdx', content: '# ERP' })

      const stats = await query.getRepoStats('apps')

      expect(stats.fileCount).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
    })
  })
})
