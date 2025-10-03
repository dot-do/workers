/**
 * API Key Email Template
 *
 * Sent when a new API key is generated
 */

import type { ApiKeyData, RenderedEmail } from '../types'

export function renderApiKey(data: ApiKeyData): RenderedEmail {
  return {
    subject: 'New API Key Generated',

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New API Key Generated</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .api-key { background: #f5f5f5; border: 2px solid #4caf50; border-radius: 6px; padding: 20px; margin: 20px 0; font-family: monospace; font-size: 14px; word-break: break-all; }
    .warning { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔑 New API Key Generated</h1>
  </div>
  <div class="content">
    <h2>Hi ${data.name},</h2>
    <p>A new API key has been generated for your account on ${data.createdAt}.</p>
    <div class="api-key">
      <strong>API Key:</strong><br>
      ${data.apiKey}
    </div>
    <div class="warning">
      <strong>⚠️ Important Security Information:</strong><br>
      • This is the only time we will show you this key<br>
      • Store it securely (we recommend a password manager)<br>
      • Never share it or commit it to version control<br>
      • Treat it like a password<br>
      ${data.expiresAt ? `• This key expires on ${data.expiresAt}<br>` : ''}
      • If compromised, revoke it immediately from your dashboard
    </div>
    <p>You can use this API key to authenticate requests to our API. Include it in the Authorization header:</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px;">
      Authorization: Bearer ${data.apiKey}
    </div>
    <p>If you didn't create this API key, please contact support immediately.</p>
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
New API Key Generated

Hi ${data.name},

A new API key has been generated for your account on ${data.createdAt}.

API KEY:
${data.apiKey}

⚠️ IMPORTANT SECURITY INFORMATION:
• This is the only time we will show you this key
• Store it securely (we recommend a password manager)
• Never share it or commit it to version control
• Treat it like a password
${data.expiresAt ? `• This key expires on ${data.expiresAt}\n` : ''}• If compromised, revoke it immediately from your dashboard

You can use this API key to authenticate requests to our API. Include it in the Authorization header:

Authorization: Bearer ${data.apiKey}

If you didn't create this API key, please contact support immediately.

Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
