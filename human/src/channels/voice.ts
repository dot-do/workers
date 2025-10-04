/**
 * Voice Channel for Human Functions
 *
 * Enables voice-based interactions with human functions using VAPI.
 * Converts React components to voice scripts, handles speech-to-text,
 * text-to-speech, DTMF input, and call recording.
 */

import type { HumanFunctionPayload, HumanFunctionResponse, ChannelConfig } from '../types'

export interface VapiCallConfig {
  assistantId?: string
  phoneNumberId?: string
  customer?: {
    number?: string
    name?: string
    email?: string
  }
  model?: {
    provider?: 'openai' | 'anthropic' | 'together-ai'
    model?: string
    temperature?: number
    voice?: string
  }
  maxDuration?: number // seconds
  recordingEnabled?: boolean
}

export interface VoiceScript {
  initial: VoicePrompt
  menu?: MenuOption[]
  prompts?: Record<string, VoicePrompt>
  confirmations?: Record<string, string>
}

export interface VoicePrompt {
  say: string
  gather?: {
    input: Array<'speech' | 'dtmf'>
    numDigits?: number
    timeout?: number
    speechTimeout?: number
    finishOnKey?: string
    action?: string
  }
}

export interface MenuOption {
  digits: string | string[]
  say: string
  action: string
  next?: string
}

export interface VoiceInput {
  type: 'speech' | 'dtmf'
  value: string
  confidence?: number
  timestamp: string
}

export interface CallRecording {
  callSid: string
  recordingUrl: string
  duration: number
  transcription?: string
  r2Key: string
}

/**
 * Voice Channel Implementation
 */
export class VoiceChannel {
  private vapiApiKey: string
  private vapiBaseUrl: string
  private r2Bucket: R2Bucket
  private db: any

  constructor(config: ChannelConfig & { vapiApiKey: string; vapiBaseUrl?: string; r2Bucket: R2Bucket; db: any }) {
    this.vapiApiKey = config.vapiApiKey
    this.vapiBaseUrl = config.vapiBaseUrl || 'https://api.vapi.ai'
    this.r2Bucket = config.r2Bucket
    this.db = config.db
  }

  /**
   * Initiate outbound call to user
   */
  async initiateCall(phoneNumber: string, payload: HumanFunctionPayload, config?: Partial<VapiCallConfig>): Promise<{ callSid: string; status: string }> {
    // Generate voice script from payload
    const script = this.payloadToVoiceScript(payload)

    // Create VAPI call
    const response = await fetch(`${this.vapiBaseUrl}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: config?.phoneNumberId,
        customer: {
          number: phoneNumber,
          ...config?.customer,
        },
        assistant: {
          firstMessage: script.initial.say,
          model: config?.model || {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
          },
          voice: config?.model?.voice || 'jennifer-playht',
        },
        maxDurationSeconds: config?.maxDuration || 600,
        recordingEnabled: config?.recordingEnabled !== false,
      }),
    })

    if (!response.ok) {
      throw new Error(`VAPI call failed: ${response.statusText}`)
    }

    const result = await response.json()

    // Store call state in database
    await this.db.execute(
      `INSERT INTO human_function_calls (id, function_id, phone_number, call_sid, status, script, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), payload.id, phoneNumber, result.callId, 'initiated', JSON.stringify(script), new Date().toISOString()]
    )

    return {
      callSid: result.callId,
      status: 'initiated',
    }
  }

  /**
   * Handle inbound call
   */
  async handleInbound(callSid: string): Promise<VoiceScript> {
    // Retrieve call state from database
    const result = await this.db.execute(`SELECT * FROM human_function_calls WHERE call_sid = ?`, [callSid])

    if (!result.rows.length) {
      throw new Error(`Call not found: ${callSid}`)
    }

    const call = result.rows[0]
    return JSON.parse(call.script as string)
  }

  /**
   * Collect input from user
   */
  async collectInput(callSid: string, prompt: VoicePrompt, inputType: 'speech' | 'dtmf' | 'both' = 'both'): Promise<VoiceInput> {
    // This would be called from VAPI webhook handler
    // For now, return a placeholder that shows the structure
    return {
      type: inputType === 'both' ? 'speech' : inputType,
      value: '', // Would be populated by VAPI webhook
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Confirm input with user
   */
  async confirm(callSid: string, input: VoiceInput): Promise<boolean> {
    const confirmationPrompt: VoicePrompt = {
      say: `I heard ${input.value}. Is that correct? Press 1 for yes, 2 for no.`,
      gather: {
        input: ['dtmf'],
        numDigits: 1,
        timeout: 5,
      },
    }

    // This would send confirmation prompt via VAPI
    // and wait for response in webhook handler
    return true // Placeholder
  }

  /**
   * Record call audio and save to R2
   */
  async recordResponse(callSid: string, audioUrl: string): Promise<CallRecording> {
    // Download audio from VAPI
    const audioResponse = await fetch(audioUrl)
    const audioData = await audioResponse.arrayBuffer()

    // Generate R2 key
    const timestamp = new Date()
    const r2Key = `calls/${timestamp.getFullYear()}/${timestamp.getMonth() + 1}/${callSid}.mp3`

    // Upload to R2
    await this.r2Bucket.put(r2Key, audioData, {
      httpMetadata: {
        contentType: 'audio/mpeg',
      },
      customMetadata: {
        callSid,
        timestamp: timestamp.toISOString(),
      },
    })

    // Get duration from audio file (would need audio processing library)
    const duration = 0 // Placeholder

    // Store recording metadata in database
    await this.db.execute(
      `UPDATE human_function_calls SET recording_url = ?, recording_r2_key = ?, duration = ? WHERE call_sid = ?`,
      [audioUrl, r2Key, duration, callSid]
    )

    return {
      callSid,
      recordingUrl: audioUrl,
      duration,
      r2Key,
    }
  }

  /**
   * Convert human function payload to VAPI voice script
   */
  private payloadToVoiceScript(payload: HumanFunctionPayload): VoiceScript {
    const script: VoiceScript = {
      initial: {
        say: payload.prompt || `You have a new ${payload.functionType} request.`,
      },
      menu: [],
      prompts: {},
      confirmations: {},
    }

    // Convert payload structure to voice prompts
    if (payload.functionType === 'approval') {
      script.initial = {
        say: `${payload.prompt}. Press 1 to approve, 2 to reject, or say your response.`,
        gather: {
          input: ['speech', 'dtmf'],
          numDigits: 1,
          timeout: 5,
          speechTimeout: 3,
        },
      }

      script.menu = [
        {
          digits: '1',
          say: 'Approved',
          action: 'approve',
        },
        {
          digits: '2',
          say: 'Rejected',
          action: 'reject',
        },
      ]
    } else if (payload.functionType === 'form') {
      // Convert form fields to voice questions
      const fields = payload.fields || []

      script.initial = {
        say: payload.prompt || 'Please provide the following information.',
      }

      fields.forEach((field, index) => {
        script.prompts![`field_${index}`] = {
          say: field.prompt || `Please provide ${field.label}.`,
          gather: {
            input: ['speech'],
            speechTimeout: 5,
            action: `field_${index}_response`,
          },
        }

        script.confirmations![`field_${index}`] = `You said {value}. Is that correct? Press 1 for yes, 2 to re-enter.`
      })
    } else if (payload.functionType === 'notification') {
      script.initial = {
        say: payload.prompt || 'You have a new notification.',
      }

      script.menu = [
        {
          digits: '1',
          say: 'Acknowledged',
          action: 'acknowledge',
        },
      ]
    }

    return script
  }

  /**
   * Convert React component structure to voice script
   * This would parse React component props and children to generate voice flow
   */
  reactToVoiceScript(component: any): VoiceScript {
    // Placeholder for React → Voice conversion
    // Would parse component tree and extract:
    // - Text content → TTS prompts
    // - Form fields → Voice questions
    // - Buttons → Menu options
    // - Validation rules → Confirmation flow

    return {
      initial: {
        say: 'React component conversion not yet implemented.',
      },
    }
  }

  /**
   * Handle VAPI webhook events
   */
  async handleWebhook(event: any): Promise<any> {
    const { type, callId, data } = event

    switch (type) {
      case 'call-started':
        await this.db.execute(`UPDATE human_function_calls SET status = 'in_progress' WHERE call_sid = ?`, [callId])
        return { success: true }

      case 'call-ended':
        await this.db.execute(
          `UPDATE human_function_calls SET status = 'completed', ended_at = ? WHERE call_sid = ?`,
          [new Date().toISOString(), callId]
        )

        // Process recording if available
        if (data.recordingUrl) {
          await this.recordResponse(callId, data.recordingUrl)
        }

        return { success: true }

      case 'transcript':
        // Store transcript segment
        await this.db.execute(
          `INSERT INTO call_transcripts (call_sid, speaker, text, timestamp) VALUES (?, ?, ?, ?)`,
          [callId, data.role, data.text, new Date().toISOString()]
        )
        return { success: true }

      case 'function-call':
        // Handle function call from VAPI
        const { functionName, arguments: args } = data

        // Execute the appropriate handler based on function name
        return await this.handleFunctionCall(callId, functionName, args)

      case 'dtmf':
        // Handle DTMF input
        return await this.handleDtmfInput(callId, data.digit)

      default:
        console.warn('Unknown VAPI event type:', type)
        return { success: true }
    }
  }

  /**
   * Handle function calls from VAPI
   */
  private async handleFunctionCall(callSid: string, functionName: string, args: any): Promise<any> {
    // Retrieve call state
    const result = await this.db.execute(`SELECT * FROM human_function_calls WHERE call_sid = ?`, [callSid])

    if (!result.rows.length) {
      return { error: 'Call not found' }
    }

    const call = result.rows[0]

    // Execute function based on name
    switch (functionName) {
      case 'approve':
        await this.db.execute(
          `UPDATE human_function_calls SET response = ?, status = 'completed' WHERE call_sid = ?`,
          [JSON.stringify({ approved: true, ...args }), callSid]
        )
        return {
          result: 'Approved. Thank you for your response.',
          endCall: true,
        }

      case 'reject':
        await this.db.execute(
          `UPDATE human_function_calls SET response = ?, status = 'completed' WHERE call_sid = ?`,
          [JSON.stringify({ approved: false, reason: args.reason || 'No reason provided' }), callSid]
        )
        return {
          result: 'Rejected. Thank you for your response.',
          endCall: true,
        }

      case 'submit_form':
        await this.db.execute(
          `UPDATE human_function_calls SET response = ?, status = 'completed' WHERE call_sid = ?`,
          [JSON.stringify(args), callSid]
        )
        return {
          result: 'Form submitted. Thank you.',
          endCall: true,
        }

      default:
        return { error: 'Unknown function' }
    }
  }

  /**
   * Handle DTMF (button press) input
   */
  private async handleDtmfInput(callSid: string, digit: string): Promise<any> {
    // Retrieve call script
    const result = await this.db.execute(`SELECT script FROM human_function_calls WHERE call_sid = ?`, [callSid])

    if (!result.rows.length) {
      return { error: 'Call not found' }
    }

    const script: VoiceScript = JSON.parse(result.rows[0].script as string)

    // Find menu option for pressed digit
    const option = script.menu?.find((opt) => opt.digits === digit || (Array.isArray(opt.digits) && opt.digits.includes(digit)))

    if (!option) {
      return {
        say: "I didn't understand that. Please try again.",
        repeat: true,
      }
    }

    // Execute action
    return await this.handleFunctionCall(callSid, option.action, {})
  }

  /**
   * Get call status and details
   */
  async getCallStatus(callSid: string): Promise<any> {
    const result = await this.db.execute(
      `SELECT * FROM human_function_calls WHERE call_sid = ?`,
      [callSid]
    )

    if (!result.rows.length) {
      throw new Error(`Call not found: ${callSid}`)
    }

    const call = result.rows[0]

    return {
      callSid,
      functionId: call.function_id,
      status: call.status,
      phoneNumber: call.phone_number,
      response: call.response ? JSON.parse(call.response) : null,
      recordingUrl: call.recording_url,
      duration: call.duration,
      createdAt: call.created_at,
      endedAt: call.ended_at,
    }
  }

  /**
   * List all calls for a function
   */
  async listCalls(functionId: string, status?: string): Promise<any[]> {
    let query = `SELECT * FROM human_function_calls WHERE function_id = ?`
    const params: any[] = [functionId]

    if (status) {
      query += ` AND status = ?`
      params.push(status)
    }

    query += ` ORDER BY created_at DESC`

    const result = await this.db.execute(query, params)

    return result.rows.map((row: any) => ({
      callSid: row.call_sid,
      status: row.status,
      phoneNumber: row.phone_number,
      response: row.response ? JSON.parse(row.response) : null,
      createdAt: row.created_at,
    }))
  }
}

/**
 * Voice UX Patterns
 */
export class VoiceUX {
  /**
   * Multi-level DTMF menu
   */
  static createMenu(options: MenuOption[]): VoicePrompt {
    const menuText = options.map((opt, idx) => `Press ${opt.digits} for ${opt.say}`).join(', ')

    return {
      say: menuText,
      gather: {
        input: ['dtmf'],
        numDigits: 1,
        timeout: 5,
      },
    }
  }

  /**
   * Voice form field
   */
  static createFormField(label: string, type: 'text' | 'number' | 'email' = 'text'): VoicePrompt {
    let prompt = `Please provide ${label}.`

    if (type === 'number') {
      prompt += ' Speak only digits.'
    } else if (type === 'email') {
      prompt += ' Spell your email address slowly.'
    }

    return {
      say: prompt,
      gather: {
        input: ['speech'],
        speechTimeout: 5,
      },
    }
  }

  /**
   * Confirmation prompt
   */
  static createConfirmation(value: string): VoicePrompt {
    return {
      say: `I heard ${value}. Is that correct? Press 1 for yes, 2 for no.`,
      gather: {
        input: ['dtmf'],
        numDigits: 1,
        timeout: 5,
      },
    }
  }

  /**
   * Error handling with retry
   */
  static createErrorPrompt(maxRetries: number = 3): VoicePrompt {
    return {
      say: "I didn't understand that. Please try again.",
      gather: {
        input: ['speech', 'dtmf'],
        timeout: 5,
      },
    }
  }

  /**
   * Timeout escalation
   */
  static createTimeoutHandler(): VoicePrompt {
    return {
      say: "I didn't hear a response. Let me connect you to a human operator.",
    }
  }
}
