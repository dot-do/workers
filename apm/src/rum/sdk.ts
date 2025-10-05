/**
 * Real User Monitoring (RUM) SDK for Browser
 *
 * Lightweight browser SDK that captures:
 * - Page views and navigation
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 * - User interactions (clicks, form submissions)
 * - JavaScript errors
 * - Network requests
 * - Long tasks
 *
 * Usage:
 * <script src="https://apm.example.com/apm-rum.min.js"></script>
 * <script>
 *   window.APM.init({
 *     endpoint: 'https://apm.example.com/v1/rum',
 *     applicationId: 'my-app',
 *     sessionSampleRate: 1.0, // 100% of sessions
 *     trackInteractions: true,
 *     trackResources: true,
 *     trackLongTasks: true
 *   })
 * </script>
 */

interface APMConfig {
  endpoint: string
  applicationId: string
  sessionSampleRate?: number
  trackInteractions?: boolean
  trackResources?: boolean
  trackLongTasks?: boolean
  allowedOrigins?: string[]
  beforeSend?: (event: any) => any | null
}

interface RUMEvent {
  type: 'pageview' | 'interaction' | 'error' | 'webvital' | 'resource' | 'longtask'
  timestamp: number
  sessionId: string
  viewId: string
  url: string
  referrer?: string
  userAgent: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  viewport: { width: number; height: number }
  data: any
}

class APM {
  private config: APMConfig | null = null
  private sessionId: string
  private viewId: string
  private buffer: RUMEvent[] = []
  private flushInterval: number = 5000 // 5 seconds
  private flushTimer?: number

  constructor() {
    this.sessionId = this.generateId()
    this.viewId = this.generateId()
  }

  init(config: APMConfig) {
    this.config = config

    // Check if session should be sampled
    if (Math.random() > (config.sessionSampleRate || 1.0)) {
      console.log('[APM] Session not sampled')
      return
    }

    // Track page view
    this.trackPageView()

    // Track Web Vitals
    this.trackWebVitals()

    // Track errors
    this.trackErrors()

    // Track interactions
    if (config.trackInteractions) {
      this.trackInteractions()
    }

    // Track resources
    if (config.trackResources) {
      this.trackResources()
    }

    // Track long tasks
    if (config.trackLongTasks) {
      this.trackLongTasks()
    }

    // Track page visibility changes
    this.trackVisibilityChanges()

    // Start flush timer
    this.startFlushTimer()

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true)
    })
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  private trackPageView() {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
    const domContentLoadedTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    const firstPaintTime = this.getFirstPaint()
    const firstContentfulPaintTime = this.getFirstContentfulPaint()

    this.recordEvent({
      type: 'pageview',
      data: {
        title: document.title,
        loadTime,
        domContentLoadedTime,
        firstPaintTime,
        firstContentfulPaintTime,
      },
    })
  }

  private getFirstPaint(): number | undefined {
    const paint = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint')
    return paint?.startTime
  }

  private getFirstContentfulPaint(): number | undefined {
    const paint = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint')
    return paint?.startTime
  }

  private trackWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.recordWebVital('LCP', lastEntry.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordWebVital('FID', entry.processingStart - entry.startTime)
      })
    }).observe({ type: 'first-input', buffered: true })

    // Cumulative Layout Shift (CLS)
    let clsScore = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value
        }
      })
      this.recordWebVital('CLS', clsScore)
    }).observe({ type: 'layout-shift', buffered: true })

    // Interaction to Next Paint (INP)
    if ('PerformanceEventTiming' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordWebVital('INP', entry.duration)
        })
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 })
    }

    // Time to First Byte (TTFB)
    const ttfb = performance.timing.responseStart - performance.timing.requestStart
    this.recordWebVital('TTFB', ttfb)

    // First Contentful Paint (FCP)
    const fcp = this.getFirstContentfulPaint()
    if (fcp) {
      this.recordWebVital('FCP', fcp)
    }
  }

  private recordWebVital(name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP', value: number) {
    const rating = this.rateWebVital(name, value)
    this.recordEvent({
      type: 'webvital',
      data: {
        name,
        value,
        rating,
      },
    })
  }

  private rateWebVital(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      LCP: [2500, 4000], // milliseconds
      FID: [100, 300], // milliseconds
      CLS: [0.1, 0.25], // score
      FCP: [1800, 3000], // milliseconds
      TTFB: [800, 1800], // milliseconds
      INP: [200, 500], // milliseconds
    }

    const [good, poor] = thresholds[name] || [0, 0]
    if (value <= good) return 'good'
    if (value <= poor) return 'needs-improvement'
    return 'poor'
  }

  private trackErrors() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordEvent({
        type: 'error',
        data: {
          message: event.message,
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          errorType: 'js',
        },
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordEvent({
        type: 'error',
        data: {
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          errorType: 'js',
        },
      })
    })

    // Network errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - startTime

        if (!response.ok) {
          this.recordEvent({
            type: 'error',
            data: {
              message: `HTTP ${response.status}: ${response.statusText}`,
              errorType: 'network',
            },
          })
        }

        return response
      } catch (error) {
        const duration = performance.now() - startTime
        this.recordEvent({
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            errorType: 'network',
          },
        })
        throw error
      }
    }
  }

  private trackInteractions() {
    // Click tracking
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement
        this.recordEvent({
          type: 'interaction',
          data: {
            elementType: target.tagName.toLowerCase(),
            elementId: target.id,
            elementText: target.textContent?.substring(0, 100),
            duration: 0,
          },
        })
      },
      { capture: true }
    )

    // Form submissions
    document.addEventListener(
      'submit',
      (event) => {
        const target = event.target as HTMLFormElement
        this.recordEvent({
          type: 'interaction',
          data: {
            elementType: 'form',
            elementId: target.id,
            duration: 0,
          },
        })
      },
      { capture: true }
    )
  }

  private trackResources() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordEvent({
          type: 'resource',
          data: {
            url: entry.name,
            type: this.getResourceType(entry.initiatorType),
            duration: entry.duration,
            size: entry.transferSize,
          },
        })
      })
    }).observe({ type: 'resource', buffered: true })
  }

  private getResourceType(initiatorType: string): 'script' | 'stylesheet' | 'image' | 'fetch' | 'xhr' {
    const typeMap: Record<string, any> = {
      script: 'script',
      link: 'stylesheet',
      img: 'image',
      fetch: 'fetch',
      xmlhttprequest: 'xhr',
    }
    return typeMap[initiatorType] || 'fetch'
  }

  private trackLongTasks() {
    if ('PerformanceLongTaskTiming' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordEvent({
            type: 'longtask',
            data: {
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: entry.attribution?.map((a: any) => a.name),
            },
          })
        })
      }).observe({ type: 'longtask', buffered: true })
    }
  }

  private trackVisibilityChanges() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush(true)
      } else {
        // Generate new view ID when page becomes visible again
        this.viewId = this.generateId()
      }
    })
  }

  private recordEvent(event: Partial<RUMEvent>) {
    if (!this.config) return

    const fullEvent: RUMEvent = {
      type: event.type!,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      viewId: this.viewId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      data: event.data,
      ...event,
    }

    // Allow filtering via beforeSend
    const processedEvent = this.config.beforeSend ? this.config.beforeSend(fullEvent) : fullEvent
    if (!processedEvent) return

    this.buffer.push(processedEvent)

    // Flush immediately for errors
    if (event.type === 'error') {
      this.flush()
    }
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet'
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile'
    }
    return 'desktop'
  }

  private startFlushTimer() {
    this.flushTimer = window.setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  private flush(useBeacon: boolean = false) {
    if (!this.config || this.buffer.length === 0) return

    const events = [...this.buffer]
    this.buffer = []

    const payload = {
      applicationId: this.config.applicationId,
      events,
    }

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload))
    } else {
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((error) => {
        console.error('[APM] Failed to send events:', error)
      })
    }
  }

  // Public API for manual tracking
  trackEvent(name: string, data: any) {
    this.recordEvent({
      type: 'interaction',
      data: {
        elementType: 'custom',
        elementId: name,
        ...data,
      },
    })
  }

  setUser(userId: string, attributes?: Record<string, any>) {
    // Store user context
    ;(this as any).userId = userId
    ;(this as any).userAttributes = attributes
  }

  addTag(key: string, value: string) {
    if (!(this as any).tags) {
      ;(this as any).tags = {}
    }
    ;(this as any).tags[key] = value
  }
}

// Global singleton
;(window as any).APM = new APM()
