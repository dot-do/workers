/**
 * Tests for videos.as upload functionality
 * Tests the worker implementation directly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the RPC wrapper
vi.mock('@dotdo/rpc', () => ({
  RPC: (api: any) => api,
}))

// Import the worker API after mocking
let videosAPI: any

beforeEach(async () => {
  // Dynamic import to ensure mocks are applied
  const module = await import('../../../workers/videos/index')
  videosAPI = module.default

  // Mock fetch globally
  global.fetch = vi.fn()
})

describe('videos.as upload', () => {
  let mockEnv: any

  beforeEach(() => {
    // Mock environment variables
    mockEnv = {
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      CLOUDFLARE_API_TOKEN: 'test-api-token',
    }

    vi.clearAllMocks()
  })

  describe('TUS resumable upload', () => {
    it('should upload video using TUS protocol', async () => {
      const mockVideoBuffer = new ArrayBuffer(1024)
      const mockVideoId = 'test-video-123'
      const mockUploadUrl = `https://api.cloudflare.com/client/v4/accounts/test-account-id/stream/${mockVideoId}`

      // Mock TUS session creation
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([
            ['location', mockUploadUrl],
            ['stream-media-id', mockVideoId],
          ]),
        })
      )

      // Mock TUS upload PATCH
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
        })
      )

      // Mock get video details
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: {
                uid: mockVideoId,
                meta: {
                  name: 'Test Video',
                  description: 'Test Description',
                },
                duration: 120,
                status: {
                  state: 'ready',
                },
                requireSignedURLs: false,
                thumbnail: `https://customer-test-vid.cloudflarestream.com/${mockVideoId}/thumbnails/thumbnail.jpg`,
                playback: {
                  hls: `https://customer-test-vid.cloudflarestream.com/${mockVideoId}/manifest/video.m3u8`,
                },
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              },
            }),
        })
      )

      const video = await videosAPI.upload(
        {
          file: mockVideoBuffer,
          title: 'Test Video',
          description: 'Test Description',
        },
        mockEnv
      )

      expect(video).toBeDefined()
      expect(video.id).toBe(mockVideoId)
      expect(video.title).toBe('Test Video')
      expect(video.description).toBe('Test Description')
      expect(video.status).toBe('ready')
      expect(video.duration).toBe(120)
      expect(video.url).toContain(mockVideoId)
      expect(video.hlsUrl).toContain(mockVideoId)
      expect(video.embedCode).toContain('iframe')
    })

    it('should handle TUS upload with metadata', async () => {
      const mockVideoBuffer = new ArrayBuffer(2048)
      const mockVideoId = 'test-video-456'

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([
            ['location', `https://api.cloudflare.com/stream/${mockVideoId}`],
            ['stream-media-id', mockVideoId],
          ]),
        })
      )

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({ ok: true })
      )

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: {
                uid: mockVideoId,
                meta: {
                  name: 'Tutorial Video',
                  description: 'How to use videos.as',
                  folder: 'tutorials',
                  tags: 'tutorial,demo',
                },
                duration: 300,
                status: { state: 'ready' },
                requireSignedURLs: true,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              },
            }),
        })
      )

      const video = await videosAPI.upload(
        {
          file: mockVideoBuffer,
          title: 'Tutorial Video',
          description: 'How to use videos.as',
          folder: 'tutorials',
          tags: ['tutorial', 'demo'],
          visibility: 'private',
          allowedDomains: ['example.com'],
        },
        mockEnv
      )

      expect(video.id).toBe(mockVideoId)
      expect(video.title).toBe('Tutorial Video')
      expect(video.folder).toBe('tutorials')
      expect(video.tags).toContain('tutorial')
      expect(video.visibility).toBe('private')
    })

    it('should handle TUS upload errors', async () => {
      const mockVideoBuffer = new ArrayBuffer(1024)

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('TUS session creation failed'),
        })
      )

      await expect(
        videosAPI.upload(
          {
            file: mockVideoBuffer,
            title: 'Test Video',
          },
          mockEnv
        )
      ).rejects.toThrow('Failed to create TUS upload session')
    })
  })

  describe('URL upload', () => {
    it('should upload video from URL', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4'
      const mockVideoId = 'test-video-789'

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: {
                uid: mockVideoId,
                meta: {
                  name: 'URL Video',
                  description: 'Video from URL',
                },
                duration: 180,
                status: { state: 'processing' },
                requireSignedURLs: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              },
            }),
        })
      )

      const video = await videosAPI.upload(
        {
          file: mockVideoUrl,
          title: 'URL Video',
          description: 'Video from URL',
        },
        mockEnv
      )

      expect(video).toBeDefined()
      expect(video.id).toBe(mockVideoId)
      expect(video.title).toBe('URL Video')
      expect(video.status).toBe('processing')
    })

    it('should handle URL upload with private visibility', async () => {
      const mockVideoUrl = 'https://example.com/private-video.mp4'
      const mockVideoId = 'test-video-private'

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              result: {
                uid: mockVideoId,
                meta: { name: 'Private Video' },
                duration: 60,
                status: { state: 'ready' },
                requireSignedURLs: true,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              },
            }),
        })
      )

      const video = await videosAPI.upload(
        {
          file: mockVideoUrl,
          title: 'Private Video',
          visibility: 'private',
          allowedDomains: ['secure.example.com'],
        },
        mockEnv
      )

      expect(video.visibility).toBe('private')
    })

    it('should handle URL upload errors', async () => {
      const mockVideoUrl = 'https://example.com/invalid.mp4'

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              errors: [{ message: 'Invalid video URL' }],
            }),
        })
      )

      await expect(
        videosAPI.upload(
          {
            file: mockVideoUrl,
            title: 'Invalid Video',
          },
          mockEnv
        )
      ).rejects.toThrow('Failed to upload video')
    })
  })

  describe('Configuration validation', () => {
    it('should throw error when missing credentials', async () => {
      const mockVideoBuffer = new ArrayBuffer(1024)

      await expect(
        videosAPI.upload(
          {
            file: mockVideoBuffer,
            title: 'Test Video',
          },
          {} // Empty env
        )
      ).rejects.toThrow('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN')
    })

    it('should throw error for invalid file format', async () => {
      await expect(
        videosAPI.upload(
          {
            file: 123 as any, // Invalid type
            title: 'Test Video',
          },
          mockEnv
        )
      ).rejects.toThrow('Invalid file format')
    })
  })

  describe('Video status mapping', () => {
    it('should map Cloudflare Stream statuses correctly', async () => {
      const testCases = [
        { streamStatus: 'ready', expectedStatus: 'ready' },
        { streamStatus: 'inprogress', expectedStatus: 'processing' },
        { streamStatus: 'pendingupload', expectedStatus: 'processing' },
        { streamStatus: 'error', expectedStatus: 'error' },
        { streamStatus: 'queued', expectedStatus: 'error' },
      ]

      for (const testCase of testCases) {
        const mockVideoId = `test-video-${testCase.streamStatus}`

        ;(global.fetch as any).mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                result: {
                  uid: mockVideoId,
                  meta: { name: 'Test' },
                  duration: 0,
                  status: { state: testCase.streamStatus },
                  requireSignedURLs: false,
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
              }),
          })
        )

        const video = await videosAPI.get(mockVideoId, mockEnv)
        expect(video.status).toBe(testCase.expectedStatus)
      }
    })
  })
})
