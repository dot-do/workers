import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DynamicForm } from '@/components/DynamicForm'
import type { JSONSchema } from '@/types/task'

describe('DynamicForm', () => {
  const mockSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Your name',
      },
      age: {
        type: 'number',
        minimum: 0,
        maximum: 120,
      },
      active: {
        type: 'boolean',
      },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest'],
      },
    },
    required: ['name', 'role'],
  }

  it('renders all fields from schema', () => {
    const onSubmit = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('role')).toBeInTheDocument()
  })

  it('marks required fields with asterisk', () => {
    const onSubmit = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    const nameLabel = screen.getByText('name')
    const roleLabel = screen.getByText('role')

    expect(nameLabel.parentElement?.textContent).toContain('*')
    expect(roleLabel.parentElement?.textContent).toContain('*')
  })

  it('renders correct input types', () => {
    const onSubmit = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    // String input
    const nameInput = screen.getByPlaceholderText('Enter name')
    expect(nameInput).toHaveAttribute('type', 'text')

    // Number input
    const ageInput = screen.getByPlaceholderText('Enter age')
    expect(ageInput).toHaveAttribute('type', 'number')
  })

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    // Fill required fields
    const nameInput = screen.getByPlaceholderText('Enter name')
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })

    // Submit form
    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('shows validation errors for required fields', async () => {
    const onSubmit = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    // Should not call onSubmit
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} onCancel={onCancel} />)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('renders enum fields as select dropdowns', () => {
    const onSubmit = vi.fn()
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />)

    // Role should be a select
    expect(screen.getByText('Select role')).toBeInTheDocument()
  })

  it('applies default values', () => {
    const onSubmit = vi.fn()
    const defaultValues = { name: 'Jane Doe', age: 30 }
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} defaultValues={defaultValues} />)

    const nameInput = screen.getByPlaceholderText('Enter name') as HTMLInputElement
    expect(nameInput.value).toBe('Jane Doe')
  })
})
