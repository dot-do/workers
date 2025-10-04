'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { Task, TaskMetrics } from '@/types/task'
import { CheckCircle, XCircle, Clock, Search, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        params.append('status', 'completed,timeout,rejected')
        if (searchQuery) params.append('search', searchQuery)
        if (dateFilter !== 'all') params.append('dateFilter', dateFilter)

        const [tasksResponse, metricsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/tasks?${params.toString()}`),
          fetch(`${apiUrl}/api/tasks/metrics`),
        ])

        const tasksData = await tasksResponse.json()
        const metricsData = await metricsResponse.json()

        setTasks(tasksData.tasks || [])
        setMetrics(metricsData.metrics)
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [searchQuery, dateFilter, apiUrl])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task History</h1>
        <p className="text-muted-foreground">View completed, rejected, and timed-out tasks</p>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-3xl">{metrics.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl text-green-600">{metrics.completed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Response Time</CardDescription>
              <CardTitle className="text-3xl">{Math.round(metrics.avgResponseTime)}s</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completion Rate</CardDescription>
              <CardTitle className="text-3xl">{metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Loading history...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium">No history found</p>
          <p className="text-muted-foreground">Complete some tasks to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/task/${task.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {task.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : task.status === 'timeout' ? (
                          <Clock className="h-5 w-5 text-red-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-orange-500" />
                        )}
                        <h3 className="font-semibold">{task.functionName}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{task.prompt}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {formatDate(task.createdAt)}</span>
                        {task.completedAt && <span>Completed: {formatDate(task.completedAt)}</span>}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'timeout' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                      {task.status}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
