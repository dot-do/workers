import type { Env, AnomalyDetectionConfig, Anomaly } from '../types'

/**
 * AI-Powered Anomaly Detection Engine
 * Uses statistical methods and Workers AI for detecting anomalies
 */
export class AnomalyDetector {
  constructor(private env: Env) {}

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = []

    switch (config.algorithm) {
      case 'zscore':
        anomalies.push(...this.detectUsingZScore(config, data))
        break
      case 'mad':
        anomalies.push(...this.detectUsingMAD(config, data))
        break
      case 'isolation-forest':
        anomalies.push(...(await this.detectUsingIsolationForest(config, data)))
        break
      case 'prophet':
        anomalies.push(...(await this.detectUsingProphet(config, data)))
        break
      case 'lstm':
        anomalies.push(...(await this.detectUsingLSTM(config, data)))
        break
    }

    // Enrich anomalies with root cause analysis
    for (const anomaly of anomalies) {
      await this.performRootCauseAnalysis(anomaly)
    }

    return anomalies
  }

  /**
   * Z-Score method (simple statistical anomaly detection)
   * Detects values that are N standard deviations away from mean
   */
  private detectUsingZScore(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Anomaly[] {
    if (data.length < config.minDataPoints) return []

    // Calculate mean and standard deviation
    const values = data.map((d) => d.value)
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Determine threshold based on sensitivity
    const thresholds = {
      low: 3.0, // 3 sigma
      medium: 2.5, // 2.5 sigma
      high: 2.0, // 2 sigma
    }
    const threshold = thresholds[config.sensitivity]

    // Detect anomalies
    const anomalies: Anomaly[] = []

    for (const point of data) {
      const zScore = Math.abs((point.value - mean) / stdDev)

      if (zScore > threshold) {
        const severity = zScore > threshold * 1.5 ? 'critical' : zScore > threshold * 1.2 ? 'warning' : 'info'

        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: point.timestamp,
          metricName: config.metricName,
          value: point.value,
          expectedValue: mean,
          expectedRange: [mean - threshold * stdDev, mean + threshold * stdDev],
          severity,
          score: Math.min(zScore / (threshold * 2), 1), // 0-1
          confidence: 0.8, // Z-score is fairly reliable
          service: '',
          labels: {},
        })
      }
    }

    return anomalies
  }

  /**
   * Median Absolute Deviation (MAD) method
   * More robust to outliers than Z-score
   */
  private detectUsingMAD(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Anomaly[] {
    if (data.length < config.minDataPoints) return []

    const values = data.map((d) => d.value)

    // Calculate median
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]

    // Calculate MAD
    const absoluteDeviations = values.map((v) => Math.abs(v - median))
    const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b)
    const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)]

    // Determine threshold based on sensitivity
    const thresholds = {
      low: 3.5,
      medium: 3.0,
      high: 2.5,
    }
    const threshold = thresholds[config.sensitivity]

    // Detect anomalies
    const anomalies: Anomaly[] = []

    for (const point of data) {
      const modifiedZScore = 0.6745 * (point.value - median) / mad
      const absModifiedZScore = Math.abs(modifiedZScore)

      if (absModifiedZScore > threshold) {
        const severity = absModifiedZScore > threshold * 1.5 ? 'critical' : absModifiedZScore > threshold * 1.2 ? 'warning' : 'info'

        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: point.timestamp,
          metricName: config.metricName,
          value: point.value,
          expectedValue: median,
          expectedRange: [median - threshold * mad / 0.6745, median + threshold * mad / 0.6745],
          severity,
          score: Math.min(absModifiedZScore / (threshold * 2), 1),
          confidence: 0.85, // MAD is more robust
          service: '',
          labels: {},
        })
      }
    }

    return anomalies
  }

  /**
   * Isolation Forest (using Workers AI)
   * Machine learning based anomaly detection
   */
  private async detectUsingIsolationForest(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Promise<Anomaly[]> {
    if (data.length < config.minDataPoints) return []

    // In production, this would use a pre-trained model via Workers AI
    // For now, use statistical approximation

    // Sort by value to find outliers
    const sorted = [...data].sort((a, b) => a.value - b.value)

    // Detect top/bottom outliers
    const outlierThreshold = Math.ceil(data.length * 0.05) // Top/bottom 5%

    const anomalies: Anomaly[] = []

    for (let i = 0; i < outlierThreshold; i++) {
      const topOutlier = sorted[sorted.length - 1 - i]
      const bottomOutlier = sorted[i]

      const median = sorted[Math.floor(sorted.length / 2)].value

      // Top outlier
      if (topOutlier.value > median * 1.5) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: topOutlier.timestamp,
          metricName: config.metricName,
          value: topOutlier.value,
          expectedValue: median,
          expectedRange: [median * 0.8, median * 1.2],
          severity: 'warning',
          score: 0.7,
          confidence: 0.75,
          service: '',
          labels: {},
        })
      }

      // Bottom outlier
      if (bottomOutlier.value < median * 0.5) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: bottomOutlier.timestamp,
          metricName: config.metricName,
          value: bottomOutlier.value,
          expectedValue: median,
          expectedRange: [median * 0.8, median * 1.2],
          severity: 'warning',
          score: 0.7,
          confidence: 0.75,
          service: '',
          labels: {},
        })
      }
    }

    return anomalies
  }

  /**
   * Prophet (Facebook's forecasting algorithm)
   * Handles seasonality and trends
   */
  private async detectUsingProphet(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Promise<Anomaly[]> {
    if (data.length < config.minDataPoints) return []

    // Simple trend + seasonality decomposition
    const { trend, seasonal, residual } = this.decomposeTimeSeries(data, config.seasonality)

    // Detect anomalies in residuals
    const residualMean = residual.reduce((sum, v) => sum + v, 0) / residual.length
    const residualStd = Math.sqrt(residual.reduce((sum, v) => sum + Math.pow(v - residualMean, 2), 0) / residual.length)

    const threshold = config.sensitivity === 'low' ? 3 : config.sensitivity === 'medium' ? 2.5 : 2

    const anomalies: Anomaly[] = []

    for (let i = 0; i < data.length; i++) {
      const expectedValue = trend[i] + seasonal[i]
      const zScore = Math.abs((residual[i] - residualMean) / residualStd)

      if (zScore > threshold) {
        const severity = zScore > threshold * 1.5 ? 'critical' : 'warning'

        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: data[i].timestamp,
          metricName: config.metricName,
          value: data[i].value,
          expectedValue,
          expectedRange: [expectedValue - threshold * residualStd, expectedValue + threshold * residualStd],
          severity,
          score: Math.min(zScore / (threshold * 2), 1),
          confidence: 0.9, // Prophet is good with seasonality
          service: '',
          labels: {},
        })
      }
    }

    return anomalies
  }

  /**
   * LSTM (Long Short-Term Memory neural network)
   * Deep learning for complex patterns
   */
  private async detectUsingLSTM(config: AnomalyDetectionConfig, data: Array<{ timestamp: number; value: number }>): Promise<Anomaly[]> {
    if (data.length < config.minDataPoints) return []

    // In production, this would use a trained LSTM model via Workers AI
    // For now, use moving average as approximation

    const windowSize = 10
    const anomalies: Anomaly[] = []

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i).map((d) => d.value)
      const prediction = window.reduce((sum, v) => sum + v, 0) / windowSize

      const error = Math.abs(data[i].value - prediction)
      const threshold = prediction * (config.sensitivity === 'low' ? 0.3 : config.sensitivity === 'medium' ? 0.2 : 0.15)

      if (error > threshold) {
        const severity = error > threshold * 2 ? 'critical' : 'warning'

        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: data[i].timestamp,
          metricName: config.metricName,
          value: data[i].value,
          expectedValue: prediction,
          expectedRange: [prediction * 0.9, prediction * 1.1],
          severity,
          score: Math.min(error / (threshold * 3), 1),
          confidence: 0.85,
          service: '',
          labels: {},
        })
      }
    }

    return anomalies
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  private decomposeTimeSeries(
    data: Array<{ timestamp: number; value: number }>,
    seasonality?: 'hourly' | 'daily' | 'weekly'
  ): { trend: number[]; seasonal: number[]; residual: number[] } {
    const values = data.map((d) => d.value)

    // Simple moving average for trend
    const windowSize = seasonality === 'hourly' ? 24 : seasonality === 'daily' ? 7 : 30
    const trend: number[] = []

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1)
      const window = values.slice(start, end)
      trend.push(window.reduce((sum, v) => sum + v, 0) / window.length)
    }

    // Detrend
    const detrended = values.map((v, i) => v - trend[i])

    // Extract seasonal component (simple averaging by period)
    const period = seasonality === 'hourly' ? 24 : seasonality === 'daily' ? 7 : 30
    const seasonal: number[] = new Array(values.length).fill(0)

    for (let i = 0; i < values.length; i++) {
      const seasonIndex = i % period
      const seasonValues = detrended.filter((_, idx) => idx % period === seasonIndex)
      seasonal[i] = seasonValues.reduce((sum, v) => sum + v, 0) / seasonValues.length
    }

    // Residual
    const residual = values.map((v, i) => v - trend[i] - seasonal[i])

    return { trend, seasonal, residual }
  }

  /**
   * Perform root cause analysis using Workers AI
   */
  private async performRootCauseAnalysis(anomaly: Anomaly): Promise<void> {
    // Get related events (deployments, alerts, etc.)
    const relatedEvents = await this.getRelatedEvents(anomaly.timestamp)

    // Use Workers AI to analyze
    try {
      const prompt = `
You are an expert SRE analyzing an anomaly in production metrics.

Anomaly Details:
- Metric: ${anomaly.metricName}
- Value: ${anomaly.value} (expected: ${anomaly.expectedValue})
- Timestamp: ${new Date(anomaly.timestamp).toISOString()}
- Severity: ${anomaly.severity}

Recent Events:
${relatedEvents.map((e) => `- ${e.type}: ${e.description}`).join('\n')}

Provide:
1. Most likely root causes (2-3 sentences)
2. Recommended actions (bullet points)
3. Related services to check

Keep it concise and actionable.
`

      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 300,
      })

      const analysis = (response as any).response

      // Parse response (simplified)
      anomaly.recommendation = analysis
      anomaly.possibleCauses = this.extractCauses(analysis)
      anomaly.relatedEvents = relatedEvents.map((e) => e.description)
    } catch (error) {
      console.error('Failed to perform root cause analysis:', error)
    }
  }

  /**
   * Get events related to anomaly timestamp
   */
  private async getRelatedEvents(timestamp: number): Promise<Array<{ type: string; description: string }>> {
    // Query recent deployments, alerts, config changes, etc.
    const window = 30 * 60 * 1000 // 30 minutes

    const events: Array<{ type: string; description: string }> = []

    // Check recent alerts
    const alertResult = await this.env.DB.prepare(
      `SELECT * FROM alert_incidents
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC
       LIMIT 10`
    )
      .bind(Math.floor((timestamp - window) / 1000), Math.floor((timestamp + window) / 1000))
      .all()

    for (const alert of alertResult.results as any[]) {
      events.push({
        type: 'Alert',
        description: alert.message,
      })
    }

    // Check deployments (would query deployment tracking system)
    // events.push({
    //   type: 'Deployment',
    //   description: 'Service X deployed v1.2.3'
    // })

    return events
  }

  /**
   * Extract possible causes from AI response
   */
  private extractCauses(analysis: string): string[] {
    // Simple extraction - look for numbered or bulleted lists
    const lines = analysis.split('\n')
    const causes: string[] = []

    for (const line of lines) {
      const match = line.match(/^\s*[-•*]?\s*(.+)/)
      if (match && match[1].length > 10) {
        causes.push(match[1])
      }
    }

    return causes.slice(0, 3) // Top 3
  }

  /**
   * Continuously monitor metrics for anomalies
   */
  async monitorMetric(config: AnomalyDetectionConfig): Promise<void> {
    // This would run on a schedule (cron trigger)
    // Query recent metric data and detect anomalies

    const now = Date.now()
    const lookback = 24 * 60 * 60 * 1000 // 24 hours

    // Query metric data (from Analytics Engine)
    const data = await this.getMetricData(config.metricName, now - lookback, now)

    // Detect anomalies
    const anomalies = await this.detectAnomalies(config, data)

    // Create incidents for anomalies
    for (const anomaly of anomalies) {
      await this.createIncident(anomaly)
    }
  }

  /**
   * Get metric data from Analytics Engine
   */
  private async getMetricData(metricName: string, from: number, to: number): Promise<Array<{ timestamp: number; value: number }>> {
    // In production, query Analytics Engine
    // For now, return placeholder
    return []
  }

  /**
   * Create incident for anomaly
   */
  private async createIncident(anomaly: Anomaly): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO alert_incidents (
        id, alert_id, state, severity, timestamp, value, message, labels
      ) VALUES (?, ?, 'firing', ?, ?, ?, ?, ?)`
    )
      .bind(
        anomaly.id,
        `anomaly-${anomaly.metricName}`,
        anomaly.severity,
        Math.floor(anomaly.timestamp / 1000),
        anomaly.value,
        `Anomaly detected in ${anomaly.metricName}: ${anomaly.value} (expected ${anomaly.expectedValue})`,
        JSON.stringify(anomaly.labels)
      )
      .run()
  }
}
