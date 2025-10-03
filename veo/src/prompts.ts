/**
 * Random prompt generator for Veo 3 video generation
 *
 * Follows best practices:
 * - Vividly descriptive with specific details
 * - Sets scene and atmosphere with sensory language
 * - Specifies camera angles and visual style
 * - Describes actions in sequence
 * - Includes audio cues for realism
 */

import type { PromptTemplate } from './types'

/**
 * Template-based prompts covering diverse industries and scenarios
 */
export const promptTemplates: PromptTemplate[] = [
  {
    industry: 'Healthcare',
    occupation: 'Surgeon',
    task: 'performs a delicate arthroscopic knee surgery',
    tool: 'robotic surgical system with 3D visualization',
    environment: 'A sterile, brightly-lit operating room with blue surgical drapes',
    audioCue: 'soft beeping of monitors, gentle hum of ventilation system, occasional muted instructions',
  },
  {
    industry: 'Manufacturing',
    occupation: 'Welder',
    task: 'welds precision metal joints on automotive components',
    tool: 'automated arc welding torch with AI-guided precision',
    environment: 'A bustling factory floor with rows of assembly stations, industrial lighting casting dramatic shadows',
    audioCue: 'crackling of welding arcs, rhythmic machinery clanging, deep hum of conveyor systems',
  },
  {
    industry: 'Technology',
    occupation: 'Data Analyst',
    task: 'analyzes real-time market data streams on multiple holographic displays',
    tool: 'AI-powered analytics platform with gesture control interface',
    environment: 'A modern glass-walled office at dusk, city lights twinkling in the background, sleek minimalist design',
    audioCue: 'subtle keyboard clicks, soft whoosh of gesture controls, ambient office soundscape',
  },
  {
    industry: 'Retail',
    occupation: 'Barista',
    task: 'crafts an intricate latte art design while an AI robot steams milk simultaneously',
    tool: 'professional espresso machine with digital temperature control',
    environment: 'A warm, bustling coffee shop with exposed brick walls, morning sunlight streaming through large windows',
    audioCue: 'steam hissing, milk frothing, gentle chatter of customers, espresso machine gurgling',
  },
  {
    industry: 'Construction',
    occupation: 'Heavy Equipment Operator',
    task: 'operates an excavator to dig foundation trenches with millimeter precision',
    tool: 'AI-assisted excavator with real-time ground-penetrating radar',
    environment: 'A dusty construction site at golden hour, mountains visible in the distance, orange safety cones marking boundaries',
    audioCue: 'diesel engine rumbling, hydraulics hissing, dirt and rocks tumbling, radio chatter in background',
  },
]

/**
 * Generate a complete Veo 3 prompt from a template
 */
export function generatePromptFromTemplate(template: PromptTemplate): string {
  const { industry, occupation, task, tool, environment, audioCue } = template

  let prompt = `In the ${industry} industry, ${environment.toLowerCase()}, `
  prompt += `a ${occupation.toLowerCase()} ${task} using ${tool}. `
  prompt += `Beside them, an advanced AI-driven system performs the same task with flawless precision. `

  // Camera direction
  prompt += `Medium shot, shallow depth of field, cinematic lighting with natural shadows. `

  // Visual style
  prompt += `Realistic live-action style with crisp 4K detail. `

  // Audio cue
  if (audioCue) {
    prompt += `Audio: ${audioCue}.`
  }

  return prompt
}

/**
 * Get a random prompt template
 */
export function getRandomPromptTemplate(): PromptTemplate {
  return promptTemplates[Math.floor(Math.random() * promptTemplates.length)]
}

/**
 * Get all 5 default prompts
 */
export function getAllPromptTemplates(): PromptTemplate[] {
  return promptTemplates
}

/**
 * Generate 5 diverse prompts (one from each template)
 */
export function generateBatchPrompts(): string[] {
  return promptTemplates.map(generatePromptFromTemplate)
}

/**
 * Generate N random prompts (may include duplicates)
 */
export function generateRandomPrompts(count: number): string[] {
  const prompts: string[] = []
  for (let i = 0; i < count; i++) {
    const template = getRandomPromptTemplate()
    prompts.push(generatePromptFromTemplate(template))
  }
  return prompts
}
