/**
 * Welcome Email Template
 *
 * Sent when a new user signs up
 */

import type { WelcomeData, RenderedEmail } from '../types'

export function renderWelcome(data: WelcomeData): RenderedEmail {
  const companyName = data.companyName || '.do'

  return {
    subject: `Welcome to ${companyName}!`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${companyName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #5568d3; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to ${companyName}!</h1>
  </div>
  <div class="content">
    <h2>Hi ${data.name},</h2>
    <p>Thanks for signing up! We're excited to have you on board.</p>
    <p>Your account is all set up and ready to go. Click the button below to log in and start exploring:</p>
    <p style="text-align: center;">
      <a href="${data.loginUrl}" class="button">Log In Now</a>
    </p>
    <p>If you have any questions or need help getting started, just reply to this email and we'll be happy to assist.</p>
    <p>Best regards,<br>The ${companyName} Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
Welcome to ${companyName}!

Hi ${data.name},

Thanks for signing up! We're excited to have you on board.

Your account is all set up and ready to go. Click the link below to log in and start exploring:

${data.loginUrl}

If you have any questions or need help getting started, just reply to this email and we'll be happy to assist.

Best regards,
The ${companyName} Team

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim(),
  }
}
