/**
 * Amazon SES Email Provider
 *
 * Integration with Amazon SES v2 API for cost-effective bulk email sending
 * Cost: $0.10 per 1,000 emails (vs Resend $0.40/1K)
 * Docs: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html
 */

import { BaseEmailProvider } from './base'
import type { EmailMessage, EmailResult, EmailStatus } from '../types'

interface SESEmailRequest {
  FromEmailAddress: string
  Destination: {
    ToAddresses: string[]
    CcAddresses?: string[]
    BccAddresses?: string[]
  }
  Content: {
    Simple: {
      Subject: {
        Data: string
        Charset?: string
      }
      Body: {
        Html?: {
          Data: string
          Charset?: string
        }
        Text?: {
          Data: string
          Charset?: string
        }
      }
    }
  }
  ReplyToAddresses?: string[]
  EmailTags?: Array<{ Name: string; Value: string }>
}

interface SESEmailResponse {
  MessageId: string
}

interface SESErrorResponse {
  __type: string
  message: string
}

export class SESProvider extends BaseEmailProvider {
  name = 'ses'
  private region: string
  private accessKeyId: string
  private secretAccessKey: string

  constructor(config: { accessKeyId: string; secretAccessKey: string; region?: string }) {
    super(config.accessKeyId) // Pass accessKeyId as apiKey for base class
    this.accessKeyId = config.accessKeyId
    this.secretAccessKey = config.secretAccessKey
    this.region = config.region || 'us-east-1'
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    this.validateMessage(message)

    const payload: SESEmailRequest = {
      FromEmailAddress: this.normalizeAddress(message.from),
      Destination: {
        ToAddresses: this.normalizeAddresses(message.to),
      },
      Content: {
        Simple: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {},
        },
      },
    }

    // Add HTML and/or text content
    if (message.html) {
      payload.Content.Simple.Body.Html = {
        Data: message.html,
        Charset: 'UTF-8',
      }
    }

    if (message.text) {
      payload.Content.Simple.Body.Text = {
        Data: message.text,
        Charset: 'UTF-8',
      }
    }

    // Add CC recipients
    if (message.cc) {
      payload.Destination.CcAddresses = this.normalizeAddresses(message.cc)
    }

    // Add BCC recipients
    if (message.bcc) {
      payload.Destination.BccAddresses = this.normalizeAddresses(message.bcc)
    }

    // Add Reply-To
    if (message.replyTo) {
      payload.ReplyToAddresses = [this.normalizeAddress(message.replyTo)]
    }

    // Add tags
    if (message.tags) {
      payload.EmailTags = Object.entries(message.tags).map(([name, value]) => ({
        Name: name,
        Value: value,
      }))
    }

    try {
      // Use AWS SES v2 API
      const endpoint = `https://email.${this.region}.amazonaws.com/v2/email/outbound-emails`

      // Create AWS Signature V4 signed request
      const response = await this.makeSignedRequest(endpoint, 'POST', payload)

      if (!response.ok) {
        const error: SESErrorResponse = await response.json()
        return {
          id: `failed-${Date.now()}`,
          provider: this.name,
          status: 'failed',
          error: error.message || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        }
      }

      const result: SESEmailResponse = await response.json()

      return {
        id: result.MessageId,
        provider: this.name,
        status: 'sent',
        providerId: result.MessageId,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id: `failed-${Date.now()}`,
        provider: this.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Make AWS Signature V4 signed request
   * Simplified implementation for SES API
   */
  private async makeSignedRequest(url: string, method: string, body: any): Promise<Response> {
    const date = new Date()
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.substring(0, 8)

    const payload = JSON.stringify(body)
    const payloadHash = await this.sha256(payload)

    // Canonical request
    const canonicalUri = new URL(url).pathname
    const canonicalHeaders = `content-type:application/json\nhost:email.${this.region}.amazonaws.com\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'content-type;host;x-amz-date'
    const canonicalRequest = `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${this.region}/ses/aws4_request`
    const requestHash = await this.sha256(canonicalRequest)
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${requestHash}`

    // Calculate signature
    const signingKey = await this.getSignatureKey(dateStamp)
    const signature = await this.hmacSha256(signingKey, stringToSign)
    const signatureHex = this.bufferToHex(signature)

    // Authorization header
    const authorization = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`

    // Make request
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        Authorization: authorization,
      },
      body: payload,
    })
  }

  /**
   * Get AWS Signature V4 signing key
   */
  private async getSignatureKey(dateStamp: string): Promise<ArrayBuffer> {
    const kDate = await this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp)
    const kRegion = await this.hmacSha256(kDate, this.region)
    const kService = await this.hmacSha256(kRegion, 'ses')
    return await this.hmacSha256(kService, 'aws4_request')
  }

  /**
   * SHA256 hash
   */
  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return this.bufferToHex(hashBuffer)
  }

  /**
   * HMAC-SHA256
   */
  private async hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const keyData = typeof key === 'string' ? encoder.encode(key) : key

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}
