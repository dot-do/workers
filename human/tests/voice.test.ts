/**
 * Voice Channel Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VoiceChannel, VoiceUX } from '../src/channels/voice'
import type { HumanFunctionPayload } from '../src/types'

// Mock VAPI API
const mockVapiApi = {
  call: vi.fn(),
  webhook: vi.fn(),
}

// Mock R2 bucket
const mockR2 = {
  put: vi.fn(),
  get: vi.fn(),
}

// Mock database
const mockDb = {
  execute: vi.fn(),
}

describe('VoiceChannel', () => {
  let voiceChannel: VoiceChannel

  beforeEach(() => {
    vi.clearAllMocks()

    voiceChannel = new VoiceChannel({
      vapiApiKey: 'test-key',
      vapiBaseUrl: 'https://api.vapi.ai',
      r2Bucket: mockR2 as any,
      db: mockDb,
    })

    // Mock successful database response
    mockDb.execute.mockResolvedValue({ rows: [] })
  })

  describe('initiateCall', () => {
    it('should create VAPI call with correct payload', async () => {
      const payload: HumanFunctionPayload = {
        id: 'func-123',
        functionType: 'approval',
        prompt: 'Please approve this expense of $5000 in the marketing category.',
      }

      // Mock successful VAPI response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ callId: 'call-123', status: 'initiated' }),
      })

      const result = await voiceChannel.initiateCall('+1234567890', payload)

      expect(result).toEqual({
        callSid: 'call-123',
        status: 'initiated',
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      )

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO human_function_calls'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'func-123',
          '+1234567890',
          'call-123',
          'initiated',
          expect.any(String), // JSON script
          expect.any(String), // timestamp
        ])
      )
    })

    it('should throw error on VAPI failure', async () => {
      const payload: HumanFunctionPayload = {
        id: 'func-123',
        functionType: 'approval',
        prompt: 'Test approval',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      })

      await expect(voiceChannel.initiateCall('+1234567890', payload)).rejects.toThrow('VAPI call failed')
    })
  })

  describe('payloadToVoiceScript', () => {
    it('should convert approval payload to voice script', () => {
      const payload: HumanFunctionPayload = {
        id: 'func-123',
        functionType: 'approval',
        prompt: 'Please approve this expense of $5000.',
      }

      // @ts-ignore - accessing private method for testing
      const script = voiceChannel.payloadToVoiceScript(payload)

      expect(script.initial.say).toContain('$5000')
      expect(script.menu).toHaveLength(2)
      expect(script.menu?.[0]).toEqual({
        digits: '1',
        say: 'Approved',
        action: 'approve',
      })
      expect(script.menu?.[1]).toEqual({
        digits: '2',
        say: 'Rejected',
        action: 'reject',
      })
    })

    it('should convert form payload to voice script with field prompts', () => {
      const payload: HumanFunctionPayload = {
        id: 'func-123',
        functionType: 'form',
        prompt: 'Please provide your information.',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Name',
            prompt: 'Please say your full name',
            required: true,
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email',
            required: true,
          },
        ],
      }

      // @ts-ignore - accessing private method for testing
      const script = voiceChannel.payloadToVoiceScript(payload)

      expect(script.prompts).toBeDefined()
      expect(script.prompts?.field_0).toBeDefined()
      expect(script.prompts?.field_0.say).toContain('full name')
      expect(script.prompts?.field_1.say).toContain('Email')
    })

    it('should convert notification payload to voice script', () => {
      const payload: HumanFunctionPayload = {
        id: 'func-123',
        functionType: 'notification',
        prompt: 'Your order has been shipped.',
      }

      // @ts-ignore - accessing private method for testing
      const script = voiceChannel.payloadToVoiceScript(payload)

      expect(script.initial.say).toContain('shipped')
      expect(script.menu).toHaveLength(1)
      expect(script.menu?.[0].action).toBe('acknowledge')
    })
  })

  describe('handleWebhook', () => {
    it('should handle call-started event', async () => {
      const event = {
        type: 'call-started',
        callId: 'call-123',
        data: {},
      }

      const result = await voiceChannel.handleWebhook(event)

      expect(result).toEqual({ success: true })
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE human_function_calls'),
        ['call-123']
      )
    })

    it('should handle call-ended event and process recording', async () => {
      const event = {
        type: 'call-ended',
        callId: 'call-123',
        data: {
          recordingUrl: 'https://recordings.vapi.ai/call-123.mp3',
        },
      }

      // Mock successful audio fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1024),
      })

      const result = await voiceChannel.handleWebhook(event)

      expect(result).toEqual({ success: true })
      expect(mockDb.execute).toHaveBeenCalled()
      expect(mockR2.put).toHaveBeenCalled()
    })

    it('should handle transcript event', async () => {
      const event = {
        type: 'transcript',
        callId: 'call-123',
        data: {
          role: 'user',
          text: 'I approve this expense.',
        },
      }

      const result = await voiceChannel.handleWebhook(event)

      expect(result).toEqual({ success: true })
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO call_transcripts'),
        ['call-123', 'user', 'I approve this expense.', expect.any(String)]
      )
    })

    it('should handle function-call event for approval', async () => {
      mockDb.execute.mockResolvedValueOnce({
        rows: [
          {
            call_sid: 'call-123',
            function_id: 'func-123',
            script: JSON.stringify({}),
          },
        ],
      })

      const event = {
        type: 'function-call',
        callId: 'call-123',
        data: {
          functionName: 'approve',
          arguments: { reason: 'Approved by manager' },
        },
      }

      const result = await voiceChannel.handleWebhook(event)

      expect(result.result).toContain('Approved')
      expect(result.endCall).toBe(true)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE human_function_calls'),
        expect.arrayContaining([expect.stringContaining('"approved":true'), 'call-123'])
      )
    })

    it('should handle DTMF input', async () => {
      mockDb.execute.mockResolvedValueOnce({
        rows: [
          {
            script: JSON.stringify({
              menu: [
                { digits: '1', say: 'Approved', action: 'approve' },
                { digits: '2', say: 'Rejected', action: 'reject' },
              ],
            }),
          },
        ],
      }).mockResolvedValueOnce({
        rows: [
          {
            call_sid: 'call-123',
            function_id: 'func-123',
          },
        ],
      })

      const event = {
        type: 'dtmf',
        callId: 'call-123',
        data: {
          digit: '1',
        },
      }

      const result = await voiceChannel.handleWebhook(event)

      expect(result.result).toContain('Approved')
    })
  })

  describe('recordResponse', () => {
    it('should download audio, upload to R2, and store metadata', async () => {
      const audioData = new ArrayBuffer(1024)

      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: async () => audioData,
      })

      const result = await voiceChannel.recordResponse('call-123', 'https://audio.example.com/call-123.mp3')

      expect(result.callSid).toBe('call-123')
      expect(result.r2Key).toMatch(/^calls\/\d{4}\/\d{1,2}\/call-123\.mp3$/)
      expect(mockR2.put).toHaveBeenCalledWith(
        expect.stringMatching(/^calls\/\d{4}\/\d{1,2}\/call-123\.mp3$/),
        audioData,
        expect.objectContaining({
          httpMetadata: {
            contentType: 'audio/mpeg',
          },
          customMetadata: {
            callSid: 'call-123',
            timestamp: expect.any(String),
          },
        })
      )
    })
  })

  describe('getCallStatus', () => {
    it('should retrieve call details from database', async () => {
      mockDb.execute.mockResolvedValue({
        rows: [
          {
            call_sid: 'call-123',
            function_id: 'func-123',
            status: 'completed',
            phone_number: '+1234567890',
            response: JSON.stringify({ approved: true }),
            recording_url: 'https://recordings.example.com/call-123.mp3',
            duration: 120,
            created_at: '2025-01-01T00:00:00Z',
            ended_at: '2025-01-01T00:02:00Z',
          },
        ],
      })

      const status = await voiceChannel.getCallStatus('call-123')

      expect(status).toEqual({
        callSid: 'call-123',
        functionId: 'func-123',
        status: 'completed',
        phoneNumber: '+1234567890',
        response: { approved: true },
        recordingUrl: 'https://recordings.example.com/call-123.mp3',
        duration: 120,
        createdAt: '2025-01-01T00:00:00Z',
        endedAt: '2025-01-01T00:02:00Z',
      })
    })

    it('should throw error if call not found', async () => {
      mockDb.execute.mockResolvedValue({ rows: [] })

      await expect(voiceChannel.getCallStatus('call-999')).rejects.toThrow('Call not found')
    })
  })

  describe('listCalls', () => {
    it('should list all calls for a function', async () => {
      mockDb.execute.mockResolvedValue({
        rows: [
          {
            call_sid: 'call-1',
            status: 'completed',
            phone_number: '+1234567890',
            response: JSON.stringify({ approved: true }),
            created_at: '2025-01-01T00:00:00Z',
          },
          {
            call_sid: 'call-2',
            status: 'completed',
            phone_number: '+0987654321',
            response: JSON.stringify({ approved: false }),
            created_at: '2025-01-01T00:05:00Z',
          },
        ],
      })

      const calls = await voiceChannel.listCalls('func-123')

      expect(calls).toHaveLength(2)
      expect(calls[0].callSid).toBe('call-1')
      expect(calls[1].callSid).toBe('call-2')
    })

    it('should filter calls by status', async () => {
      mockDb.execute.mockResolvedValue({
        rows: [
          {
            call_sid: 'call-1',
            status: 'completed',
            phone_number: '+1234567890',
            response: JSON.stringify({ approved: true }),
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
      })

      const calls = await voiceChannel.listCalls('func-123', 'completed')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        ['func-123', 'completed']
      )
    })
  })
})

describe('VoiceUX', () => {
  describe('createMenu', () => {
    it('should create DTMF menu with multiple options', () => {
      const menu = VoiceUX.createMenu([
        { digits: '1', say: 'Approve', action: 'approve' },
        { digits: '2', say: 'Reject', action: 'reject' },
        { digits: '3', say: 'Get more info', action: 'info' },
      ])

      expect(menu.say).toContain('Press 1 for Approve')
      expect(menu.say).toContain('Press 2 for Reject')
      expect(menu.say).toContain('Press 3 for Get more info')
      expect(menu.gather?.input).toEqual(['dtmf'])
      expect(menu.gather?.numDigits).toBe(1)
    })
  })

  describe('createFormField', () => {
    it('should create text field prompt', () => {
      const field = VoiceUX.createFormField('your name', 'text')

      expect(field.say).toContain('your name')
      expect(field.gather?.input).toEqual(['speech'])
    })

    it('should create number field prompt with digit instruction', () => {
      const field = VoiceUX.createFormField('your age', 'number')

      expect(field.say).toContain('your age')
      expect(field.say).toContain('only digits')
    })

    it('should create email field prompt with spelling instruction', () => {
      const field = VoiceUX.createFormField('your email', 'email')

      expect(field.say).toContain('email')
      expect(field.say).toContain('slowly')
    })
  })

  describe('createConfirmation', () => {
    it('should create confirmation prompt with value', () => {
      const confirmation = VoiceUX.createConfirmation('John Doe')

      expect(confirmation.say).toContain('John Doe')
      expect(confirmation.say).toContain('correct')
      expect(confirmation.gather?.input).toEqual(['dtmf'])
    })
  })

  describe('createErrorPrompt', () => {
    it('should create error prompt', () => {
      const error = VoiceUX.createErrorPrompt()

      expect(error.say).toContain("didn't understand")
      expect(error.say).toContain('try again')
    })
  })

  describe('createTimeoutHandler', () => {
    it('should create timeout escalation prompt', () => {
      const timeout = VoiceUX.createTimeoutHandler()

      expect(timeout.say).toContain("didn't hear")
      expect(timeout.say).toContain('human operator')
    })
  })
})
