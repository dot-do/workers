/**
 * Integration tests for conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveConflict, detectConflict } from '../src/conflicts'
import type { Env } from '../src/types'

describe('Conflict Resolution', () => {
  let mockEnv: Env
  let mockOctokit: any

  beforeEach(() => {
    mockEnv = {
      DB: {
        query: vi.fn(),
      },
      GITHUB_TOKEN: 'test-token',
    } as any

    mockOctokit = {
      repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
      },
    }
  })

  describe('detectConflict', () => {
    it('should return null if no previous sync exists', async () => {
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [],
      })

      const conflict = await detectConflict(
        mockOctokit,
        'dot-do',
        'notes',
        'test.mdx',
        'main',
        'abc123',
        mockEnv
      )

      expect(conflict).toBeNull()
    })

    it('should return null if SHAs match', async () => {
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [
          {
            ns: 'note',
            id: 'test',
            github_sha: 'abc123',
            data: JSON.stringify({ title: 'Test' }),
            content: 'Content',
          },
        ],
      })

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          sha: 'abc123',
          content: Buffer.from('---\ntitle: Test\n---\n\nContent').toString('base64'),
        },
      })

      const conflict = await detectConflict(
        mockOctokit,
        'dot-do',
        'notes',
        'test.mdx',
        'main',
        'abc123',
        mockEnv
      )

      expect(conflict).toBeNull()
    })

    it('should detect conflict when SHAs differ', async () => {
      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({
          results: [
            {
              ns: 'note',
              id: 'test',
              github_sha: 'old123',
              data: JSON.stringify({ title: 'Old Title' }),
              content: 'Old content',
              type: 'Note',
            },
          ],
        })
        .mockResolvedValueOnce({ success: true }) // Store conflict

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          sha: 'new456',
          content: Buffer.from('---\ntitle: New Title\n---\n\nNew content').toString('base64'),
        },
      })

      const conflict = await detectConflict(
        mockOctokit,
        'dot-do',
        'notes',
        'test.mdx',
        'main',
        'old123',
        mockEnv
      )

      expect(conflict).not.toBeNull()
      expect(conflict?.databaseSha).toBe('old123')
      expect(conflict?.githubSha).toBe('new456')
      expect(conflict?.status).toBe('pending')
    })
  })

  describe('resolveConflict - ours strategy', () => {
    it('should push database version to GitHub', async () => {
      const conflictData = {
        id: 'conflict123',
        ns: 'note',
        entity_id: 'test',
        repository: 'dot-do/notes',
        path: 'test.mdx',
        branch: 'main',
        database_sha: 'old123',
        github_sha: 'new456',
        database_content: '---\ntitle: Database\n---\n\nDatabase content',
        github_content: '---\ntitle: GitHub\n---\n\nGitHub content',
        status: 'pending',
      }

      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({ results: [conflictData] }) // Get conflict
        .mockResolvedValueOnce({ success: true }) // Update things
        .mockResolvedValueOnce({ success: true }) // Mark resolved

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'resolved123' },
        },
      })

      const result = await resolveConflict('conflict123', 'ours', mockEnv)

      expect(result.success).toBe(true)
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'dot-do',
          repo: 'notes',
          path: 'test.mdx',
          sha: 'new456',
        })
      )
    })
  })

  describe('resolveConflict - theirs strategy', () => {
    it('should update database with GitHub version', async () => {
      const conflictData = {
        id: 'conflict123',
        ns: 'note',
        entity_id: 'test',
        repository: 'dot-do/notes',
        path: 'test.mdx',
        branch: 'main',
        database_sha: 'old123',
        github_sha: 'new456',
        database_content: '---\n$id: note/test\n$type: Note\ntitle: Database\n---\n\nDatabase content',
        github_content: '---\n$id: note/test\n$type: Note\ntitle: GitHub\n---\n\nGitHub content',
        status: 'pending',
      }

      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({ results: [conflictData] }) // Get conflict
        .mockResolvedValueOnce({ success: true }) // Update things
        .mockResolvedValueOnce({ success: true }) // Mark resolved

      const result = await resolveConflict('conflict123', 'theirs', mockEnv)

      expect(result.success).toBe(true)
      expect(mockEnv.DB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('UPDATE things SET type = ?'),
        })
      )
    })
  })

  describe('resolveConflict - merge strategy', () => {
    it('should merge both versions and push to GitHub', async () => {
      const conflictData = {
        id: 'conflict123',
        ns: 'note',
        entity_id: 'test',
        repository: 'dot-do/notes',
        path: 'test.mdx',
        branch: 'main',
        database_sha: 'old123',
        github_sha: 'new456',
        database_content: '---\n$id: note/test\n$type: Note\ntitle: Database\nauthor: Alice\n---\n\nDatabase content',
        github_content: '---\n$id: note/test\n$type: Note\ntitle: GitHub\ntags: [test]\n---\n\nGitHub content',
        status: 'pending',
      }

      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({ results: [conflictData] }) // Get conflict
        .mockResolvedValueOnce({ success: true }) // Update things
        .mockResolvedValueOnce({ success: true }) // Mark resolved

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'merged789' },
        },
      })

      const result = await resolveConflict('conflict123', 'merge', mockEnv)

      expect(result.success).toBe(true)
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalled()
    })
  })

  describe('resolveConflict - error handling', () => {
    it('should return error if conflict not found', async () => {
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [],
      })

      const result = await resolveConflict('nonexistent', 'ours', mockEnv)

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })

    it('should return error if conflict already resolved', async () => {
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'conflict123',
            status: 'resolved',
          },
        ],
      })

      const result = await resolveConflict('conflict123', 'ours', mockEnv)

      expect(result.success).toBe(false)
      expect(result.message).toContain('already resolved')
    })

    it('should mark conflict as failed if resolution throws', async () => {
      const conflictData = {
        id: 'conflict123',
        ns: 'note',
        entity_id: 'test',
        repository: 'dot-do/notes',
        path: 'test.mdx',
        branch: 'main',
        database_sha: 'old123',
        github_sha: 'new456',
        database_content: '---\n$id: note/test\n$type: Note\n---\n\nContent',
        github_content: '---\n$id: note/test\n$type: Note\n---\n\nContent',
        status: 'pending',
      }

      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({ results: [conflictData] }) // Get conflict
        .mockResolvedValueOnce({ success: true }) // Mark failed

      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue(
        new Error('GitHub API error')
      )

      const result = await resolveConflict('conflict123', 'ours', mockEnv)

      expect(result.success).toBe(false)
      expect(mockEnv.DB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining("status = 'failed'"),
        })
      )
    })
  })
})
