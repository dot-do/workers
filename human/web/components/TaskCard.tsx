'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatTimeRemaining, getProgressPercentage } from '@/lib/utils'
import type { Task, TaskPriority, TaskStatus } from '@/types/task'
import { Clock, User, AlertCircle } from 'lucide-react'

interface TaskCardProps {
  task: Task
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

const statusColors: Record<TaskStatus, string> = {
  pending: 'text-gray-500',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  timeout: 'text-red-500',
  rejected: 'text-orange-500',
}

export function TaskCard({ task }: TaskCardProps) {
  const progress = getProgressPercentage(task.createdAt, task.timeoutAt)
  const timeRemaining = formatTimeRemaining(task.timeoutAt)
  const isUrgent = progress > 80

  return (
    <Link href={`/task/${task.id}`}>
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${isUrgent ? 'border-red-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
              <CardTitle className="text-lg">{task.functionName}</CardTitle>
            </div>
            <span className={`text-sm font-medium capitalize ${statusColors[task.status]}`}>{task.status.replace('_', ' ')}</span>
          </div>
          <CardDescription className="line-clamp-2">{task.prompt}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Time remaining</span>
              <span className={isUrgent ? 'text-red-500 font-semibold' : ''}>{timeRemaining}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {task.assignee && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{task.assignee}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{task.timeoutSeconds}s timeout</span>
            </div>
          </div>

          {/* Urgent warning */}
          {isUrgent && task.status === 'pending' && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>Urgent: Requires immediate attention!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
