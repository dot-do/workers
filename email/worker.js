/**
 * Email Service Worker
 *
 * Backwards compatibility shim for the email receiving functionality.
 * The main email sending service is now in src/index.ts
 */

import * as PostalMime from 'postal-mime'

// Email receiving handler (for incoming emails via Cloudflare Email Routing)
export default {
  async email(message, env, ctx) {
    const parser = new PostalMime.default()
    const rawEmail = new Response(message.raw)
    const email = await parser.parse(await rawEmail.arrayBuffer())

    console.log('Received email:', email)

    // Add metadata
    email.$type = 'Email.Received'
    email.type = 'Email.Received'
    email.$ts = new Date().toISOString()

    // Send to pipeline for processing
    await env.pipeline.send([email])
  },

  // Re-export the main service for HTTP/RPC handling
  async fetch(request, env, ctx) {
    // Import and use the main service
    const { http } = await import('./src/index.ts')
    return http.fetch(request, env, ctx)
  },
}
