/**
 * Random prompt generator for AI image generation
 *
 * Follows best practices for Imagen 3 and DALL-E 3:
 * - Detailed descriptions with specific visual elements
 * - Style and mood specifications
 * - Composition and framing guidance
 * - Color palette suggestions
 * - Lighting and atmosphere details
 */

interface PromptTemplate {
  industry: string
  occupation: string
  scene: string
  style: string
  lighting: string
  mood: string
}

/**
 * Template-based prompts covering diverse industries and scenarios
 */
export const promptTemplates: PromptTemplate[] = [
  {
    industry: 'Healthcare',
    occupation: 'Surgeon',
    scene: 'A surgeon in blue scrubs examining a holographic 3D medical scan while an AI assistant displays vital signs',
    style: 'Photorealistic, modern medical facility, clean and professional',
    lighting: 'Bright clinical lighting with glowing blue holographic displays',
    mood: 'Focused and precise, cutting-edge technology',
  },
  {
    industry: 'Manufacturing',
    occupation: 'Welder',
    scene: 'A welder in protective gear working alongside a robotic welding arm on an automotive assembly line',
    style: 'Industrial photography, gritty and authentic, cinematic composition',
    lighting: 'Dramatic side lighting with bright welding sparks creating lens flares',
    mood: 'Powerful and industrious, human-machine collaboration',
  },
  {
    industry: 'Technology',
    occupation: 'Data Analyst',
    scene: 'A data analyst surrounded by floating holographic charts and graphs, gesturing to manipulate data visualizations',
    style: 'Futuristic tech aesthetic, sleek glass office, minimalist design',
    lighting: 'Cool blue and purple ambient light from displays, city skyline at dusk in background',
    mood: 'Innovative and analytical, high-tech sophistication',
  },
  {
    industry: 'Retail',
    occupation: 'Barista',
    scene: 'A barista crafting latte art next to a sleek AI-powered coffee robot in a modern café',
    style: 'Warm lifestyle photography, cozy café atmosphere, natural materials',
    lighting: 'Soft morning sunlight streaming through large windows, warm overhead pendant lights',
    mood: 'Inviting and artisanal, blend of tradition and innovation',
  },
  {
    industry: 'Construction',
    occupation: 'Equipment Operator',
    scene: 'An operator in high-vis vest using a tablet to control an autonomous excavator on a construction site',
    style: 'Documentary-style wide shot, realistic construction environment, golden hour',
    lighting: 'Warm golden hour sunlight, dramatic shadows, dust particles in air',
    mood: 'Progressive and efficient, future of construction',
  },
]

/**
 * Generate a complete image prompt from a template
 */
export function generatePromptFromTemplate(template: PromptTemplate): string {
  const { scene, style, lighting, mood } = template

  let prompt = `${scene}. `
  prompt += `Style: ${style}. `
  prompt += `Lighting: ${lighting}. `
  prompt += `Mood: ${mood}. `
  prompt += `High quality, detailed, professional photography.`

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

/**
 * Enhance a prompt with style modifiers for better results
 */
export function enhancePrompt(prompt: string, style?: 'photorealistic' | 'artistic' | 'cinematic'): string {
  const styleModifiers = {
    photorealistic: 'Photorealistic, highly detailed, professional photography, sharp focus, 8K resolution',
    artistic: 'Artistic illustration, creative composition, vibrant colors, professional digital art',
    cinematic: 'Cinematic composition, dramatic lighting, movie poster quality, epic and atmospheric',
  }

  const modifier = style ? styleModifiers[style] : styleModifiers.photorealistic

  return `${prompt}. ${modifier}`
}
