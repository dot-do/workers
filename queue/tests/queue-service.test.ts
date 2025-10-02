/**
 * Queue Service Tests
 *
 * Tests for the QueueService RPC class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueueService } from '../src/index'
import type { QueueJob } from '../src/index'

describe('QueueService', () => {
  let service: QueueService
  let mockEnv: any
  let mockCtx: any

  beforeEach(() => {
    // Mock DB service
    const mockDB = {
      upsert: vi.fn().mockResolvedValue({ success: true }),
      get: vi.fn().mockResolvedValue({
        data: {
          data: {
            id: 'test-job-id',
            type: 'test-job',
            payload: { test: 'data' },
            status: 'pending',
            priority: 0,
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      }),
      list: vi.fn().mockResolvedValue({
        data: [
          {
            data: {
              id: 'job-1',
              type: 'test',
              payload: {},
              status: 'completed',
              priority: 0,
              attempts: 1,
              maxAttempts: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          {
            data: {
              id: 'job-2',
              type: 'test',
              payload: {},
              status: 'pending',
              priority: 0,
              attempts: 0,
              maxAttempts: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      }),
    }

    // Mock Queue
    const mockQueue = {
      send: vi.fn().mockResolvedValue(undefined),
    }

    mockEnv = {
      DB: mockDB,
      JOB_QUEUE: mockQueue,
    }

    mockCtx = {}

    service = new QueueService(mockCtx, mockEnv)
  })

  describe('enqueue', () => {
    it('should enqueue a job successfully', async () => {
      const job: QueueJob = {
        type: 'send-email',
        payload: { to: 'test@example.com', subject: 'Test', body: 'Test body' },
        priority: 1,
        maxAttempts: 5,
      }

      const jobId = await service.enqueue(job)

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')
      expect(mockEnv.DB.upsert).toHaveBeenCalled()
      expect(mockEnv.JOB_QUEUE.send).toHaveBeenCalled()
    })

    it('should use default values for optional fields', async () => {
      const job: QueueJob = {
        type: 'test-job',
        payload: { test: 'data' },
      }

      await service.enqueue(job)

      const upsertCall = mockEnv.DB.upsert.mock.calls[0]
      const jobData = upsertCall[0][0].data

      expect(jobData.priority).toBe(0)
      expect(jobData.maxAttempts).toBe(3)
      expect(jobData.attempts).toBe(0)
      expect(jobData.status).toBe('pending')
    })

    it('should handle scheduled jobs', async () => {
      const scheduledFor = new Date(Date.now() + 3600000) // 1 hour from now

      const job: QueueJob = {
        type: 'scheduled-job',
        payload: { test: 'data' },
        scheduledFor,
      }

      await service.enqueue(job)

      const queueCall = mockEnv.JOB_QUEUE.send.mock.calls[0][0]
      expect(queueCall.scheduledFor).toBe(scheduledFor.toISOString())
    })
  })

  describe('getJob', () => {
    it('should retrieve a job by ID', async () => {
      const job = await service.getJob('test-job-id')

      expect(job).toBeDefined()
      expect(job?.id).toBe('test-job-id')
      expect(job?.type).toBe('test-job')
      expect(mockEnv.DB.get).toHaveBeenCalledWith('queue/test-job-id')
    })

    it('should return null for non-existent job', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({ data: null })

      const job = await service.getJob('non-existent')

      expect(job).toBeNull()
    })
  })

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      await service.updateJobStatus('test-job-id', 'processing')

      expect(mockEnv.DB.upsert).toHaveBeenCalled()

      const upsertCall = mockEnv.DB.upsert.mock.calls[0]
      const jobData = upsertCall[0][0].data

      expect(jobData.status).toBe('processing')
      expect(jobData.updatedAt).toBeDefined()
    })

    it('should update job with result on completion', async () => {
      const result = { success: true, message: 'Job completed' }

      await service.updateJobStatus('test-job-id', 'completed', { result })

      const upsertCall = mockEnv.DB.upsert.mock.calls[0]
      const jobData = upsertCall[0][0].data

      expect(jobData.status).toBe('completed')
      expect(jobData.result).toEqual(result)
      expect(jobData.completedAt).toBeDefined()
    })

    it('should update job with error on failure', async () => {
      const error = 'Job failed due to network error'

      await service.updateJobStatus('test-job-id', 'failed', {
        error,
        attempts: 3,
      })

      const upsertCall = mockEnv.DB.upsert.mock.calls[0]
      const jobData = upsertCall[0][0].data

      expect(jobData.status).toBe('failed')
      expect(jobData.error).toBe(error)
      expect(jobData.attempts).toBe(3)
    })

    it('should throw error for non-existent job', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({ data: null })

      await expect(service.updateJobStatus('non-existent', 'processing')).rejects.toThrow('Job non-existent not found')
    })
  })

  describe('retryJob', () => {
    it('should retry a failed job', async () => {
      const success = await service.retryJob('test-job-id')

      expect(success).toBe(true)
      expect(mockEnv.DB.upsert).toHaveBeenCalled()
      expect(mockEnv.JOB_QUEUE.send).toHaveBeenCalled()
    })

    it('should not retry job that exceeded max attempts', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({
        data: {
          data: {
            id: 'test-job-id',
            type: 'test-job',
            payload: {},
            status: 'failed',
            priority: 0,
            attempts: 3,
            maxAttempts: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })

      const success = await service.retryJob('test-job-id')

      expect(success).toBe(false)
      expect(mockEnv.JOB_QUEUE.send).not.toHaveBeenCalled()
    })

    it('should return false for non-existent job', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({ data: null })

      const success = await service.retryJob('non-existent')

      expect(success).toBe(false)
    })
  })

  describe('listJobs', () => {
    it('should list all jobs', async () => {
      const jobs = await service.listJobs()

      expect(jobs).toHaveLength(2)
      expect(jobs[0].id).toBe('job-1')
      expect(jobs[1].id).toBe('job-2')
    })

    it('should filter jobs by status', async () => {
      const jobs = await service.listJobs({ status: 'completed' })

      expect(jobs.length).toBeGreaterThan(0)
      jobs.forEach((job) => {
        expect(job.status).toBe('completed')
      })
    })

    it('should filter jobs by type', async () => {
      const jobs = await service.listJobs({ type: 'test' })

      expect(jobs.length).toBeGreaterThan(0)
      jobs.forEach((job) => {
        expect(job.type).toBe('test')
      })
    })

    it('should apply pagination', async () => {
      const jobs = await service.listJobs({ limit: 1, offset: 0 })

      expect(jobs).toHaveLength(1)
      expect(jobs[0].id).toBe('job-1')
    })

    it('should return empty array when no jobs found', async () => {
      mockEnv.DB.list.mockResolvedValueOnce({ data: null })

      const jobs = await service.listJobs()

      expect(jobs).toEqual([])
    })
  })

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getStats()

      expect(stats).toBeDefined()
      expect(stats.total).toBe(2)
      expect(stats.completed).toBe(1)
      expect(stats.pending).toBe(1)
      expect(stats.completionRate).toBe('50.00%')
    })

    it('should handle empty queue', async () => {
      mockEnv.DB.list.mockResolvedValueOnce({ data: [] })

      const stats = await service.getStats()

      expect(stats.total).toBe(0)
      expect(stats.completionRate).toBe('0%')
      expect(stats.failureRate).toBe('0%')
    })
  })

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      const success = await service.cancelJob('test-job-id')

      expect(success).toBe(true)
      expect(mockEnv.DB.upsert).toHaveBeenCalled()

      const upsertCall = mockEnv.DB.upsert.mock.calls[0]
      const jobData = upsertCall[0][0].data

      expect(jobData.status).toBe('failed')
      expect(jobData.error).toContain('cancelled')
    })

    it('should not cancel completed job', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({
        data: {
          data: {
            id: 'test-job-id',
            type: 'test-job',
            payload: {},
            status: 'completed',
            priority: 0,
            attempts: 1,
            maxAttempts: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })

      const success = await service.cancelJob('test-job-id')

      expect(success).toBe(false)
    })

    it('should return false for non-existent job', async () => {
      mockEnv.DB.get.mockResolvedValueOnce({ data: null })

      const success = await service.cancelJob('non-existent')

      expect(success).toBe(false)
    })
  })
})
