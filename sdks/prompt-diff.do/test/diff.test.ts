/**
 * Tests for prompt-diff.do
 */

import { describe, it, expect } from 'vitest'
import { diffPrompts, formatSideBySide, formatInline, formatHTML } from '../index'

describe('diffPrompts', () => {
  it('should detect no changes in identical prompts', () => {
    const prompt = 'You are a helpful assistant.'
    const diff = diffPrompts(prompt, prompt)

    expect(diff.stats.additions).toBe(0)
    expect(diff.stats.deletions).toBe(0)
    expect(diff.stats.modifications).toBe(0)
    expect(diff.stats.unchanged).toBe(1)
  })

  it('should detect additions', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'You are a helpful assistant.\nYou answer questions clearly.'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.additions).toBe(1)
    expect(diff.stats.deletions).toBe(0)
    expect(diff.stats.unchanged).toBe(1)
  })

  it('should detect deletions', () => {
    const oldPrompt = 'You are a helpful assistant.\nYou answer questions clearly.'
    const newPrompt = 'You are a helpful assistant.'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.additions).toBe(0)
    expect(diff.stats.deletions).toBe(1)
    expect(diff.stats.unchanged).toBe(1)
  })

  it('should detect modifications', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'You are a very helpful AI assistant.'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBeGreaterThan(0)
  })

  it('should handle multi-line prompts', () => {
    const oldPrompt = `You are a helpful assistant.
You answer questions clearly.
You are polite and professional.`

    const newPrompt = `You are a very helpful AI assistant.
You answer questions clearly and concisely.
You are polite and professional.`

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.lines.length).toBe(3)
    expect(diff.stats.modifications).toBeGreaterThan(0)
    expect(diff.stats.unchanged).toBeGreaterThan(0)
  })

  it('should handle empty prompts', () => {
    const diff1 = diffPrompts('', 'New prompt')
    expect(diff1.stats.additions).toBe(1)

    const diff2 = diffPrompts('Old prompt', '')
    expect(diff2.stats.deletions).toBe(1)

    const diff3 = diffPrompts('', '')
    expect(diff3.stats.unchanged).toBe(1)
  })

  it('should respect ignoreWhitespace option', () => {
    const oldPrompt = 'You are a helpful  assistant.'
    const newPrompt = 'You are a helpful assistant.'

    const diff1 = diffPrompts(oldPrompt, newPrompt, { ignoreWhitespace: false })
    expect(diff1.stats.modifications).toBeGreaterThan(0)

    const diff2 = diffPrompts(oldPrompt, newPrompt, { ignoreWhitespace: true })
    expect(diff2.stats.unchanged).toBe(1)
  })

  it('should respect ignoreCase option', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'YOU ARE A HELPFUL ASSISTANT.'

    const diff1 = diffPrompts(oldPrompt, newPrompt, { ignoreCase: false })
    // When ignoreCase is false, completely different case is treated as deletion + addition
    expect(diff1.stats.deletions + diff1.stats.additions + diff1.stats.modifications).toBeGreaterThan(0)

    const diff2 = diffPrompts(oldPrompt, newPrompt, { ignoreCase: true })
    expect(diff2.stats.unchanged).toBe(1)
  })

  it('should include line numbers', () => {
    const oldPrompt = 'Line 1\nLine 2\nLine 3'
    const newPrompt = 'Line 1\nNew Line 2\nLine 3'

    const diff = diffPrompts(oldPrompt, newPrompt)

    const modifiedLine = diff.lines.find((line) => line.type === 'modify')
    expect(modifiedLine?.oldLineNumber).toBe(2)
    expect(modifiedLine?.newLineNumber).toBe(2)
  })

  it('should handle complex changes', () => {
    const oldPrompt = `System: You are a customer service bot.
Task: Help users with their questions.
Tone: Professional and friendly.`

    const newPrompt = `System: You are an AI customer service assistant.
Task: Help users quickly resolve their questions.
Tone: Professional, friendly, and empathetic.
Context: You work for Acme Corp.`

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.additions).toBeGreaterThan(0)
    expect(diff.stats.modifications).toBeGreaterThan(0)
    expect(diff.lines.length).toBe(4)
  })
})

describe('formatSideBySide', () => {
  it('should format side-by-side diff', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'You are a very helpful AI assistant.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatSideBySide(diff)

    expect(formatted).toContain('OLD')
    expect(formatted).toContain('NEW')
    expect(formatted).toContain('|')
    expect(formatted).toContain('Stats:')
  })

  it('should show line numbers when enabled', () => {
    const oldPrompt = 'Line 1\nLine 2'
    const newPrompt = 'Line 1\nNew Line 2'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatSideBySide(diff, { showLineNumbers: true })

    expect(formatted).toMatch(/\d+/)
  })

  it('should hide line numbers when disabled', () => {
    const oldPrompt = 'Line 1\nLine 2'
    const newPrompt = 'Line 1\nNew Line 2'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatSideBySide(diff, { showLineNumbers: false })

    expect(formatted).toBeTruthy()
  })

  it('should include statistics', () => {
    const oldPrompt = 'Line 1\nLine 2\nLine 3'
    const newPrompt = 'Line 1\nNew Line 2\nLine 3\nLine 4'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatSideBySide(diff)

    expect(formatted).toContain('Stats:')
    expect(formatted).toMatch(/\+\d+/)
    expect(formatted).toMatch(/-\d+/)
  })

  it('should highlight changes when enabled', () => {
    const oldPrompt = 'You are helpful.'
    const newPrompt = 'You are very helpful.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatSideBySide(diff, { highlightChanges: true })

    expect(formatted).toBeTruthy()
  })
})

describe('formatInline', () => {
  it('should format inline diff', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'You are a very helpful AI assistant.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatInline(diff)

    expect(formatted).toContain('PROMPT DIFF')
    expect(formatted).toContain('Stats:')
  })

  it('should use diff markers', () => {
    const oldPrompt = 'Old line\nKeep this'
    const newPrompt = 'New line\nKeep this'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatInline(diff)

    // Should contain markers for changes
    expect(formatted).toMatch(/[-+~]/)
  })

  it('should show line numbers when enabled', () => {
    const oldPrompt = 'Line 1\nLine 2'
    const newPrompt = 'Line 1\nNew Line 2'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatInline(diff, { showLineNumbers: true })

    expect(formatted).toMatch(/\d+\s+\|/)
  })

  it('should highlight character-level changes', () => {
    const oldPrompt = 'You are helpful.'
    const newPrompt = 'You are very helpful.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const formatted = formatInline(diff, { highlightChanges: true })

    expect(formatted).toContain('[+')
    expect(formatted).toContain('+]')
  })
})

describe('formatHTML', () => {
  it('should format HTML diff', () => {
    const oldPrompt = 'You are a helpful assistant.'
    const newPrompt = 'You are a very helpful AI assistant.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const html = formatHTML(diff)

    expect(html).toContain('<div class="prompt-diff">')
    expect(html).toContain('<style>')
    expect(html).toContain('</div>')
  })

  it('should include CSS styles', () => {
    const diff = diffPrompts('old', 'new')
    const html = formatHTML(diff)

    expect(html).toContain('.add')
    expect(html).toContain('.remove')
    expect(html).toContain('.modify')
    expect(html).toContain('.unchanged')
  })

  it('should escape HTML characters', () => {
    const oldPrompt = '<script>alert("xss")</script>'
    const newPrompt = '<div>safe</div>'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const html = formatHTML(diff)

    expect(html).toContain('&lt;')
    expect(html).toContain('&gt;')
    expect(html).not.toContain('<script>')
  })

  it('should show line numbers when enabled', () => {
    const diff = diffPrompts('line 1', 'line 2')
    const html = formatHTML(diff, { showLineNumbers: true })

    expect(html).toContain('line-num')
  })

  it('should highlight character changes', () => {
    const oldPrompt = 'You are helpful.'
    const newPrompt = 'You are very helpful.'

    const diff = diffPrompts(oldPrompt, newPrompt)
    const html = formatHTML(diff, { highlightChanges: true })

    expect(html).toContain('highlight-')
  })
})

describe('edge cases', () => {
  it('should handle very long lines', () => {
    const longLine = 'a'.repeat(1000)
    const diff = diffPrompts(longLine, longLine + 'b')

    expect(diff.lines.length).toBe(1)
    expect(diff.stats.modifications).toBeGreaterThan(0)
  })

  it('should handle many lines', () => {
    const oldPrompt = Array(100)
      .fill('Line')
      .map((l, i) => `${l} ${i}`)
      .join('\n')
    const newPrompt = Array(100)
      .fill('Line')
      .map((l, i) => `${l} ${i} modified`)
      .join('\n')

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.lines.length).toBe(100)
  })

  it('should handle special characters', () => {
    const oldPrompt = 'Special chars: !@#$%^&*()'
    const newPrompt = 'Special chars: !@#$%^&*() plus more []{}|'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBeGreaterThan(0)
  })

  it('should handle unicode characters', () => {
    const oldPrompt = 'Hello 世界'
    const newPrompt = 'Hello 世界! 👋'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBeGreaterThan(0)
  })

  it('should handle tabs and newlines', () => {
    const oldPrompt = 'Line\twith\ttabs'
    const newPrompt = 'Line\twith\tmore\ttabs'

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBeGreaterThan(0)
  })
})

describe('real-world scenarios', () => {
  it('should compare ChatGPT-style prompts', () => {
    const oldPrompt = `You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2021-09
Current date: 2024-01-01`

    const newPrompt = `You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2023-04
Current date: 2024-01-15`

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBe(2)
    expect(diff.stats.unchanged).toBe(1)
  })

  it('should compare Claude-style prompts', () => {
    const oldPrompt = `You are Claude, an AI assistant created by Anthropic.
You are helpful, harmless, and honest.`

    const newPrompt = `You are Claude, an AI assistant created by Anthropic.
You are helpful, harmless, and honest.
You think step-by-step before responding.`

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.additions).toBe(1)
    expect(diff.stats.unchanged).toBe(2)
  })

  it('should compare system prompts with roles', () => {
    const oldPrompt = `System: You are a code reviewer.
User: Review the following code:
Assistant: I'll review the code carefully.`

    const newPrompt = `System: You are an expert code reviewer specializing in TypeScript.
User: Review the following code:
Assistant: I'll review the code carefully and provide detailed feedback.`

    const diff = diffPrompts(oldPrompt, newPrompt)

    expect(diff.stats.modifications).toBeGreaterThan(0)
    expect(diff.stats.unchanged).toBeGreaterThan(0)
  })
})
