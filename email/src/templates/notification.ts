/**
 * Notification Email Template
 *
 * General purpose notification template
 */

import type { NotificationData, RenderedEmail } from '../types'

export function renderNotification(data: NotificationData): RenderedEmail {
  return {
    subject: data.title,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .message { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #5568d3; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 ${data.title}</h1>
  </div>
  <div class="content">
    <div class="message">
      ${data.message}
    </div>
    ${
      data.actionUrl
        ? `
    <p style="text-align: center;">
      <a href="${data.actionUrl}" class="button">${data.actionText || 'View Details'}</a>
    </p>
    `
        : ''
    }
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
${data.title}

${data.message}

${data.actionUrl ? `${data.actionText || 'View Details'}: ${data.actionUrl}\n` : ''}
Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
