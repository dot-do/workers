'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task, WSMessage, Presence } from '@/types/task'

interface UseWebSocketOptions {
  url: string
  onTaskCreated?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
  onTaskCompleted?: (taskId: string, response: any) => void
  onTaskTimeout?: (taskId: string) => void
  onPresenceJoined?: (presence: Presence) => void
  onPresenceLeft?: (userId: string, taskId: string) => void
  onPresenceTyping?: (userId: string, taskId: string, isTyping: boolean) => void
  reconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onTaskCreated,
    onTaskUpdated,
    onTaskCompleted,
    onTaskTimeout,
    onPresenceJoined,
    onPresenceLeft,
    onPresenceTyping,
    reconnect = true,
    reconnectInterval = 3000,
  } = options

  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)

        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`)
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Max reconnection attempts reached')
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Connection error occurred')
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)

          switch (message.type) {
            case 'task.created':
              onTaskCreated?.(message.task)
              break
            case 'task.updated':
              onTaskUpdated?.(message.task)
              break
            case 'task.completed':
              onTaskCompleted?.(message.taskId, message.response)
              break
            case 'task.timeout':
              onTaskTimeout?.(message.taskId)
              break
            case 'presence.joined':
              onPresenceJoined?.(message.presence)
              break
            case 'presence.left':
              onPresenceLeft?.(message.userId, message.taskId)
              break
            case 'presence.typing':
              onPresenceTyping?.(message.userId, message.taskId, message.isTyping)
              break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setConnectionError('Failed to create WebSocket connection')
    }
  }, [url, onTaskCreated, onTaskUpdated, onTaskCompleted, onTaskTimeout, onPresenceJoined, onPresenceLeft, onPresenceTyping, reconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    setIsConnected(false)
  }, [])

  const send = useCallback(
    (message: any) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message))
      } else {
        console.error('WebSocket is not connected')
      }
    },
    []
  )

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    send,
    disconnect,
    reconnect: connect,
  }
}
