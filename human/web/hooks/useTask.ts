'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from './useWebSocket'
import type { Task, Presence } from '@/types/task'

export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null)
  const [presence, setPresence] = useState<Presence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787'

  // Fetch initial task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${apiUrl}/api/task/${taskId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch task')
        }
        const data = await response.json()
        setTask(data.task)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, apiUrl])

  // WebSocket for real-time updates
  const { isConnected, send } = useWebSocket({
    url: `${wsUrl}/ws/task/${taskId}`,
    onTaskUpdated: (updatedTask) => {
      if (updatedTask.id === taskId) {
        setTask(updatedTask)
      }
    },
    onTaskCompleted: (completedTaskId) => {
      if (completedTaskId === taskId) {
        setTask((prev) => (prev ? { ...prev, status: 'completed' as const } : null))
      }
    },
    onTaskTimeout: (timeoutTaskId) => {
      if (timeoutTaskId === taskId) {
        setTask((prev) => (prev ? { ...prev, status: 'timeout' as const } : null))
      }
    },
    onPresenceJoined: (newPresence) => {
      if (newPresence.taskId === taskId) {
        setPresence((prev) => [...prev.filter((p) => p.userId !== newPresence.userId), newPresence])
      }
    },
    onPresenceLeft: (userId, presenceTaskId) => {
      if (presenceTaskId === taskId) {
        setPresence((prev) => prev.filter((p) => p.userId !== userId))
      }
    },
    onPresenceTyping: (userId, presenceTaskId, isTyping) => {
      if (presenceTaskId === taskId) {
        setPresence((prev) => prev.map((p) => (p.userId === userId ? { ...p, isTyping } : p)))
      }
    },
  })

  const respond = async (response: any) => {
    try {
      const res = await fetch(`${apiUrl}/api/task/${taskId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit response')
      }

      const data = await res.json()
      setTask(data.task)
      return data
    } catch (err) {
      throw err
    }
  }

  const reject = async (reason: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/task/${taskId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        throw new Error('Failed to reject task')
      }

      const data = await res.json()
      setTask(data.task)
      return data
    } catch (err) {
      throw err
    }
  }

  const delegate = async (assignee: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/task/${taskId}/delegate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignee }),
      })

      if (!res.ok) {
        throw new Error('Failed to delegate task')
      }

      const data = await res.json()
      setTask(data.task)
      return data
    } catch (err) {
      throw err
    }
  }

  const updateTyping = (isTyping: boolean) => {
    send({
      type: 'presence.typing',
      taskId,
      isTyping,
    })
  }

  return {
    task,
    presence,
    isLoading,
    error,
    isConnected,
    respond,
    reject,
    delegate,
    updateTyping,
  }
}
