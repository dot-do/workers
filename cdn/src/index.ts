/**
 * Content Supply Chain Platform
 * Main entry point for Hono API
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Env } from './types/env'
import { EventCapture } from './events/capture'
import { ProvenanceTracker } from './provenance/tracker'
import { ContentDistributor } from './publishing/distributor'
import { ConsumptionTracker } from './analytics/tracker'
import { ContentGraphBuilder } from './graph/builder'
import {
  CreationEventSchema,
  EditEventSchema,
  ApprovalEventSchema,
  PublishEventSchema,
  DistributionEventSchema,
  ConsumptionEventSchema,
} from './types/events'
import { ContentSchema, DistributionChannelSchema, ProvenanceEntrySchema, AIDisclosureSchema, LicenseSchema } from './types/content'

const app = new Hono<{ Bindings: Env }>()

// Middleware: Initialize services
app.use('*', async (c, next) => {
  c.set('eventCapture', new EventCapture(c.env.DB, c.env.EVENTS_PIPELINE, c.env.EVENT_QUEUE))
  c.set('provenance', new ProvenanceTracker(c.env.DB))
  c.set('distributor', new ContentDistributor(c.env.DB, c.get('eventCapture')))
  c.set('analytics', new ConsumptionTracker(c.env.DB, c.env.ANALYTICS))
  c.set('graph', new ContentGraphBuilder(c.env.DB))
  await next()
})

// Health check
app.get('/', c => c.json({ status: 'ok', service: 'content-supply-chain' }))

// ===== Content Events API =====

app.post('/events/creation', zValidator('json', CreationEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  await eventCapture.captureEvent(event)
  return c.json({ success: true, eventId: event.id })
})

app.post('/events/edit', zValidator('json', EditEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  await eventCapture.captureEvent(event)
  return c.json({ success: true, eventId: event.id })
})

app.post('/events/approval', zValidator('json', ApprovalEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  await eventCapture.captureEvent(event)
  return c.json({ success: true, eventId: event.id })
})

app.post('/events/publish', zValidator('json', PublishEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  await eventCapture.captureEvent(event)
  return c.json({ success: true, eventId: event.id })
})

app.post('/events/distribution', zValidator('json', DistributionEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  await eventCapture.captureEvent(event)
  return c.json({ success: true, eventId: event.id })
})

app.post('/events/consumption', zValidator('json', ConsumptionEventSchema), async c => {
  const event = c.req.valid('json')
  const eventCapture: EventCapture = c.get('eventCapture')
  const analytics: ConsumptionTracker = c.get('analytics')

  await eventCapture.captureEvent(event)
  await analytics.trackConsumption(event)

  return c.json({ success: true, eventId: event.id })
})

app.get('/events/:contentId', async c => {
  const contentId = c.req.param('contentId')
  const eventTypes = c.req.query('types')?.split(',')
  const limit = parseInt(c.req.query('limit') || '100')

  const eventCapture: EventCapture = c.get('eventCapture')
  const events = await eventCapture.getContentEvents(contentId, { eventTypes, limit })

  return c.json({ contentId, events })
})

app.get('/events/:contentId/timeline', async c => {
  const contentId = c.req.param('contentId')
  const eventCapture: EventCapture = c.get('eventCapture')
  const timeline = await eventCapture.getContentTimeline(contentId)
  return c.json({ contentId, timeline })
})

// ===== Provenance API =====

app.post('/provenance', zValidator('json', ProvenanceEntrySchema), async c => {
  const entry = c.req.valid('json')
  const provenance: ProvenanceTracker = c.get('provenance')
  await provenance.addProvenance(entry)
  return c.json({ success: true, entryId: entry.id })
})

app.get('/provenance/:contentId', async c => {
  const contentId = c.req.param('contentId')
  const provenance: ProvenanceTracker = c.get('provenance')
  const chain = await provenance.getProvenance(contentId)
  return c.json({ contentId, provenance: chain })
})

app.post('/provenance/ai-disclosure', zValidator('json', AIDisclosureSchema), async c => {
  const disclosure = c.req.valid('json')
  const provenance: ProvenanceTracker = c.get('provenance')
  await provenance.updateAIDisclosure(disclosure)
  return c.json({ success: true, disclosureId: disclosure.id })
})

app.get('/provenance/:contentId/ai-disclosure', async c => {
  const contentId = c.req.param('contentId')
  const provenance: ProvenanceTracker = c.get('provenance')
  const disclosure = await provenance.getAIDisclosure(contentId)
  return c.json({ contentId, disclosure })
})

app.post('/provenance/license', zValidator('json', LicenseSchema), async c => {
  const license = c.req.valid('json')
  const provenance: ProvenanceTracker = c.get('provenance')
  await provenance.setLicense(license)
  return c.json({ success: true, licenseId: license.id })
})

app.get('/provenance/:contentId/license', async c => {
  const contentId = c.req.param('contentId')
  const provenance: ProvenanceTracker = c.get('provenance')
  const license = await provenance.getLicense(contentId)
  return c.json({ contentId, license })
})

app.get('/provenance/:contentId/compliance', async c => {
  const contentId = c.req.param('contentId')
  const provenance: ProvenanceTracker = c.get('provenance')
  const report = await provenance.generateComplianceReport(contentId)
  return c.json({ contentId, report })
})

// ===== Distribution API =====

app.post('/channels', zValidator('json', DistributionChannelSchema), async c => {
  const channel = c.req.valid('json')
  const distributor: ContentDistributor = c.get('distributor')
  await distributor.registerChannel(channel)
  return c.json({ success: true, channelId: channel.id })
})

app.get('/channels', async c => {
  const distributor: ContentDistributor = c.get('distributor')
  const channels = await distributor.getActiveChannels()
  return c.json({ channels })
})

app.post('/distribution/schedule', async c => {
  const { contentId, channelId, scheduledAt, actorId } = await c.req.json()
  const distributor: ContentDistributor = c.get('distributor')
  const distribution = await distributor.scheduleDistribution(contentId, channelId, scheduledAt, actorId)
  return c.json({ success: true, distribution })
})

app.post('/distribution/publish', async c => {
  const { contentId, channelId, actorId, customizations } = await c.req.json()
  const distributor: ContentDistributor = c.get('distributor')
  const distribution = await distributor.publishToChannel(contentId, channelId, actorId, customizations)
  return c.json({ success: true, distribution })
})

app.get('/distribution/:contentId', async c => {
  const contentId = c.req.param('contentId')
  const distributor: ContentDistributor = c.get('distributor')
  const distributions = await distributor.getContentDistributions(contentId)
  return c.json({ contentId, distributions })
})

app.get('/distribution/:contentId/metrics', async c => {
  const contentId = c.req.param('contentId')
  const distributor: ContentDistributor = c.get('distributor')
  const metrics = await distributor.getDistributionMetrics(contentId)
  return c.json({ contentId, metrics })
})

// ===== Analytics API =====

app.get('/analytics/:contentId', async c => {
  const contentId = c.req.param('contentId')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const channelId = c.req.query('channelId')

  const analytics: ConsumptionTracker = c.get('analytics')
  const data = await analytics.getContentAnalytics(contentId, { startDate, endDate, channelId })

  return c.json({ contentId, analytics: data })
})

app.get('/analytics/:contentId/summary', async c => {
  const contentId = c.req.param('contentId')
  const analytics: ConsumptionTracker = c.get('analytics')
  const summary = await analytics.getAnalyticsSummary(contentId)
  return c.json({ contentId, summary })
})

app.get('/analytics/trending', async c => {
  const limit = parseInt(c.req.query('limit') || '10')
  const days = parseInt(c.req.query('days') || '7')

  const analytics: ConsumptionTracker = c.get('analytics')
  const trending = await analytics.getTrendingContent(limit, days)

  return c.json({ trending })
})

// ===== Content Graph API =====

app.get('/graph/:contentId/relationships', async c => {
  const contentId = c.req.param('contentId')
  const direction = c.req.query('direction') as 'outbound' | 'inbound' | 'both' | undefined

  const graph: ContentGraphBuilder = c.get('graph')
  const relationships = await graph.getRelationships(contentId, direction)

  return c.json({ contentId, relationships })
})

app.get('/graph/:contentId/related', async c => {
  const contentId = c.req.param('contentId')
  const relationshipType = c.req.query('type') || 'references'
  const maxDepth = parseInt(c.req.query('depth') || '2')

  const graph: ContentGraphBuilder = c.get('graph')
  const related = await graph.findRelated(contentId, relationshipType, maxDepth)

  return c.json({ contentId, related })
})

app.get('/graph/:contentId/recommendations', async c => {
  const contentId = c.req.param('contentId')
  const limit = parseInt(c.req.query('limit') || '10')

  const graph: ContentGraphBuilder = c.get('graph')
  const recommendations = await graph.getRecommendations(contentId, limit)

  return c.json({ contentId, recommendations })
})

app.get('/graph/:contentId/lineage', async c => {
  const contentId = c.req.param('contentId')
  const graph: ContentGraphBuilder = c.get('graph')
  const lineage = await graph.getContentLineage(contentId)
  return c.json({ contentId, lineage })
})

app.get('/graph/:contentId/influence', async c => {
  const contentId = c.req.param('contentId')
  const graph: ContentGraphBuilder = c.get('graph')
  const score = await graph.calculateInfluenceScore(contentId)
  return c.json({ contentId, influenceScore: score })
})

app.get('/graph/stale', async c => {
  const thresholdDays = parseInt(c.req.query('days') || '180')
  const graph: ContentGraphBuilder = c.get('graph')
  const stale = await graph.findStaleContent(thresholdDays)
  return c.json({ staleContent: stale })
})

// ===== Queue Consumer =====

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { type, envelope } = message.body

        if (type === 'content_event') {
          // Process event asynchronously
          console.log('Processing event:', envelope.event.eventType, envelope.event.contentId)

          // Could trigger notifications, webhooks, analytics aggregation, etc.
        }

        message.ack()
      } catch (error) {
        console.error('Error processing message:', error)
        message.retry()
      }
    }
  },
}
