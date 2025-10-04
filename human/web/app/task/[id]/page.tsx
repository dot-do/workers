'use client'

import { use } from 'react'
import { useTask } from '@/hooks/useTask'
import { DynamicForm } from '@/components/DynamicForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatTimeRemaining, formatDate, getProgressPercentage } from '@/lib/utils'
import { Clock, User, AlertCircle, CheckCircle, XCircle, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { task, presence, isLoading, error, isConnected, respond, reject, delegate, updateTyping } = useTask(id)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-muted-foreground">Loading task...</div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">Task not found</p>
        <p className="text-muted-foreground">{error || 'The task you are looking for does not exist.'}</p>
      </div>
    )
  }

  const progress = getProgressPercentage(task.createdAt, task.timeoutAt)
  const timeRemaining = formatTimeRemaining(task.timeoutAt)
  const isUrgent = progress > 80

  const handleSubmit = async (data: any) => {
    try {
      await respond(data)
      toast.success('Response submitted successfully!')
    } catch (err) {
      toast.error('Failed to submit response')
    }
  }

  const handleReject = async () => {
    try {
      await reject('Task rejected by user')
      toast.success('Task rejected')
    } catch (err) {
      toast.error('Failed to reject task')
    }
  }

  const isCompleted = task.status === 'completed' || task.status === 'timeout' || task.status === 'rejected'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{task.functionName}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'timeout' ? 'bg-red-100 text-red-800' : task.status === 'rejected' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-muted-foreground">{task.prompt}</p>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-50 dark:bg-orange-950 p-3 rounded">
          <AlertCircle className="h-4 w-4" />
          <span>Real-time updates disconnected. Reconnecting...</span>
        </div>
      )}

      {/* Progress and metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time remaining</span>
              <span className={`font-semibold ${isUrgent ? 'text-red-500' : ''}`}>{timeRemaining}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Created</div>
              <div className="font-medium">{formatDate(task.createdAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Timeout</div>
              <div className="font-medium">{formatDate(task.timeoutAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Priority</div>
              <div className="font-medium capitalize">{task.priority}</div>
            </div>
            {task.assignee && (
              <div>
                <div className="text-muted-foreground">Assignee</div>
                <div className="font-medium">{task.assignee}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Presence indicators */}
      {presence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Viewing ({presence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {presence.map((p) => (
                <div key={p.userId} className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm">
                  <User className="h-4 w-4" />
                  <span>{p.userName}</span>
                  {p.isTyping && <span className="text-muted-foreground italic">typing...</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form or response */}
      {isCompleted ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {task.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              {task.status === 'completed' ? 'Response' : task.status === 'timeout' ? 'Timeout' : 'Rejected'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.response ? <pre className="bg-secondary p-4 rounded overflow-auto">{JSON.stringify(task.response, null, 2)}</pre> : <p className="text-muted-foreground">{task.error || 'No response available'}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Respond to Task</CardTitle>
            <CardDescription>Fill out the form below to complete this task</CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicForm
              schema={task.schema}
              onSubmit={handleSubmit}
              onCancel={handleReject}
              defaultValues={task.response}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
