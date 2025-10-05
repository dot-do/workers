/**
 * Example: Complete Model Lifecycle with Vibe Coding Integration
 */

import type { ModelMetadata } from '../src/types/schema'

const exampleModels = {
  gpt4: {
    name: 'GPT-4 Turbo',
    description: 'OpenAI GPT-4 Turbo for code generation',
    metadata: {
      framework: 'openai',
      model_type: 'text-generation',
      provider: 'openai',
      model_name: 'gpt-4-turbo-preview',
      parameters: 1760000000000
    } as ModelMetadata,
    tags: ['production', 'code-generation', 'openai']
  }
}

async function modelLifecycle(apiUrl: string) {
  console.log('ML Model Registry Lifecycle Demo')
  
  // Register model, track metrics, run compliance checks, etc.
  const model = await fetch(`${apiUrl}/api/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...exampleModels.gpt4,
      created_by: 'system',
      version: '1.0.0'
    })
  }).then(r => r.json())
  
  console.log('Model registered:', model.model.id)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const apiUrl = process.env.API_URL || 'http://localhost:8787'
  modelLifecycle(apiUrl).catch(console.error)
}
