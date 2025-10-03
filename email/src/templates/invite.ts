/**
 * Team Invite Email Template
 *
 * Sent when a user is invited to join a team/organization
 */

import type { InviteData, RenderedEmail } from '../types'

export function renderInvite(data: InviteData): RenderedEmail {
  const expiresIn = data.expiresIn || '7 days'
  const roleText = data.role ? ` as a ${data.role}` : ''

  return {
    subject: `You've been invited to join ${data.organizationName}`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .invite-box { background: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: 600; }
    .button:hover { background: #5568d3; }
    .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 You're Invited!</h1>
  </div>
  <div class="content">
    <h2>Hi there,</h2>
    <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong>${roleText}.</p>
    <div class="invite-box">
      <h3 style="margin-top: 0;">Join ${data.organizationName}</h3>
      ${data.role ? `<p style="color: #667eea; font-weight: 600; margin: 10px 0;">Role: ${data.role}</p>` : ''}
      <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
      <p style="font-size: 14px; color: #666; margin-bottom: 0;">This invitation expires in ${expiresIn}</p>
    </div>
    <div class="info">
      <strong>What happens next?</strong><br>
      1. Click the button above to accept the invitation<br>
      2. Create your account or log in if you already have one<br>
      3. Start collaborating with your team!
    </div>
    <p>If you have any questions, feel free to reach out to ${data.inviterName} or contact our support team.</p>
    <p>Best regards,<br>The .do Team</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} .do. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),

    text: `
You're Invited!

Hi there,

${data.inviterName} has invited you to join ${data.organizationName}${roleText}.

${data.role ? `Role: ${data.role}\n` : ''}
Click the link below to accept the invitation:

${data.inviteUrl}

This invitation expires in ${expiresIn}.

WHAT HAPPENS NEXT?
1. Click the link above to accept the invitation
2. Create your account or log in if you already have one
3. Start collaborating with your team!

If you have any questions, feel free to reach out to ${data.inviterName} or contact our support team.

Best regards,
The .do Team

---
© ${new Date().getFullYear()} .do. All rights reserved.
    `.trim(),
  }
}
