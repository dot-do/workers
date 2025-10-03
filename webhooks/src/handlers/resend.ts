import type { Env, ResendEvent, ResendEmailSent, ResendEmailDelivered, ResendEmailOpened, ResendEmailClicked, ResendEmailBounced } from '../types'

/**
 * Handle Resend webhook events
 *
 * Supported events:
 * - email.sent
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */
export async function handleResendWebhook(event: ResendEvent, env: Env): Promise<any> {
  console.log(`[RESEND] Processing event: ${event.type}`)

  switch (event.type) {
    case 'email.sent':
      return handleEmailSent(event.data as ResendEmailSent, env)

    case 'email.delivered':
      return handleEmailDelivered(event.data as ResendEmailDelivered, env)

    case 'email.opened':
      return handleEmailOpened(event.data as ResendEmailOpened, env)

    case 'email.clicked':
      return handleEmailClicked(event.data as ResendEmailClicked, env)

    case 'email.bounced':
      return handleEmailBounced(event.data as ResendEmailBounced, env)

    case 'email.complained':
      return handleEmailComplained(event.data, env)

    default:
      console.log(`[RESEND] Unhandled event type: ${event.type}`)
      return { acknowledged: true, event_type: event.type }
  }
}

/**
 * Handle email sent event
 */
async function handleEmailSent(data: ResendEmailSent, env: Env): Promise<any> {
  console.log(`[RESEND] Email sent: ${data.email_id}`)

  // Update email status in database
  await env.DB.query({
    sql: `INSERT INTO emails (resend_email_id, from_address, to_address, subject, status, sent_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'sent', ?, NOW(), NOW())
          ON CONFLICT (resend_email_id) DO UPDATE SET status = 'sent', sent_at = ?, updated_at = NOW()`,
    params: [data.email_id, data.from, data.to.join(','), data.subject, data.created_at, data.created_at],
  })

  return { processed: true, email_id: data.email_id }
}

/**
 * Handle email delivered event
 */
async function handleEmailDelivered(data: ResendEmailDelivered, env: Env): Promise<any> {
  console.log(`[RESEND] Email delivered: ${data.email_id}`)

  // Update email status in database
  await env.DB.query({
    sql: `UPDATE emails SET status = 'delivered', delivered_at = ?, updated_at = NOW() WHERE resend_email_id = ?`,
    params: [data.created_at, data.email_id],
  })

  return { processed: true, email_id: data.email_id }
}

/**
 * Handle email opened event
 */
async function handleEmailOpened(data: ResendEmailOpened, env: Env): Promise<any> {
  console.log(`[RESEND] Email opened: ${data.email_id}`)

  // Update email opens
  await env.DB.query({
    sql: `UPDATE emails SET opens = opens + 1, last_opened_at = ?, updated_at = NOW() WHERE resend_email_id = ?`,
    params: [data.opened_at, data.email_id],
  })

  // Track open event
  await env.DB.query({
    sql: `INSERT INTO email_events (resend_email_id, event_type, user_agent, ip_address, created_at)
          VALUES (?, 'opened', ?, ?, NOW())`,
    params: [data.email_id, data.user_agent || null, data.ip || null],
  })

  // Queue analytics
  await env.QUEUE.enqueue({
    type: 'email.analytics',
    payload: {
      emailId: data.email_id,
      eventType: 'opened',
      timestamp: data.opened_at,
    },
  })

  return { processed: true, email_id: data.email_id }
}

/**
 * Handle email clicked event
 */
async function handleEmailClicked(data: ResendEmailClicked, env: Env): Promise<any> {
  console.log(`[RESEND] Email link clicked: ${data.email_id} - ${data.link}`)

  // Update email clicks
  await env.DB.query({
    sql: `UPDATE emails SET clicks = clicks + 1, last_clicked_at = ?, updated_at = NOW() WHERE resend_email_id = ?`,
    params: [data.clicked_at, data.email_id],
  })

  // Track click event
  await env.DB.query({
    sql: `INSERT INTO email_events (resend_email_id, event_type, link, user_agent, ip_address, created_at)
          VALUES (?, 'clicked', ?, ?, ?, NOW())`,
    params: [data.email_id, data.link, data.user_agent || null, data.ip || null],
  })

  // Queue analytics
  await env.QUEUE.enqueue({
    type: 'email.analytics',
    payload: {
      emailId: data.email_id,
      eventType: 'clicked',
      link: data.link,
      timestamp: data.clicked_at,
    },
  })

  return { processed: true, email_id: data.email_id, link: data.link }
}

/**
 * Handle email bounced event
 */
async function handleEmailBounced(data: ResendEmailBounced, env: Env): Promise<any> {
  console.log(`[RESEND] Email bounced: ${data.email_id} - ${data.bounce_type}`)

  // Update email status
  await env.DB.query({
    sql: `UPDATE emails SET status = 'bounced', bounce_type = ?, bounce_reason = ?, bounced_at = ?, updated_at = NOW() WHERE resend_email_id = ?`,
    params: [data.bounce_type, data.reason, data.bounced_at, data.email_id],
  })

  // Track bounce event
  await env.DB.query({
    sql: `INSERT INTO email_events (resend_email_id, event_type, bounce_type, bounce_reason, created_at)
          VALUES (?, 'bounced', ?, ?, NOW())`,
    params: [data.email_id, data.bounce_type, data.reason],
  })

  // Queue notification for hard bounces
  if (data.bounce_type === 'hard') {
    await env.QUEUE.enqueue({
      type: 'email.hard_bounce',
      payload: {
        emailId: data.email_id,
        reason: data.reason,
      },
    })
  }

  return { processed: true, email_id: data.email_id, bounce_type: data.bounce_type }
}

/**
 * Handle email complained (spam) event
 */
async function handleEmailComplained(data: any, env: Env): Promise<any> {
  console.log(`[RESEND] Email complained: ${data.email_id}`)

  // Update email status
  await env.DB.query({
    sql: `UPDATE emails SET status = 'complained', complained_at = NOW(), updated_at = NOW() WHERE resend_email_id = ?`,
    params: [data.email_id],
  })

  // Track complaint event
  await env.DB.query({
    sql: `INSERT INTO email_events (resend_email_id, event_type, created_at)
          VALUES (?, 'complained', NOW())`,
    params: [data.email_id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'email.complaint',
    payload: {
      emailId: data.email_id,
    },
  })

  return { processed: true, email_id: data.email_id }
}
