/**
 * Magic Link Email Template
 *
 * Sent for passwordless login
 */

import type { MagicLinkData, RenderedEmail } from '../types'

export function renderMagicLink(data: MagicLinkData): RenderedEmail {
  const expiresIn = data.expiresIn || '15 minutes'
  const greeting = data.name ? `Hi ${data.name}` : 'Hi there'

  return {
    subject: 'Your Login Link',

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Link</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .button:hover { background: #5568d3; }
    .info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Your Login Link</h1>
  </div>
  <div class="content">
    <h2>${greeting},</h2>
    <p>Click the button below to securely log in to your account:</p>
    <p style="text-align: center;">
      <a href="${data.loginUrl}" class="button">Log In Now</a>
    </p>
    <div class="info">
      <strong>ℹ️ Security Information:</strong><br>
      • This link will expire in ${expiresIn}<br>
      • Can only be used once<br>
      ${data.ipAddress ? `• Requested from IP: ${data.ipAddress}<br>` : ''}
      • If you didn't request this, please ignore this email
    </div>
    <p><small>If the button doesn't work, copy and paste this link into your browser:<br>${data.loginUrl}</small></p>
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
Your Login Link

${greeting},

Click the link below to securely log in to your account:

${data.loginUrl}

SECURITY INFORMATION:
• This link will expire in ${expiresIn}
• Can only be used once
${data.ipAddress ? `• Requested from IP: ${data.ipAddress}\n` : ''}• If you didn't request this, please ignore this email

Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
