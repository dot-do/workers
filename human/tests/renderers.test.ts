/**
 * Universal Renderer Tests
 *
 * Tests all renderers with the same components
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BlockKitRenderer } from '../src/renderers/blockkit'
import { WebRenderer } from '../src/renderers/web'
import { VoiceRenderer } from '../src/renderers/voice'
import { CLIRenderer } from '../src/renderers/cli'
import { renderers, render, parseResponse } from '../src/renderers/base'
import { Prompt, Form, TextInput, Select, MultiSelect, Button, Review, validators } from '../src/components'
import type { SelectOption, ReviewItem, RenderContext } from '../src/renderers/base'

describe('Universal Renderers', () => {
  beforeEach(() => {
    // Register all renderers
    renderers.register('blockkit', new BlockKitRenderer())
    renderers.register('web', new WebRenderer())
    renderers.register('voice', new VoiceRenderer())
    renderers.register('cli', new CLIRenderer())
  })

  describe('Prompt Component', () => {
    it('should render prompt in BlockKit', async () => {
      const component = <Prompt type="info">This is an information message</Prompt>

      const result = await render(component, 'blockkit')

      expect(result).toHaveProperty('blocks')
      const blockkit = result as any
      expect(blockkit.blocks).toHaveLength(1)
      expect(blockkit.blocks[0].type).toBe('section')
      expect(blockkit.blocks[0].text.text).toContain('information message')
    })

    it('should render prompt in Web', async () => {
      const component = <Prompt type="warning">This is a warning</Prompt>

      const result = await render(component, 'web')

      expect(result).toHaveProperty('html')
      const web = result as any
      expect(web.html).toContain('prompt-warning')
      expect(web.html).toContain('This is a warning')
      expect(web.css).toContain('.prompt')
    })

    it('should render prompt in Voice', async () => {
      const component = <Prompt>Please listen carefully</Prompt>

      const result = await render(component, 'voice')

      expect(result).toHaveProperty('script')
      const voice = result as any
      expect(voice.script).toBe('Please listen carefully')
      expect(voice.prompts).toHaveLength(1)
      expect(voice.prompts[0].text).toBe('Please listen carefully')
    })

    it('should render prompt in CLI', async () => {
      const component = <Prompt type="success">Operation completed</Prompt>

      const result = await render(component, 'cli')

      expect(result).toHaveProperty('output')
      const cli = result as any
      expect(cli.output).toContain('Operation completed')
      expect(cli.cursor).toBe('hide')
    })
  })

  describe('Form Component', () => {
    const testForm = (
      <Form>
        <Prompt>Please fill out this form</Prompt>
        <TextInput name="name" label="Full Name" required validation={[validators.required(), validators.minLength(2)]} />
        <Select
          name="role"
          label="Role"
          options={[
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' },
          ]}
          required
        />
        <Button type="submit">Submit</Button>
      </Form>
    )

    it('should render form in BlockKit', async () => {
      const result = await render(testForm, 'blockkit')

      const blockkit = result as any
      expect(blockkit.blocks).toBeDefined()

      // Should have section, input, input, actions blocks
      const blockTypes = blockkit.blocks.map((b: any) => b.type)
      expect(blockTypes).toContain('section') // Prompt
      expect(blockTypes).toContain('input') // TextInput
      expect(blockTypes).toContain('actions') // Button
    })

    it('should render form in Web', async () => {
      const result = await render(testForm, 'web')

      const web = result as any
      expect(web.html).toContain('<form')
      expect(web.html).toContain('name="name"')
      expect(web.html).toContain('name="role"')
      expect(web.html).toContain('type="submit"')
      expect(web.css).toContain('.universal-form')
    })

    it('should render form in Voice', async () => {
      const result = await render(testForm, 'voice')

      const voice = result as any
      expect(voice.prompts.length).toBeGreaterThan(0)
      expect(voice.responses.length).toBeGreaterThan(0)
      expect(voice.script).toContain('Full Name')
    })

    it('should render form in CLI', async () => {
      const result = await render(testForm, 'cli')

      const cli = result as any
      expect(cli.output).toContain('Form')
      expect(cli.output).toContain('Full Name')
      expect(cli.output).toContain('Role')
      expect(cli.cursor).toBe('show')
    })
  })

  describe('Review Component', () => {
    const items: ReviewItem[] = [
      { label: 'Name', value: 'John Doe' },
      { label: 'Amount', value: 100.5, format: 'currency' },
      { label: 'Date', value: '2025-10-03', format: 'date' },
      { label: 'Approved', value: true, format: 'boolean' },
    ]

    const reviewComponent = <Review title="Summary" items={items} />

    it('should render review in BlockKit', async () => {
      const result = await render(reviewComponent, 'blockkit')

      const blockkit = result as any
      expect(blockkit.blocks).toBeDefined()

      // Should have header, divider, sections
      const blockTypes = blockkit.blocks.map((b: any) => b.type)
      expect(blockTypes).toContain('header')
      expect(blockTypes).toContain('divider')
      expect(blockTypes).toContain('section')
    })

    it('should render review in Web', async () => {
      const result = await render(reviewComponent, 'web')

      const web = result as any
      expect(web.html).toContain('review-title')
      expect(web.html).toContain('John Doe')
      expect(web.html).toContain('$100.50') // Currency format
      expect(web.css).toContain('.review')
    })

    it('should render review in Voice', async () => {
      const result = await render(reviewComponent, 'voice')

      const voice = result as any
      expect(voice.script).toContain('Name: John Doe')
      expect(voice.script).toContain('100 dollars and 50 cents')
      expect(voice.prompts.length).toBeGreaterThan(0)
    })

    it('should render review in CLI', async () => {
      const result = await render(reviewComponent, 'cli')

      const cli = result as any
      expect(cli.output).toContain('Summary')
      expect(cli.output).toContain('John Doe')
      expect(cli.output).toContain('$100.50')
      expect(cli.cursor).toBe('hide')
    })
  })

  describe('MultiSelect Component', () => {
    const multiSelectComponent = (
      <Form>
        <MultiSelect
          name="interests"
          label="Select your interests"
          options={[
            { value: 'coding', label: 'Coding' },
            { value: 'design', label: 'Design' },
            { value: 'marketing', label: 'Marketing' },
          ]}
          minSelected={1}
          maxSelected={2}
        />
      </Form>
    )

    it('should render multiselect in BlockKit', async () => {
      const result = await render(multiSelectComponent, 'blockkit')

      const blockkit = result as any
      const inputBlock = blockkit.blocks.find((b: any) => b.type === 'input')
      expect(inputBlock).toBeDefined()
      expect(inputBlock.element.type).toBe('multi_static_select')
      expect(inputBlock.element.max_selected_items).toBe(2)
    })

    it('should render multiselect in Web', async () => {
      const result = await render(multiSelectComponent, 'web')

      const web = result as any
      expect(web.html).toContain('multi-select')
      expect(web.html).toContain('type="checkbox"')
      expect(web.html).toContain('Coding')
      expect(web.html).toContain('Design')
    })

    it('should degrade multiselect in Voice to speech', async () => {
      const result = await render(multiSelectComponent, 'voice')

      const voice = result as any
      expect(voice.script).toContain('Select your interests')
      expect(voice.responses).toHaveLength(1)
      expect(voice.responses[0].type).toBe('speech')
    })

    it('should render multiselect in CLI', async () => {
      const result = await render(multiSelectComponent, 'cli')

      const cli = result as any
      expect(cli.output).toContain('Select your interests')
      expect(cli.output).toContain('1. Coding')
      expect(cli.output).toContain('2. Design')
      expect(cli.output).toContain('separate with commas')
    })
  })

  describe('Response Parsing', () => {
    it('should parse BlockKit response', async () => {
      const payload = {
        state: {
          values: {
            input_name: {
              name: {
                type: 'plain_text_input',
                value: 'John Doe',
              },
            },
          },
        },
        actions: [{ action_id: 'submit' }],
      }

      const formData = await parseResponse(payload, 'blockkit')

      expect(formData.channel).toBe('blockkit')
      expect(formData.fields.name).toBe('John Doe')
      expect(formData.action).toBe('submit')
    })

    it('should parse Web response', async () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
      }

      const formData = await parseResponse(payload, 'web')

      expect(formData.channel).toBe('web')
      expect(formData.fields.name).toBe('John Doe')
      expect(formData.fields.email).toBe('john@example.com')
    })

    it('should parse Voice response', async () => {
      const payload = {
        transcript: 'John Doe',
        messages: [{ transcript: 'John Doe' }, { transcript: 'administrator' }],
      }

      const formData = await parseResponse(payload, 'voice')

      expect(formData.channel).toBe('voice')
      expect(formData.fields.text).toBe('John Doe')
    })

    it('should parse CLI response', async () => {
      const payload = {
        name: 'John Doe',
        role: 'admin',
      }

      const formData = await parseResponse(payload, 'cli')

      expect(formData.channel).toBe('cli')
      expect(formData.fields.name).toBe('John Doe')
      expect(formData.fields.role).toBe('admin')
    })
  })

  describe('Renderer Support', () => {
    it('should report supported components', () => {
      const blockkit = new BlockKitRenderer()
      const web = new WebRenderer()
      const voice = new VoiceRenderer()
      const cli = new CLIRenderer()

      const prompt = <Prompt>Test</Prompt>
      const form = <Form>Test</Form>

      expect(blockkit.supports(prompt)).toBe(true)
      expect(web.supports(form)).toBe(true)
      expect(voice.supports(prompt)).toBe(true)
      expect(cli.supports(form)).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should include ARIA labels in Web renderer', async () => {
      const component = (
        <Form>
          <TextInput name="email" label="Email Address" required />
        </Form>
      )

      const result = await render(component, 'web')
      const web = result as any

      // Web renderer should generate proper HTML with labels
      expect(web.html).toContain('label')
      expect(web.html).toContain('Email Address')
      expect(web.html).toContain('required')
    })
  })

  describe('Theme Support', () => {
    it('should apply light theme in Web renderer', async () => {
      const web = new WebRenderer()
      web.setTheme('light')

      const component = <Prompt>Test</Prompt>
      const context: RenderContext = { channel: 'web', theme: 'light' }

      const result = await web.renderPrompt(component, context)
      expect(result).toHaveProperty('css')
      expect((result as any).css).toContain('color')
    })

    it('should apply dark theme in Web renderer', async () => {
      const web = new WebRenderer()
      web.setTheme('dark')

      const component = <Prompt>Test</Prompt>
      const context: RenderContext = { channel: 'web', theme: 'dark' }

      const result = await web.renderPrompt(component, context)
      expect(result).toHaveProperty('css')
      expect((result as any).css).toContain('color')
    })
  })
})
