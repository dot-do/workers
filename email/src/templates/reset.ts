/**
 * Password Reset Email Template
 *
 * Sent when a user requests a password reset
 */

import type { PasswordResetData, RenderedEmail } from '../types'

export function renderPasswordReset(data: PasswordResetData): RenderedEmail {
  const expiresIn = data.expiresIn || '1 hour'

  return {
    subject: 'Reset Your Password',

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #d32f2f; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Password Reset Request</h1>
  </div>
  <div class="content">
    <h2>Hi ${data.name},</h2>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </p>
    <div class="warning">
      <strong>⚠️ Security Notice:</strong> This link will expire in ${expiresIn}. If you didn't request this reset, you can safely ignore this email.
    </div>
    <p>For security reasons, we cannot send you your current password. If you continue to have problems, please contact support.</p>
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
Password Reset Request

Hi ${data.name},

We received a request to reset your password. Click the link below to create a new password:

${data.resetUrl}

⚠️ SECURITY NOTICE:
This link will expire in ${expiresIn}. If you didn't request this reset, you can safely ignore this email.

For security reasons, we cannot send you your current password. If you continue to have problems, please contact support.

Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
