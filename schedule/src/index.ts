registerTask(options: RegisterTaskOptions): Promise<ScheduledTask>


unregisterTask(name: string): Promise<boolean>


enableTask(name: string): Promise<boolean>


disableTask(name: string): Promise<boolean>


getTask(name: string): Promise<ScheduledTask | null>


listTasks(): Promise<ScheduledTask[]>


runTaskNow(name: string): Promise<boolean>


getTaskHistory(name: string, limit?: number): Promise<TaskExecution[]>


getRecentExecutions(limit?: number): Promise<TaskExecution[]>


getAvailableHandlers(): Promise<string[]>


initializeDefaultTasks(): Promise<void>


// src/tasks/custom.ts
export async function myCustomTask(env: Env): Promise<any> {
  // Task implementation
  const result = await doSomething(env)
  return { processed: result.count }
}

// src/tasks/index.ts
import { myCustomTask } from './custom'

export const taskRegistry: TaskRegistry = {
  // ... existing tasks
  'my-custom-task': myCustomTask,
}


await env.SCHEDULE.registerTask({
  name: 'my-custom-task',
  schedule: '@daily',
  handler: 'my-custom-task',
  enabled: true,
})
