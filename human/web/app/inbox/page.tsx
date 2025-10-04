'use client'

import { useState, useEffect } from 'react'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Task, TaskFilters, TaskStatus, TaskPriority } from '@/types/task'
import { Search, Filter } from 'lucide-react'

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787'

  // Fetch initial tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        if (filters.status?.length) params.append('status', filters.status.join(','))
        if (filters.priority?.length) params.append('priority', filters.priority.join(','))
        if (searchQuery) params.append('search', searchQuery)

        const response = await fetch(`${apiUrl}/api/tasks?${params.toString()}`)
        const data = await response.json()
        setTasks(data.tasks || [])
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [filters, searchQuery, apiUrl])

  // WebSocket for real-time updates
  useWebSocket({
    url: `${wsUrl}/ws/tasks`,
    onTaskCreated: (task) => {
      setTasks((prev) => [task, ...prev])
    },
    onTaskUpdated: (task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    },
    onTaskCompleted: (taskId) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    },
    onTaskTimeout: (taskId) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'timeout' as TaskStatus } : t)))
    },
  })

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Inbox</h1>
          <p className="text-muted-foreground">
            {pendingTasks.length} pending, {inProgressTasks.length} in progress
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Select
          value={filters.status?.[0]}
          onValueChange={(value) => {
            setFilters((prev) => ({ ...prev, status: value ? [value as TaskStatus] : undefined }))
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority?.[0]}
          onValueChange={(value) => {
            setFilters((prev) => ({ ...prev, priority: value ? [value as TaskPriority] : undefined }))
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Loading tasks...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-muted-foreground">All caught up!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
