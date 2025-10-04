/**
 * Integration tests for queue handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleQueueMessage } from '../src/queue'
import type { Env } from '../src/types'

describe('Queue Handler', () => {
  let mockEnv: Env
  let mockBatch: any

  beforeEach(() => {
    mockEnv = {
      DB: {
        query: vi.fn(),
      },
      GITHUB_TOKEN: 'test-token',
    } as any

    // Mock syncToGitHub globally
    vi.mock('../src/handlers/github', () => ({
      syncToGitHub: vi.fn().mockResolvedValue({
        success: true,
        type: 'commit',
        commit: { sha: 'abc123' },
      }),
    }))
  })

  describe('handleQueueMessage', () => {
    it('should process sync job with entity from database', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'test-note',
        repository: 'dot-do/notes',
        path: 'test-note.mdx',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      // Mock database query to return entity
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [
          {
            ns: 'note',
            id: 'test-note',
            type: 'Note',
            data: JSON.stringify({ title: 'Test' }),
            content: 'Content',
            github_url: 'https://github.com/dot-do/notes',
            github_path: 'test-note.mdx',
          },
        ],
      })

      await handleQueueMessage(mockBatch, mockEnv)

      expect(mockMessage.ack).toHaveBeenCalled()
      expect(mockMessage.retry).not.toHaveBeenCalled()
    })

    it('should process sync job with provided content', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'test-note',
        repository: 'dot-do/notes',
        path: 'test-note.mdx',
        content: '---\n$id: note/test-note\n$type: Note\n---\n\nContent',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      await handleQueueMessage(mockBatch, mockEnv)

      expect(mockMessage.ack).toHaveBeenCalled()
    })

    it('should ack message if entity not found', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'nonexistent',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [],
      })

      await handleQueueMessage(mockBatch, mockEnv)

      // Should ack to avoid infinite retries
      expect(mockMessage.ack).toHaveBeenCalled()
      expect(mockMessage.retry).not.toHaveBeenCalled()
    })

    it('should ack message if repository or path missing', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'test-note',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [
          {
            ns: 'note',
            id: 'test-note',
            type: 'Note',
            data: JSON.stringify({ title: 'Test' }),
            content: 'Content',
            github_url: null,
            github_path: null,
          },
        ],
      })

      await handleQueueMessage(mockBatch, mockEnv)

      // Should ack to avoid infinite retries
      expect(mockMessage.ack).toHaveBeenCalled()
      expect(mockMessage.retry).not.toHaveBeenCalled()
    })

    it('should retry message on sync failure', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'test-note',
        repository: 'dot-do/notes',
        path: 'test-note.mdx',
        content: '---\n$id: note/test-note\n$type: Note\n---\n\nContent',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      // Mock syncToGitHub to throw error
      const { syncToGitHub } = await import('../src/handlers/github')
      vi.mocked(syncToGitHub).mockRejectedValueOnce(new Error('Sync failed'))

      await handleQueueMessage(mockBatch, mockEnv)

      expect(mockMessage.retry).toHaveBeenCalled()
      expect(mockMessage.ack).not.toHaveBeenCalled()
    })

    it('should process multiple messages in batch', async () => {
      const messages = [
        {
          body: {
            type: 'sync' as const,
            ns: 'note',
            id: 'note-1',
            repository: 'dot-do/notes',
            path: 'note-1.mdx',
            content: '---\n$id: note/note-1\n$type: Note\n---\n\nContent 1',
          },
          ack: vi.fn(),
          retry: vi.fn(),
        },
        {
          body: {
            type: 'sync' as const,
            ns: 'note',
            id: 'note-2',
            repository: 'dot-do/notes',
            path: 'note-2.mdx',
            content: '---\n$id: note/note-2\n$type: Note\n---\n\nContent 2',
          },
          ack: vi.fn(),
          retry: vi.fn(),
        },
      ]

      mockBatch = { messages }

      await handleQueueMessage(mockBatch, mockEnv)

      expect(messages[0].ack).toHaveBeenCalled()
      expect(messages[1].ack).toHaveBeenCalled()
    })

    it('should handle delete job type', async () => {
      const deleteJob = {
        type: 'delete' as const,
        ns: 'note',
        id: 'test-note',
      }

      const mockMessage = {
        body: deleteJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      await handleQueueMessage(mockBatch, mockEnv)

      // Delete not yet implemented, should ack
      expect(mockMessage.ack).toHaveBeenCalled()
    })
  })

  describe('MDX Reconstruction', () => {
    it('should reconstruct MDX with $id and $type', async () => {
      const syncJob = {
        type: 'sync' as const,
        ns: 'note',
        id: 'test-note',
        repository: 'dot-do/notes',
        path: 'test-note.mdx',
      }

      const mockMessage = {
        body: syncJob,
        ack: vi.fn(),
        retry: vi.fn(),
      }

      mockBatch = {
        messages: [mockMessage],
      }

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        results: [
          {
            ns: 'note',
            id: 'test-note',
            type: 'Note',
            data: JSON.stringify({
              title: 'Test Note',
              author: 'Alice',
              tags: ['test', 'sample'],
            }),
            content: 'This is the content.',
            github_url: 'https://github.com/dot-do/notes',
            github_path: 'test-note.mdx',
          },
        ],
      })

      const { syncToGitHub } = await import('../src/handlers/github')

      await handleQueueMessage(mockBatch, mockEnv)

      expect(syncToGitHub).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('$id: note/test-note'),
        }),
        mockEnv
      )

      expect(syncToGitHub).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('$type: Note'),
        }),
        mockEnv
      )

      expect(mockMessage.ack).toHaveBeenCalled()
    })
  })
})
