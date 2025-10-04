import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeRemaining(timeoutAt: string): string {
  const now = new Date()
  const timeout = new Date(timeoutAt)
  const diffMs = timeout.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'

  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
  if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`
  return `${diffMinutes}m`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleString()
}

export function getProgressPercentage(createdAt: string, timeoutAt: string): number {
  const created = new Date(createdAt).getTime()
  const timeout = new Date(timeoutAt).getTime()
  const now = Date.now()

  const total = timeout - created
  const elapsed = now - created

  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}
