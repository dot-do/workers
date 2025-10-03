/**
 * Email Verification Template
 *
 * Sent to verify a user's email address
 */

import type { VerificationData, RenderedEmail } from '../types'

export function renderVerification(data: VerificationData): RenderedEmail {
  const expiresIn = data.expiresIn || '24 hours'

  return {
    subject: 'Verify Your Email Address',

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .button:hover { background: #5568d3; }
    .code-box { background: #f5f5f5; border: 2px dashed #667eea; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
    .code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
    .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✉️ Verify Your Email</h1>
  </div>
  <div class="content">
    <h2>Hi ${data.name},</h2>
    <p>Thanks for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
    <p style="text-align: center;">
      <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
    </p>
    ${
      data.code
        ? `
    <p style="text-align: center; margin: 30px 0;">Or enter this verification code:</p>
    <div class="code-box">
      <div class="code">${data.code}</div>
    </div>
    `
        : ''
    }
    <div class="info">
      ℹ️ This verification link will expire in ${expiresIn}. If you didn't create an account, you can safely ignore this email.
    </div>
    <p><small>If the button doesn't work, copy and paste this link into your browser:<br>${data.verificationUrl}</small></p>
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
Verify Your Email

Hi ${data.name},

Thanks for signing up! To complete your registration, please verify your email address by clicking the link below:

${data.verificationUrl}

${data.code ? `Or enter this verification code: ${data.code}\n` : ''}
This verification link will expire in ${expiresIn}. If you didn't create an account, you can safely ignore this email.

Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
