/**
 * Email Warming Service Types
 */

/**
 * Warmup Status
 */
export type WarmupStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'failed'

/**
 * Warmup Schedule Type
 */
export type WarmupScheduleType = 'conservative' | 'standard' | 'aggressive' | 'custom'

/**
 * Warmup Day Schedule
 */
export interface WarmupDaySchedule {
  day: number // 1-based day number
  dailyLimit: number // Maximum emails for this day
  sent: number // Emails sent today
  bounceRate: number // Bounce rate for this day
  complaintRate: number // Complaint rate for this day
  successRate: number // Success rate for this day
  completed: boolean // Whether this day is completed
}

/**
 * Warmup Configuration
 */
export interface WarmupConfig {
  domainId: string
  scheduleType: WarmupScheduleType
  customSchedule?: number[] // Daily limits for custom schedule
  startDate?: string // ISO 8601 date
  maxDays?: number // Maximum warmup duration
  autoAdvance?: boolean // Automatically advance to next day
  pauseOnHighBounce?: boolean // Pause if bounce rate > threshold
  pauseOnHighComplaint?: boolean // Pause if complaint rate > threshold
  bounceThreshold?: number // Bounce rate threshold (0-1, default 0.05)
  complaintThreshold?: number // Complaint rate threshold (0-1, default 0.001)
}

/**
 * Warmup Progress
 */
export interface WarmupProgress {
  domainId: string
  status: WarmupStatus
  scheduleType: WarmupScheduleType
  currentDay: number
  totalDays: number
  dailyLimit: number
  sentToday: number
  remaining: number
  schedule: WarmupDaySchedule[]
  startedAt?: string
  completedAt?: string
  pausedAt?: string
  lastAdvancedAt?: string
  config: WarmupConfig
}

/**
 * Warmup Statistics
 */
export interface WarmupStats {
  domainId: string
  totalSent: number
  totalDays: number
  currentDay: number
  averageBounceRate: number
  averageComplaintRate: number
  averageSuccessRate: number
  completionPercentage: number
  estimatedCompletionDate?: string
}

/**
 * Start Warmup Request
 */
export interface StartWarmupRequest {
  config: WarmupConfig
}

/**
 * Pause Warmup Request
 */
export interface PauseWarmupRequest {
  domainId: string
  reason?: string
}

/**
 * Resume Warmup Request
 */
export interface ResumeWarmupRequest {
  domainId: string
}

/**
 * Reset Warmup Request
 */
export interface ResetWarmupRequest {
  domainId: string
  preserveStats?: boolean
}

/**
 * Advance Warmup Request
 */
export interface AdvanceWarmupRequest {
  domainId: string
  force?: boolean // Force advance even if current day not complete
}

/**
 * Record Send Request
 */
export interface RecordSendRequest {
  domainId: string
  status: 'delivered' | 'bounced' | 'failed' | 'complained'
  timestamp?: string
}

/**
 * Check Warmup Limit Request
 */
export interface CheckWarmupLimitRequest {
  domainId: string
  count?: number // Number of emails to send (default 1)
}

/**
 * Check Warmup Limit Response
 */
export interface CheckWarmupLimitResponse {
  allowed: boolean
  remaining: number
  dailyLimit: number
  currentDay: number
  status: WarmupStatus
  reason?: string
}

/**
 * Environment Bindings
 */
export interface Env {
  // Service Bindings
  DB?: any // Database service

  // KV Namespace
  KV?: KVNamespace

  // Queue
  WARMUP_QUEUE?: Queue

  // Environment
  ENVIRONMENT?: string
}

/**
 * Warmup Schedule Templates
 */
export const WARMUP_SCHEDULES: Record<WarmupScheduleType, number[]> = {
  // Conservative: 6-8 weeks, very gradual increase
  conservative: [
    50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000,
    10000, 12000, 14000, 16000, 18000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
  ],

  // Standard: 4 weeks, balanced approach
  standard: [
    50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000, 250000, 300000,
    400000, 500000, 600000, 800000, 1000000,
  ],

  // Aggressive: 2 weeks, fast ramp-up (risky)
  aggressive: [100, 500, 1000, 2000, 5000, 10000, 20000, 40000, 60000, 100000, 150000, 250000, 500000, 1000000],

  // Custom: defined by user
  custom: [],
}
