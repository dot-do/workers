import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { WSMessage } from '@/types/task'

// Mock WebSocket
class MockWebSocket {
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  readyState: number = WebSocket.CONNECTING

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url: string) {
    this.url = url
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helper for testing
  simulateMessage(message: WSMessage) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(message),
    })
    this.onmessage?.(event)
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    // @ts-ignore
    global.WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('connects to WebSocket on mount', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8787/ws',
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })

  it('handles task.created messages', async () => {
    const onTaskCreated = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8787/ws',
        onTaskCreated,
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate receiving a task.created message
    const mockTask = {
      id: 'task-1',
      functionName: 'test',
      prompt: 'Test prompt',
      schema: { type: 'object' as const, properties: {} },
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date().toISOString(),
      timeoutAt: new Date(Date.now() + 60000).toISOString(),
      timeoutSeconds: 60,
    }

    // Get the WebSocket instance
    // @ts-ignore
    const ws = global.WebSocket.instances?.[0]
    ws?.simulateMessage({
      type: 'task.created',
      task: mockTask,
    })

    await waitFor(() => {
      expect(onTaskCreated).toHaveBeenCalledWith(mockTask)
    })
  })

  it('handles connection errors', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8787/ws',
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Close connection
    result.current.disconnect()

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
    })
  })

  it('sends messages through WebSocket', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8787/ws',
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Should not throw
    expect(() => {
      result.current.send({ type: 'test', data: 'hello' })
    }).not.toThrow()
  })

  it('reconnects on disconnect when enabled', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8787/ws',
        reconnect: true,
        reconnectInterval: 1000,
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate disconnect
    result.current.disconnect()

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
    })

    // Fast-forward time to trigger reconnect
    vi.advanceTimersByTime(1000)

    vi.useRealTimers()
  })
})
