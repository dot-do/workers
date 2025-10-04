/**
 * Tests for Error Analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getErrorSummary, getErrorTimeSeries, getErrorTrends, generateAlerts, getErrorsByService, getErrorDistribution } from '../src/error-analytics'

// Mock R2 SQL query results
const mockExecuteR2Query = vi.fn()

vi.mock('../src/r2-sql', () => ({
  executeR2Query: (...args: any[]) => mockExecuteR2Query(...args),
}))

// Mock environment
const createMockEnv = () => ({
  ANALYTICS_BUCKET: {} as any,
  ANALYTICS_KV: {} as any,
  ANALYTICS: {} as any,
})

describe('Error Analytics - Error Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should aggregate errors by severity', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['critical', 'exception', 'gateway', 'TypeError', 'Cannot read property', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'db', 'server_error', 'HTTP 500', 25, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['warning', 'http', 'auth', 'client_error', 'HTTP 400', 50, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const summary = await getErrorSummary('1 hour', env as any)

    expect(summary.total).toBe(85)
    expect(summary.bySeverity.critical).toBe(10)
    expect(summary.bySeverity.error).toBe(25)
    expect(summary.bySeverity.warning).toBe(50)
  })

  it('should aggregate errors by category', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['critical', 'exception', 'gateway', 'TypeError', 'Error', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'db', 'server_error', 'HTTP 500', 25, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'auth', 'server_error', 'HTTP 503', 15, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const summary = await getErrorSummary('1 hour', env as any)

    expect(summary.byCategory.exception).toBe(10)
    expect(summary.byCategory.http).toBe(40)
  })

  it('should aggregate errors by service', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['critical', 'exception', 'gateway', 'TypeError', 'Error', 30, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'db', 'server_error', 'HTTP 500', 20, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'auth', 'server_error', 'HTTP 503', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const summary = await getErrorSummary('1 hour', env as any)

    expect(summary.byService.gateway).toBe(30)
    expect(summary.byService.db).toBe(20)
    expect(summary.byService.auth).toBe(10)
  })

  it('should return top errors', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['critical', 'exception', 'gateway', 'TypeError', 'Cannot read property', 50, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'db', 'server_error', 'HTTP 500', 30, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['warning', 'http', 'auth', 'client_error', 'HTTP 400', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const summary = await getErrorSummary('1 hour', env as any)

    expect(summary.topErrors).toHaveLength(3)
    expect(summary.topErrors[0].count).toBe(50)
    expect(summary.topErrors[0].errorType).toBe('TypeError')
    expect(summary.topErrors[1].count).toBe(30)
  })
})

describe('Error Analytics - Time Series', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return time series data in 5-minute buckets', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['bucket', 'total', 'critical', 'error', 'warning', 'info'],
      rows: [
        ['2025-10-04T10:00:00Z', 45, 2, 12, 25, 6],
        ['2025-10-04T10:05:00Z', 52, 1, 15, 28, 8],
        ['2025-10-04T10:10:00Z', 38, 0, 10, 20, 8],
      ],
    })

    const env = createMockEnv()
    const timeseries = await getErrorTimeSeries('24 hours', env as any)

    expect(timeseries).toHaveLength(3)
    expect(timeseries[0].timestamp).toBe('2025-10-04T10:00:00Z')
    expect(timeseries[0].total).toBe(45)
    expect(timeseries[0].critical).toBe(2)
    expect(timeseries[0].error).toBe(12)
  })
})

describe('Error Analytics - Trend Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect error spikes', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [
        ['gateway', 'server_error', 'error', 210, 60], // 250% increase
        ['db', 'timeout', 'error', 90, 30], // 200% increase
        ['auth', 'validation', 'warning', 120, 100], // 20% increase (not a spike)
      ],
    })

    const env = createMockEnv()
    const trends = await getErrorTrends(env as any)

    expect(trends).toHaveLength(3)

    // First trend should be a spike (250% increase)
    expect(trends[0].service).toBe('gateway')
    expect(trends[0].isSpike).toBe(true)
    expect(trends[0].percentChange).toBeGreaterThan(50)

    // Second trend should be a spike (200% increase)
    expect(trends[1].service).toBe('db')
    expect(trends[1].isSpike).toBe(true)

    // Third trend should NOT be a spike (only 20% increase)
    expect(trends[2].service).toBe('auth')
    expect(trends[2].isSpike).toBe(false)
  })

  it('should calculate error rates correctly', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [['gateway', 'server_error', 'error', 60, 30]], // 60 errors in 1 hour = 1/min
    })

    const env = createMockEnv()
    const trends = await getErrorTrends(env as any)

    expect(trends[0].currentRate).toBe(1.0) // 60 / 60 = 1 error/min
    expect(trends[0].baselineRate).toBe(0.5) // 30 / 60 = 0.5 error/min
    expect(trends[0].percentChange).toBe(100) // 100% increase
  })

  it('should handle new error types (no baseline)', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [['gateway', 'new_error', 'error', 120, 0]], // New error type
    })

    const env = createMockEnv()
    const trends = await getErrorTrends(env as any)

    expect(trends[0].percentChange).toBe(100) // New error = 100% increase
    expect(trends[0].isSpike).toBe(true) // New errors with rate > 1/min are spikes
  })

  it('should sort trends by severity and percent change', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [
        ['auth', 'validation', 'warning', 120, 60], // 100% increase, not a spike
        ['gateway', 'server_error', 'error', 150, 50], // 200% increase, spike
        ['db', 'timeout', 'critical', 180, 60], // 200% increase, spike
      ],
    })

    const env = createMockEnv()
    const trends = await getErrorTrends(env as any)

    // Spikes should come first
    expect(trends[0].isSpike).toBe(true)
    expect(trends[1].isSpike).toBe(true)
    expect(trends[2].isSpike).toBe(false)
  })
})

describe('Error Analytics - Alert Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate alerts for error spikes', async () => {
    // Mock trend data with spike
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [['gateway', 'server_error', 'error', 210, 60]], // 250% increase
    })

    // Mock summary data (no threshold alerts)
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [['error', 'http', 'gateway', 'server_error', 'HTTP 500', 50, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z']],
    })

    const env = createMockEnv()
    const alerts = await generateAlerts(env as any)

    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].severity).toBe('high')
    expect(alerts[0].title).toContain('Error Spike Detected')
    expect(alerts[0].service).toBe('gateway')
  })

  it('should generate alerts for high critical error counts', async () => {
    // Mock trend data (no spikes)
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [],
    })

    // Mock summary data with high critical count
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['critical', 'exception', 'gateway', 'TypeError', 'Error 1', 60, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['critical', 'exception', 'db', 'Error', 'Error 2', 50, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const alerts = await generateAlerts(env as any)

    const criticalAlert = alerts.find((a) => a.title === 'High Critical Error Rate')
    expect(criticalAlert).toBeDefined()
    expect(criticalAlert?.severity).toBe('critical')
    expect(criticalAlert?.metrics.current).toBe(110)
  })

  it('should generate alerts for high error counts', async () => {
    // Mock trend data (no spikes)
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['service', 'errorType', 'severity', 'current_count', 'baseline_count'],
      rows: [],
    })

    // Mock summary data with high error count
    mockExecuteR2Query.mockResolvedValueOnce({
      columns: ['severity', 'category', 'service', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['error', 'http', 'gateway', 'server_error', 'HTTP 500', 300, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['error', 'http', 'db', 'server_error', 'HTTP 500', 250, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const alerts = await generateAlerts(env as any)

    const errorAlert = alerts.find((a) => a.title === 'High Error Rate')
    expect(errorAlert).toBeDefined()
    expect(errorAlert?.severity).toBe('high')
    expect(errorAlert?.metrics.current).toBe(550)
  })
})

describe('Error Analytics - Errors by Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should group errors by service', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'severity', 'category', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['gateway', 'error', 'http', 'server_error', 'HTTP 500', 30, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['gateway', 'warning', 'http', 'client_error', 'HTTP 400', 20, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['db', 'critical', 'exception', 'TypeError', 'Error', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const byService = await getErrorsByService('1 hour', env as any)

    expect(Object.keys(byService)).toContain('gateway')
    expect(Object.keys(byService)).toContain('db')
    expect(byService.gateway.total).toBe(50)
    expect(byService.db.total).toBe(10)
  })

  it('should include top errors per service', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['service', 'severity', 'category', 'errorType', 'errorMessage', 'count', 'firstSeen', 'lastSeen'],
      rows: [
        ['gateway', 'error', 'http', 'server_error', 'HTTP 500', 30, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['gateway', 'warning', 'http', 'client_error', 'HTTP 400', 20, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
        ['gateway', 'warning', 'http', 'client_error', 'HTTP 401', 10, '2025-10-04T10:00:00Z', '2025-10-04T10:30:00Z'],
      ],
    })

    const env = createMockEnv()
    const byService = await getErrorsByService('1 hour', env as any)

    expect(byService.gateway.topErrors).toHaveLength(3)
    expect(byService.gateway.topErrors[0].count).toBe(30)
    expect(byService.gateway.topErrors[1].count).toBe(20)
    expect(byService.gateway.topErrors[2].count).toBe(10)
  })
})

describe('Error Analytics - Error Distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate error distribution with percentages', async () => {
    mockExecuteR2Query.mockResolvedValue({
      columns: ['errorType', 'count'],
      rows: [
        ['server_error', 60],
        ['client_error', 30],
        ['timeout', 10],
      ],
    })

    const env = createMockEnv()
    const distribution = await getErrorDistribution('24 hours', env as any)

    expect(distribution).toHaveLength(3)
    expect(distribution[0].type).toBe('server_error')
    expect(distribution[0].count).toBe(60)
    expect(distribution[0].percentage).toBe(60) // 60/100 = 60%

    expect(distribution[1].type).toBe('client_error')
    expect(distribution[1].count).toBe(30)
    expect(distribution[1].percentage).toBe(30) // 30/100 = 30%

    expect(distribution[2].type).toBe('timeout')
    expect(distribution[2].count).toBe(10)
    expect(distribution[2].percentage).toBe(10) // 10/100 = 10%
  })
})
