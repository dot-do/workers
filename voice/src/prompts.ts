/**
 * Voice prompt generator for professional voiceovers
 *
 * Follows best practices for TTS:
 * - Clear, well-structured text
 * - Appropriate pacing and pauses
 * - Natural conversational flow
 * - Emotion and style guidance
 * - Provider-specific optimization
 */

import type { VoicePromptTemplate } from './types'

/**
 * Template-based prompts covering diverse voiceover use cases
 */
export const voicePromptTemplates: VoicePromptTemplate[] = [
  {
    name: 'Professional Business Narration',
    useCase: 'Corporate video, product demo, explainer video',
    text: `Welcome to the future of business automation. Our AI-powered platform streamlines your workflow, eliminates repetitive tasks, and empowers your team to focus on what truly matters: innovation and growth. With seamless integrations, real-time analytics, and enterprise-grade security, we're helping companies worldwide transform their operations and achieve unprecedented efficiency.`,
    provider: 'openai',
    voice: 'onyx',
    style: 'professional',
    emotion: 'confident and authoritative',
  },
  {
    name: 'Educational Explainer',
    useCase: 'E-learning, tutorial, online course',
    text: `Let's dive into the fascinating world of machine learning! Imagine teaching a computer to recognize patterns, just like how you learned to identify animals as a child. Machine learning algorithms analyze thousands of examples, gradually improving their accuracy with each iteration. Today, we'll explore three fundamental concepts: supervised learning, where we provide labeled data; unsupervised learning, where the algorithm finds patterns on its own; and reinforcement learning, where it learns through trial and error. Ready to get started?`,
    provider: 'elevenlabs',
    voice: 'rachel',
    style: 'educational',
    emotion: 'enthusiastic and engaging',
  },
  {
    name: 'Podcast Intro',
    useCase: 'Podcast opener, show introduction',
    text: `Hey everyone, welcome back to Tech Horizons, the podcast where we explore the cutting edge of technology and its impact on society. I'm your host, and today we have an incredible episode lined up. We'll be discussing the latest breakthroughs in quantum computing, interviewing a pioneer in sustainable AI, and answering your burning questions about the future of work. So grab your coffee, settle in, and let's explore what's next in the world of innovation.`,
    provider: 'openai',
    voice: 'nova',
    style: 'conversational',
    emotion: 'warm and welcoming',
  },
  {
    name: 'Audiobook Excerpt',
    useCase: 'Audiobook narration, storytelling',
    text: `The rain hammered against the window panes as Sarah stood in the dimly lit study, her fingers tracing the worn leather binding of the ancient journal. Three generations had passed since her great-grandmother first penned these words, yet the secrets within still held the power to change everything. She took a deep breath, opened the cover, and began to read. "If you're reading this," the first entry began, "then you've already discovered that our family's past is far more extraordinary than you ever imagined."`,
    provider: 'elevenlabs',
    voice: 'sarah',
    style: 'narrative',
    emotion: 'mysterious and dramatic',
  },
  {
    name: 'Customer Service Greeting',
    useCase: 'IVR system, customer support, helpdesk',
    text: `Thank you for calling TechSupport Solutions. We're here to help you resolve any technical issues you might be experiencing. To better assist you, please listen carefully to the following options. Press one for account and billing inquiries. Press two for technical support and troubleshooting. Press three to speak with a customer service representative. Or, stay on the line to hear these options again. Your call is important to us.`,
    provider: 'google',
    voice: 'en-US-Neural2-C',
    style: 'professional',
    emotion: 'helpful and patient',
  },
]

/**
 * Generate complete voice generation config from a template
 */
export function generateVoiceFromTemplate(template: VoicePromptTemplate) {
  return {
    text: template.text,
    provider: template.provider,
    voice: template.voice,
    style: template.style,
    emotion: template.emotion,
    metadata: {
      template: template.name,
      useCase: template.useCase,
    },
  }
}

/**
 * Get a random voice prompt template
 */
export function getRandomVoicePromptTemplate(): VoicePromptTemplate {
  return voicePromptTemplates[Math.floor(Math.random() * voicePromptTemplates.length)]
}

/**
 * Get all 5 default prompts
 */
export function getAllVoicePromptTemplates(): VoicePromptTemplate[] {
  return voicePromptTemplates
}

/**
 * Generate 5 diverse voice generation configs (one from each template)
 */
export function generateBatchVoicePrompts() {
  return voicePromptTemplates.map(generateVoiceFromTemplate)
}

/**
 * Generate N random voice configs (may include duplicates)
 */
export function generateRandomVoicePrompts(count: number) {
  const prompts = []
  for (let i = 0; i < count; i++) {
    const template = getRandomVoicePromptTemplate()
    prompts.push(generateVoiceFromTemplate(template))
  }
  return prompts
}

/**
 * Add SSML tags for enhanced control (Google Cloud TTS)
 */
export function wrapWithSSML(text: string, options?: { speed?: number; pitch?: number; emphasis?: string }) {
  let ssml = '<speak>'

  if (options?.speed || options?.pitch) {
    const attrs: string[] = []
    if (options.speed) attrs.push(`rate="${options.speed >= 1 ? 'fast' : 'slow'}"`)
    if (options.pitch) attrs.push(`pitch="${options.pitch > 0 ? '+' : ''}${options.pitch}st"`)
    ssml += `<prosody ${attrs.join(' ')}>`
  }

  // Add emphasis if specified
  if (options?.emphasis) {
    ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`
  } else {
    ssml += text
  }

  if (options?.speed || options?.pitch) {
    ssml += '</prosody>'
  }

  ssml += '</speak>'
  return ssml
}

/**
 * Generate instruction for OpenAI's steerable TTS
 */
export function generateSteerableInstruction(style?: string, emotion?: string): string | undefined {
  if (!style && !emotion) return undefined

  const parts: string[] = []

  if (style) {
    parts.push(`speak in a ${style} style`)
  }

  if (emotion) {
    parts.push(`with a ${emotion} tone`)
  }

  return `Please ${parts.join(', ')}.`
}
