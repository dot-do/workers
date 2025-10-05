/**
 * Asset Storage Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AssetStorage } from '../src/storage'
import type { StorageEnv } from '../src/storage'

// Mock R2 and R2 SQL
class MockR2Bucket {
  private store = new Map<string, { content: ArrayBuffer; metadata: Record<string, string> }>()

  async put(key: string, content: string | ArrayBuffer, options?: any): Promise<void> {
    const buffer = typeof content === 'string' ? new TextEncoder().encode(content) : content
    this.store.set(key, {
      content: buffer,
      metadata: options?.customMetadata || {},
    })
  }

  async get(key: string): Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null> {
    const item = this.store.get(key)
    if (!item) return null
    return {
      arrayBuffer: async () => item.content,
    }
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
  }

  async exec(query: string, ...params: unknown[]): Promise<{ rows: unknown[]; rowsAffected: number }> {
    // Simple mock implementation
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

    if (query.includes('SELECT * FROM mdx_files WHERE repo')) {
      const [repo, path] = params
      const rows = this.tables.mdx_files.filter(f => f.repo === repo && f.path === path)
      return { rows, rowsAffected: 0 }
    }

    if (query.includes('SELECT * FROM mdx_files WHERE id')) {
      const [id] = params
      const rows = this.tables.mdx_files.filter(f => f.id === id)
      return { rows, rowsAffected: 0 }
    }

    if (query.includes('SELECT * FROM mdx_assets WHERE file_id')) {
      const [file_id, type] = params
      const rows = this.tables.mdx_assets.filter(a => a.file_id === file_id && (!type || a.type === type))
      return { rows, rowsAffected: 0 }
    }

    return { rows: [], rowsAffected: 0 }
  }
}

describe('AssetStorage', () => {
  let storage: AssetStorage
  let env: StorageEnv

  beforeEach(() => {
    env = {
      MDX_ASSETS: new MockR2Bucket() as any,
      MDX_METADATA: new MockR2SqlDatabase() as any,
    }
    storage = new AssetStorage(env)
  })

  describe('storeFile', () => {
    it('should store MDX file metadata', async () => {
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/crm/index.mdx',
        content: '# Hello World',
        metadata: { title: 'Hello' },
      })

      expect(file).toBeDefined()
      expect(file.repo).toBe('apps')
      expect(file.path).toBe('apps/crm/index.mdx')
      expect(file.hash).toBeDefined()
      expect(file.size).toBeGreaterThan(0)
    })

    it('should calculate content hash correctly', async () => {
      const file1 = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test1.mdx',
        content: '# Test',
      })

      const file2 = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test2.mdx',
        content: '# Test',
      })

      // Same content = same hash
      expect(file1.hash).toBe(file2.hash)
    })
  })

  describe('storeAsset', () => {
    it('should store asset with content-addressed key', async () => {
      // First store a file
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test.mdx',
        content: '# Test',
      })

      // Then store an asset
      const asset = await storage.storeAsset({
        fileId: file.id,
        type: 'json',
        content: JSON.stringify({ title: 'Test' }),
        metadata: { compiler: 'test' },
      })

      expect(asset).toBeDefined()
      expect(asset.type).toBe('json')
      expect(asset.hash).toBeDefined()
      expect(asset.r2_key).toContain('json/')
    })

    it('should deduplicate identical content', async () => {
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test.mdx',
        content: '# Test',
      })

      const content = JSON.stringify({ title: 'Test' })

      const asset1 = await storage.storeAsset({
        fileId: file.id,
        type: 'json',
        content,
      })

      const asset2 = await storage.storeAsset({
        fileId: file.id,
        type: 'json',
        content,
      })

      // Should return same asset (deduplication)
      expect(asset1.hash).toBe(asset2.hash)
      expect(asset1.r2_key).toBe(asset2.r2_key)
    })
  })

  describe('getAsset', () => {
    it('should retrieve stored asset', async () => {
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test.mdx',
        content: '# Test',
      })

      const stored = await storage.storeAsset({
        fileId: file.id,
        type: 'html',
        content: '<h1>Test</h1>',
      })

      const retrieved = await storage.getAsset(file.id, 'html')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(stored.id)
      expect(retrieved?.type).toBe('html')
    })

    it('should return null for non-existent asset', async () => {
      const asset = await storage.getAsset('non-existent-id', 'json')
      expect(asset).toBeNull()
    })
  })

  describe('listAssets', () => {
    it('should list all assets for a file', async () => {
      const file = await storage.storeFile({
        repo: 'apps',
        path: 'apps/test.mdx',
        content: '# Test',
      })

      await storage.storeAsset({ fileId: file.id, type: 'json', content: '{}' })
      await storage.storeAsset({ fileId: file.id, type: 'html', content: '<div></div>' })
      await storage.storeAsset({ fileId: file.id, type: 'esm', content: 'export default {}' })

      const assets = await storage.listAssets(file.id)

      expect(assets).toHaveLength(3)
      expect(assets.map(a => a.type).sort()).toEqual(['esm', 'html', 'json'])
    })
  })
})
